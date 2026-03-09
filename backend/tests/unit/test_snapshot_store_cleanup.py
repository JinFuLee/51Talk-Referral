"""
SnapshotStore 自动清理逻辑单元测试（Tech Debt #43）
覆盖：概率触发、时间戳冷却、后台线程、retention_days 环境变量
"""

import threading
import time
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from backend.core.snapshot_store import SnapshotStore

_KPI_SQL = (
    "INSERT OR REPLACE INTO daily_kpi "
    "(snapshot_date, metric, value, time_progress) VALUES (?, ?, ?, ?)"
)


def _insert_kpi(conn, date: str, metric: str, value: float) -> None:
    conn.execute(_KPI_SQL, (date, metric, value, 0.5))
    conn.commit()


@pytest.fixture(autouse=True)
def reset_singleton(tmp_path):
    """每个测试前后重置单例，避免污染"""
    SnapshotStore.reset_instance()
    yield
    SnapshotStore.reset_instance()


@pytest.fixture
def store(tmp_path):
    return SnapshotStore(project_root=tmp_path)


@pytest.fixture
def minimal_result():
    """最小 analysis_result，save_snapshot 不抛异常"""
    return {
        "summary": {},
        "time_progress": 0.5,
        "cc_ranking": [],
        "prediction": {},
    }


def _save_n(store, result, n, base_date=None):
    """连续 save N 次（日期各不同，避免 PRIMARY KEY 冲突）"""
    base = base_date or datetime(2026, 3, 1)
    for i in range(n):
        store.save_snapshot(result, base + timedelta(days=i))


# ---------------------------------------------------------------------------
# 1. 初始状态
# ---------------------------------------------------------------------------


def test_initial_save_count_is_zero(store):
    assert store._save_count == 0
    assert store._last_cleanup is None


# ---------------------------------------------------------------------------
# 2. 计数器累加
# ---------------------------------------------------------------------------


def test_save_count_increments(store, minimal_result):
    _save_n(store, minimal_result, 3)
    assert store._save_count == 3


# ---------------------------------------------------------------------------
# 3. 概率触发：第 10 次才触发（默认 interval=10）
# ---------------------------------------------------------------------------


def test_cleanup_not_triggered_before_interval(store, minimal_result):
    with patch.object(store, "_background_cleanup") as mock_cleanup:
        _save_n(store, minimal_result, 9)
        mock_cleanup.assert_not_called()


def test_cleanup_triggered_at_interval(store, minimal_result):
    triggered = threading.Event()

    def fake_cleanup(days):
        triggered.set()

    with patch.object(store, "_background_cleanup", side_effect=fake_cleanup):
        _save_n(store, minimal_result, 10)
        triggered.wait(timeout=2)
        assert triggered.is_set(), "cleanup 应在第 10 次 save 后触发"


# ---------------------------------------------------------------------------
# 4. 时间戳双重保护：24h 内不重复执行
# ---------------------------------------------------------------------------


def test_cleanup_skipped_within_cooldown(store, minimal_result):
    """第一次在第 10 次触发后，第 20 次因 24h 冷却不触发"""
    call_count = {"n": 0}

    original = store._background_cleanup

    def counting_cleanup(days):
        call_count["n"] += 1
        original(days)

    with patch.object(store, "_background_cleanup", side_effect=counting_cleanup):
        # 第 10 次触发第一次
        _save_n(store, minimal_result, 10)
        time.sleep(0.05)  # 等后台线程完成

        # 立刻再 save 10 次（距第一次不足 24h），应被冷却抑制
        _save_n(store, minimal_result, 10, base_date=datetime(2026, 4, 1))
        time.sleep(0.05)

    assert call_count["n"] == 1, "24h 冷却内不应重复执行清理"


def test_cleanup_runs_again_after_cooldown(store, minimal_result):
    """伪造 _last_cleanup 为 25h 前，下次到达 interval 应再次触发"""
    call_count = {"n": 0}

    original = store._background_cleanup

    def counting_cleanup(days):
        call_count["n"] += 1
        original(days)

    with patch.object(store, "_background_cleanup", side_effect=counting_cleanup):
        _save_n(store, minimal_result, 10)
        time.sleep(0.05)

        # 伪造上次清理时间为 25h 前，绕过冷却
        store._last_cleanup = datetime.now() - timedelta(hours=25)

        _save_n(store, minimal_result, 10, base_date=datetime(2026, 5, 1))
        time.sleep(0.05)

    assert call_count["n"] == 2, "冷却期结束后应再次触发清理"


