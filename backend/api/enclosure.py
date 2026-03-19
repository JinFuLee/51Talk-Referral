"""围场分析 API"""

from __future__ import annotations

from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.enclosure import EnclosureCCMetrics

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


def _df_to_metrics(df: pd.DataFrame) -> list[EnclosureCCMetrics]:
    """将 D2 DataFrame 按围场分组聚合成 EnclosureCCMetrics 列表"""
    if df.empty:
        return []

    col_map = {
        "enclosure": "围场",
        "cc_group": "last_cc_group_name",
        "cc_name": "last_cc_name",
        "students": "学员数",
        "participation_rate": "转介绍参与率",
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

    # 数值列做聚合，字符串列取 first
    num_cols = [
        "学员数",
        "转介绍参与率",
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
    group_col = "围场"
    if group_col not in df.columns:
        # 若围场列缺失，返回单条汇总
        row_dict: dict[str, Any] = {"enclosure": "全部"}
        for field, col in col_map.items():
            if col in df.columns and col in num_cols:
                row_dict[field] = _safe_float(
                    pd.to_numeric(df[col], errors="coerce").sum()
                )
        return [EnclosureCCMetrics(**row_dict)]

    results = []
    for enclosure, group in df.groupby(group_col, sort=False):
        row_dict = {"enclosure": str(enclosure)}
        # CC 名称取最多的（众数）
        for str_field, col in [
            ("cc_group", "last_cc_group_name"),
            ("cc_name", "last_cc_name"),
        ]:
            if col in group.columns:
                mode_val = group[col].mode()
                row_dict[str_field] = (
                    str(mode_val.iloc[0]) if not mode_val.empty else None
                )

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
    summary="围场过程数据（D2 有效围场汇总）",
)
def get_enclosure(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> list[EnclosureCCMetrics]:
    data = dm.load_all()
    return _df_to_metrics(data["enclosure_cc"])


@router.get(
    "/enclosure/ranking",
    response_model=list[EnclosureCCMetrics],
    summary="围场排名（按注册数降序）",
)
def get_enclosure_ranking(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> list[EnclosureCCMetrics]:
    data = dm.load_all()
    metrics = _df_to_metrics(data["enclosure_cc"])
    # 按注册数降序
    return sorted(
        metrics,
        key=lambda m: m.registrations or 0,
        reverse=True,
    )
