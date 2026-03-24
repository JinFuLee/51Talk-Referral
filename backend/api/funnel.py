"""漏斗分析 API"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.config import get_targets
from backend.core.data_manager import DataManager
from backend.core.scenario_engine import ScenarioEngine
from backend.models.funnel import FunnelResult, ScenarioResult

router = APIRouter()


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _merged_targets(data: dict) -> dict:
    """合并 Excel 目标（TargetLoader）+ targets_override.json（API 设置的月度目标）"""
    targets = dict(data.get("targets") or {})
    # 优先用 config 中的 override 目标（含用户通过 Settings 页面设置的值）
    config_targets = get_targets()
    targets.update(config_targets)
    return targets


def _get_invitation_stats(detail_df: pd.DataFrame | None) -> dict[str, Any]:
    """从 D3 明细聚合邀约数 + 衍生转化率"""
    if detail_df is None or detail_df.empty:
        return {}

    inv_col = "邀约数"
    reg_col = next(
        (c for c in ["转介绍注册数", "注册数"] if c in detail_df.columns), None
    )
    show_col = next((c for c in ["出席数", "到场数"] if c in detail_df.columns), None)

    if inv_col not in detail_df.columns:
        return {}

    invitation_count = _safe_float(
        pd.to_numeric(detail_df[inv_col], errors="coerce").sum()
    )

    registrations = None
    if reg_col:
        registrations = _safe_float(
            pd.to_numeric(detail_df[reg_col], errors="coerce").sum()
        )

    showups = None
    if show_col:
        showups = _safe_float(pd.to_numeric(detail_df[show_col], errors="coerce").sum())

    # 注册→邀约率（registration_invitation_rate）：注册数 / 邀约数
    reg_inv_rate = (
        round(registrations / invitation_count, 4)
        if (registrations is not None and invitation_count and invitation_count > 0)
        else None
    )
    # 邀约→出席率（invitation_showup_rate）：出席数 / 邀约数
    inv_show_rate = (
        round(showups / invitation_count, 4)
        if (showups is not None and invitation_count and invitation_count > 0)
        else None
    )

    return {
        "invitation_count": invitation_count,
        "registration_invitation_rate": reg_inv_rate,
        "invitation_showup_rate": inv_show_rate,
    }


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
    "/funnel/with-invitation",
    summary="漏斗 + 邀约环节数据（D3 邀约数 + 注册→邀约率 + 邀约→出席率）",
)
def get_funnel_with_invitation(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """在标准漏斗基础上，增加 D3 邀约数 + 注册→邀约率 + 邀约→出席率"""
    data = dm.load_all()
    engine = ScenarioEngine(data["result"], _merged_targets(data))
    funnel = engine.compute_funnel()

    detail_df = data.get("detail")
    invitation_stats = _get_invitation_stats(detail_df)

    return {
        **funnel.model_dump(),
        "invitation": invitation_stats,
    }


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
