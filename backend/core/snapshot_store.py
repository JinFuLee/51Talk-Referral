"""SnapshotStore — SQLite 日快照持久层

负责：
  1. 数据库初始化（CREATE TABLE IF NOT EXISTS）
  2. 日快照写入（daily_snapshots + daily_channel_snapshots）
  3. 月度归档（monthly_archives）
  4. 查询接口（供 ComparisonEngine / ReportEngine 消费）
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# 默认数据库路径（output/snapshots/ref_ops.db）
_DEFAULT_DB_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "output"
    / "snapshots"
    / "ref_ops.db"
)

# ──────────────────────────────────────────────────────────
# DDL — 3 张表（M33 新增）
# ──────────────────────────────────────────────────────────

_DDL_DAILY_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS daily_snapshots (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date    DATE    NOT NULL,          -- T-1 日期，格式 YYYY-MM-DD
    month_key        TEXT    NOT NULL,          -- 如 202603
    workday_index    INTEGER,                   -- 本月第 N 工作日
    registrations    INTEGER,
    appointments     INTEGER,
    attendance       INTEGER,
    payments         INTEGER,
    revenue_usd      REAL,
    asp              REAL,
    appt_rate        REAL,
    attend_rate      REAL,
    paid_rate        REAL,
    reg_to_pay_rate  REAL,
    bm_pct           REAL,                      -- 工作日进度（0.0-1.0）
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date)
);
"""

