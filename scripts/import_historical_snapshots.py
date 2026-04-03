"""一次性导入历史月度快照到 SQLite（monthly_archives + daily_snapshots 月末行）

数据来源：Felix 手工提供的 11 个月全月终值（2025-05 至 2026-03）
5 口径：总计 / CC窄口 / SS窄口 / LP窄口 / 其它
9 指标：注册 / 预约 / 出席 / 付费 / 美金金额 / 注册付费率 / 预约率 / 预约出席率 / 出席付费率
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "snapshots.db"

# ── 历史数据（5 口径 × 9 指标 × 11 个月）──────────────────────────────────────

# 月份映射（按时间顺序）
MONTHS = [
    "202505", "202506", "202507", "202508", "202509",
    "202510", "202511", "202512", "202601", "202602", "202603",
]

# 每月最后一天（用于 daily_snapshots 写入）
MONTH_END_DATES = [
    "2025-05-31", "2025-06-30", "2025-07-31", "2025-08-31", "2025-09-30",
    "2025-10-31", "2025-11-30", "2025-12-31", "2026-01-31", "2026-02-28", "2026-03-25",
]

# 数据结构: [注册, 预约, 出席, 付费, 美金金额]
# 转化率从绝对值计算，不硬编码

# ── 第二批数据（2025-05 至 2025-09，Felix 第二次提供）──
RAW_BATCH2 = {
    "total": [
        [806, 654, 401, 186, 146848],
        [615, 503, 356, 166, 147094],
        [609, 452, 285, 114, 95830],
        [674, 526, 319, 136, 132488],
        [783, 610, 366, 136, 134586],
    ],
    "CC窄口": [
        [204, 152, 129, 82, 62835],
        [203, 162, 137, 75, 64472],
        [164, 114, 97, 58, 46198],
        [199, 149, 125, 67, 67588],
        [217, 157, 125, 64, 64972],
    ],
    "LP窄口": [
        [35, 30, 22, 9, 9022],
        [44, 32, 26, 12, 11900],
        [26, 22, 20, 6, 5564],
        [38, 24, 18, 6, 5442],
        [64, 45, 33, 18, 17624],
    ],
    "SS窄口": [
        [35, 33, 30, 19, 17111],
        [32, 24, 23, 16, 15526],
        [26, 15, 11, 6, 4954],
        [32, 25, 24, 13, 14264],
        [25, 14, 12, 5, 5052],
    ],
    "其它": [
        [532, 439, 220, 76, 57880],
        [336, 285, 170, 63, 55196],
        [393, 301, 157, 44, 39114],
        [405, 328, 152, 50, 45194],
        [477, 394, 196, 49, 46938],
    ],
}

# ── 第一批数据（2025-10 至 2026-03，Felix 最初提供）──
RAW_BATCH1 = {
    "total": [
        [685, 546, 336, 143, 112990],
        [523, 426, 296, 131, 112726],
        [516, 380, 238, 91, 76392],
        [503, 400, 247, 103, 102706],
        [677, 532, 324, 113, 114038],
        [906, 738, 469, 184, 175221],
    ],
    "CC窄口": [
        [172, 127, 103, 62, 47851],
        [169, 134, 114, 57, 47012],
        [136, 94, 78, 45, 35936],
        [151, 113, 95, 51, 53242],
        [183, 138, 113, 49, 51782],
        [243, 189, 176, 90, 85561],
    ],
    "LP窄口": [
        [33, 27, 20, 5, 5374],
        [41, 27, 22, 11, 11018],
        [24, 21, 20, 6, 5564],
        [25, 15, 12, 3, 2648],
        [52, 38, 30, 16, 15854],
        [57, 51, 45, 23, 25874],
    ],
    "SS窄口": [
        [29, 28, 26, 16, 12701],
        [24, 17, 16, 14, 12816],
        [18, 11, 7, 4, 2782],
        [22, 17, 17, 10, 11470],
        [20, 14, 12, 5, 5052],
        [25, 21, 20, 12, 9254],
    ],
    "其它": [
        [451, 364, 187, 60, 47064],
        [289, 248, 144, 49, 41880],
        [338, 254, 133, 36, 32110],
        [305, 255, 123, 39, 35346],
        [422, 342, 169, 43, 41350],
        [581, 477, 228, 59, 54532],
    ],
}


def _safe_div(a: float, b: float) -> float | None:
    return round(a / b, 6) if b > 0 else None


def _compute_rates(row: list[int]) -> dict:
    """从 [reg, appt, attend, paid, rev] 计算 9 指标 dict"""
    reg, appt, attend, paid, rev = row
    return {
        "registrations": reg,
        "appointments": appt,
        "attendance": attend,
        "payments": paid,
        "revenue_usd": rev,
        "asp": _safe_div(rev, paid),
        "appt_rate": _safe_div(appt, reg),
        "attend_rate": _safe_div(attend, appt),
        "paid_rate": _safe_div(paid, attend),
        "reg_to_pay_rate": _safe_div(paid, reg),
    }


def _insert_monthly_archive(conn: sqlite3.Connection, month_key: str,
                             channel: str, metrics: dict) -> None:
    conn.execute("""
        INSERT OR REPLACE INTO monthly_archives
        (month_key, channel, final_registrations, final_appointments,
         final_attendance, final_payments, final_revenue_usd, final_asp,
         final_appt_rate, final_attend_rate, final_paid_rate,
         final_reg_to_pay_rate, workdays_total, archived_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        month_key, channel,
        metrics["registrations"], metrics["appointments"],
        metrics["attendance"], metrics["payments"],
        metrics["revenue_usd"], metrics["asp"],
        metrics["appt_rate"], metrics["attend_rate"],
        metrics["paid_rate"], metrics["reg_to_pay_rate"],
        22,  # 近似工作日数
    ))


