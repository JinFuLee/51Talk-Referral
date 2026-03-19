"""学员明细 API"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.common import PaginatedResponse
from backend.models.member import StudentBrief, StudentDetail

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


def _row_to_brief(row: pd.Series) -> StudentBrief:
    return StudentBrief(
        id=str(row.get("学员id", "") or row.get("stdt_id", "") or ""),
        name=str(row.get("真实姓名", "") or ""),
        enclosure=str(row.get("生命周期", "") or ""),
        lifecycle=str(row.get("生命周期", "") or ""),
        cc_name=str(row.get("末次CC员工姓名", "") or ""),
        cc_group=str(row.get("末次CC员工组名称", "") or ""),
        registrations=_safe(row.get("当月推荐注册人数") or row.get("总推荐注册人数")),
        appointments=_safe(row.get("当月推荐出席人数")),
        attendance=_safe(row.get("当月推荐出席人数")),
        payments=_safe(row.get("本月推荐付费数")),
    )


def _row_to_detail(row: pd.Series) -> StudentDetail:
    brief = _row_to_brief(row)
    extra: dict[str, Any] = {}
    for col in row.index:
        extra[col] = _safe(row[col])

    return StudentDetail(
        **brief.model_dump(),
        region=str(row.get("区域", "") or ""),
        business_line=str(row.get("业务线", "") or ""),
        country=str(row.get("当前国家名称", "") or ""),
        teacher_level=str(row.get("当前菲教级别", "") or ""),
        first_paid_date=str(row.get("首次1v1大单付费日期(day)", "") or ""),
        checkin_last_month=_safe(row.get("上月打卡天数")),
        checkin_this_month=_safe(row.get("本月打卡天数")),
        referral_reward_status=str(row.get("推荐奖励领取状态", "") or ""),
        ss_name=str(row.get("末次SS员工姓名", "") or ""),
        ss_group=str(row.get("末次SS员工姓名/组", "") or ""),
        lp_name=str(row.get("末次LP员工姓名", "") or ""),
        lp_group=str(row.get("末次LP员工组", "") or ""),
        total_revenue_usd=_safe(row.get("首次1v1大单付费金额")),
        extra=extra,
    )


@router.get("/members", summary="学员列表（分页）")
def get_members(
    request: Request,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    dm: DataManager = Depends(get_data_manager),
) -> PaginatedResponse:
    data = dm.load_all()
    df = data.get("students", pd.DataFrame())

    if df.empty:
        return PaginatedResponse(items=[], total=0, page=page, size=size, pages=0)

    total = len(df)
    pages = math.ceil(total / size)
    start = (page - 1) * size
    end = start + size
    page_df = df.iloc[start:end]

    items = [_row_to_brief(row).model_dump() for _, row in page_df.iterrows()]
    return PaginatedResponse(
        items=items, total=total, page=page, size=size, pages=pages
    )


@router.get("/members/{student_id}", response_model=StudentDetail, summary="学员详情")
def get_member_detail(
    student_id: str,
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> StudentDetail:
    data = dm.load_all()
    df = data.get("students", pd.DataFrame())

    if df.empty:
        raise HTTPException(status_code=404, detail="学员数据未加载")

    # 按 学员id 或 stdt_id 查找
    id_col = "学员id" if "学员id" in df.columns else "stdt_id"
    if id_col not in df.columns:
        raise HTTPException(status_code=404, detail="学员ID列未找到")

    mask = df[id_col].astype(str) == str(student_id)
    matches = df[mask]

    if matches.empty:
        raise HTTPException(status_code=404, detail=f"学员 {student_id} 不存在")

    return _row_to_detail(matches.iloc[0])
