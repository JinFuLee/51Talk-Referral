"""对比期间解析模块 — 环比(PoP)、同比(YoY)"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

from core.time_period import TimePeriod, resolve_period


@dataclass
class CompareTarget:
    """对比期间解析结果"""
    period: str               # 统一为 'custom'（计算出的范围）或预设字符串
    custom_start: Optional[str]  # ISO date 字符串，period='custom' 时使用
    custom_end: Optional[str]    # ISO date 字符串，period='custom' 时使用
    label: str                # 中文标签，如 "环比上月"


def _safe_replace_year(d: date, year: int) -> date:
    """
    将日期 d 的年份替换为 year，安全处理 2/29 闰年边界。
    若目标年份无法表示该日（如 2024-02-29 → 2023），退到 2/28。
    """
    try:
        return d.replace(year=year)
    except ValueError:
        # 2/29 → 2/28
        return d.replace(year=year, day=28)


def _resolve_base_range(
    base_period: str,
    custom_start: Optional[str],
    custom_end: Optional[str],
) -> tuple[date, date]:
    """
    解析 base_period 对应的 start/end 日期对。
    对于 'custom' period，直接用 custom_start/custom_end 参数。
    """
    try:
        tp_enum = TimePeriod(base_period)
    except ValueError:
        tp_enum = TimePeriod.THIS_MONTH

    pr = resolve_period(
        tp_enum,
        custom_start=custom_start,
        custom_end=custom_end,
    )
    return pr.start_date, pr.end_date


def resolve_pop_period(
    base_period: str,
    custom_start: Optional[str] = None,
    custom_end: Optional[str] = None,
) -> CompareTarget:
    """
    解析环比对比期间（Period-over-Period）。

    策略：
      - 取 base 期间的 [start, end]
      - pop_end   = base_start - 1 天
      - pop_start = pop_end - (duration - 1)
      - duration  = base_end - base_start + 1（天数）

    例：本月 2/1 ~ 2/22（22 天）→ 环比期 1/10 ~ 1/31（前推 22 天）

    label 按 base_period 映射中文标签。
    """
    base_start, base_end = _resolve_base_range(base_period, custom_start, custom_end)
    duration = (base_end - base_start).days + 1  # base 期间天数

    pop_end = base_start - timedelta(days=1)
    pop_start = pop_end - timedelta(days=duration - 1)

    # 中文标签映射
    label_map: dict[str, str] = {
        "this_week":    "环比上周",
        "this_month":   "环比上月",
        "last_7_days":  "环比前7日",
        "last_30_days": "环比前30日",
        "last_month":   "环比上上月",
        "this_quarter": "环比上季度",
        "last_quarter": "环比上上季度",
        "this_year":    "环比去年",
        "last_year":    "环比前年",
        "custom":       "环比前期",
    }
    label = label_map.get(base_period, "环比前期")

    return CompareTarget(
        period="custom",
        custom_start=pop_start.isoformat(),
        custom_end=pop_end.isoformat(),
        label=label,
    )


def resolve_yoy_period(
    base_period: str,
    custom_start: Optional[str] = None,
    custom_end: Optional[str] = None,
) -> CompareTarget:
    """
    解析同比对比期间（Year-over-Year）。

    策略：
      - 取 base 期间的 [start, end]
      - yoy_start = base_start 回退一年（安全处理 2/29 闰年边界）
      - yoy_end   = base_end   回退一年

    例：2026-02-01 ~ 2026-02-22 → 2025-02-01 ~ 2025-02-22

    label 按 base_period 映射中文标签。
    """
    base_start, base_end = _resolve_base_range(base_period, custom_start, custom_end)

    yoy_start = _safe_replace_year(base_start, base_start.year - 1)
    yoy_end = _safe_replace_year(base_end, base_end.year - 1)

    # 中文标签映射
    label_map: dict[str, str] = {
        "this_month":   "同比去年同月",
        "this_week":    "同比去年同周",
        "last_month":   "同比去年同月",
        "this_quarter": "同比去年同季",
        "this_year":    "同比去年",
        "last_year":    "同比前年",
        "custom":       "同比去年同期",
    }
    label = label_map.get(base_period, "同比去年同期")

    return CompareTarget(
        period="custom",
        custom_start=yoy_start.isoformat(),
        custom_end=yoy_end.isoformat(),
        label=label,
    )
