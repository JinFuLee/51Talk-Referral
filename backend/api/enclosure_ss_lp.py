"""SS/LP 围场过程数据 API"""

from __future__ import annotations

from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.enclosure_ss_lp import EnclosureLPMetrics, EnclosureSSMetrics
from backend.models.filters import UnifiedFilter, parse_filters

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


def _df_to_ss_metrics(df: pd.DataFrame) -> list[EnclosureSSMetrics]:
    """将 D2-SS DataFrame 按围场分组聚合成 EnclosureSSMetrics 列表"""
    if df.empty:
        return []

    col_map = {
        "enclosure": "围场",
        "ss_group": "last_ss_group_name",
        "ss_name": "last_ss_name",
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
        "registration_rate": "注册转化率",
    }

    num_cols = {
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
        "注册转化率",
    }

    group_col = "围场"
    if group_col not in df.columns:
        row_dict: dict[str, Any] = {"enclosure": "全部"}
        for field, col in col_map.items():
            if col in df.columns and col in num_cols:
                row_dict[field] = _safe_float(
                    pd.to_numeric(df[col], errors="coerce").sum()
                )
        return [EnclosureSSMetrics(**row_dict)]

    results = []
    for enclosure, group in df.groupby(group_col, sort=False):
        row_dict = {"enclosure": str(enclosure)}

        # SS 姓名取众数
        for str_field, col in [
            ("ss_group", "last_ss_group_name"),
            ("ss_name", "last_ss_name"),
        ]:
            if col in group.columns:
                mode_val = group[col].mode()
                row_dict[str_field] = (
                    str(mode_val.iloc[0]) if not mode_val.empty else None
                )

        for field, col in col_map.items():
            if field in ("enclosure", "ss_group", "ss_name"):
                continue
            if col in group.columns:
                row_dict[field] = _safe_float(
                    pd.to_numeric(group[col], errors="coerce").mean()
                    if "率" in col or "系数" in col or "比" in col
                    else pd.to_numeric(group[col], errors="coerce").sum()
                )

        results.append(EnclosureSSMetrics(**row_dict))

    return results


def _df_to_lp_metrics(df: pd.DataFrame) -> list[EnclosureLPMetrics]:
    """将 D2-LP DataFrame 按围场分组聚合成 EnclosureLPMetrics 列表"""
    if df.empty:
        return []

    col_map = {
        "enclosure": "围场",
        "lp_group": "last_lp_group_name",
        "lp_name": "last_lp_name",
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
        "registration_rate": "注册转化率",
    }

    group_col = "围场"
    if group_col not in df.columns:
        row_dict: dict[str, Any] = {"enclosure": "全部"}
        for field, col in col_map.items():
            if col in df.columns:
                row_dict[field] = _safe_float(
                    pd.to_numeric(df[col], errors="coerce").sum()
                )
        return [EnclosureLPMetrics(**row_dict)]

    results = []
    for enclosure, group in df.groupby(group_col, sort=False):
        row_dict = {"enclosure": str(enclosure)}

        # LP 姓名取众数
        for str_field, col in [
            ("lp_group", "last_lp_group_name"),
            ("lp_name", "last_lp_name"),
        ]:
            if col in group.columns:
                mode_val = group[col].mode()
                row_dict[str_field] = (
                    str(mode_val.iloc[0]) if not mode_val.empty else None
                )

        for field, col in col_map.items():
            if field in ("enclosure", "lp_group", "lp_name"):
                continue
            if col in group.columns:
                row_dict[field] = _safe_float(
                    pd.to_numeric(group[col], errors="coerce").mean()
                    if "率" in col or "系数" in col or "比" in col
                    else pd.to_numeric(group[col], errors="coerce").sum()
                )

        results.append(EnclosureLPMetrics(**row_dict))

    return results


@router.get(
    "/enclosure-ss",
    response_model=list[EnclosureSSMetrics],
    summary="SS 围场过程指标（D2-SS 有效围场汇总）",
)
def get_enclosure_ss(
    request: Request,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
    enclosure: str | None = Query(None, description="生命周期筛选，如 0M / 6M / 12M+"),
) -> list[EnclosureSSMetrics]:
    data = dm.load_all()
    df = data.get("enclosure_ss", pd.DataFrame())
    if enclosure and not df.empty:
        if "生命周期" in df.columns:
            df = df[df["生命周期"].astype(str).str.strip() == enclosure].copy()
        elif "围场" in df.columns:
            df = df[df["围场"].astype(str).str.strip() == enclosure].copy()
    return _df_to_ss_metrics(df)


