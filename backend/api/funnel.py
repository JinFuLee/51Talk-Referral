"""漏斗分析 API"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.config import get_targets
from backend.core.data_manager import DataManager
from backend.core.scenario_engine import ScenarioEngine
from backend.models.funnel import FunnelResult, ScenarioResult

router = APIRouter()


def _merged_targets(data: dict) -> dict:
    """合并 Excel 目标（TargetLoader）+ targets_override.json（API 设置的月度目标）"""
    targets = dict(data.get("targets") or {})
    # 优先用 config 中的 override 目标（含用户通过 Settings 页面设置的值）
    config_targets = get_targets()
    targets.update(config_targets)
    return targets


@router.get(
    "/funnel", response_model=FunnelResult, summary="漏斗各环节目标/实际/达成率"
)
def get_funnel(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> FunnelResult:
    data = dm.load_all()
    engine = ScenarioEngine(data["result"], _merged_targets(data))
    return engine.compute_funnel()


@router.get(
    "/funnel/scenario",
    response_model=ScenarioResult,
    summary="漏斗场景推演：若某环节达标，付费/业绩变化多少",
)
def get_funnel_scenario(
    request: Request,
    stage: str = Query(
        default="出席付费率",
        description="场景推演环节：注册预约率 / 预约出席率 / 出席付费率",
    ),
    dm: DataManager = Depends(get_data_manager),
) -> ScenarioResult:
    data = dm.load_all()
    engine = ScenarioEngine(data["result"], _merged_targets(data))
    return engine.compute_scenario(stage)
