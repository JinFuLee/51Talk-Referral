"""CC 团队排名 API"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()


def _safe_float(val) -> float | None:
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
        return None


@router.get("/team/summary", summary="CC 团队/个人带新汇总排名")
def get_team_summary(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> list[dict[str, Any]]:
    """按 CC 分组聚合 D2 围场数据，计算带新注册/付费/金额"""
    data = dm.load_all()
    df = data.get("enclosure_cc", pd.DataFrame())

    if df.empty:
        return []

    cc_col = "last_cc_name"
    group_col = "last_cc_group_name"

    if cc_col not in df.columns:
        return []

    # 数值聚合列
    num_cols = {
        "registrations": "转介绍注册数",
        "payments": "转介绍付费数",
        "revenue_usd": "总带新付费金额USD",
        "students": "学员数",
        "participation_rate": "转介绍参与率",
        "checkin_rate": "当月有效打卡率",
        "cc_reach_rate": "CC触达率",
    }

    # _is_active 列由 EnclosureCCLoader 写入（有效围场=True，非有效=False）
    has_active_col = "_is_active" in df.columns

    results = []
    for cc_name, group in df.groupby(cc_col, sort=False):
        if not cc_name or str(cc_name).strip() in ("nan", "NaN", ""):
            continue

        row: dict[str, Any] = {
            "cc_name": str(cc_name),
            "cc_group": str(group[group_col].mode().iloc[0])
            if group_col in group.columns and not group[group_col].mode().empty
            else None,
        }
        # 有效围场子集（用于 MEAN 指标）
        group_active = group[group["_is_active"]] if has_active_col else group
        for field, col in num_cols.items():
            if "率" in col:
                # MEAN 指标：仅对有效围场求均值，非有效围场过期学员不参与
                if col in group_active.columns:
                    series = pd.to_numeric(group_active[col], errors="coerce")
                    row[field] = _safe_float(series.mean())
                else:
                    row[field] = None
            else:
                # SUM 指标：使用全部行（含非有效围场），业绩是真实收入
                if col in group.columns:
                    series = pd.to_numeric(group[col], errors="coerce")
                    row[field] = _safe_float(series.sum())
                else:
                    row[field] = None

        results.append(row)

    # 按注册数降序
    results.sort(key=lambda r: r.get("registrations") or 0, reverse=True)
    return results
