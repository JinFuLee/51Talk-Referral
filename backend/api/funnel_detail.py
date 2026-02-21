"""
F1 漏斗跟进效率 + F2 截面效率四象限
GET /api/analysis/funnel-detail
GET /api/analysis/section-efficiency
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter()

_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


@router.get("/funnel-detail")
async def get_funnel_detail() -> dict[str, Any]:
    """
    F1 CC 级别各漏斗阶段跟进效率

    返回：
    - cc_funnel: CC 粒度各阶段效率列表
    - stages: 漏斗阶段名称列表
    """
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    raw_data = getattr(_service, "_raw_data", None) or {}
    ops = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    funnel_eff = ops.get("funnel_efficiency", {})

    cc_funnel: list[dict] = []

    if isinstance(funnel_eff, list):
        # 数据已是 CC 列表格式
        cc_funnel = funnel_eff
    elif isinstance(funnel_eff, dict):
        by_cc = funnel_eff.get("by_cc", [])
        if isinstance(by_cc, list):
            cc_funnel = by_cc
        else:
            # 尝试从 records 聚合
            records = funnel_eff.get("records", [])
            aggregated: dict[str, dict] = {}
            for r in records:
                cc = r.get("cc_name") or r.get("cc") or "未知"
                if cc not in aggregated:
                    aggregated[cc] = {
                        "cc_name": cc,
                        "register_count": 0,
                        "reserve_count": 0,
                        "attend_count": 0,
                        "paid_count": 0,
                    }
                aggregated[cc]["register_count"] += r.get("register_count", 0)
                aggregated[cc]["reserve_count"] += r.get("reserve_count", 0)
                aggregated[cc]["attend_count"] += r.get("attend_count", 0)
                aggregated[cc]["paid_count"] += r.get("paid_count", 0)
            cc_funnel = list(aggregated.values())

    # 补充各阶段转化率字段
    for item in cc_funnel:
        reg = item.get("register_count", 0) or 0
        rsv = item.get("reserve_count", 0) or 0
        att = item.get("attend_count", 0) or 0
        paid = item.get("paid_count", 0) or 0
        item.setdefault("register_to_reserve", round(rsv / reg, 4) if reg else 0)
        item.setdefault("reserve_to_attend", round(att / rsv, 4) if rsv else 0)
        item.setdefault("attend_to_paid", round(paid / att, 4) if att else 0)
        item.setdefault("overall_conversion", round(paid / reg, 4) if reg else 0)

    return {
        "cc_funnel": cc_funnel,
        "stages": ["注册", "预约", "出席", "付费"],
    }


@router.get("/section-efficiency")
async def get_section_efficiency() -> dict[str, Any]:
    """
    F2 CC 级别截面效率（四象限散点图数据）

    返回：
    - sections: CC 粒度各截面效率列表
      每项含 cc_name / contact_rate / reserve_rate / attend_rate / paid_rate
    """
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    raw_data = getattr(_service, "_raw_data", None) or {}
    ops = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    section_eff = ops.get("section_efficiency", {})

    sections: list[dict] = []

    if isinstance(section_eff, list):
        sections = section_eff
    elif isinstance(section_eff, dict):
        by_cc = section_eff.get("by_cc", [])
        if isinstance(by_cc, list):
            sections = by_cc
        else:
            # 尝试从 kpi.by_cc + outreach.by_cc 联合构建
            kpi_data = ops.get("kpi", {})
            kpi_by_cc: list[dict] = kpi_data.get("by_cc", []) if isinstance(kpi_data, dict) else []

            outreach_data = ops.get("outreach", {})
            outreach_by_cc: list[dict] = outreach_data.get("by_cc", []) if isinstance(outreach_data, dict) else []

            # 构建 CC 映射
            outreach_map: dict[str, dict] = {}
            for row in outreach_by_cc:
                cc = row.get("cc_name") or row.get("cc") or ""
                if cc:
                    outreach_map[cc] = row

            for row in kpi_by_cc:
                cc = row.get("cc_name") or row.get("cc") or "未知"
                out = outreach_map.get(cc, {})
                total_students = row.get("valid_students", 0) or 1

                reached = out.get("effective_calls", 0) or 0
                contact_rate = round(reached / total_students, 4) if total_students else 0

                sections.append(
                    {
                        "cc_name": cc,
                        "contact_rate": contact_rate,
                        "reserve_rate": row.get("reserve_rate", 0) or 0,
                        "attend_rate": row.get("attend_rate", 0) or 0,
                        "paid_rate": row.get("paid_rate", 0) or 0,
                    }
                )

    # 确保必要字段存在
    for item in sections:
        item.setdefault("cc_name", "未知")
        item.setdefault("contact_rate", 0)
        item.setdefault("reserve_rate", 0)
        item.setdefault("attend_rate", 0)
        item.setdefault("paid_rate", 0)

    return {"sections": sections}
