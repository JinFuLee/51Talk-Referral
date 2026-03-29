"""围场健康度 API

GET /enclosure-health/scores
GET /enclosure-health/benchmark
GET /enclosure-health/variance
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.cross_analyzer import CrossAnalyzer
from backend.core.data_manager import DataManager
from backend.models.enclosure_health import (
    CCVarianceData,
    EnclosureBenchmark,
    EnclosureHealthScore,
)
from backend.models.filters import UnifiedFilter, parse_filters

router = APIRouter()


def _get_analyzer(dm: DataManager, filters: UnifiedFilter) -> CrossAnalyzer:
    from backend.models.filters import apply_filters
    data = dm.load_all()
    filtered_data = dict(data)
    filtered_data["enclosure_cc"] = apply_filters(data["enclosure_cc"], filters)
    return CrossAnalyzer(filtered_data)


@router.get(
    "/enclosure-health/scores",
    response_model=list[EnclosureHealthScore],
    summary="围场加权健康评分（参与率×0.3 + 转化率×0.4 + 打卡率×0.3）",
)
def get_enclosure_health_scores(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[EnclosureHealthScore]:
    analyzer = _get_analyzer(dm, filters)
    items = analyzer.enclosure_health_scores()
    return [EnclosureHealthScore(**item) for item in items]


@router.get(
    "/enclosure-health/benchmark",
    response_model=list[EnclosureBenchmark],
    summary="围场4指标对标（参与率/转化率/打卡率/触达率/带货比）",
)
def get_enclosure_benchmark(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[EnclosureBenchmark]:
    analyzer = _get_analyzer(dm, filters)
    items = analyzer.enclosure_benchmark()
    return [EnclosureBenchmark(**item) for item in items]


@router.get(
    "/enclosure-health/variance",
    response_model=list[CCVarianceData],
    summary="同围场内CC的带新系数方差/min/max/median",
)
def get_enclosure_cc_variance(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[CCVarianceData]:
    analyzer = _get_analyzer(dm, filters)
    items = analyzer.enclosure_cc_variance()
    return [CCVarianceData(**item) for item in items]
