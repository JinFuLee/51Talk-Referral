"""高潜学员 API"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request

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


def _row_to_hp(row: pd.Series) -> HighPotentialStudent:
    return HighPotentialStudent(
        id=str(row.get("stdt_id", "") or ""),
        enclosure=str(row.get("围场", "") or ""),
        total_new=_safe(row.get("总带新人数")),
        attendance=_safe(row.get("出席数")),
        payments=_safe(row.get("转介绍付费数")),
        cc_name=str(row.get("last_cc_name", "") or ""),
        cc_group=str(row.get("last_cc_group_name", "") or ""),
        ss_name=str(row.get("last_ss_name", "") or ""),
        ss_group=str(row.get("last_ss_group_name", "") or ""),
        lp_name=str(row.get("last_lp_name", "") or ""),
        lp_group=str(row.get("last_lp_group_name", "") or ""),
    )


@router.get(
    "/high-potential",
    response_model=list[HighPotentialStudent],
    summary="高潜学员列表（D5，按带新人数降序）",
)
def get_high_potential(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> list[HighPotentialStudent]:
    data = dm.load_all()
    df = data.get("high_potential", pd.DataFrame())

    if df.empty:
        return []

    students = [_row_to_hp(row) for _, row in df.iterrows()]
    return sorted(students, key=lambda s: s.total_new or 0, reverse=True)
