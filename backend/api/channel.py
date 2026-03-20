"""渠道归因 API"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.attribution_engine import AttributionEngine
from backend.core.data_manager import DataManager
from backend.models.channel import (
    ChannelMetrics,
    RevenueContribution,
    ThreeFactorComparison,
)

router = APIRouter()


def _safe_val(val) -> Any:
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return str(val) if val else None


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


@router.get(
    "/channel/detail",
    summary="D3 明细表行级数据（可按渠道/状态过滤）",
)
def get_channel_detail(
    request: Request,
    channel: str | None = Query(
        default=None, description="渠道过滤：CC窄口/SS窄口/LP窄口/宽口"
    ),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    data = dm.load_all()
    df: pd.DataFrame = data.get("detail", pd.DataFrame())

    if df.empty:
        return {
            "items": [], "total": 0, "page": page,
            "size": size, "pages": 0, "columns": [],
        }

    if channel and "转介绍类型_新" in df.columns:
        df = df[df["转介绍类型_新"].astype(str).str.contains(channel, na=False)]

    total = len(df)
    pages = math.ceil(total / size) if total > 0 else 0
    start = (page - 1) * size
    end = start + size
    page_df = df.iloc[start:end]

    items = []
    for _, row in page_df.iterrows():
        items.append({col: _safe_val(row[col]) for col in row.index})

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
        "columns": list(df.columns),
    }


@router.get(
    "/channel/d2-columns",
    summary="D2 围场过程数据全列暴露（含忽略列）",
)
def get_d2_columns(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    data = dm.load_all()
    df: pd.DataFrame = data.get("enclosure_cc", pd.DataFrame())

    if df.empty:
        return {"columns": [], "sample": {}, "row_count": 0}

    row = df.iloc[0]
    sample = {col: _safe_val(row[col]) for col in df.columns}
    return {
        "columns": list(df.columns),
        "sample": sample,
        "row_count": len(df),
    }
