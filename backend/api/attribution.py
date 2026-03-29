"""达成归因 API

GET /api/attribution/summary   → D1 第一行全字段映射（英文 key）
GET /api/attribution/breakdown → D2/D4 多维度归因拆解
GET /api/attribution/simulation → 转化率提升模拟预测
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.cross_analyzer import CrossAnalyzer
from backend.core.data_manager import DataManager
from backend.models.attribution import (
    AttributionBreakdownItem,
    AttributionSummary,
    SimulationResult,
)
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()


def _get_analyzer(dm: DataManager, filters: UnifiedFilter) -> CrossAnalyzer:
    data = dm.load_all()
    filtered_data = dict(data)
    filtered_data["enclosure_cc"] = apply_filters(data["enclosure_cc"], filters)
    if "detail" in data:
        filtered_data["detail"] = apply_filters(
            data["detail"], filters, col_enclosure="围场"
        )
    return CrossAnalyzer(filtered_data)


@router.get(
    "/attribution/summary",
    response_model=AttributionSummary,
    summary="达成归因摘要（D1 第一行，英文字段）",
)
def get_attribution_summary(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> AttributionSummary:
    analyzer = _get_analyzer(dm, filters)
    data = analyzer.attribution_summary()
    return AttributionSummary(**data)


@router.get(
    "/attribution/breakdown",
    response_model=list[AttributionBreakdownItem],
    summary="归因拆解（按围场/CC/渠道/生命周期聚合付费数+金额）",
)
def get_attribution_breakdown(
    request: Request,
    group_by: Literal["enclosure", "cc", "channel", "lifecycle"] = Query(
        default="enclosure",
        description="分组维度：enclosure(围场) / cc(CC姓名) / channel(三级渠道) / lifecycle(生命周期)",  # noqa: E501
    ),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[AttributionBreakdownItem]:
    analyzer = _get_analyzer(dm, filters)
    items = analyzer.attribution_breakdown(group_by=group_by)
    return [AttributionBreakdownItem(**item) for item in items]


@router.get(
    "/attribution/simulation",
    response_model=SimulationResult,
    summary="转化率提升模拟：预测指定围场 segment 提升注册转化率后的达成率变化",
)
def get_attribution_simulation(
    request: Request,
    segment: str = Query(
        ...,
        description="围场 segment，如 '0-30天'",
    ),
    new_rate: float = Query(
        ...,
        ge=0.0,
        le=1.0,
        description="假设的新注册转化率（0.0~1.0）",
    ),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> SimulationResult:
    analyzer = _get_analyzer(dm, filters)
    result = analyzer.attribution_simulation(segment=segment, new_rate=new_rate)
    return SimulationResult(**result)