@router.get(
    "/enclosure-ss/ranking",
    response_model=list[EnclosureSSMetrics],
    summary="SS 围场排名（按注册数降序）",
)
def get_enclosure_ss_ranking(
    request: Request,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> list[EnclosureSSMetrics]:
    data = dm.load_all()
    metrics = _df_to_ss_metrics(data.get("enclosure_ss", pd.DataFrame()))
    return sorted(metrics, key=lambda m: m.registrations or 0, reverse=True)


@router.get(
    "/enclosure-lp",
    response_model=list[EnclosureLPMetrics],
    summary="LP 围场过程指标（D2-LP 有效围场汇总）",
)
def get_enclosure_lp(
    request: Request,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
    enclosure: str | None = Query(None, description="生命周期筛选，如 0M / 6M / 12M+"),
) -> list[EnclosureLPMetrics]:
    data = dm.load_all()
    df = data.get("enclosure_lp", pd.DataFrame())
    if enclosure and not df.empty:
        if "生命周期" in df.columns:
            df = df[df["生命周期"].astype(str).str.strip() == enclosure].copy()
        elif "围场" in df.columns:
            df = df[df["围场"].astype(str).str.strip() == enclosure].copy()
    return _df_to_lp_metrics(df)


@router.get(
    "/enclosure-lp/ranking",
    response_model=list[EnclosureLPMetrics],
    summary="LP 围场排名（按注册数降序）",
)
def get_enclosure_lp_ranking(
    request: Request,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> list[EnclosureLPMetrics]:
    data = dm.load_all()
    metrics = _df_to_lp_metrics(data.get("enclosure_lp", pd.DataFrame()))
    return sorted(metrics, key=lambda m: m.registrations or 0, reverse=True)


@router.get(
    "/team/ss-ranking",
    response_model=list[EnclosureSSMetrics],
    summary="SS 个人排名（按注册数降序）",
)
def get_ss_ranking(
    request: Request,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> list[EnclosureSSMetrics]:
    """按 SS 个人维度聚合（跨围场汇总），再按注册数降序"""
    data = dm.load_all()
    df = data.get("enclosure_ss", pd.DataFrame())
    if df.empty:
        return []

    name_col = "last_ss_name"
    if name_col not in df.columns:
        return _df_to_ss_metrics(df)

    results = []
    num_sum_cols = ["学员数", "转介绍注册数", "转介绍付费数", "总带新付费金额USD"]
    num_mean_cols = [
        "转介绍参与率",
        "带新系数",
        "带货比",
        "当月有效打卡率",
        "CC触达率",
        "SS触达率",
        "LP触达率",
        "注册转化率",
    ]

    for ss_name, group in df.groupby(name_col, sort=False):
        row_dict: dict[str, Any] = {"enclosure": "全部", "ss_name": str(ss_name)}

        if "last_ss_group_name" in group.columns:
            mode_val = group["last_ss_group_name"].mode()
            row_dict["ss_group"] = str(mode_val.iloc[0]) if not mode_val.empty else None

        for col in num_sum_cols:
            if col in group.columns:
                row_dict[_cn_to_field(col)] = _safe_float(
                    pd.to_numeric(group[col], errors="coerce").sum()
                )
        for col in num_mean_cols:
            if col in group.columns:
                row_dict[_cn_to_field(col)] = _safe_float(
                    pd.to_numeric(group[col], errors="coerce").mean()
                )

        results.append(EnclosureSSMetrics(**row_dict))

    return sorted(results, key=lambda m: m.registrations or 0, reverse=True)


@router.get(
    "/team/lp-ranking",
    response_model=list[EnclosureLPMetrics],
    summary="LP 个人排名（按注册数降序）",
)
def get_lp_ranking(
    request: Request,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> list[EnclosureLPMetrics]:
    """按 LP 个人维度聚合（跨围场汇总），再按注册数降序"""
    data = dm.load_all()
    df = data.get("enclosure_lp", pd.DataFrame())
    if df.empty:
        return []

    name_col = "last_lp_name"
    if name_col not in df.columns:
        return _df_to_lp_metrics(df)

    results = []
    num_sum_cols = ["学员数", "转介绍注册数", "转介绍付费数", "总带新付费金额USD"]
    num_mean_cols = [
        "转介绍参与率",
        "带新系数",
        "带货比",
        "当月有效打卡率",
        "CC触达率",
        "SS触达率",
        "LP触达率",
        "注册转化率",
    ]

    for lp_name, group in df.groupby(name_col, sort=False):
        row_dict: dict[str, Any] = {"enclosure": "全部", "lp_name": str(lp_name)}

        if "last_lp_group_name" in group.columns:
            mode_val = group["last_lp_group_name"].mode()
            row_dict["lp_group"] = str(mode_val.iloc[0]) if not mode_val.empty else None

        for col in num_sum_cols:
            if col in group.columns:
                row_dict[_cn_to_field_lp(col)] = _safe_float(
                    pd.to_numeric(group[col], errors="coerce").sum()
                )
        for col in num_mean_cols:
            if col in group.columns:
                row_dict[_cn_to_field_lp(col)] = _safe_float(
                    pd.to_numeric(group[col], errors="coerce").mean()
                )

        results.append(EnclosureLPMetrics(**row_dict))

    return sorted(results, key=lambda m: m.registrations or 0, reverse=True)


def _cn_to_field(col: str) -> str:
    """中文列名 → EnclosureSSMetrics 字段名"""
    _MAP = {
        "学员数": "students",
        "转介绍参与率": "participation_rate",
        "带新系数": "new_coefficient",
        "带货比": "cargo_ratio",
        "当月有效打卡率": "checkin_rate",
        "CC触达率": "cc_reach_rate",
        "SS触达率": "ss_reach_rate",
        "LP触达率": "lp_reach_rate",
        "转介绍注册数": "registrations",
        "转介绍付费数": "payments",
        "总带新付费金额USD": "revenue_usd",
        "注册转化率": "registration_rate",
    }
    return _MAP.get(col, col)


def _cn_to_field_lp(col: str) -> str:
    """中文列名 → EnclosureLPMetrics 字段名（同 SS）"""
    return _cn_to_field(col)
