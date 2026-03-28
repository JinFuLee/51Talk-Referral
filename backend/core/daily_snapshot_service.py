"""DailySnapshotService — 每日 T-1 数据快照持久化到 SQLite

表结构（在项目 data/ 目录下 snapshots.db）：
- daily_snapshots        : 总计口径每日快照（幂等写入）
- daily_channel_snapshots: 各渠道口径每日快照（幂等写入）
- monthly_archives       : 月末归档（最终月度汇总）
"""

from __future__ import annotations

import logging
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# SQLite 数据库路径（项目根 data/ 目录）
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = _PROJECT_ROOT / "data" / "snapshots.db"


# ── DDL ────────────────────────────────────────────────────────────────────────

_DDL_DAILY_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS daily_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date   TEXT    NOT NULL UNIQUE,
    month_key       TEXT    NOT NULL,
    workday_index   INTEGER,
    registrations   REAL,
    appointments    REAL,
    attendance      REAL,
    payments        REAL,
    revenue_usd     REAL,
    asp             REAL,
    appt_rate       REAL,
    attend_rate     REAL,
    paid_rate       REAL,
    reg_to_pay_rate REAL,
    bm_pct          REAL,
    created_at      TEXT    NOT NULL
)
"""

_DDL_DAILY_CHANNEL_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS daily_channel_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date   TEXT    NOT NULL,
    month_key       TEXT    NOT NULL,
    channel         TEXT    NOT NULL,
    registrations   REAL,
    appointments    REAL,
    attendance      REAL,
    payments        REAL,
    revenue_usd     REAL,
    asp             REAL,
    appt_rate       REAL,
    attend_rate     REAL,
    paid_rate       REAL,
    reg_to_pay_rate REAL,
    created_at      TEXT    NOT NULL,
    UNIQUE(snapshot_date, channel)
)
"""

_DDL_MONTHLY_ARCHIVES = """
CREATE TABLE IF NOT EXISTS monthly_archives (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    month_key             TEXT    NOT NULL,
    channel               TEXT    NOT NULL DEFAULT 'total',
    final_registrations   REAL,
    final_appointments    REAL,
    final_attendance      REAL,
    final_payments        REAL,
    final_revenue_usd     REAL,
    final_asp             REAL,
    final_appt_rate       REAL,
    final_attend_rate     REAL,
    final_paid_rate       REAL,
    final_reg_to_pay_rate REAL,
    workdays_total        INTEGER,
    archived_at           TEXT    NOT NULL,
    UNIQUE(month_key, channel)
)
"""


# ── 工具函数 ───────────────────────────────────────────────────────────────────

def _safe_float(val: Any) -> float | None:
    """安全转换为 float，失败时返回 None。"""
    if val is None:
        return None
    try:
        import math
        f = float(val)
        return None if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return None


def _col_sum(df: pd.DataFrame, *col_candidates: str) -> float | None:
    """从 DataFrame 中找到第一个存在的列并求和，不存在则返回 None。"""
    for col in col_candidates:
        if col in df.columns:
            try:
                return _safe_float(pd.to_numeric(df[col], errors="coerce").sum())
            except Exception:
                return None
    return None


