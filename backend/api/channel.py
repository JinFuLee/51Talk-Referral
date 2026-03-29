"""渠道归因 API — 消费 Settings 围场配置做多口径归因"""

from __future__ import annotations

import json
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
    """读取宽口围场→角色配置。

    优先级：enclosure_role_override.json wide → config.json enclosure_role_wide → 默认值
    返回格式: {"M0": ["CC"], "M3": ["LP"], "M6+": ["运营"], ...}
    """
    # 1. 优先读 override 文件
    try:
        if _OVERRIDE_PATH.exists():
            data = json.loads(_OVERRIDE_PATH.read_text(encoding="utf-8"))
            wide = data.get("wide")
            if wide and isinstance(wide, dict):
                return wide
    except Exception:
        pass

    # 2. fallback: config.json enclosure_role_wide（天数范围格式 → M 标签格式）
    try:
        if _CONFIG_PATH.exists():
            cfg = json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
            wide_cfg = cfg.get("enclosure_role_wide", {})
            if wide_cfg:
                result: dict[str, list[str]] = {}
                for role, spec in wide_cfg.items():
                    min_d = spec.get("min_days", 0)
                    max_d = spec.get("max_days") or 9999
                    for m_label, (lo, hi) in _M_TO_DAYS.items():
                        if lo >= min_d and hi <= max_d:
                            result.setdefault(m_label, []).append(role)
                if result:
                    return result
    except Exception:
        pass

    # 3. 硬编码默认值（最终 fallback）
    return {
        "M0": ["CC"],
        "M1": ["CC"],
        "M2": ["CC"],
        "M3": ["LP"],
        "M4": ["LP"],
        "M5": ["LP"],
        "M6": ["运营"],
        "M7": ["运营"],
        "M8": ["运营"],
        "M9": ["运营"],
        "M10": ["运营"],
        "M11": ["运营"],
        "M12": ["运营"],
        "M12+": ["运营"],
        "M6+": ["运营"],  # 旧数据兼容
    }


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
