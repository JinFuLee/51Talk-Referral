from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends

from .dependencies import get_service
from services.analysis_service import AnalysisService

router = APIRouter()


@router.get("/productivity-history")
def get_productivity_history(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    E1/E2 CC+SS 出勤历史 → 产能利用率趋势

    order_loader 返回结构:
      cc_attendance: list[{date, active_5min, active_30min}]
      ss_attendance: list[{date, active_5min, active_30min}]

    active_5min = 当日活跃>=5分钟的人数（即出勤人数）
    active_30min = 当日活跃>=30分钟的人数（深度出勤）
    """
    raw_data = getattr(svc, "_raw_data", None) or {}
    order = raw_data.get("order", {}) if isinstance(raw_data, dict) else {}

    # order_loader 返回 list[{date, active_5min, active_30min}]
    cc_records: list = order.get("cc_attendance", []) if isinstance(order, dict) else []
    ss_records: list = order.get("ss_attendance", []) if isinstance(order, dict) else []

    # 兼容旧格式（dict with by_date key）和新格式（plain list）
    def _normalise_records(raw: Any) -> list[dict]:
        if isinstance(raw, list):
            return raw
        if isinstance(raw, dict):
            by_date = raw.get("by_date", [])
            if isinstance(by_date, list):
                return by_date
        return []

    cc_list = _normalise_records(cc_records)
    ss_list = _normalise_records(ss_records)

    # 合并为统一日期时间序列
    # order_loader 字段: date, active_5min (出勤人数), active_30min (深度出勤人数)
    date_map: dict[str, dict] = {}

    for item in cc_list:
        if not isinstance(item, dict):
            continue
        d = item.get("date", "")
        if not d:
            continue
        if d not in date_map:
            date_map[d] = {"date": d}
        present = item.get("active_5min") or item.get("present") or item.get("present_count") or 0
        deep = item.get("active_30min") or 0
        date_map[d]["cc_present"] = present
        date_map[d]["cc_deep_present"] = deep

    for item in ss_list:
        if not isinstance(item, dict):
            continue
        d = item.get("date", "")
        if not d:
            continue
        if d not in date_map:
            date_map[d] = {"date": d}
        present = item.get("active_5min") or item.get("present") or item.get("present_count") or 0
        deep = item.get("active_30min") or 0
        date_map[d]["ss_present"] = present
        date_map[d]["ss_deep_present"] = deep

    series = sorted(date_map.values(), key=lambda x: x.get("date", ""))

    # 汇总统计
    cc_present_total = sum(
        r.get("active_5min") or r.get("present") or r.get("present_count") or 0
        for r in cc_list if isinstance(r, dict)
    )
    ss_present_total = sum(
        r.get("active_5min") or r.get("present") or r.get("present_count") or 0
        for r in ss_list if isinstance(r, dict)
    )
    cc_days = len(cc_list)
    ss_days = len(ss_list)

    return {
        "series": series,
        "summary": {
            "cc_present_total": cc_present_total,
            "cc_avg_daily": round(cc_present_total / cc_days, 1) if cc_days else 0,
            "cc_days": cc_days,
            "ss_present_total": ss_present_total,
            "ss_avg_daily": round(ss_present_total / ss_days, 1) if ss_days else 0,
            "ss_days": ss_days,
        },
    }
