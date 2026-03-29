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
    behavior: str | None = Query(None),  # 逗号分隔: "gold,effective"
    benchmarks: str = Query("target"),  # 逗号分隔: "target,bm_progress"
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


def _resolve_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """从候选列名列表中找到 DataFrame 实际存在的第一个。"""
    for c in candidates:
        if c in df.columns:
            return c
    return None


# 每个维度的候选列名（按优先级排列，覆盖已知数据源的列名变体）
_TEAM_CANDIDATES = ["团队", "last_cc_group_name", "team", "Team", "cc_group"]
_CC_CANDIDATES = ["CC", "last_cc_name", "cc_name", "cc", "seller"]
_ENCLOSURE_CANDIDATES = ["围场", "生命周期", "enclosure", "Enclosure"]
_CHANNEL_CANDIDATES = ["转介绍类型_新", "channel", "渠道", "Channel"]


def apply_filters(
    df: pd.DataFrame,
    filters: UnifiedFilter,
    *,
    col_team: str | None = None,
    col_cc: str | None = None,
    col_enclosure: str | None = None,
    col_channel: str | None = None,
) -> pd.DataFrame:
    """统一数据过滤。在 DataManager 返回原始 DataFrame 之后调用。

    列名自动推断：如果不传 col_* 参数，会从 DataFrame 实际列中自动匹配。
    也可显式传入 col_team="xxx" 覆盖自动推断。

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

    # 自动推断列名（显式传入优先）
    team_col = col_team or _resolve_col(df, _TEAM_CANDIDATES)
    cc_col = col_cc or _resolve_col(df, _CC_CANDIDATES)
    enc_col = col_enclosure or _resolve_col(df, _ENCLOSURE_CANDIDATES)
    ch_col = col_channel or _resolve_col(df, _CHANNEL_CANDIDATES)

    # 1. country — 团队名前缀过滤
    if filters.country and filters.country.lower() != "all":
        prefix = filters.country.upper() + "-"
        if team_col and team_col in df.columns:
            mask = df[team_col].astype(str).str.upper().str.startswith(prefix)
            df = df[mask]
            if df.empty:
                return df

    # 2. team — 团队名精确匹配
    if filters.team and team_col and team_col in df.columns:
        df = df[df[team_col].astype(str) == filters.team]
        if df.empty:
            return df

    # 3. cc — CC 姓名精确匹配
    if filters.cc and cc_col and cc_col in df.columns:
        df = df[df[cc_col].astype(str) == filters.cc]
        if df.empty:
            return df

    # 4. data_role — 围场角色映射过滤
    if filters.data_role and filters.data_role != "all":
        role_enclosures = _ROLE_ENCLOSURE_MAP.get(filters.data_role)
        if role_enclosures and enc_col and enc_col in df.columns:
            df = df[df[enc_col].isin(role_enclosures)]
            if df.empty:
                return df

    # 5. enclosure — 行级围场过滤（None = 不过滤，保留全部）
    if filters.enclosure is not None and enc_col and enc_col in df.columns:
        df = df[df[enc_col].isin(filters.enclosure)]
        if df.empty:
            return df

    # 6. channel — 渠道列过滤
    if filters.channel and filters.channel != "all":
        mapped_value = _CHANNEL_MAP.get(filters.channel)
        if mapped_value and ch_col and ch_col in df.columns:
            df = df[df[ch_col].astype(str) == mapped_value]
            if df.empty:
                return df

    return df
