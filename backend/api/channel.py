"""渠道归因 API — 消费 Settings 围场配置做多口径归因"""

from __future__ import annotations

import math
from pathlib import Path
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
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_OVERRIDE_PATH = _PROJECT_ROOT / "config" / "enclosure_role_override.json"
_CONFIG_PATH = _PROJECT_ROOT / "projects" / "referral" / "config.json"

# 围场天数 → M 标签映射（与 checkin.py 对齐）
_M_TO_DAYS: dict[str, tuple[int, int]] = {
    "M0": (0, 30),
    "M1": (31, 60),
    "M2": (61, 90),
    "M3": (91, 120),
    "M4": (121, 150),
    "M5": (151, 180),
    "M6": (181, 210),
    "M7": (211, 240),
    "M8": (241, 270),
    "M9": (271, 300),
    "M10": (301, 330),
    "M11": (331, 360),
    "M12": (361, 390),
    "M12+": (391, 9999),
    "M6+": (181, 9999),  # 旧数据兼容
}


def _get_wide_role_config() -> dict[str, list[str]]:
    """读取宽口围场→角色配置（复用 _checkin_config 三层优先级，保证全局一致）。

    返回格式: {"M0": ["CC"], "M3": ["SS"], "M6+": ["运营"], ...}（围场→角色列表）
    """
    try:
        from backend.api._checkin_config import _get_wide_role
        role_to_bands = _get_wide_role()  # {"CC": ["0~30","31~60",...], ...}
        # 反转为 {围场M标签: [角色,...]} 格式
        _raw_to_m: dict[str, str] = {
            "0~30": "M0", "31~60": "M1", "61~90": "M2", "91~120": "M3",
            "121~150": "M4", "151~180": "M5",
        }
        result: dict[str, list[str]] = {}
        for role, bands in role_to_bands.items():
            for band in bands:
                m_label = _raw_to_m.get(band, band)
                result.setdefault(m_label, []).append(role)
        return result
    except Exception:
        return {"M0": ["CC"], "M1": ["CC"], "M2": ["CC"]}


def _safe_val(val: object) -> Any:
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


def _get_engine(
    dm: DataManager, filters: UnifiedFilter | None = None
) -> AttributionEngine:
    data = dm.load_all()
    if filters is not None:
        if "enclosure_cc" in data and isinstance(data["enclosure_cc"], pd.DataFrame):
            data["enclosure_cc"] = apply_filters(data["enclosure_cc"], filters)
        if "detail" in data and isinstance(data["detail"], pd.DataFrame):
            data["detail"] = apply_filters(data["detail"], filters)
    return AttributionEngine(
        enclosure_cc_df=data["enclosure_cc"],
        detail_df=data["detail"],
        wide_role_config=_get_wide_role_config(),
    )


@router.get(
    "/channel",
    response_model=list[ChannelMetrics],
    summary="各渠道（CC/SS/LP/宽口）注册数/付费/金额",
)
def get_channel(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[ChannelMetrics]:
    engine = _get_engine(dm, filters)
    return engine.compute_channel_metrics()


@router.get(
    "/channel/attribution",
    response_model=list[RevenueContribution],
    summary="渠道收入贡献（金额/占比/人均）",
)
def get_channel_attribution(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[RevenueContribution]:
    engine = _get_engine(dm, filters)
    return engine.compute_revenue_contribution()


@router.get(
    "/channel/three-factor",
    response_model=list[ThreeFactorComparison],
    summary="三因素对标：各渠道预约率/出席率/付费率 vs 期望",
)
def get_channel_three_factor(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[ThreeFactorComparison]:
    engine = _get_engine(dm, filters)
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
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict[str, Any]:
    data = dm.load_all()
    df: pd.DataFrame = data.get("detail", pd.DataFrame())
    df = apply_filters(df, filters)

    if df.empty:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "size": size,
            "pages": 0,
            "columns": [],
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
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict[str, Any]:
    data = dm.load_all()
    df: pd.DataFrame = data.get("enclosure_cc", pd.DataFrame())
    df = apply_filters(df, filters)

    if df.empty:
        return {"columns": [], "sample": {}, "row_count": 0}

    row = df.iloc[0]
    sample = {col: _safe_val(row[col]) for col in df.columns}
    return {
        "columns": list(df.columns),
        "sample": sample,
        "row_count": len(df),
    }