# ---------------------------------------------------------------------------
# 5. retention_days 读取环境变量
# ---------------------------------------------------------------------------


def test_retention_days_from_env(store, minimal_result, monkeypatch):
    """SNAPSHOT_RETENTION_DAYS=30 时，cleanup_old_snapshots 应以 days=30 调用"""
    monkeypatch.setenv("SNAPSHOT_RETENTION_DAYS", "30")
    monkeypatch.setenv("SNAPSHOT_CLEANUP_INTERVAL", "1")  # 每次都触发
    monkeypatch.setenv("SNAPSHOT_CLEANUP_COOLDOWN_HOURS", "0")  # 无冷却

    received_days = []

    def capture(days):
        received_days.append(days)

    with patch.object(store, "_background_cleanup", side_effect=capture):
        store.save_snapshot(minimal_result, datetime(2026, 3, 1))
        time.sleep(0.05)

    assert received_days == [30], f"期望 [30]，实际 {received_days}"


# ---------------------------------------------------------------------------
# 6. _background_cleanup 实际删除旧数据 + 日志
# ---------------------------------------------------------------------------


def test_background_cleanup_deletes_old_rows(store, minimal_result, caplog):
    """插入超过 90 天的旧数据，cleanup 后应删除"""
    import logging

    # 插入一条 200 天前的数据
    old_date = (datetime.now() - timedelta(days=200)).strftime("%Y-%m-%d")
    _insert_kpi(store.conn, old_date, "registration", 100.0)
    store.conn.commit()

    with caplog.at_level(logging.INFO, logger="backend.core.snapshot_store"):
        store._background_cleanup(retention_days=90)

    # 旧数据被删
    rows = store.conn.execute(
        "SELECT * FROM daily_kpi WHERE snapshot_date = ?", (old_date,)
    ).fetchall()
    assert len(rows) == 0, "200 天前的数据应被清理"

    # 日志有清理条数
    assert any("Auto cleanup" in r.message for r in caplog.records), (
        "应有 Auto cleanup 日志输出"
    )


# ---------------------------------------------------------------------------
# 7. cleanup_old_snapshots 不改变最近数据
# ---------------------------------------------------------------------------


def test_cleanup_preserves_recent_data(store, minimal_result):
    """cleanup 保留 retention_days 内的数据"""
    recent_date = datetime.now().strftime("%Y-%m-%d")
    _insert_kpi(store.conn, recent_date, "registration", 200.0)
    store.conn.commit()

    store.cleanup_old_snapshots(days=90)

    rows = store.conn.execute(
        "SELECT * FROM daily_kpi WHERE snapshot_date = ?", (recent_date,)
    ).fetchall()
    assert len(rows) == 1, "最近数据不应被清理"


# ---------------------------------------------------------------------------
# 8. 线程安全：_cleanup_lock 防止并发重入
# ---------------------------------------------------------------------------


def test_cleanup_lock_prevents_concurrent_runs(store):
    """两个线程同时调用 _background_cleanup，_cleanup_lock 确保串行"""
    call_order = []
    original_cleanup = store.cleanup_old_snapshots

    def slow_cleanup(days):
        call_order.append("start")
        time.sleep(0.05)
        original_cleanup(days)
        call_order.append("end")

    with patch.object(store, "cleanup_old_snapshots", side_effect=slow_cleanup):
        t1 = threading.Thread(target=store._background_cleanup, args=(90,))
        t2 = threading.Thread(target=store._background_cleanup, args=(90,))
        t1.start()
        t2.start()
        t1.join(timeout=3)
        t2.join(timeout=3)

    # 顺序必须是 start→end→start→end，不能交叉
    assert call_order == ["start", "end", "start", "end"], (
        f"cleanup_lock 应保证串行执行，实际顺序: {call_order}"
    )
