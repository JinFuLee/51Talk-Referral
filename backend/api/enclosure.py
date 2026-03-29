"""围场分析 API"""

from __future__ import annotations

from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.enclosure import EnclosureCCMetrics
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()


def _safe_float(val) -> Any:
    if val is None:
        return None
    try:
        import math

        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _df_to_metrics(
    df: pd.DataFrame, group_by: str = "enclosure_x_group"
) -> list[EnclosureCCMetrics]:
    """将 D2 DataFrame 聚合成 EnclosureCCMetrics 列表。

    group_by:
      - "enclosure": 仅按围场聚合（7行，CC信息取众数）
      - "enclosure_x_group": 围场 × CC组 矩阵（默认，真正的交叉矩阵）
      - "individual": 围场 × CC个人（完整明细）
    """
    if df.empty:
        return []

    col_map = {
        "enclosure": "围场",
        "cc_group": "last_cc_group_name",
        "cc_name": "last_cc_name",
        "students": "学员数",
        "participation_rate": "转介绍参与率",
        "finance_participation_rate": "财务模型参与率",
        "new_coefficient": "带新系数",
        "cargo_ratio": "带货比",
        "checkin_rate": "当月有效打卡率",
        "cc_reach_rate": "CC触达率",
        "ss_reach_rate": "SS触达率",
        "lp_reach_rate": "LP触达率",
        "registrations": "转介绍注册数",
        "payments": "转介绍付费数",
        "revenue_usd": "总带新付费金额USD",
    }

    num_cols = [
        "学员数",
        "转介绍参与率",
        "财务模型参与率",
        "带新系数",
        "带货比",
        "当月有效打卡率",
        "CC触达率",
        "SS触达率",
        "LP触达率",
        "转介绍注册数",
        "转介绍付费数",
        "总带新付费金额USD",
    ]

    enc_col = "围场"
    grp_col = "last_cc_group_name"
    name_col = "last_cc_name"

    if enc_col not in df.columns:
        row_dict: dict[str, Any] = {"enclosure": "全部"}
        for field, col in col_map.items():
            if col in df.columns and col in num_cols:
                row_dict[field] = _safe_float(
                    pd.to_numeric(df[col], errors="coerce").sum()
                )
        return [EnclosureCCMetrics(**row_dict)]

    # 确定 groupby 键
    if group_by == "individual" and name_col in df.columns:
        group_keys = [enc_col, grp_col, name_col]
    elif group_by == "enclosure_x_group" and grp_col in df.columns:
        group_keys = [enc_col, grp_col]
    else:
        group_keys = [enc_col]

    results = []
    for keys, group in df.groupby(group_keys, sort=False):
        if not isinstance(keys, tuple):
            keys = (keys,)

        row_dict = {"enclosure": str(keys[0])}

        # 填充 CC 组名和个人名
        if len(keys) >= 2:
            row_dict["cc_group"] = str(keys[1]) if keys[1] else None
        elif grp_col in group.columns:
            mode_val = group[grp_col].mode()
            row_dict["cc_group"] = str(mode_val.iloc[0]) if not mode_val.empty else None

        if len(keys) >= 3:
            row_dict["cc_name"] = str(keys[2]) if keys[2] else None
        elif name_col in group.columns:
            mode_val = group[name_col].mode()
            row_dict["cc_name"] = str(mode_val.iloc[0]) if not mode_val.empty else None

        for field, col in col_map.items():
            if field in ("enclosure", "cc_group", "cc_name"):
                continue
            if col in group.columns:
                row_dict[field] = _safe_float(
                    pd.to_numeric(group[col], errors="coerce").mean()
                    if "率" in col or "系数" in col or "比" in col
                    else pd.to_numeric(group[col], errors="coerce").sum()
                )

        results.append(EnclosureCCMetrics(**row_dict))

    return results


@router.get(
    "/enclosure",
    response_model=list[EnclosureCCMetrics],
    summary="围场过程数据（D2 有效围场汇总，支持围场×CC组矩阵）",
)
def get_enclosure(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
    group_by: str = "enclosure_x_group",
    enclosure: str | None = Query(None, description="生命周期筛选，如 0M / 6M / 12M+"),
) -> list[EnclosureCCMetrics]:
    data = dm.load_all()
    df = data["enclosure_cc"]
    df = apply_filters(df, filters)
    if enclosure and not df.empty:
        # 优先用"生命周期"列（14段细粒度），fallback "围场"列（7段粗粒度）
        if "生命周期" in df.columns:
            df = df[df["生命周期"].astype(str).str.strip() == enclosure].copy()
        elif "围场" in df.columns:
            df = df[df["围场"].astype(str).str.strip() == enclosure].copy()
    return _df_to_metrics(df, group_by=group_by)


@router.get(
    "/enclosure/ranking",
    response_model=list[EnclosureCCMetrics],
    summary="围场排名（按注册数降序）",
)
def get_enclosure_ranking(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> list[EnclosureCCMetrics]:
    data = dm.load_all()
    df = apply_filters(data["enclosure_cc"], filters)
    metrics = _df_to_metrics(df)
    # 按注册数降序
    return sorted(
        metrics,
        key=lambda m: m.registrations or 0,
        reverse=True,
    )
