from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from backend.services.analysis_service import AnalysisService

from .dependencies import get_service

router = APIRouter()


@router.get("/outreach-gap", summary="F11 课前外呼覆盖缺口 + 损失收入量化（简版）")
def get_outreach_gap(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """F11 课前外呼覆盖缺口 + $损失量化"""
    raw_data = getattr(svc, "_raw_data", None) or {}
    ops = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    pre_class = ops.get("pre_class_outreach", {})

    # pre_class_outreach 可能结构:
    # { summary: { total_students, called, not_called, coverage_rate },
    #   by_cc: [{ cc_name, total, called, not_called, rate }],
    #   by_date: [...] }

    summary = pre_class.get("summary", {}) if isinstance(pre_class, dict) else {}
    by_cc = pre_class.get("by_cc", []) if isinstance(pre_class, dict) else []
    # 额外抽取的新增的分析维度
    l3_raw = pre_class.get("by_channel_l3", {}) if isinstance(pre_class, dict) else {}
    lg_raw = pre_class.get("by_lead_grade", {}) if isinstance(pre_class, dict) else {}

    total = summary.get("total_students") or summary.get("total") or 0
    called = summary.get("called") or summary.get("covered") or 0
    not_called = summary.get("not_called") or max(0, total - called)
    coverage_rate = summary.get("coverage_rate") or (
        round(called / total, 4) if total else 0
    )
    target_rate = 0.85  # 目标覆盖率 85%

    gap = round(target_rate - coverage_rate, 4)
    gap_students = max(0, int(total * target_rate) - called)

    # 损失量化: 未覆盖学员 → 尝试从引擎真实宏观指标取值，取不到时用保守预估
    # ── 从缓存中提取真实宏观指标 ──
    _cached = svc.get_cached_result()
    _summary = (_cached or {}).get("summary", {})
    _funnel = (_cached or {}).get("funnel_efficiency", {})
    attend_rate = _funnel.get("attend_rate") or _summary.get("attend_rate") or 0.30
    conversion_rate = (
        _funnel.get("conversion_rate") or _summary.get("conversion_rate") or 0.15
    )
    asp_usd = _summary.get("asp_usd") or _funnel.get("asp_usd") or 200
    _loss_is_estimated = (
        attend_rate == 0.30 and conversion_rate == 0.15 and asp_usd == 200
    )
    lost_attend = round(not_called * attend_rate)
    lost_paid = round(lost_attend * conversion_rate)
    lost_revenue_usd = round(lost_paid * asp_usd, 2)
    lost_revenue_thb = round(lost_revenue_usd * 34, 0)

    # CC 粒度
    cc_gaps = []
    for cc in by_cc if isinstance(by_cc, list) else []:
        if not isinstance(cc, dict):
            continue
        cc_total = cc.get("total") or 0
        cc_called = cc.get("called") or cc.get("covered") or 0
        cc_not_called = cc.get("not_called") or max(0, cc_total - cc_called)
        cc_rate = round(cc_called / cc_total, 4) if cc_total else 0
        cc_gaps.append(
            {
                "cc_name": cc.get("cc_name") or cc.get("name", ""),
                "total": cc_total,
                "called": cc_called,
                "not_called": cc_not_called,
                "coverage_rate": cc_rate,
                "gap_vs_target": round(target_rate - cc_rate, 4),
            }
        )

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
        # 新增下发表格所需的数据流
        "by_channel_l3": sorted(
            [{"name": k, **v} for k, v in l3_raw.items()],
            key=lambda x: x.get("total_classes", 0),
            reverse=True,
        ),
        "by_lead_grade": sorted(
            [{"name": k, **v} for k, v in lg_raw.items()],
            key=lambda x: str(x.get("name", "")),
            reverse=False,
        ),
        "data_source": "f11" if total > 0 else "empty",
        "loss_is_estimated": _loss_is_estimated,
    }
