"""时间维度枚举与日期范围解析器 + 工作日计算"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum


class TimePeriod(str, Enum):
    THIS_WEEK = "this_week"  # 本周T-1
    THIS_MONTH = "this_month"  # 本月T-1（默认）
    LAST_7_DAYS = "last_7_days"  # 近7日
    LAST_30_DAYS = "last_30_days"  # 近30日
    LAST_MONTH = "last_month"  # 上个月
    THIS_QUARTER = "this_quarter"  # 本季度
    LAST_QUARTER = "last_quarter"  # 上季度
    THIS_YEAR = "this_year"  # 本年
    LAST_YEAR = "last_year"  # 上年
    CUSTOM = "custom"  # 自定义


@dataclass
class PeriodRange:
    start_date: date
    end_date: date
    period: TimePeriod
    label_zh: str


def resolve_period(
    period: TimePeriod,
    reference_date: date | None = None,
    custom_start: str | None = None,
    custom_end: str | None = None,
) -> PeriodRange:
    """将 TimePeriod 枚举解析为具体日期范围，T-1 基准"""
    ref = reference_date or date.today()
    t1 = ref - timedelta(days=1)  # T-1

    if period == TimePeriod.THIS_MONTH:
        return PeriodRange(t1.replace(day=1), t1, period, "本月T-1")

    if period == TimePeriod.THIS_WEEK:
        start = t1 - timedelta(days=t1.weekday())  # Monday
        return PeriodRange(start, t1, period, "本周T-1")

    if period == TimePeriod.LAST_7_DAYS:
        return PeriodRange(t1 - timedelta(days=6), t1, period, "近7日")

    if period == TimePeriod.LAST_30_DAYS:
        return PeriodRange(t1 - timedelta(days=29), t1, period, "近30日")

    if period == TimePeriod.LAST_MONTH:
        first_this = t1.replace(day=1)
        last_prev = first_this - timedelta(days=1)
        return PeriodRange(last_prev.replace(day=1), last_prev, period, "上个月")

    if period == TimePeriod.THIS_QUARTER:
        q_m = ((t1.month - 1) // 3) * 3 + 1
        return PeriodRange(t1.replace(month=q_m, day=1), t1, period, "本季度")

    if period == TimePeriod.LAST_QUARTER:
        q_m = ((t1.month - 1) // 3) * 3 + 1
        prev_q_end = t1.replace(month=q_m, day=1) - timedelta(days=1)
        prev_q_m = ((prev_q_end.month - 1) // 3) * 3 + 1
        return PeriodRange(
            prev_q_end.replace(month=prev_q_m, day=1), prev_q_end, period, "上季度"
        )

    if period == TimePeriod.THIS_YEAR:
        return PeriodRange(t1.replace(month=1, day=1), t1, period, "本年")

    if period == TimePeriod.LAST_YEAR:
        return PeriodRange(
            date(t1.year - 1, 1, 1), date(t1.year - 1, 12, 31), period, "上年"
        )

    if period == TimePeriod.CUSTOM:
        s = date.fromisoformat(custom_start) if custom_start else t1.replace(day=1)
        e = date.fromisoformat(custom_end) if custom_end else t1
        return PeriodRange(s, e, period, f"自定义 {s}~{e}")

    # fallback
    return PeriodRange(t1.replace(day=1), t1, TimePeriod.THIS_MONTH, "本月T-1")


# ---------------------------------------------------------------------------
# 工作日权重计算（按 CLAUDE.md 规则：周三权重 0，周六日权重 1.4）
# ---------------------------------------------------------------------------

# 默认工作日权重（0=周一 … 6=周日，2=周三休息=0.0）
_DEFAULT_DAY_WEIGHTS: dict[int, float] = {
    0: 1.0,  # 周一
    1: 1.0,  # 周二
    2: 0.0,  # 周三（休息）
    3: 1.0,  # 周四
    4: 1.0,  # 周五
    5: 1.4,  # 周六
    6: 1.4,  # 周日
}


@dataclass
class MonthProgress:
    """本月时间进度信息"""

    today: date
    month_start: date
    month_end: date
    elapsed_workdays: float       # 已过加权工作日（到 T-1）
    remaining_workdays: float     # 剩余加权工作日（今天到月末）
    total_workdays: float         # 本月全部加权工作日
    time_progress: float          # elapsed / total，0~1
    elapsed_calendar_days: int    # 已过自然日（含今天）
    total_calendar_days: int      # 本月自然日


def _weighted_workdays(
    start: date,
    end: date,
    day_weights: dict[int, float] | None = None,
) -> float:
    """累加 [start, end] 区间内每天的权重（闭区间）"""
    weights = day_weights or _DEFAULT_DAY_WEIGHTS
    total = 0.0
    cur = start
    while cur <= end:
        total += weights.get(cur.weekday(), 1.0)
        cur += timedelta(days=1)
    return total


def compute_month_progress(
    reference_date: date | None = None,
    day_weights: dict[int, float] | None = None,
) -> MonthProgress:
    """
    计算当前月份的时间进度。

    Args:
        reference_date: 基准日期，默认 date.today()（即系统"今天"）。
            数据为 T-1，所以 elapsed 计算到 T-1（reference_date - 1）。
        day_weights: 自定义每日权重，默认使用 _DEFAULT_DAY_WEIGHTS。

    Returns:
        MonthProgress dataclass
    """
    today = reference_date or date.today()
    t1 = today - timedelta(days=1)  # T-1 数据截止日

    month_start = today.replace(day=1)
    # 当月最后一天
    if today.month == 12:
        month_end = date(today.year, 12, 31)
    else:
        month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    # 已过工作日：month_start 到 T-1（含）
    if t1 >= month_start:
        elapsed = _weighted_workdays(month_start, t1, day_weights)
    else:
        elapsed = 0.0

    # 剩余工作日：today 到 month_end（含），今天数据还没出来
    remaining = _weighted_workdays(today, month_end, day_weights)

    total = _weighted_workdays(month_start, month_end, day_weights)
    time_progress = (elapsed / total) if total > 0 else 0.0

    elapsed_calendar_days = (today - month_start).days  # 不含今天 = T-1 天数
    total_calendar_days = (month_end - month_start).days + 1

    return MonthProgress(
        today=today,
        month_start=month_start,
        month_end=month_end,
        elapsed_workdays=round(elapsed, 2),
        remaining_workdays=round(remaining, 2),
        total_workdays=round(total, 2),
        time_progress=round(time_progress, 4),
        elapsed_calendar_days=elapsed_calendar_days,
        total_calendar_days=total_calendar_days,
    )
