"""
北极星打卡率分析 API
GET /api/analysis/north-star   — CC 打卡率排名 + 达标分布（D1 数据源）
GET /api/analysis/checkin-ab   — D1×D5 联合对比（24H 打卡 + 月度打卡 + 倍率）
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from .dependencies import get_service
from services.analysis_service import AnalysisService

router = APIRouter(tags=["north_star"])


def _get_raw_data(svc: AnalysisService) -> dict[str, Any]:
    raw = getattr(svc, "_raw_data", None)
    if not raw:
        raise HTTPException(status_code=503, detail="数据未加载，请先运行分析")
    return raw


@router.get("/north-star", summary="CC 24H 打卡率排名 + 达标分布")
def get_north_star(
    cc_name: Optional[str] = Query(default=None, description="筛选指定 CC（精确匹配）"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    D1 北极星指标：CC 24H 打卡率排名 + 达标分布

    返回：
    - by_cc: CC 列表（按 checkin_24h_rate 降序），若传 cc_name 则只返回该 CC
    - by_team: 团队汇总
    - summary: 整体均值 / 目标 / 总达标数
    - achieved_count: 达标 CC 数
    - total_cc: 参与统计的 CC 总数
    """
    raw = _get_raw_data(svc)
    kpi = raw.get("kpi") or {}
    d1 = kpi.get("north_star_24h") or {}

    by_cc: list[dict] = d1.get("by_cc") or []
    summary: dict = d1.get("summary") or {}

    sorted_cc = sorted(by_cc, key=lambda x: float(x.get("checkin_24h_rate") or 0), reverse=True)

    # CC 筛选：精确匹配 cc_name
    if cc_name:
        sorted_cc = [cc for cc in sorted_cc if cc.get("cc_name") == cc_name]

    target = float(summary.get("target") or 0)
    achieved_count = (
        sum(1 for cc in sorted_cc if float(cc.get("checkin_24h_rate") or 0) >= target)
        if target > 0
        else 0
    )

    return {
        "by_cc": sorted_cc,
        "by_team": d1.get("by_team") or [],
        "summary": summary,
        "achieved_count": achieved_count,
        "total_cc": len(sorted_cc),
    }


@router.get("/checkin-ab", summary="D1×D5 24H 打卡率 × 月度打卡率联合对比")
def get_checkin_ab(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    D1×D5 联合对比：24H 打卡率 × 月度打卡率 × 打卡倍率

    D1 key: kpi.north_star_24h
    D5 key: kpi.checkin_rate_monthly

    返回：
    - merged: 每个 CC 的 D1+D5 合并记录
    - d1_summary: D1 整体汇总
    - d5_summary: D5 整体汇总
    """
    raw = _get_raw_data(svc)
    kpi = raw.get("kpi") or {}
    d1 = kpi.get("north_star_24h") or {}
    d5 = kpi.get("checkin_rate_monthly") or {}

    d1_by_cc: dict[str, dict] = {
        cc["cc_name"]: cc for cc in (d1.get("by_cc") or []) if cc.get("cc_name")
    }
    d5_by_cc: dict[str, dict] = {
        cc["cc_name"]: cc for cc in (d5.get("by_cc") or []) if cc.get("cc_name")
    }

    all_names = sorted(set(d1_by_cc.keys()) | set(d5_by_cc.keys()))

    merged: list[dict] = []
    for name in all_names:
        d1_cc = d1_by_cc.get(name) or {}
        d5_cc = d5_by_cc.get(name) or {}
        merged.append(
            {
                "cc_name": name,
                "team": d1_cc.get("team") or d5_cc.get("team"),
                "checkin_24h_rate": d1_cc.get("checkin_24h_rate"),
                "checkin_monthly_rate": d5_cc.get("checkin_rate"),
                "referral_coefficient_24h": d1_cc.get("referral_coefficient"),
                "referral_participation": d1_cc.get("referral_participation"),
                "achievement_rate": d1_cc.get("achievement_rate"),
                "referral_participation_total": d5_cc.get("referral_participation_total"),
                "referral_participation_checked": d5_cc.get("referral_participation_checked"),
                "referral_participation_unchecked": d5_cc.get("referral_participation_unchecked"),
                "checkin_multiplier": d5_cc.get("checkin_multiplier"),
                "referral_coefficient_monthly": d5_cc.get("referral_coefficient_total"),
                "conversion_ratio": d1_cc.get("conversion_ratio") or d5_cc.get("conversion_ratio"),
            }
        )

    return {
        "merged": merged,
        "d1_summary": d1.get("summary") or {},
        "d5_summary": d5.get("summary") or {},
    }
