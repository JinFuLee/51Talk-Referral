"""ComparisonEngine — 8 维环比计算引擎

数据源：daily_snapshots（总计维度） + daily_channel_snapshots（口径维度）
8 个维度：
  日      — T-1 vs T-2
  周_td   — 本周一→T-1 vs 上周一→上周同天（累计对比）
  周_roll — 近 7 日 sum vs 上 7 日 sum（滚动窗口）
  月_td   — 本月 1 日→T-1 vs 上月 1 日→上月同日（累计对比）
  月_roll — 近 30 日 sum vs 上 30 日 sum（滚动窗口）
  年_td   — 本年 1/1→T-1 vs 去年 1/1→去年同日（累计对比）
  年_roll — 近 365 日 sum vs 上 365 日 sum（滚动窗口）
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import date, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# 数值类指标（求和聚合）
_SUM_METRICS = {
    "registrations",
    "appointments",
    "attendance",
    "payments",
    "revenue_usd",
}

# 效率类指标（加权平均聚合，分母需要从明细重新计算）
# 注：直接对率类指标求均值误差大，此处从量值推导
_RATE_METRICS = {
    "asp",
    "appt_rate",
    "attend_rate",
    "paid_rate",
    "reg_to_pay_rate",
}

# 所有支持的 channel 值
VALID_CHANNELS = {"total", "CC窄口", "SS窄口", "LP窄口", "宽口", "其它"}


def _safe_pct(current: float | None, previous: float | None) -> float | None:
    """安全计算百分比变化，previous=0 或 None 时返回 None"""
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / abs(previous)


def _judgment(delta: float | None) -> str:
    """根据 delta 生成方向符号"""
    if delta is None:
        return "→"
    if delta > 0:
        return "↑"
    if delta < 0:
        return "↓"
    return "→"


def _build_result(current: float | None, previous: float | None) -> dict[str, Any]:
    """构建单维度环比结果字典"""
    delta = (
        (current - previous) if (current is not None and previous is not None) else None
    )
    delta_pct = _safe_pct(current, previous)
    return {
        "current": current,
        "previous": previous,
        "delta": delta,
        "delta_pct": delta_pct,
        "judgment": _judgment(delta),
    }


class ComparisonEngine:
    """8 维环比计算引擎

    用法：
        engine = ComparisonEngine(db_path)
        results = engine.compute(metric="registrations", channel="total")
    """

    def __init__(self, db_path: Path | str) -> None:
        self._db_path = Path(db_path)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _query_single(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        target_date: date,
    ) -> float | None:
        """查询某天某口径某指标的值"""
        if channel == "total":
            sql = f"""
                SELECT {metric} FROM daily_snapshots
                WHERE snapshot_date = ?
                LIMIT 1
            """
            row = conn.execute(sql, (target_date.isoformat(),)).fetchone()
        else:
            sql = f"""
                SELECT {metric} FROM daily_channel_snapshots
                WHERE snapshot_date = ? AND channel = ?
                LIMIT 1
            """
            row = conn.execute(sql, (target_date.isoformat(), channel)).fetchone()

        if row is None:
            return None
        val = row[0]
        return float(val) if val is not None else None

    def _query_sum(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        start_date: date,
        end_date: date,
    ) -> float | None:
        """查询日期范围内某指标的累计求和值"""
        if channel == "total":
            sql = f"""
                SELECT SUM({metric}) FROM daily_snapshots
                WHERE snapshot_date BETWEEN ? AND ?
            """
            row = conn.execute(
                sql, (start_date.isoformat(), end_date.isoformat())
            ).fetchone()
        else:
            sql = f"""
                SELECT SUM({metric}) FROM daily_channel_snapshots
                WHERE snapshot_date BETWEEN ? AND ? AND channel = ?
            """
            row = conn.execute(
                sql,
                (start_date.isoformat(), end_date.isoformat(), channel),
            ).fetchone()

        if row is None or row[0] is None:
            return None
        return float(row[0])

    def _query_weighted_rate(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        start_date: date,
        end_date: date,
    ) -> float | None:
        """
        对率类指标做加权平均：
          appt_rate       = SUM(appointments)  / SUM(registrations)
          attend_rate     = SUM(attendance)    / SUM(appointments)
          paid_rate       = SUM(payments)      / SUM(attendance)
          reg_to_pay_rate = SUM(payments)      / SUM(registrations)
          asp             = SUM(revenue_usd)   / SUM(payments)
        """
        rate_formula: dict[str, tuple[str, str]] = {
            "appt_rate": ("appointments", "registrations"),
            "attend_rate": ("attendance", "appointments"),
            "paid_rate": ("payments", "attendance"),
            "reg_to_pay_rate": ("payments", "registrations"),
            "asp": ("revenue_usd", "payments"),
        }
        if metric not in rate_formula:
            return None

        num_col, den_col = rate_formula[metric]
        num_val = self._query_sum(conn, num_col, channel, start_date, end_date)
        den_val = self._query_sum(conn, den_col, channel, start_date, end_date)

        if num_val is None or den_val is None or den_val == 0:
            return None
        return num_val / den_val

    def _query_period(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        start_date: date,
        end_date: date,
    ) -> float | None:
        """按 metric 类型选择合适的聚合方式"""
        if metric in _SUM_METRICS:
            return self._query_sum(conn, metric, channel, start_date, end_date)
        if metric in _RATE_METRICS:
            return self._query_weighted_rate(
                conn, metric, channel, start_date, end_date
            )
        logger.warning("未知 metric: %s，跳过查询", metric)
        return None

    # ──────────────────────────────────────────────
    # 7 个维度的计算方法
    # ──────────────────────────────────────────────

    def _dim_day(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        t1: date,
    ) -> dict[str, Any]:
        """日维度：T-1 vs T-2"""
        t2 = t1 - timedelta(days=1)
        current = self._query_single(conn, metric, channel, t1)
        previous = self._query_single(conn, metric, channel, t2)
        return _build_result(current, previous)

    def _dim_week_td(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        t1: date,
    ) -> dict[str, Any]:
        """周累计：本周一→T-1 vs 上周一→上周同天（对应周内天数相同）"""
        # 本周一（Monday=0）
        days_since_mon = t1.weekday()  # 0=周一 … 6=周日
        this_week_start = t1 - timedelta(days=days_since_mon)
        # 上周一 → 上周同天
        last_week_start = this_week_start - timedelta(weeks=1)
        last_week_end = last_week_start + timedelta(days=days_since_mon)

        current = self._query_period(conn, metric, channel, this_week_start, t1)
        previous = self._query_period(
            conn, metric, channel, last_week_start, last_week_end
        )
        return _build_result(current, previous)

    def _dim_week_roll(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        t1: date,
    ) -> dict[str, Any]:
        """周滚动：近 7 日 vs 上 7 日"""
        cur_start = t1 - timedelta(days=6)  # [t1-6, t1] = 7 天
        pre_end = t1 - timedelta(days=7)
        pre_start = t1 - timedelta(days=13)  # [t1-13, t1-7] = 7 天

        current = self._query_period(conn, metric, channel, cur_start, t1)
        previous = self._query_period(conn, metric, channel, pre_start, pre_end)
        return _build_result(current, previous)

    def _dim_month_td(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        t1: date,
    ) -> dict[str, Any]:
        """月累计：本月 1 日→T-1 vs 上月 1 日→上月同日"""
        this_month_start = t1.replace(day=1)
        # 上月 1 日
        if t1.month == 1:
            last_month_start = date(t1.year - 1, 12, 1)
        else:
            last_month_start = date(t1.year, t1.month - 1, 1)
        # 上月同日（注意月末边界）
        import calendar

        last_month_days = calendar.monthrange(
            last_month_start.year, last_month_start.month
        )[1]
        last_month_same_day = min(t1.day, last_month_days)
        last_month_end = date(
            last_month_start.year, last_month_start.month, last_month_same_day
        )

        current = self._query_period(conn, metric, channel, this_month_start, t1)
        previous = self._query_period(
            conn, metric, channel, last_month_start, last_month_end
        )
        return _build_result(current, previous)

    def _dim_month_roll(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        t1: date,
    ) -> dict[str, Any]:
        """月滚动：近 30 日 vs 上 30 日"""
        cur_start = t1 - timedelta(days=29)  # [t1-29, t1] = 30 天
        pre_end = t1 - timedelta(days=30)
        pre_start = t1 - timedelta(days=59)  # [t1-59, t1-30] = 30 天

        current = self._query_period(conn, metric, channel, cur_start, t1)
        previous = self._query_period(conn, metric, channel, pre_start, pre_end)
        return _build_result(current, previous)

    def _dim_year_td(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        t1: date,
    ) -> dict[str, Any]:
        """年累计：本年 1/1→T-1 vs 去年 1/1→去年同日"""
        this_year_start = date(t1.year, 1, 1)
        last_year_start = date(t1.year - 1, 1, 1)
        # 去年同日（处理闰年 2/29）

        if t1.month == 2 and t1.day == 29:
            last_year_end = date(t1.year - 1, 2, 28)
        else:
            last_year_end = date(t1.year - 1, t1.month, t1.day)

        current = self._query_period(conn, metric, channel, this_year_start, t1)
        previous = self._query_period(
            conn, metric, channel, last_year_start, last_year_end
        )
        return _build_result(current, previous)

    def _dim_year_roll(
        self,
        conn: sqlite3.Connection,
        metric: str,
        channel: str,
        t1: date,
    ) -> dict[str, Any]:
        """年滚动：近 365 日 vs 上 365 日"""
        cur_start = t1 - timedelta(days=364)  # [t1-364, t1] = 365 天
        pre_end = t1 - timedelta(days=365)
        pre_start = t1 - timedelta(days=729)  # [t1-729, t1-365] = 365 天

        current = self._query_period(conn, metric, channel, cur_start, t1)
        previous = self._query_period(conn, metric, channel, pre_start, pre_end)
        return _build_result(current, previous)

    # ──────────────────────────────────────────────
    # 公开 API
    # ──────────────────────────────────────────────

    def compute(
        self,
        metric: str,
        channel: str = "total",
        reference_date: date | None = None,
    ) -> dict[str, dict[str, Any]]:
        """
        计算 7 个维度的环比结果。

        Args:
            metric:         指标列名，如 "registrations" / "revenue_usd" / "appt_rate"
            channel:        口径，"total" 使用 daily_snapshots，
                            其它值使用 daily_channel_snapshots
            reference_date: T-1 参考日期，默认使用 daily_snapshots 最新的 snapshot_date

        Returns:
            {
              "day":        {current, previous, delta, delta_pct, judgment},
              "week_td":    {...},
              "week_roll":  {...},
              "month_td":   {...},
              "month_roll": {...},
              "year_td":    {...},
              "year_roll":  {...},
            }
        """
        if channel not in VALID_CHANNELS:
            raise ValueError(f"channel 必须是 {VALID_CHANNELS} 之一，收到: {channel!r}")

        if metric not in _SUM_METRICS and metric not in _RATE_METRICS:
            raise ValueError(
                f"metric 必须是 {_SUM_METRICS | _RATE_METRICS} 之一，收到: {metric!r}"
            )

        if not self._db_path.exists():
            logger.warning("SQLite 数据库不存在: %s，返回空结果", self._db_path)
            empty = _build_result(None, None)
            return {
                k: empty
                for k in (
                    "day",
                    "week_td",
                    "week_roll",
                    "month_td",
                    "month_roll",
                    "year_td",
                    "year_roll",
                )
            }

        with self._connect() as conn:
            # 确定 T-1 日期
            if reference_date is None:
                row = conn.execute(
                    "SELECT MAX(snapshot_date) FROM daily_snapshots"
                ).fetchone()
                if row is None or row[0] is None:
                    logger.warning("daily_snapshots 为空，无法计算环比")
                    empty = _build_result(None, None)
                    return {
                        k: empty
                        for k in (
                            "day",
                            "week_td",
                            "week_roll",
                            "month_td",
                            "month_roll",
                            "year_td",
                            "year_roll",
                        )
                    }
                t1 = date.fromisoformat(row[0])
            else:
                t1 = reference_date

            return {
                "day": self._dim_day(conn, metric, channel, t1),
                "week_td": self._dim_week_td(conn, metric, channel, t1),
                "week_roll": self._dim_week_roll(conn, metric, channel, t1),
                "month_td": self._dim_month_td(conn, metric, channel, t1),
                "month_roll": self._dim_month_roll(conn, metric, channel, t1),
                "year_td": self._dim_year_td(conn, metric, channel, t1),
                "year_roll": self._dim_year_roll(conn, metric, channel, t1),
            }

    def compute_all_metrics(
        self,
        channel: str = "total",
        reference_date: date | None = None,
    ) -> dict[str, dict[str, dict[str, Any]]]:
        """
        计算所有支持指标的 7 维环比。

        Returns:
            {
              "registrations": {"day": {...}, "week_td": {...}, ...},
              "revenue_usd":   {...},
              ...
            }
        """
        all_metrics = list(_SUM_METRICS | _RATE_METRICS)
        return {
            metric: self.compute(metric, channel, reference_date)
            for metric in all_metrics
        }
