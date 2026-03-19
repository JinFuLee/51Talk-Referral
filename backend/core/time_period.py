"""时间维度枚举与日期范围解析器"""

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