def _insert_daily_snapshot(conn: sqlite3.Connection, snapshot_date: str,
                            month_key: str, metrics: dict) -> None:
    conn.execute("""
        INSERT OR REPLACE INTO daily_snapshots
        (snapshot_date, month_key, workday_index, registrations, appointments,
         attendance, payments, revenue_usd, asp, appt_rate, attend_rate,
         paid_rate, reg_to_pay_rate, bm_pct, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        snapshot_date, month_key, 22,
        metrics["registrations"], metrics["appointments"],
        metrics["attendance"], metrics["payments"],
        metrics["revenue_usd"], metrics["asp"],
        metrics["appt_rate"], metrics["attend_rate"],
        metrics["paid_rate"], metrics["reg_to_pay_rate"],
        1.0,  # 月末 BM = 100%
    ))


def _insert_channel_snapshot(conn: sqlite3.Connection, snapshot_date: str,
                              month_key: str, channel: str,
                              metrics: dict) -> None:
    conn.execute("""
        INSERT OR REPLACE INTO daily_channel_snapshots
        (snapshot_date, month_key, channel, registrations, appointments,
         attendance, payments, revenue_usd, asp, appt_rate, attend_rate,
         paid_rate, reg_to_pay_rate, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        snapshot_date, month_key, channel,
        metrics["registrations"], metrics["appointments"],
        metrics["attendance"], metrics["payments"],
        metrics["revenue_usd"], metrics["asp"],
        metrics["appt_rate"], metrics["attend_rate"],
        metrics["paid_rate"], metrics["reg_to_pay_rate"],
    ))


def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))

    # 确保表存在
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS daily_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_date TEXT NOT NULL UNIQUE,
            month_key TEXT NOT NULL,
            workday_index INTEGER,
            registrations REAL, appointments REAL, attendance REAL,
            payments REAL, revenue_usd REAL, asp REAL,
            appt_rate REAL, attend_rate REAL, paid_rate REAL,
            reg_to_pay_rate REAL, bm_pct REAL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS daily_channel_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_date TEXT NOT NULL, month_key TEXT NOT NULL,
            channel TEXT NOT NULL,
            registrations REAL, appointments REAL, attendance REAL,
            payments REAL, revenue_usd REAL, asp REAL,
            appt_rate REAL, attend_rate REAL, paid_rate REAL,
            reg_to_pay_rate REAL, created_at TEXT NOT NULL,
            UNIQUE(snapshot_date, channel)
        );
        CREATE TABLE IF NOT EXISTS monthly_archives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month_key TEXT NOT NULL,
            channel TEXT NOT NULL DEFAULT 'total',
            final_registrations REAL, final_appointments REAL,
            final_attendance REAL, final_payments REAL,
            final_revenue_usd REAL, final_asp REAL,
            final_appt_rate REAL, final_attend_rate REAL,
            final_paid_rate REAL, final_reg_to_pay_rate REAL,
            workdays_total INTEGER, archived_at TEXT NOT NULL,
            UNIQUE(month_key, channel)
        );
    """)

    channels = ["total", "CC窄口", "LP窄口", "SS窄口", "其它"]

    # 导入 batch2（2025-05 至 2025-09）
    for i in range(5):
        mk = MONTHS[i]
        end_date = MONTH_END_DATES[i]
        for ch in channels:
            raw_key = ch
            raw = RAW_BATCH2[raw_key][i]
            metrics = _compute_rates(raw)

            _insert_monthly_archive(conn, mk, ch, metrics)
            if ch == "total":
                _insert_daily_snapshot(conn, end_date, mk, metrics)
            _insert_channel_snapshot(conn, end_date, mk, ch, metrics)

    # 导入 batch1（2025-10 至 2026-03）
    for i in range(6):
        mk = MONTHS[5 + i]
        end_date = MONTH_END_DATES[5 + i]
        for ch in channels:
            raw_key = ch
            raw = RAW_BATCH1[raw_key][i]
            metrics = _compute_rates(raw)

            _insert_monthly_archive(conn, mk, ch, metrics)
            if ch == "total":
                _insert_daily_snapshot(conn, end_date, mk, metrics)
            _insert_channel_snapshot(conn, end_date, mk, ch, metrics)

    conn.commit()

    # 验证
    cursor = conn.execute("SELECT COUNT(*) FROM monthly_archives")
    ma_count = cursor.fetchone()[0]
    cursor = conn.execute("SELECT COUNT(*) FROM daily_snapshots")
    ds_count = cursor.fetchone()[0]
    cursor = conn.execute("SELECT COUNT(*) FROM daily_channel_snapshots")
    dcs_count = cursor.fetchone()[0]

    print("✓ 导入完成:")
    print(f"  monthly_archives: {ma_count} 条（期望 55 = 11月×5口径）")
    print(f"  daily_snapshots: {ds_count} 条（期望 11 = 11月×总计）")
    print(f"  daily_channel_snapshots: {dcs_count} 条（期望 55 = 11月×5口径）")

    # 抽检
    cursor = conn.execute(
        "SELECT month_key, channel, final_registrations, final_revenue_usd "
        "FROM monthly_archives WHERE month_key='202603' ORDER BY channel"
    )
    print("\n202603 月度归档抽检:")
    for row in cursor.fetchall():
        print(f"  {row[0]} {row[1]}: reg={row[2]}, rev=${row[3]:,.0f}")

    conn.close()


if __name__ == "__main__":
    main()