def _safe_div(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return round(a / b, 6)


def _month_key(d: date) -> str:
    """date → YYYYMM 字符串"""
    return d.strftime("%Y%m")


def _workday_index(target_date: date) -> int:
    """计算目标日期是当月第几个工作日（非周三，包含周六日）。"""
    y, m = target_date.year, target_date.month
    count = 0
    for day in range(1, target_date.day + 1):
        d = date(y, m, day)
        if d.weekday() != 2:  # 0=周一, 2=周三（休息）
            count += 1
    return count


# ── 连接管理 ───────────────────────────────────────────────────────────────────

@contextmanager
def _get_conn(db_path: Path = DB_PATH):
    """上下文管理器：打开连接，提交或回滚，关闭。"""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _ensure_schema(db_path: Path = DB_PATH) -> None:
    """建表（幂等）。"""
    with _get_conn(db_path) as conn:
        conn.execute(_DDL_DAILY_SNAPSHOTS)
        conn.execute(_DDL_DAILY_CHANNEL_SNAPSHOTS)
        conn.execute(_DDL_MONTHLY_ARCHIVES)
    logger.debug(f"SQLite schema ready: {db_path}")


# ── 核心服务类 ─────────────────────────────────────────────────────────────────

class DailySnapshotService:
    """每日快照读写服务。

    Usage:
        svc = DailySnapshotService()
        svc.write_daily(result_df=d1_df, channel_snapshots=channel_dict)
    """

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = db_path
        _ensure_schema(db_path)

    # ── 写入 ──────────────────────────────────────────────────────────────────

    def write_daily(
        self,
        result_df: pd.DataFrame,
        channel_snapshots: dict[str, dict[str, float | None]] | None = None,
        snapshot_date: date | None = None,
    ) -> dict[str, Any]:
        """写入当日（T-1）总计快照及各渠道快照。

        Args:
            result_df       : D1 结果数据 DataFrame（至少含核心指标列）
            channel_snapshots: {渠道名: {指标名: 值}} 字典，来自 ChannelFunnelEngine
            snapshot_date   : 快照日期，默认取今天 - 1 天（T-1）

        Returns:
            写入结果摘要 dict
        """
        from datetime import timedelta

        if snapshot_date is None:
            snapshot_date = date.today() - timedelta(days=1)

        snap_str = snapshot_date.isoformat()
        mk = _month_key(snapshot_date)
        wdi = _workday_index(snapshot_date)
        now_str = datetime.utcnow().isoformat() + "Z"

        # ── 1. 从 D1 提取总计指标 ─────────────────────────────────────────────
        row = self._extract_total(result_df)

        total_rec = {
            "snapshot_date": snap_str,
            "month_key": mk,
            "workday_index": wdi,
            "registrations": row.get("registrations"),
            "appointments": row.get("appointments"),
            "attendance": row.get("attendance"),
            "payments": row.get("payments"),
            "revenue_usd": row.get("revenue_usd"),
            "asp": row.get("asp"),
            "appt_rate": row.get("appt_rate"),
            "attend_rate": row.get("attend_rate"),
            "paid_rate": row.get("paid_rate"),
            "reg_to_pay_rate": row.get("reg_to_pay_rate"),
            "bm_pct": row.get("bm_pct"),
            "created_at": now_str,
        }

        # ── 2. 写总计快照（INSERT OR REPLACE 幂等）────────────────────────────
        with _get_conn(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO daily_snapshots
                    (snapshot_date, month_key, workday_index,
                     registrations, appointments, attendance, payments,
                     revenue_usd, asp, appt_rate, attend_rate, paid_rate,
                     reg_to_pay_rate, bm_pct, created_at)
                VALUES
                    (:snapshot_date, :month_key, :workday_index,
                     :registrations, :appointments, :attendance, :payments,
                     :revenue_usd, :asp, :appt_rate, :attend_rate, :paid_rate,
                     :reg_to_pay_rate, :bm_pct, :created_at)
                """,
                total_rec,
            )
            logger.info(f"daily_snapshots: 写入 {snap_str} 总计快照")

            # ── 3. 写渠道快照 ─────────────────────────────────────────────────
            if channel_snapshots:
                for channel, metrics in channel_snapshots.items():
                    ch_rec = {
                        "snapshot_date": snap_str,
                        "month_key": mk,
                        "channel": channel,
                        "registrations": metrics.get("registrations"),
                        "appointments": metrics.get("appointments"),
                        "attendance": metrics.get("attendance"),
                        "payments": metrics.get("payments"),
                        "revenue_usd": metrics.get("revenue_usd"),
                        "asp": metrics.get("asp"),
                        "appt_rate": metrics.get("appt_rate"),
                        "attend_rate": metrics.get("attend_rate"),
                        "paid_rate": metrics.get("paid_rate"),
                        "reg_to_pay_rate": metrics.get("reg_to_pay_rate"),
                        "created_at": now_str,
                    }
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO daily_channel_snapshots
                            (snapshot_date, month_key, channel,
                             registrations, appointments, attendance, payments,
                             revenue_usd, asp, appt_rate, attend_rate, paid_rate,
                             reg_to_pay_rate, created_at)
                        VALUES
                            (:snapshot_date, :month_key, :channel,
                             :registrations, :appointments, :attendance, :payments,
                             :revenue_usd, :asp, :appt_rate, :attend_rate, :paid_rate,
                             :reg_to_pay_rate, :created_at)
                        """,
                        ch_rec,
                    )
                n_ch = len(channel_snapshots)
                logger.info(
                    f"daily_channel_snapshots: 写入 {snap_str} {n_ch} 个渠道"
                )

        return {
            "snapshot_date": snap_str,
            "month_key": mk,
            "workday_index": wdi,
            "channels_written": (
                list(channel_snapshots.keys()) if channel_snapshots else []
            ),
        }

    def _extract_total(self, df: pd.DataFrame) -> dict[str, float | None]:
        """从 D1 DataFrame 提取总计行指标（仅泰国区域）。"""
        if df is None or df.empty:
            return {}

        from backend.core.data_manager import DataManager
        df = DataManager.filter_thai_region(df)

        registrations = _col_sum(df, "转介绍注册数", "registrations")
        appointments = _col_sum(df, "预约数", "appointments")
        attendance = _col_sum(df, "出席数", "attendance")
        payments = _col_sum(df, "转介绍付费数", "payments")
        revenue_usd = _col_sum(df, "总带新付费金额USD", "revenue_usd")
        asp = _col_sum(df, "客单价", "asp")

        # 转化率取第一行（D1 通常只有1-2行汇总数据，率不应 sum）
        def _first_rate(df: pd.DataFrame, *cols: str) -> float | None:
            for col in cols:
                if col in df.columns:
                    series = pd.to_numeric(df[col], errors="coerce").dropna()
                    if not series.empty:
                        return _safe_float(series.iloc[0])
            return None

        appt_rate = _first_rate(df, "注册预约率", "appt_rate") or _safe_div(
            appointments, registrations
        )
        attend_rate = _first_rate(df, "预约出席率", "attend_rate") or _safe_div(
            attendance, appointments
        )
        paid_rate = _first_rate(df, "出席付费率", "paid_rate") or _safe_div(
            payments, attendance
        )
        reg_to_pay_rate = _first_rate(
            df, "注册转化率", "reg_to_pay_rate"
        ) or _safe_div(payments, registrations)
        bm_pct = _first_rate(df, "区域业绩达成率", "bm_pct")

        return {
            "registrations": registrations,
            "appointments": appointments,
            "attendance": attendance,
            "payments": payments,
            "revenue_usd": revenue_usd,
            "asp": asp,
            "appt_rate": appt_rate,
            "attend_rate": attend_rate,
            "paid_rate": paid_rate,
            "reg_to_pay_rate": reg_to_pay_rate,
            "bm_pct": bm_pct,
        }

    # ── 月末归档 ──────────────────────────────────────────────────────────────

    def archive_month(
        self,
        month_key: str,
        channels: list[str] | None = None,
    ) -> dict[str, Any]:
        """将指定月份的日快照聚合为月度最终值写入 monthly_archives。

        Args:
            month_key: YYYYMM 字符串
            channels : 需要归档的渠道列表，None 则归档总计和全部已有渠道

        Returns:
            归档结果摘要
        """
        now_str = datetime.utcnow().isoformat() + "Z"
        archived: list[str] = []

        with _get_conn(self.db_path) as conn:
            # ── 归档总计口径 ──────────────────────────────────────────────────
            rows = conn.execute(
                """
                SELECT COUNT(*) as cnt,
                       SUM(registrations) as registrations,
                       SUM(appointments)  as appointments,
                       SUM(attendance)    as attendance,
                       SUM(payments)      as payments,
                       SUM(revenue_usd)   as revenue_usd,
                       AVG(asp)           as asp,
                       AVG(appt_rate)     as appt_rate,
                       AVG(attend_rate)   as attend_rate,
                       AVG(paid_rate)     as paid_rate,
                       AVG(reg_to_pay_rate) as reg_to_pay_rate
                FROM daily_snapshots
                WHERE month_key = ?
                """,
                (month_key,),
            ).fetchone()

            if rows and rows["cnt"] and rows["cnt"] > 0:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO monthly_archives
                        (month_key, channel,
                         final_registrations, final_appointments, final_attendance,
                         final_payments, final_revenue_usd, final_asp,
                         final_appt_rate, final_attend_rate, final_paid_rate,
                         final_reg_to_pay_rate, workdays_total, archived_at)
                    VALUES (?, 'total', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        month_key,
                        _safe_float(rows["registrations"]),
                        _safe_float(rows["appointments"]),
                        _safe_float(rows["attendance"]),
                        _safe_float(rows["payments"]),
                        _safe_float(rows["revenue_usd"]),
                        _safe_float(rows["asp"]),
                        _safe_float(rows["appt_rate"]),
                        _safe_float(rows["attend_rate"]),
                        _safe_float(rows["paid_rate"]),
                        _safe_float(rows["reg_to_pay_rate"]),
                        int(rows["cnt"]),
                        now_str,
                    ),
                )
                archived.append("total")

            # ── 归档渠道口径 ──────────────────────────────────────────────────
            channel_rows = conn.execute(
                """
                SELECT channel,
                       COUNT(*) as cnt,
                       SUM(registrations) as registrations,
                       SUM(appointments)  as appointments,
                       SUM(attendance)    as attendance,
                       SUM(payments)      as payments,
                       SUM(revenue_usd)   as revenue_usd,
                       AVG(asp)           as asp,
                       AVG(appt_rate)     as appt_rate,
                       AVG(attend_rate)   as attend_rate,
                       AVG(paid_rate)     as paid_rate,
                       AVG(reg_to_pay_rate) as reg_to_pay_rate
                FROM daily_channel_snapshots
                WHERE month_key = ?
                GROUP BY channel
                """,
                (month_key,),
            ).fetchall()

            for ch_row in channel_rows:
                ch = ch_row["channel"]
                if channels is not None and ch not in channels:
                    continue
                conn.execute(
                    """
                    INSERT OR REPLACE INTO monthly_archives
                        (month_key, channel,
                         final_registrations, final_appointments, final_attendance,
                         final_payments, final_revenue_usd, final_asp,
                         final_appt_rate, final_attend_rate, final_paid_rate,
                         final_reg_to_pay_rate, workdays_total, archived_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        month_key,
                        ch,
                        _safe_float(ch_row["registrations"]),
                        _safe_float(ch_row["appointments"]),
                        _safe_float(ch_row["attendance"]),
                        _safe_float(ch_row["payments"]),
                        _safe_float(ch_row["revenue_usd"]),
                        _safe_float(ch_row["asp"]),
                        _safe_float(ch_row["appt_rate"]),
                        _safe_float(ch_row["attend_rate"]),
                        _safe_float(ch_row["paid_rate"]),
                        _safe_float(ch_row["reg_to_pay_rate"]),
                        int(ch_row["cnt"]),
                        now_str,
                    ),
                )
                archived.append(ch)

        logger.info(f"monthly_archives: 归档 {month_key}，共 {len(archived)} 个口径")
        return {"month_key": month_key, "archived_channels": archived}

    # ── 查询 ──────────────────────────────────────────────────────────────────

    def query_by_date(self, snapshot_date: date) -> dict[str, Any]:
        """查询指定日期的总计快照（含渠道）。"""
        snap_str = snapshot_date.isoformat()
        with _get_conn(self.db_path) as conn:
            total = conn.execute(
                "SELECT * FROM daily_snapshots WHERE snapshot_date = ?", (snap_str,)
            ).fetchone()

            channels = conn.execute(
                "SELECT * FROM daily_channel_snapshots "
                "WHERE snapshot_date = ? ORDER BY channel",
                (snap_str,),
            ).fetchall()

        return {
            "snapshot_date": snap_str,
            "total": dict(total) if total else None,
            "channels": [dict(r) for r in channels],
        }

    def query_by_month(
        self,
        month_key: str,
        channel: str | None = None,
    ) -> list[dict[str, Any]]:
        """查询某月所有日快照（总计口径），可选按渠道过滤渠道表。"""
        with _get_conn(self.db_path) as conn:
            if channel:
                rows = conn.execute(
                    """
                    SELECT * FROM daily_channel_snapshots
                    WHERE month_key = ? AND channel = ?
                    ORDER BY snapshot_date
                    """,
                    (month_key, channel),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM daily_snapshots "
                    "WHERE month_key = ? ORDER BY snapshot_date",
                    (month_key,),
                ).fetchall()

        return [dict(r) for r in rows]

    def query_by_workday_index(
        self,
        month_key: str,
        workday_index: int,
    ) -> dict[str, Any] | None:
        """按工作日序号查询（用于环比：当月第 N 工作日 vs 上月第 N 工作日）。"""
        with _get_conn(self.db_path) as conn:
            row = conn.execute(
                "SELECT * FROM daily_snapshots "
                "WHERE month_key = ? AND workday_index = ?",
                (month_key, workday_index),
            ).fetchone()

        return dict(row) if row else None

    def query_monthly_archive(
        self,
        month_key: str,
        channel: str | None = None,
    ) -> list[dict[str, Any]]:
        """查询月度归档数据。"""
        with _get_conn(self.db_path) as conn:
            if channel:
                rows = conn.execute(
                    "SELECT * FROM monthly_archives "
                    "WHERE month_key = ? AND channel = ?",
                    (month_key, channel),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM monthly_archives "
                    "WHERE month_key = ? ORDER BY channel",
                    (month_key,),
                ).fetchall()

        return [dict(r) for r in rows]

    def query_recent_days(self, n_days: int = 30) -> list[dict[str, Any]]:
        """查询最近 N 天的总计快照，按日期升序。"""
        with _get_conn(self.db_path) as conn:
            rows = conn.execute(
                """
                SELECT * FROM daily_snapshots
                ORDER BY snapshot_date DESC
                LIMIT ?
                """,
                (n_days,),
            ).fetchall()
        # 反转为升序
        return [dict(r) for r in reversed(rows)]
