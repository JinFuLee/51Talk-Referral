from __future__ import annotations
from typing import Any
from fastapi import APIRouter, HTTPException

router = APIRouter()
_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


@router.get("/outreach-gap")
def get_outreach_gap():
    """F11 课前外呼覆盖缺口 + $损失量化"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    raw_data = getattr(_service, "_raw_data", None) or {}
    ops = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    pre_class = ops.get("pre_class_outreach", {})

    # pre_class_outreach 可能结构:
    # { summary: { total_students, called, not_called, coverage_rate },
    #   by_cc: [{ cc_name, total, called, not_called, rate }],
    #   by_date: [...] }

    summary = pre_class.get("summary", {}) if isinstance(pre_class, dict) else {}
    by_cc = pre_class.get("by_cc", []) if isinstance(pre_class, dict) else []

    total = summary.get("total_students") or summary.get("total") or 0
    called = summary.get("called") or summary.get("covered") or 0
    not_called = summary.get("not_called") or max(0, total - called)
    coverage_rate = summary.get("coverage_rate") or (round(called / total, 4) if total else 0)
    target_rate = 0.85  # 目标覆盖率 85%

    gap = round(target_rate - coverage_rate, 4)
    gap_students = max(0, int(total * target_rate) - called)

    # 损失量化: 未覆盖学员 → 假设 attend_rate=0.3, conversion_rate=0.15, ASP=200 USD
    attend_rate = 0.30
    conversion_rate = 0.15
    asp_usd = 200
    lost_attend = round(not_called * attend_rate)
    lost_paid = round(lost_attend * conversion_rate)
    lost_revenue_usd = round(lost_paid * asp_usd, 2)
    lost_revenue_thb = round(lost_revenue_usd * 34, 0)

    # CC 粒度
    cc_gaps = []
    for cc in (by_cc if isinstance(by_cc, list) else []):
        if not isinstance(cc, dict):
            continue
        cc_total = cc.get("total") or 0
        cc_called = cc.get("called") or cc.get("covered") or 0
        cc_not_called = cc.get("not_called") or max(0, cc_total - cc_called)
        cc_rate = round(cc_called / cc_total, 4) if cc_total else 0
        cc_gaps.append({
            "cc_name": cc.get("cc_name") or cc.get("name", ""),
            "total": cc_total,
            "called": cc_called,
            "not_called": cc_not_called,
            "coverage_rate": cc_rate,
            "gap_vs_target": round(target_rate - cc_rate, 4),
        })

    cc_gaps.sort(key=lambda x: x.get("gap_vs_target", 0), reverse=True)

    return {
        "summary": {
            "total_students": total,
            "called": called,
            "not_called": not_called,
            "coverage_rate": coverage_rate,
            "target_rate": target_rate,
            "gap_rate": gap,
            "gap_students": gap_students,
        },
        "loss_estimate": {
            "lost_attend": lost_attend,
            "lost_paid": lost_paid,
            "lost_revenue_usd": lost_revenue_usd,
            "lost_revenue_thb": lost_revenue_thb,
        },
        "by_cc": cc_gaps,
    }
