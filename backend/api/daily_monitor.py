"""日报监控 API

GET /daily-monitor/stats
GET /daily-monitor/cc-ranking
GET /daily-monitor/contact-vs-conversion
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.cross_analyzer import CrossAnalyzer
from backend.core.data_manager import DataManager
from backend.models.daily_monitor import (
    CCRankingItem,
    ContactConversionPoint,
    ContactSegmentStat,
    DailyContactStats,
    FunnelStat,
)
from backend.models.filters import UnifiedFilter, parse_filters

router = APIRouter()


def _get_analyzer(dm: DataManager) -> CrossAnalyzer:
    return CrossAnalyzer(dm.load_all())


@router.get(
    "/daily-monitor/stats",
    response_model=DailyContactStats,
    summary="日报触达统计：总触达率 + 围场段分布 + 带新漏斗",
)
def get_daily_contact_stats(
    request: Request,
    date: str | None = Query(default=None, description="过滤日期前缀，如 '2024-03-01'"),
    segments: str | None = Query(
        default=None, description="围场段过滤，逗号分隔，如 '0-30天,31-60天'"
    ),
    role: str | None = Query(default=None, description="角色过滤 cc/ss/lp"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> DailyContactStats:
    analyzer = _get_analyzer(dm)
    seg_list = [s.strip() for s in segments.split(",")] if segments else None
    data = analyzer.daily_contact_stats(date=date, segments=seg_list, role=role)

    funnel = FunnelStat(**data.get("funnel", {}))
    by_segment = [ContactSegmentStat(**s) for s in data.get("by_segment", [])]
    return DailyContactStats(
        total_students=data.get("total_students"),
        cc_contact_rate=data.get("cc_contact_rate"),
        ss_contact_rate=data.get("ss_contact_rate"),
        lp_contact_rate=data.get("lp_contact_rate"),
        by_segment=by_segment,
        funnel=funnel,
        checkin_rate=data.get("checkin_rate"),
    )


@router.get(
    "/daily-monitor/cc-ranking",
    response_model=list[CCRankingItem],
    summary="CC 触达排行榜（按角色分组）",
)
def get_daily_cc_ranking(
    request: Request,
    role: str = Query(default="cc", description="角色：cc / ss / lp"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[CCRankingItem]:
    analyzer = _get_analyzer(dm)
    items = analyzer.daily_cc_ranking(role=role)
    return [CCRankingItem(**item) for item in items]


@router.get(
    "/daily-monitor/contact-vs-conversion",
    response_model=list[ContactConversionPoint],
    summary="CC接通率 × 转化率散点图数据",
)
def get_contact_vs_conversion(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[ContactConversionPoint]:
    analyzer = _get_analyzer(dm)
    items = analyzer.contact_vs_conversion()
    return [ContactConversionPoint(**item) for item in items]
