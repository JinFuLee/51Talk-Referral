from __future__ import annotations
from typing import Any
from fastapi import APIRouter, HTTPException

router = APIRouter()
_service: Any = None

def set_service(service: Any) -> None:
    global _service
    _service = service

@router.get("/productivity-history")
def get_productivity_history():
    """E1/E2 CC+SS 出勤历史 → 产能利用率趋势"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    raw_data = getattr(_service, "_raw_data", None) or {}
    order = raw_data.get("order", {}) if isinstance(raw_data, dict) else {}

    cc_att = order.get("cc_attendance", {})
    ss_att = order.get("ss_attendance", {})

    # cc_attendance/ss_attendance 可能结构:
    # { total_headcount, present_count, attendance_rate, by_date: [...], by_person: [...] }
    # 提取 by_date 构建历史趋势

    cc_by_date = cc_att.get("by_date", []) if isinstance(cc_att, dict) else []
    ss_by_date = ss_att.get("by_date", []) if isinstance(ss_att, dict) else []

    # 合并为统一格式
    date_map: dict[str, dict] = {}
    for item in (cc_by_date if isinstance(cc_by_date, list) else []):
        if not isinstance(item, dict):
            continue
        d = item.get("date", "")
        if d not in date_map:
            date_map[d] = {"date": d}
        date_map[d]["cc_headcount"] = item.get("headcount") or item.get("total") or 0
        date_map[d]["cc_present"] = item.get("present") or item.get("present_count") or 0
        hc = date_map[d]["cc_headcount"] or 1
        date_map[d]["cc_rate"] = round(date_map[d]["cc_present"] / hc, 4)

    for item in (ss_by_date if isinstance(ss_by_date, list) else []):
        if not isinstance(item, dict):
            continue
        d = item.get("date", "")
        if d not in date_map:
            date_map[d] = {"date": d}
        date_map[d]["ss_headcount"] = item.get("headcount") or item.get("total") or 0
        date_map[d]["ss_present"] = item.get("present") or item.get("present_count") or 0
        hc = date_map[d]["ss_headcount"] or 1
        date_map[d]["ss_rate"] = round(date_map[d]["ss_present"] / hc, 4)

    series = sorted(date_map.values(), key=lambda x: x.get("date", ""))

    # 汇总
    cc_total = cc_att.get("total_headcount") or cc_att.get("headcount") or 0
    ss_total = ss_att.get("total_headcount") or ss_att.get("headcount") or 0
    cc_present = cc_att.get("present_count") or cc_att.get("present") or 0
    ss_present = ss_att.get("present_count") or ss_att.get("present") or 0

    return {
        "series": series,
        "summary": {
            "cc_headcount": cc_total,
            "cc_present": cc_present,
            "cc_rate": round(cc_present / cc_total, 4) if cc_total else 0,
            "ss_headcount": ss_total,
            "ss_present": ss_present,
            "ss_rate": round(ss_present / ss_total, 4) if ss_total else 0,
        },
    }
