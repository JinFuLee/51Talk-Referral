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

# M 标签 ↔ 原始围场值双向映射（数据源格式不同：D2=M标签, D3/D4=原始值）
_M_TO_RAW: dict[str, str] = {
    "M0": "0~30", "M1": "31~60", "M2": "61~90", "M3": "91~120",
    "M4": "121~150", "M5": "151~180", "M6+": "M6+",
}


def _get_role_enclosure_map() -> dict[str, list[str]]:
    """从 config 动态生成 data_role → 围场列表映射。

    读取 _checkin_config._get_wide_role()（三层优先级），
    展开为 M 标签 + 原始围场值两种格式（兼容不同数据源）。
    """
    try:
        from backend.api._checkin_config import _get_wide_role
        wide_role = _get_wide_role()
    except Exception:
        # 启动阶段 import 可能失败，返回空让 apply_filters 跳过 data_role 过滤
        return {}

    result: dict[str, list[str]] = {}
    for role, bands in wide_role.items():
        key = role.lower()
        if key == "运营":
            key = "ops"
        expanded: list[str] = []
        for band in bands:
            expanded.append(band)
            # 原始值 → 找对应 M 标签
            for m, raw in _M_TO_RAW.items():
                if raw == band and m not in expanded:
                    expanded.append(m)
            # M 标签 → 找对应原始值
            raw_val = _M_TO_RAW.get(band)
            if raw_val and raw_val not in expanded:
                expanded.append(raw_val)
        result[key] = expanded
    return result


class UnifiedFilter(BaseModel):
    """全站统一筛选参数，前后端字段名 1:1 匹配"""

    country: str = "TH"
    data_role: str = "all"  # Literal["all","cc","ss","lp","ops"]
    enclosure: list[str] | None = None  # None = active default
    team: str | None = None
    cc: str | None = None
    channel: str = "all"  # Literal["all","cc_narrow","ss_narrow","lp_narrow","cc_wide","lp_wide","ops_wide"]  # noqa: E501
    benchmarks: list[str] = Field(default=["target"])


def parse_filters(
    country: str = Query("TH"),
    data_role: str = Query("all"),
    enclosure: str | None = Query(None),  # 逗号分隔: "M0,M1,M2"
    team: str | None = Query(None),
    cc: str | None = Query(None),
    channel: str = Query("all"),
    benchmarks: str = Query("target"),  # 逗号分隔: "target,bm_progress"
) -> UnifiedFilter:
    """FastAPI Depends — 从 query params 解析为 UnifiedFilter"""
    return UnifiedFilter(
        country=country,
        data_role=data_role,
        enclosure=enclosure.split(",") if enclosure else None,
        team=team,
        cc=cc,
        channel=channel,
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

    benchmarks 不在此处处理，由各 API 端点自行根据值调整聚合/展示逻辑。
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

    # 4. data_role — 围场角色映射过滤（从 config 动态读取，非硬编码）
    if filters.data_role and filters.data_role != "all":
        role_enclosures = _get_role_enclosure_map().get(filters.data_role)
        if role_enclosures and enc_col and enc_col in df.columns:
            df = df[df[enc_col].isin(role_enclosures)]
            if df.empty:
                return df

    # 5. enclosure — 行级围场过滤（None = 不过滤，保留全部）
    # M 标签（M0/M1...）→ D3 原始围场值（0~30/31~60...）展开，
    # 同时保留 M 标签本身以兼容 D4（生命周期列用 M 标签格式）
    if filters.enclosure is not None and enc_col and enc_col in df.columns:
        _M_LABEL_TO_RAW = {
            "M0": "0~30", "M1": "31~60", "M2": "61~90", "M3": "91~120",
            "M4": "121~150", "M5": "151~180", "M6": "6M", "M7": "7M",
            "M8": "8M", "M9": "9M", "M10": "10M", "M11": "11M",
            "M12": "12M", "M12+": "12M+", "M6+": "M6+",
        }
        expanded: set[str] = set()
        for enc in filters.enclosure:
            expanded.add(enc)  # 保留原值（M 标签，兼容 D4）
            raw = _M_LABEL_TO_RAW.get(enc)
            if raw:
                expanded.add(raw)  # 加入 D3 原始值
        df = df[df[enc_col].isin(expanded)]
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
