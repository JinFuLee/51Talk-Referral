from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends

from .dependencies import get_service
from services.analysis_service import AnalysisService

router = APIRouter()


@router.get("/enclosure-health")
def get_enclosure_health(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """围场健康度仪表盘 — 交叉 F7+F8+D3"""
    raw_data = getattr(svc, "_raw_data", None) or {}
    ops = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    kpi = raw_data.get("kpi", {}) if isinstance(raw_data, dict) else {}

    f7 = ops.get("paid_user_followup", {})  # F7 付费用户跟进
    f8 = ops.get("enclosure_monthly_followup", {})  # F8 围场月度跟进
    d3 = kpi.get("enclosure_referral", {})  # D3 转介绍围场

    leads = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}
    a2 = leads.get("channel_efficiency", {}) # A2 围场效率矩阵

    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]

    # D3: 围场 KPI (by_enclosure: list of {enclosure, conversion_rate, participation_rate, active_students, ...})
    d3_map: dict[str, dict] = {}
    for row in (d3.get("by_enclosure", []) if isinstance(d3, dict) else []):
        if isinstance(row, dict):
            d3_map[row.get("enclosure", "")] = row

    # F8: 围场月度跟进 (by_enclosure: list of {enclosure, by_team, summary})
    # summary 字段包含 effective_coverage（有效拨打覆盖率）作为跟进率代理
    f8_map: dict[str, dict] = {}
    for row in (f8.get("by_enclosure", []) if isinstance(f8, dict) else []):
        if isinstance(row, dict):
            f8_map[row.get("enclosure", "")] = row

    # F7: 付费用户跟进率（总体）— F7 summary.call_coverage 作为全局跟进率
    f7_rate: float = 0.0
    if isinstance(f7, dict):
        f7_summary = f7.get("summary", {})
        if isinstance(f7_summary, dict):
            f7_rate = float(f7_summary.get("call_coverage") or
                            f7_summary.get("followup_rate") or
                            f7_summary.get("rate") or 0)
        else:
            f7_rate = float(f7.get("followup_rate") or f7.get("rate") or 0)

    # A2: 围场效率矩阵（by_enclosure: list of {围场, 总计, CC窄口径, LP窄口径, SS窄口径, 宽口径}）
    a2_map: dict[str, dict] = {}
    for row in (a2.get("by_enclosure", []) if isinstance(a2, dict) else []):
        if isinstance(row, dict):
            # 将键名规范化，如果 enclosure 不对齐的话
            enc_name = row.get("围场", "")
            if enc_name:
                a2_map[enc_name] = row

    segments = []
    for enc in enc_order:
        d3_row = d3_map.get(enc, {})
        f8_row = f8_map.get(enc, {})

        conv = d3_row.get("conversion_rate") or 0
        part = d3_row.get("participation_rate") or 0
        students = d3_row.get("active_students") or 0

        # F8 by_enclosure items have a "summary" dict with coverage fields
        f8_summary = f8_row.get("summary", {}) if isinstance(f8_row, dict) else {}
        fu_rate = float(
            (f8_summary.get("effective_coverage") or f8_summary.get("call_coverage")) if isinstance(f8_summary, dict) else 0
        ) if f8_summary else float(
            f8_row.get("followup_rate") or f8_row.get("effective_coverage") or
            f8_row.get("call_coverage") or 0
        )

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
            # 将 A2 中 CC窄口径 / SS，LP的细分维度挂载上去
            "channel_efficiency": a2_map.get(enc, {}),
            # 同样也把 F8 月度跟进中相关的补充挂载上去，以解决前端无数据源使用的断层
            "followup_detail": f8_row,
        })

    return {
        "segments": segments,
        "overall_followup_rate": f7_rate,
    }
