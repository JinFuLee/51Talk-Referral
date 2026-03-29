"""CC 矩阵分析 API

GET /cc-matrix/heatmap
GET /cc-matrix/radar/{cc_name}
GET /cc-matrix/drilldown
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.cross_analyzer import CrossAnalyzer
from backend.core.data_manager import DataManager
from backend.models.cc_matrix import (
    CCHeatmapResponse,
    CCRadarData,
    DrilldownStudent,
    HeatmapCell,
)
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()

_METRIC_ALIAS: dict[str, str] = {
    "coefficient": "带新系数",
    "participation": "转介绍参与率",
    "checkin": "当月有效打卡率",
    "reach": "CC触达率",
    "conversion": "注册转化率",
}


def _get_analyzer(dm: DataManager, filters: UnifiedFilter) -> CrossAnalyzer:
    data = dm.load_all()
    filtered_data = dict(data)
    filtered_data["enclosure_cc"] = apply_filters(data["enclosure_cc"], filters)
    return CrossAnalyzer(filtered_data)


@router.get(
    "/cc-matrix/heatmap",
    response_model=CCHeatmapResponse,
    summary="CC×围场 热力矩阵",
)
def get_cc_enclosure_heatmap(
    request: Request,
    metric: str = Query(
        default="coefficient",
        description="指标：coefficient(带新系数) / participation(参与率) / checkin(打卡率) / reach(触达率) / conversion(转化率)",  # noqa: E501
    ),
    segments: str | None = Query(
        default=None, description="围场段过滤，逗号分隔，如 '0-30天,31-60天'"
    ),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> CCHeatmapResponse:
    analyzer = _get_analyzer(dm, filters)
    metric_cn = _METRIC_ALIAS.get(metric, metric)
    seg_list = [s.strip() for s in segments.split(",")] if segments else None
    data = analyzer.cc_enclosure_heatmap(metric=metric_cn, segments=seg_list)
    cells = [HeatmapCell(**c) for c in data.get("data", [])]
    return CCHeatmapResponse(
        rows=data.get("rows", []),
        cols=data.get("cols", []),
        data=cells,
    )


@router.get(
    "/cc-matrix/radar/{cc_name}",
    response_model=CCRadarData,
    summary="单个CC的5维能力雷达图",
)
def get_cc_radar(
    cc_name: str,
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> CCRadarData:
    analyzer = _get_analyzer(dm, filters)
    data = analyzer.cc_radar(cc_name=cc_name)
    return CCRadarData(**data)


@router.get(
    "/cc-matrix/drilldown",
    response_model=list[DrilldownStudent],
    summary="CC×围场 下钻学员列表",
)
def get_cc_drilldown(
    request: Request,
    cc_name: str = Query(..., description="CC 姓名"),
    segment: str = Query(..., description="围场段或生命周期"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[DrilldownStudent]:
    analyzer = _get_analyzer(dm, filters)
    items = analyzer.cc_drilldown(cc_name=cc_name, segment=segment)
    return [DrilldownStudent(**item) for item in items]
