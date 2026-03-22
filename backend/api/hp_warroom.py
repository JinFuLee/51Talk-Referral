"""高潜作战室 API

GET /high-potential/warroom           → 高潜学员作战室
GET /high-potential/{stdt_id}/timeline → 学员时间线
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.cross_analyzer import CrossAnalyzer
from backend.core.data_manager import DataManager
from backend.models.warroom import StudentTimeline, TimelineEvent, WarroomStudent

router = APIRouter()


def _get_analyzer(dm: DataManager) -> CrossAnalyzer:
    return CrossAnalyzer(dm.load_all())


@router.get(
    "/high-potential/warroom",
    response_model=list[WarroomStudent],
    summary="高潜作战室列表（D5×D3，含紧急度 urgency_level）",
)
def get_hp_warroom(
    request: Request,
    urgency: str | None = Query(
        default=None,
        description="紧急度过滤：red / yellow / green（不传 = 全部）",
    ),
    cc_names: str | None = Query(
        default=None,
        description="CC 姓名过滤，多个用英文逗号分隔（不传 = 全部）",
    ),
    dm: DataManager = Depends(get_data_manager),
) -> list[WarroomStudent]:
    analyzer = _get_analyzer(dm)

    cc_list: list[str] | None = None
    if cc_names:
        cc_list = [n.strip() for n in cc_names.split(",") if n.strip()]

    items = analyzer.hp_warroom(urgency=urgency, cc_names=cc_list)
    return [WarroomStudent(**item) for item in items]


@router.get(
    "/high-potential/{stdt_id}/timeline",
    response_model=StudentTimeline,
    summary="高潜学员时间线（D3 日志 + D4 基本信息 + D5 高潜标记）",
)
def get_hp_timeline(
    request: Request,
    stdt_id: str,
    dm: DataManager = Depends(get_data_manager),
) -> StudentTimeline:
    analyzer = _get_analyzer(dm)
    result = analyzer.hp_timeline(stdt_id=stdt_id)

    # 将 timeline list[dict] 转为 list[TimelineEvent]
    timeline_events = [TimelineEvent(**evt) for evt in result.get("timeline", [])]
    result["timeline"] = timeline_events  # type: ignore[assignment]

    return StudentTimeline(**result)
