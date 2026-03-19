"""渠道归因 API"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.attribution_engine import AttributionEngine
from backend.core.data_manager import DataManager
from backend.models.channel import (
    ChannelMetrics,
    RevenueContribution,
    ThreeFactorComparison,
)

router = APIRouter()


def _get_engine(dm: DataManager) -> AttributionEngine:
    data = dm.load_all()
    return AttributionEngine(
        enclosure_cc_df=data["enclosure_cc"],
        detail_df=data["detail"],
    )


@router.get(
    "/channel",
    response_model=list[ChannelMetrics],
    summary="各渠道（CC/SS/LP/宽口）注册数/付费/金额",
)
def get_channel(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> list[ChannelMetrics]:
    engine = _get_engine(dm)
    return engine.compute_channel_metrics()


@router.get(
    "/channel/attribution",
    response_model=list[RevenueContribution],
    summary="渠道收入贡献（金额/占比/人均）",
)
def get_channel_attribution(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> list[RevenueContribution]:
    engine = _get_engine(dm)
    return engine.compute_revenue_contribution()


@router.get(
    "/channel/three-factor",
    response_model=list[ThreeFactorComparison],
    summary="三因素对标：各渠道预约率/出席率/付费率 vs 期望",
)
def get_channel_three_factor(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> list[ThreeFactorComparison]:
    engine = _get_engine(dm)
    return engine.compute_three_factor()
