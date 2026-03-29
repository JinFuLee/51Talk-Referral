"""学员 360° 视图 API

GET /students/360/search
GET /students/360/{stdt_id}
GET /students/360/{stdt_id}/network
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.cross_analyzer import CrossAnalyzer
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, parse_filters
from backend.models.student_360 import (
    DailyRecord,
    ReferralNetwork,
    ReferralNode,
    StudentDetail,
    StudentSearchItem,
    StudentSearchResult,
)

router = APIRouter()


def _get_analyzer(dm: DataManager) -> CrossAnalyzer:
    return CrossAnalyzer(dm.load_all())


@router.get(
    "/students/360/search",
    response_model=StudentSearchResult,
    summary="学员全表搜索+筛选+分页（join D5高潜标签）",
)
def search_students(
    request: Request,
    dimension_filters: UnifiedFilter = Depends(parse_filters),
    query: str | None = Query(
        default=None, description="文本搜索（学员ID/CC姓名/区域）"
    ),  # noqa: E501
    filters: str | None = Query(
        default=None,
        description='JSON 过滤条件，如 {"segment":"0-30天","lifecycle":"有效","is_hp":true,"cc_name":"张三"}',  # noqa: E501
    ),
    sort: str | None = Query(default=None, description="排序字段（D4 列名）"),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=200, description="每页条数"),
    dm: DataManager = Depends(get_data_manager),
) -> StudentSearchResult:
    analyzer = _get_analyzer(dm)
    filters_dict: dict | None = None
    if filters:
        try:
            filters_dict = json.loads(filters)
        except (json.JSONDecodeError, ValueError):
            filters_dict = None

    data = analyzer.student_search(
        query=query,
        filters=filters_dict,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    items = [StudentSearchItem(**item) for item in data.get("items", [])]
    return StudentSearchResult(
        items=items,
        total=data.get("total", 0),
        page=data.get("page", page),
        page_size=data.get("page_size", page_size),
    )


@router.get(
    "/students/360/{stdt_id}",
    response_model=StudentDetail,
    summary="学员完整360°画像（D4全量 + D3时间线 + D5高潜标签）",
)
def get_student_detail(
    stdt_id: str,
    request: Request,
    dimension_filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> StudentDetail:
    analyzer = _get_analyzer(dm)
    data = analyzer.student_detail(stdt_id=stdt_id)
    timeline = [DailyRecord(**r) for r in data.pop("timeline", [])]
    return StudentDetail(**data, timeline=timeline)


@router.get(
    "/students/360/{stdt_id}/network",
    response_model=ReferralNetwork,
    summary="学员推荐链网络图（递归深度可配）",
)
def get_student_network(
    stdt_id: str,
    request: Request,
    depth: int = Query(default=2, ge=1, le=5, description="递归深度（1-5）"),
    dimension_filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> ReferralNetwork:
    analyzer = _get_analyzer(dm)
    data = analyzer.student_network(stdt_id=stdt_id, depth=depth)
    nodes = [ReferralNode(**n) for n in data.get("nodes", [])]
    return ReferralNetwork(
        root_id=data.get("root_id", stdt_id),
        nodes=nodes,
        edges=data.get("edges", []),
        depth=data.get("depth", depth),
    )
