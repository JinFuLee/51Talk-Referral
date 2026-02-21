from __future__ import annotations
from typing import Any
from fastapi import APIRouter, HTTPException

router = APIRouter()
_service: Any = None

def set_service(service: Any) -> None:
    global _service
    _service = service

@router.get("/enclosure-health")
def get_enclosure_health():
    """围场健康度仪表盘 — 交叉 F7+F8+D3"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    raw_data = getattr(_service, "_raw_data", None) or {}
    ops = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    kpi = raw_data.get("kpi", {}) if isinstance(raw_data, dict) else {}

    f7 = ops.get("paid_user_followup", {})  # F7 付费用户跟进
    f8 = ops.get("enclosure_monthly_followup", {})  # F8 围场月度跟进
    d3 = kpi.get("enclosure_referral", {})  # D3 转介绍围场

    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]

    # D3: 围场 KPI
    d3_map: dict[str, dict] = {}
    for row in (d3.get("by_enclosure", []) if isinstance(d3, dict) else []):
        if isinstance(row, dict):
            d3_map[row.get("enclosure", "")] = row

    # F8: 围场月度跟进
    f8_map: dict[str, dict] = {}
    for row in (f8.get("by_enclosure", []) if isinstance(f8, dict) else []):
        if isinstance(row, dict):
            f8_map[row.get("enclosure", "")] = row

    # F7: 付费用户跟进率（总体）
    f7_rate = f7.get("followup_rate") or f7.get("rate") or 0 if isinstance(f7, dict) else 0

    segments = []
    for enc in enc_order:
        d3_row = d3_map.get(enc, {})
        f8_row = f8_map.get(enc, {})

        conv = d3_row.get("conversion_rate") or 0
        part = d3_row.get("participation_rate") or 0
        students = d3_row.get("active_students") or 0
        fu_rate = f8_row.get("followup_rate") or f8_row.get("rate") or 0

        # 健康度 = 加权平均: conv(40%) + part(30%) + fu_rate(30%)
        # 归一化到 0~100
        health_score = round((conv * 0.4 + part * 0.3 + fu_rate * 0.3) * 100, 1)

        status = "green" if health_score >= 15 else ("yellow" if health_score >= 8 else "red")

        segments.append({
            "enclosure": enc,
            "health_score": health_score,
            "status": status,
            "active_students": students,
            "conversion_rate": conv,
            "participation_rate": part,
            "followup_rate": fu_rate,
            "monthly_paid": d3_row.get("monthly_b_paid") or 0,
        })

    return {
        "segments": segments,
        "overall_followup_rate": f7_rate,
    }
