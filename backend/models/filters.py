"""全站统一筛选参数模型 — SSoT: docs/specs/dimension-framework.md §4.2 + §4.4"""

from __future__ import annotations

import pandas as pd
from fastapi import Query
from pydantic import BaseModel, Field

# 有效围场列表（过程类指标默认范围）
ACTIVE_ENCLOSURES = ["M0", "M1", "M2", "M3", "M4", "M5", "M6+"]

# 渠道枚举值 → 数据列值映射
_CHANNEL_MAP: dict[str, str] = {
    "cc_narrow": "CC窄口径",
    "ss_narrow": "SS窄口径",
    "lp_narrow": "LP窄口径",
    "cc_wide": "CC宽口径",
    "lp_wide": "LP宽口径",
    "ops_wide": "运营宽口径",
}

# data_role → 负责围场列表映射（按 enclosure_role_assignment 配置）
_ROLE_ENCLOSURE_MAP: dict[str, list[str]] = {
    "cc": ["M0", "M1", "M2"],
    "ss": ["M3"],
    "lp": ["M4", "M5", "M6+"],
    "ops": ["M6+"],
}


class UnifiedFilter(BaseModel):
    """全站统一筛选参数，前后端字段名 1:1 匹配"""

    country: str = "TH"
    data_role: str = "all"  # Literal["all","cc","ss","lp","ops"]
    enclosure: list[str] | None = None  # None = active default
    team: str | None = None
    cc: str | None = None
    granularity: str = "month"  # Literal["day","week","month","quarter"]
    funnel_stage: str = "all"  # Literal["all","registration","appointment","attendance","payment"]  # noqa: E501
    channel: str = "all"  # Literal["all","cc_narrow","ss_narrow","lp_narrow","cc_wide","lp_wide","ops_wide"]  # noqa: E501
    behavior: list[str] | None = None  # None = all
    benchmarks: list[str] = Field(default=["target"])


def parse_filters(
    country: str = Query("TH"),
    data_role: str = Query("all"),
    enclosure: str | None = Query(None),  # 逗号分隔: "M0,M1,M2"
    team: str | None = Query(None),
    cc: str | None = Query(None),
    granularity: str = Query("month"),
    funnel_stage: str = Query("all"),
    channel: str = Query("all"),
    behavior: str | None = Query(None),   # 逗号分隔: "gold,effective"
    benchmarks: str = Query("target"),    # 逗号分隔: "target,bm_progress"
) -> UnifiedFilter:
    """FastAPI Depends — 从 query params 解析为 UnifiedFilter"""
    return UnifiedFilter(
        country=country,
        data_role=data_role,
        enclosure=enclosure.split(",") if enclosure else None,
        team=team,
        cc=cc,
        granularity=granularity,
        funnel_stage=funnel_stage,
        channel=channel,
        behavior=behavior.split(",") if behavior else None,
        benchmarks=benchmarks.split(","),
    )


def apply_filters(
    df: pd.DataFrame,
    filters: UnifiedFilter,
    *,
    col_team: str = "团队",
    col_cc: str = "CC",
    col_enclosure: str = "围场",
    col_channel: str = "转介绍类型_新",
) -> pd.DataFrame:
    """统一数据过滤。在 DataManager 返回原始 DataFrame 之后调用。

    过滤顺序（确定性，不可乱序）：
    1. country → 团队名前缀
    2. team → 团队名精确匹配
    3. cc → CC 姓名精确匹配
    4. data_role → 围场角色配置过滤
    5. enclosure → 围场列过滤（None = ACTIVE_ENCLOSURES）
    6. channel → 渠道列过滤

    granularity / funnel_stage / benchmarks / behavior 不在此处处理，
    由各 API 端点自行根据值调整聚合/展示逻辑。
    """
    if df is None or df.empty:
        return df

    # 1. country — 团队名前缀过滤
    if filters.country and filters.country.lower() != "all":
        prefix = filters.country.upper() + "-"
        if col_team in df.columns:
            mask = df[col_team].astype(str).str.upper().str.startswith(prefix)
            df = df[mask]
            if df.empty:
                return df

    # 2. team — 团队名精确匹配
    if filters.team and col_team in df.columns:
        df = df[df[col_team].astype(str) == filters.team]
        if df.empty:
            return df

    # 3. cc — CC 姓名精确匹配
    if filters.cc and col_cc in df.columns:
        df = df[df[col_cc].astype(str) == filters.cc]
        if df.empty:
            return df

    # 4. data_role — 围场角色映射过滤
    if filters.data_role and filters.data_role != "all":
        role_enclosures = _ROLE_ENCLOSURE_MAP.get(filters.data_role)
        if role_enclosures and col_enclosure in df.columns:
            df = df[df[col_enclosure].isin(role_enclosures)]
            if df.empty:
                return df

    # 5. enclosure — 行级围场过滤（None = ACTIVE_ENCLOSURES）
    if col_enclosure in df.columns:
        selected = (
            filters.enclosure if filters.enclosure is not None else ACTIVE_ENCLOSURES
        )
        df = df[df[col_enclosure].isin(selected)]
        if df.empty:
            return df

    # 6. channel — 渠道列过滤
    if filters.channel and filters.channel != "all":
        mapped_value = _CHANNEL_MAP.get(filters.channel)
        if mapped_value and col_channel in df.columns:
            df = df[df[col_channel].astype(str) == mapped_value]
            if df.empty:
                return df

    return df
