"""
backend/api/adapters/trend_adapt.py
趋势类 adapt 函数。

对应引擎输出 key：trend（含 daily / mom / yoy / wow 四层子结构）
"""

from __future__ import annotations

from typing import Any

from backend.models.adapter_types import TrendResult


def _adapt_trend(raw: dict[str, Any], compare_type: str) -> TrendResult:
    """
    将引擎 trend 转换为前端 TrendData 格式：
    { series: TrendPoint[], compare_type, direction?, compare_data?, mom?, yoy?, wow? }

    raw 结构：{ daily, direction, mom: {months, data, direction}, yoy: {...}, wow: {available, weeks, ...} }

    按 compare_type 从正确的数据源构建 series：
      - daily（默认）：来自 raw.daily（日趋势）
      - mom：来自 raw.mom.data（月度环比，key=月份字符串，value=该月指标 dict）
      - wow：来自 raw.wow.weeks（周环比，每行含 avg_value/week_start）
      - yoy：无时间序列，保留 daily_series 作为图表数据
    """
    mom_raw = raw.get("mom") or {}
    yoy_raw = raw.get("yoy") or {}
    wow_raw = raw.get("wow") or {}

    # 日趋势 series（所有 compare_type 共享底线）
    daily_series: list[dict[str, Any]] = [
        {
            "date": p.get("date", ""),
            "revenue": p.get("revenue_cny") or p.get("revenue") or 0,
            "payments": p.get("order_count") or p.get("payments") or 0,
            "registrations": p.get("registrations") or 0,
        }
        for p in (raw.get("daily") or [])
    ]

    # 按 compare_type 选 series
    compare_data: Any = None
    if compare_type == "mom":
        mom_data = mom_raw.get("data") or {}
        months_sorted = sorted(mom_data.keys())

        def _mom_row(v: Any) -> dict[str, Any]:
            """兼容 mom_data[month] 为 dict 或 list（多渠道记录）两种结构"""
            if isinstance(v, list):
                # 找总计行，或转介绍行
                row = next(
                    (
                        r
                        for r in v
                        if isinstance(r, dict)
                        and (
                            "总计" in str(r.get("name", ""))
                            or "总计" in str(r.get("channel_type", ""))
                            or "转介绍" in str(r.get("channel_type", ""))
                        )
                    ),
                    None,
                )
                if row is None:
                    row = v[0] if v else {}
                return row if isinstance(row, dict) else {}
            return v if isinstance(v, dict) else {}

        series: list[dict[str, Any]] = []
        for month in months_sorted:
            row = _mom_row(mom_data[month])
            series.append(
                {
                    "date": month,
                    "revenue": row.get("revenue_usd")
                    or row.get("amount_usd")
                    or row.get("revenue")
                    or row.get("revenue_cny")
                    or 0,
                    "payments": row.get("payments") or row.get("paid") or 0,
                    "registrations": row.get("registrations")
                    or row.get("register")
                    or 0,
                }
            )
        if not series:
            series = daily_series
        compare_data = mom_raw
    elif compare_type == "wow":
        weeks = wow_raw.get("weeks") or []
        series = [
            {
                "date": w.get("week_start") or w.get("date") or "",
                "revenue": w.get("revenue") or w.get("avg_value") or 0,
                "payments": w.get("payments") or 0,
                "registrations": w.get("registrations") or w.get("avg_value") or 0,
            }
            for w in weeks
        ]
        if not series:
            series = daily_series
        compare_data = wow_raw
    elif compare_type == "yoy":
        series = daily_series
        compare_data = yoy_raw or raw.get("yoy_by_channel")
    else:
        series = daily_series
        compare_data = None

    return {
        "series": series,
        "daily_series": daily_series,
        "compare_type": compare_type,
        "direction": raw.get("direction"),
        "compare_data": compare_data,
        "peak": raw.get("peak"),
        "valley": raw.get("valley"),
        # 保留全部子结构供前端按需读取
        "mom": mom_raw,
        "yoy": yoy_raw,
        "wow": wow_raw,
        # 向后兼容旧字段名
        "yoy_by_channel": raw.get("yoy_by_channel"),
    }