_DDL_DAILY_CHANNEL_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS daily_channel_snapshots (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date    DATE    NOT NULL,
    month_key        TEXT    NOT NULL,
    channel          TEXT    NOT NULL,          -- CC窄口/SS窄口/LP窄口/宽口/其它
    registrations    INTEGER,
    appointments     INTEGER,
    attendance       INTEGER,
    payments         INTEGER,
    revenue_usd      REAL,
    asp              REAL,
    appt_rate        REAL,
    attend_rate      REAL,
    paid_rate        REAL,
    reg_to_pay_rate  REAL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date, channel)
);
"""

_DDL_MONTHLY_ARCHIVES = """
CREATE TABLE IF NOT EXISTS monthly_archives (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    month_key            TEXT    NOT NULL,      -- 如 202603
    channel              TEXT    NOT NULL,      -- total/CC窄口/SS窄口/LP窄口/宽口/其它
    final_registrations  INTEGER,
    final_appointments   INTEGER,
    final_attendance     INTEGER,
    final_payments       INTEGER,
    final_revenue_usd    REAL,
    final_asp            REAL,
    workdays_total       INTEGER,
    archived_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month_key, channel)
);
"""


class SnapshotStore:
    """SQLite 日快照持久层"""

    def __init__(self, db_path: Path | str | None = None) -> None:
        self._db_path = Path(db_path) if db_path else _DEFAULT_DB_PATH
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        # 启用 WAL 模式以支持并发读写
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self) -> None:
        """初始化数据库，执行 3 张表的 DDL（幂等）"""
        with self._connect() as conn:
            conn.execute(_DDL_DAILY_SNAPSHOTS)
            conn.execute(_DDL_DAILY_CHANNEL_SNAPSHOTS)
            conn.execute(_DDL_MONTHLY_ARCHIVES)
            conn.commit()
        logger.debug("SnapshotStore 初始化完成，db=%s", self._db_path)

    # ──────────────────────────────────────────────
    # 写入接口
    # ──────────────────────────────────────────────

    def upsert_daily_snapshot(
        self,
        snapshot_date: date,
        month_key: str,
        workday_index: int | None,
        registrations: int | None,
        appointments: int | None,
        attendance: int | None,
        payments: int | None,
        revenue_usd: float | None,
        asp: float | None,
        appt_rate: float | None,
        attend_rate: float | None,
        paid_rate: float | None,
        reg_to_pay_rate: float | None,
        bm_pct: float | None,
    ) -> None:
        """写入或更新总计维度日快照（UPSERT by snapshot_date）"""
        sql = """
            INSERT INTO daily_snapshots
                (snapshot_date, month_key, workday_index,
                 registrations, appointments, attendance, payments,
                 revenue_usd, asp, appt_rate, attend_rate, paid_rate,
                 reg_to_pay_rate, bm_pct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(snapshot_date) DO UPDATE SET
                month_key       = excluded.month_key,
                workday_index   = excluded.workday_index,
                registrations   = excluded.registrations,
                appointments    = excluded.appointments,
                attendance      = excluded.attendance,
                payments        = excluded.payments,
                revenue_usd     = excluded.revenue_usd,
                asp             = excluded.asp,
                appt_rate       = excluded.appt_rate,
                attend_rate     = excluded.attend_rate,
                paid_rate       = excluded.paid_rate,
                reg_to_pay_rate = excluded.reg_to_pay_rate,
                bm_pct          = excluded.bm_pct
        """
        with self._connect() as conn:
            conn.execute(
                sql,
                (
                    snapshot_date.isoformat(),
                    month_key,
                    workday_index,
                    registrations,
                    appointments,
                    attendance,
                    payments,
                    revenue_usd,
                    asp,
                    appt_rate,
                    attend_rate,
                    paid_rate,
                    reg_to_pay_rate,
                    bm_pct,
                ),
            )
            conn.commit()
        logger.debug("upsert daily_snapshots: date=%s", snapshot_date)

    def upsert_channel_snapshot(
        self,
        snapshot_date: date,
        month_key: str,
        channel: str,
        registrations: int | None,
        appointments: int | None,
        attendance: int | None,
        payments: int | None,
        revenue_usd: float | None,
        asp: float | None,
        appt_rate: float | None,
        attend_rate: float | None,
        paid_rate: float | None,
        reg_to_pay_rate: float | None,
    ) -> None:
        """写入或更新口径维度日快照（UPSERT by snapshot_date + channel）"""
        sql = """
            INSERT INTO daily_channel_snapshots
                (snapshot_date, month_key, channel,
                 registrations, appointments, attendance, payments,
                 revenue_usd, asp, appt_rate, attend_rate, paid_rate,
                 reg_to_pay_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(snapshot_date, channel) DO UPDATE SET
                month_key       = excluded.month_key,
                registrations   = excluded.registrations,
                appointments    = excluded.appointments,
                attendance      = excluded.attendance,
                payments        = excluded.payments,
                revenue_usd     = excluded.revenue_usd,
                asp             = excluded.asp,
                appt_rate       = excluded.appt_rate,
                attend_rate     = excluded.attend_rate,
                paid_rate       = excluded.paid_rate,
                reg_to_pay_rate = excluded.reg_to_pay_rate
        """
        with self._connect() as conn:
            conn.execute(
                sql,
                (
                    snapshot_date.isoformat(),
                    month_key,
                    channel,
                    registrations,
                    appointments,
                    attendance,
                    payments,
                    revenue_usd,
                    asp,
                    appt_rate,
                    attend_rate,
                    paid_rate,
                    reg_to_pay_rate,
                ),
            )
            conn.commit()
        logger.debug(
            "upsert daily_channel_snapshots: date=%s, channel=%s",
            snapshot_date,
            channel,
        )

    def upsert_monthly_archive(
        self,
        month_key: str,
        channel: str,
        final_registrations: int | None,
        final_appointments: int | None,
        final_attendance: int | None,
        final_payments: int | None,
        final_revenue_usd: float | None,
        final_asp: float | None,
        workdays_total: int | None,
    ) -> None:
        """写入或更新月度归档记录（UPSERT by month_key + channel）"""
        sql = """
            INSERT INTO monthly_archives
                (month_key, channel,
                 final_registrations, final_appointments, final_attendance,
                 final_payments, final_revenue_usd, final_asp, workdays_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(month_key, channel) DO UPDATE SET
                final_registrations = excluded.final_registrations,
                final_appointments  = excluded.final_appointments,
                final_attendance    = excluded.final_attendance,
                final_payments      = excluded.final_payments,
                final_revenue_usd   = excluded.final_revenue_usd,
                final_asp           = excluded.final_asp,
                workdays_total      = excluded.workdays_total,
                archived_at         = CURRENT_TIMESTAMP
        """
        with self._connect() as conn:
            conn.execute(
                sql,
                (
                    month_key,
                    channel,
                    final_registrations,
                    final_appointments,
                    final_attendance,
                    final_payments,
                    final_revenue_usd,
                    final_asp,
                    workdays_total,
                ),
            )
            conn.commit()
        logger.debug(
            "upsert monthly_archives: month=%s, channel=%s", month_key, channel
        )

    # ──────────────────────────────────────────────
    # 查询接口
    # ──────────────────────────────────────────────

    def get_latest_snapshot_date(self) -> date | None:
        """返回 daily_snapshots 中最新的 snapshot_date"""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT MAX(snapshot_date) FROM daily_snapshots"
            ).fetchone()
        if row is None or row[0] is None:
            return None
        return date.fromisoformat(row[0])

    def get_daily_snapshot(self, snapshot_date: date) -> dict[str, Any] | None:
        """返回指定日期的总计维度快照"""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM daily_snapshots WHERE snapshot_date = ?",
                (snapshot_date.isoformat(),),
            ).fetchone()
        return dict(row) if row else None

    def get_channel_snapshot(
        self, snapshot_date: date, channel: str
    ) -> dict[str, Any] | None:
        """返回指定日期+口径的快照"""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM daily_channel_snapshots"
                " WHERE snapshot_date = ? AND channel = ?",
                (snapshot_date.isoformat(), channel),
            ).fetchone()
        return dict(row) if row else None

    def get_monthly_archive(
        self, month_key: str, channel: str = "total"
    ) -> dict[str, Any] | None:
        """返回指定月份+口径的归档记录"""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM monthly_archives WHERE month_key = ? AND channel = ?",
                (month_key, channel),
            ).fetchone()
        return dict(row) if row else None

    def list_monthly_archives(
        self, channel: str = "total", limit: int = 12
    ) -> list[dict[str, Any]]:
        """返回最近 N 个月的归档记录（按 month_key 倒序）"""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM monthly_archives
                WHERE channel = ?
                ORDER BY month_key DESC
                LIMIT ?
                """,
                (channel, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    def count_snapshots(self) -> dict[str, int]:
        """返回各表的行数统计（用于健康检查）"""
        with self._connect() as conn:
            ds = conn.execute("SELECT COUNT(*) FROM daily_snapshots").fetchone()[0]
            dcs = conn.execute(
                "SELECT COUNT(*) FROM daily_channel_snapshots"
            ).fetchone()[0]
            ma = conn.execute("SELECT COUNT(*) FROM monthly_archives").fetchone()[0]
        return {
            "daily_snapshots": ds,
            "daily_channel_snapshots": dcs,
            "monthly_archives": ma,
        }

    @property
    def db_path(self) -> Path:
        return self._db_path
