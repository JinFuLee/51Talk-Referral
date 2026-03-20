"""D3 触达质量分析 API

暴露 D3 明细表中此前未被 API 覆盖的关键列：
- CC接通 / SS接通 / LP接通（触达质量）
- 有效打卡
- 转介绍注册数 / 转介绍付费数 / 总带新付费金额USD（按人明细聚合）
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()


# ── 响应模型 ────────────────────────────────────────────────────────────────────


class OutreachQualityRow(BaseModel):
    """按围场/CC 组聚合的触达质量行"""

    enclosure: str | None = None
    cc_group: str | None = None
    # 触达质量（接通数，非接通率）
    cc_connected: float | None = None
    ss_connected: float | None = None
    lp_connected: float | None = None
    # 有效打卡
    effective_checkin: float | None = None
    # 转介绍产出（按人明细汇总）
    referral_registrations: float | None = None
    referral_payments: float | None = None
    referral_revenue_usd: float | None = None
    # 衍生率（接通率 = 接通 / 总学员数，分母由 students 提供）
    students: float | None = None


class OutreachQualitySummary(BaseModel):
    """全量汇总 + 分围场明细"""

    summary: OutreachQualityRow
    by_enclosure: list[OutreachQualityRow]


# ── 列名常量 ────────────────────────────────────────────────────────────────────

# D3 明细表中可能出现的列名变体（空格/换行处理后）
_COL_ALIASES: dict[str, list[str]] = {
    "enclosure": ["生命周期", "围场"],
    "cc_group": ["末次CC员工组名称", "CC组名称", "cc_group"],
    "cc_connected": ["CC接通", "CC有效接通"],
    "ss_connected": ["SS接通", "SS有效接通"],
    "lp_connected": ["LP接通", "LP有效接通"],
    "effective_checkin": ["有效打卡", "本月有效打卡"],
    "referral_registrations": ["转介绍注册数", "当月推荐注册人数", "总推荐注册人数"],
    "referral_payments": ["转介绍付费数", "本月推荐付费数"],
    "referral_revenue_usd": ["总带新付费金额USD", "总带新付费金额"],
}


def _resolve_col(df: pd.DataFrame, key: str) -> str | None:
    """在 df 中找到第一个匹配的候选列名"""
    for candidate in _COL_ALIASES.get(key, []):
        if candidate in df.columns:
            return candidate
    return None


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _aggregate_group(
    group: pd.DataFrame, col_map: dict[str, str | None]
) -> dict[str, Any]:
    """对一组行聚合触达质量指标（求和）"""
    row: dict[str, Any] = {}

    sum_keys = [
        "cc_connected",
        "ss_connected",
        "lp_connected",
        "effective_checkin",
        "referral_registrations",
        "referral_payments",
        "referral_revenue_usd",
    ]
    for key in sum_keys:
        col = col_map.get(key)
        if col and col in group.columns:
            row[key] = _safe_float(pd.to_numeric(group[col], errors="coerce").sum())
        else:
            row[key] = None

    row["students"] = float(len(group))
    return row


def _build_response(df: pd.DataFrame) -> OutreachQualitySummary:
    if df.empty:
        empty = OutreachQualityRow(enclosure="全部")
        return OutreachQualitySummary(summary=empty, by_enclosure=[])

    # 解析列名
    col_map = {key: _resolve_col(df, key) for key in _COL_ALIASES}

    # 全量汇总
    summary_data = _aggregate_group(df, col_map)
    summary_data["enclosure"] = "全部"
    summary = OutreachQualityRow(**summary_data)

    # 按围场分组
    enclosure_col = col_map.get("enclosure")
    cc_group_col = col_map.get("cc_group")

    by_enclosure: list[OutreachQualityRow] = []
    if enclosure_col and enclosure_col in df.columns:
        for enc_val, enc_group in df.groupby(enclosure_col, sort=False):
            agg = _aggregate_group(enc_group, col_map)
            agg["enclosure"] = str(enc_val)
            if cc_group_col and cc_group_col in enc_group.columns:
                mode_val = enc_group[cc_group_col].mode()
                agg["cc_group"] = str(mode_val.iloc[0]) if not mode_val.empty else None
            by_enclosure.append(OutreachQualityRow(**agg))
    else:
        # 无围场列，返回单条汇总
        summary_data["enclosure"] = "全部"
        by_enclosure.append(OutreachQualityRow(**summary_data))

    return OutreachQualitySummary(summary=summary, by_enclosure=by_enclosure)


# ── 路由 ────────────────────────────────────────────────────────────────────────


@router.get(
    "/analysis/outreach-quality",
    response_model=OutreachQualitySummary,
    summary="D3 触达质量分析（CC/SS/LP 接通 + 有效打卡 + 转介绍产出）",
)
def get_outreach_quality(
    request: Request,
    dm: DataManager = Depends(get_data_manager),  # noqa: B008
) -> OutreachQualitySummary:
    """
    基于 D3 明细数据聚合触达质量指标。

    返回字段说明：
    - `cc_connected` / `ss_connected` / `lp_connected`：各角色接通次数
    - `effective_checkin`：有效打卡次数
    - `referral_registrations` / `referral_payments` / `referral_revenue_usd`：
      转介绍产出
    - `students`：当前分组学员数（可用作接通率分母）
    """
    data = dm.load_all()
    df: pd.DataFrame = data.get("detail", pd.DataFrame())
    return _build_response(df)
