"""高潜学员 API"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.member import HighPotentialStudent

router = APIRouter()


def _safe(val) -> Any:
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


def _days_since_cc_contact(row: pd.Series) -> int | None:
    """计算 CC 末次接通日期距今天数"""
    cc_last_call_candidates = ["CC末次接通日期", "末次CC接通日期", "cc_last_call_date"]
    for col in cc_last_call_candidates:
        val = row.get(col)
        if val is not None and str(val).strip():
            try:
                dt = pd.to_datetime(val)
                if pd.notna(dt):
                    today = pd.Timestamp.today().normalize()
                    delta = (today - dt.normalize()).days
                    return int(delta)
            except (ValueError, TypeError):
                pass
    return None


def _row_to_hp(row: pd.Series) -> HighPotentialStudent:
    attendance = _safe(row.get("出席数"))
    return HighPotentialStudent(
        id=str(row.get("stdt_id", "") or ""),
        enclosure=str(row.get("围场", "") or ""),
        total_new=_safe(row.get("总带新人数")),
        attendance=attendance,
        payments=_safe(row.get("转介绍付费数")),
        cc_name=str(row.get("last_cc_name", "") or ""),
        cc_group=str(row.get("last_cc_group_name", "") or ""),
        ss_name=str(row.get("last_ss_name", "") or ""),
        ss_group=str(row.get("last_ss_group_name", "") or ""),
        lp_name=str(row.get("last_lp_name", "") or ""),
        lp_group=str(row.get("last_lp_group_name", "") or ""),
        stat_date=str(row.get("统计日期", "") or "") or None,
        region=str(row.get("区域", "") or "") or None,
        business_line=str(row.get("业务线", "") or "") or None,
        days_since_last_cc_contact=_days_since_cc_contact(row),
        deep_engagement=bool(attendance is not None and attendance >= 2),
    )


@router.get(
    "/high-potential",
    response_model=list[HighPotentialStudent],
    summary="高潜学员列表（D5，按带新人数降序）",
)
def get_high_potential(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    team: str | None = Query(default=None, description="团队名称筛选，精确匹配 last_cc_group_name"),
    cc: str | None = Query(default=None, description="CC 姓名模糊筛选，匹配 last_cc_name"),
) -> list[HighPotentialStudent]:
    data = dm.load_all()
    df = data.get("high_potential", pd.DataFrame())

    if df.empty:
        return []

    # 团队筛选（精确匹配）
    if team and "last_cc_group_name" in df.columns:
        df = df[df["last_cc_group_name"].astype(str) == team]

    # CC 姓名模糊筛选
    if cc and "last_cc_name" in df.columns:
        df = df[df["last_cc_name"].astype(str).str.contains(cc, case=False, na=False)]

    students = [_row_to_hp(row) for _, row in df.iterrows()]
    return sorted(students, key=lambda s: s.total_new or 0, reverse=True)
