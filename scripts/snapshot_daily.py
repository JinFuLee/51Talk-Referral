"""snapshot_daily.py — 独立 CLI 快照写入脚本

在 Quick BI 取数成功后调用，将 T-1 数据写入 SQLite 日快照。
不依赖 FastAPI 运行，可直接通过 launchd 或 cron 调用。

用法：
  uv run python scripts/snapshot_daily.py              # 写入昨天 (T-1) 快照
  uv run python scripts/snapshot_daily.py --date 2026-03-28   # 指定日期
  uv run python scripts/snapshot_daily.py --backfill 7        # 回填最近 7 天
  uv run python scripts/snapshot_daily.py --migrate   # 迁移旧 DB 到新路径
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import logging
import shutil
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("snapshot_daily")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "output" / "snapshots" / "ref_ops.db"
OLD_DB_PATH = PROJECT_ROOT / "data" / "snapshots.db"
NOTIFY_CONFIG = PROJECT_ROOT / "config" / "quickbi_notify.json"


# ── 钉钉告警（复用 quickbi_fetch.py 模式）─────────────────────────────────────

def _alert_dingtalk(title: str, text: str) -> None:
    """读 config/quickbi_notify.json 发送钉钉 Markdown 消息。"""
    if not NOTIFY_CONFIG.exists():
        log.warning("告警配置不存在: %s，跳过告警", NOTIFY_CONFIG)
        return

    try:
        with open(NOTIFY_CONFIG) as f:
            notify_cfg = json.load(f)
        webhook = notify_cfg["dingtalk_webhook"]
        secret = notify_cfg["dingtalk_secret"]
    except (KeyError, json.JSONDecodeError, OSError) as e:
        log.warning("告警配置读取失败: %s", e)
        return

    timestamp = str(int(time.time() * 1000))
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(
        secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(hmac_code).decode("utf-8"))
    signed_url = f"{webhook}&timestamp={timestamp}&sign={sign}"

    payload = json.dumps(
        {"msgtype": "markdown", "markdown": {"title": title, "text": text}},
        ensure_ascii=False,
    ).encode("utf-8")

    try:
        req = urllib.request.Request(
            signed_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("errcode") == 0:
                log.info("📢 钉钉告警已发送: %s", title)
            else:
                log.warning("钉钉告警失败: %s", result)
    except Exception as e:
        log.warning("钉钉告警发送异常: %s", e)


# ── 数据加载 ───────────────────────────────────────────────────────────────────

def _load_data() -> dict:
    """用 DataManager 加载 Excel 数据，返回 data dict。"""
    import os

    data_dir = os.environ.get(
        "DATA_SOURCE_DIR",
        str(Path.home() / "Desktop" / "转介绍中台监测指标"),
    )
    log.info("数据目录: %s", data_dir)

    from backend.core.data_manager import DataManager

    dm = DataManager(data_dir=data_dir)
    data = dm.load_all()
    return data


# ── 快照写入 ───────────────────────────────────────────────────────────────────

def _write_snapshot(ref_date: date, data: dict) -> dict:
    """写入指定日期的快照，返回写入摘要。"""
    from backend.core.channel_funnel_engine import ChannelFunnelEngine
    from backend.core.daily_snapshot_service import DailySnapshotService

    svc = DailySnapshotService(db_path=DB_PATH)

    # 幂等检查：已有快照则跳过
    existing = svc.query_by_date(ref_date)
    if existing and existing.get("total"):
        log.info("快照已存在，跳过: %s", ref_date.isoformat())
        return {"skipped": True, "snapshot_date": ref_date.isoformat()}

    # 获取渠道漏斗数据
    funnel = ChannelFunnelEngine.from_data_dict(data)
    channel_data = funnel.compute()

    # 获取 D1 result DataFrame
    result_df = data.get("result")

    result = svc.write_daily(
        result_df=result_df,
        channel_snapshots=channel_data,
        snapshot_date=ref_date,
    )

    # 提取关键指标用于日志输出
    snap_check = svc.query_by_date(ref_date)
    total = snap_check.get("total") or {}
    reg = int(total.get("registrations") or 0)
    rev = total.get("revenue_usd") or 0.0

    log.info(
        "✓ 日快照写入: %s (注册=%d, 业绩=$%.0f, 渠道=%d 个)",
        ref_date.isoformat(),
        reg,
        rev,
        len(channel_data),
    )
    return result


# ── 数据迁移 ───────────────────────────────────────────────────────────────────

def _migrate() -> None:
    """将 data/snapshots.db 全量数据迁移到 output/snapshots/ref_ops.db。"""
    if not OLD_DB_PATH.exists():
        log.error("旧 DB 不存在: %s", OLD_DB_PATH)
        sys.exit(1)

    # 备份旧 DB
    bak_path = OLD_DB_PATH.with_suffix(".db.bak")
    shutil.copy2(OLD_DB_PATH, bak_path)
    log.info("✓ 已备份旧 DB: %s", bak_path)

    # 确保目标目录存在
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 打开两个连接
    src = sqlite3.connect(str(OLD_DB_PATH))
    src.row_factory = sqlite3.Row

    dst = sqlite3.connect(str(DB_PATH))
    dst.execute("PRAGMA journal_mode=WAL")

    # ── 确保目标表结构最新（DROP 旧表后用当前 DDL 重建，避免列缺失）
    from backend.core.daily_snapshot_service import (
        _DDL_DAILY_CHANNEL_SNAPSHOTS,
        _DDL_DAILY_SNAPSHOTS,
        _DDL_MONTHLY_ARCHIVES,
    )
    # 删除旧结构的表，保证 DDL 与代码一致
    with dst:
        for t in ["daily_snapshots", "daily_channel_snapshots", "monthly_archives"]:
            dst.execute(f"DROP TABLE IF EXISTS {t}")
        dst.execute(_DDL_DAILY_SNAPSHOTS)
        dst.execute(_DDL_DAILY_CHANNEL_SNAPSHOTS)
        dst.execute(_DDL_MONTHLY_ARCHIVES)
    log.info("✓ 目标 DB 表结构已重建（最新 DDL）")

    tables = ["daily_snapshots", "daily_channel_snapshots", "monthly_archives"]
    counts: dict[str, int] = {}

    for table in tables:
        # 检查源表是否存在
        exists = src.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table,),
        ).fetchone()
        if not exists:
            log.warning("源表不存在，跳过: %s", table)
            counts[table] = 0
            continue

        rows = src.execute(f"SELECT * FROM {table}").fetchall()
        if not rows:
            counts[table] = 0
            continue

        src_cols = set(rows[0].keys())

        # 获取目标表实际列（可能与源表结构不同）
        dst_col_info = dst.execute(
            f"PRAGMA table_info({table})"
        ).fetchall()
        dst_cols = {r[1] for r in dst_col_info}

        # 只迁移两表共有的列（排除自增主键 id，让目标表自行分配）
        common_cols = [c for c in rows[0] if c in dst_cols and c != "id"]

        if not common_cols:
            log.warning("  %s: 无共同列，跳过", table)
            counts[table] = 0
            continue

        # 仅在目标表有源表不含的列时记录
        missing_in_dst = src_cols - dst_cols - {"id"}
        if missing_in_dst:
            log.info("  %s: 目标表缺少列 %s，这些列将被跳过", table, missing_in_dst)

        col_list = ", ".join(common_cols)
        placeholders = ", ".join("?" for _ in common_cols)
        col_indices = [list(rows[0].keys()).index(c) for c in common_cols]

        with dst:
            dst.executemany(
                f"INSERT OR REPLACE INTO {table} ({col_list}) VALUES ({placeholders})",
                [tuple(row[i] for i in col_indices) for row in rows],
            )

        counts[table] = len(rows)
        log.info("  ✓ %s: 迁移 %d 条", table, len(rows))

    src.close()
    dst.close()

    log.info(
        "✓ 迁移完成: 日快照 %d 条 + 渠道 %d 条 + 月度归档 %d 条",
        counts.get("daily_snapshots", 0),
        counts.get("daily_channel_snapshots", 0),
        counts.get("monthly_archives", 0),
    )


# ── 主入口 ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="写入 T-1 日快照到 output/snapshots/ref_ops.db"
    )
    parser.add_argument(
        "--date",
        help="指定快照日期 (YYYY-MM-DD)，默认为昨天 (T-1)",
    )
    parser.add_argument(
        "--backfill",
        type=int,
        metavar="N",
        help="回填最近 N 天快照（含今天-N 到昨天）",
    )
    parser.add_argument(
        "--migrate",
        action="store_true",
        help="迁移 data/snapshots.db 到 output/snapshots/ref_ops.db",
    )
    args = parser.parse_args()

    # ── 迁移模式 ──
    if args.migrate:
        _migrate()
        return

    # ── 确定要写入的日期列表 ──
    if args.backfill:
        today = date.today()
        dates = [today - timedelta(days=i) for i in range(args.backfill, 0, -1)]
    elif args.date:
        try:
            dates = [date.fromisoformat(args.date)]
        except ValueError:
            log.error("日期格式错误，请用 YYYY-MM-DD: %s", args.date)
            sys.exit(1)
    else:
        dates = [date.today() - timedelta(days=1)]

    # ── 加载数据（一次加载，多次写入）──
    try:
        data = _load_data()
    except Exception as e:
        err_msg = f"数据加载失败: {e}"
        log.error(err_msg)
        _alert_dingtalk(
            "⚠️ 日快照写入失败 — 数据加载错误",
            f"### ⚠️ 日快照数据加载失败\n\n**错误**: {e}"
            "\n\n**操作**: 检查 Excel 数据文件是否存在",
        )
        sys.exit(1)

    # ── 逐日写入 ──
    failed: list[str] = []
    for ref_date in dates:
        try:
            _write_snapshot(ref_date, data)
        except Exception as e:
            log.error("快照写入失败 [%s]: %s", ref_date.isoformat(), e)
            failed.append(ref_date.isoformat())

    if failed:
        _alert_dingtalk(
            "⚠️ 日快照写入失败",
            f"### ⚠️ 日快照写入失败\n\n**失败日期**: {', '.join(failed)}"
            "\n\n**操作**: 检查数据完整性后重新运行",
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
