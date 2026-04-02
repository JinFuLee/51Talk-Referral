"""学员明细 API"""

from __future__ import annotations

import math
from backend.core.date_override import get_today
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.common import PaginatedResponse
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters
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
    cc_last_call_raw = row.get("CC末次拨打日期(day)")
    cc_last_call = None
    if cc_last_call_raw is not None:
        s = str(cc_last_call_raw)
        # 过滤掉 epoch 占位符
        cc_last_call = None if s.startswith("1970") else s[:10] if len(s) >= 10 else s

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
        checkin_this_month=_safe(row.get("本月打卡天数")),
        lesson_consumed_this_month=_safe(row.get("本月课耗")),
        referral_code_count_this_month=_safe(row.get("本月转码次数")),
        referral_reward_status=str(row.get("推荐奖励领取状态", "") or "") or None,
        days_until_card_expiry=_safe(row.get("次卡距到期天数")),
        cc_last_call_date=cc_last_call,
    )


def _row_to_detail(row: pd.Series) -> StudentDetail:
    brief = _row_to_brief(row)
    extra: dict[str, Any] = {}
    for col in row.index:
        extra[col] = _safe(row[col])

    brief_data = brief.model_dump()
    return StudentDetail(
        **brief_data,
        region=str(row.get("区域", "") or ""),
        business_line=str(row.get("业务线", "") or ""),
        country=str(row.get("当前国家名称", "") or ""),
        teacher_level=str(row.get("当前菲教级别", "") or ""),
        first_paid_date=str(row.get("首次1v1大单付费日期(day)", "") or ""),
        checkin_last_month=_safe(row.get("上月打卡天数")),
        ss_name=str(row.get("末次SS员工姓名", "") or ""),
        ss_group=str(row.get("末次SS员工姓名/组", "") or ""),
        lp_name=str(row.get("末次LP员工姓名", "") or ""),
        lp_group=str(row.get("末次LP员工组", "") or ""),
        total_revenue_usd=_safe(row.get("首次1v1大单付费金额")),
        extra=extra,
    )


def _contact_days_int(raw_date) -> float | None:
    """计算 CC末次接通/拨打距今天数"""
    if raw_date is None:
        return None
    s = str(raw_date)
    if not s or s.startswith("1970") or s == "nan":
        return None
    try:
        d = pd.to_datetime(s[:10]).date()
        return (get_today() - d).days
    except Exception:
        return None


@router.get("/members", summary="学员列表（分页）")
def get_members(
    request: Request,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    enclosure: str | None = Query(default=None, description="围场段筛选"),
    cc: str | None = Query(default=None, description="CC姓名筛选（模糊）"),
    contact_days: str | None = Query(
        default=None,
        description="失联天数筛选: le7 / 8to14 / ge15",
    ),
    card_health: str | None = Query(
        default=None,
        description="次卡健康度: healthy(>30天) / watch(15-30天) / risk(≤14天)",
    ),
    has_referral: bool | None = Query(
        default=None, description="仅展示当月有带新记录的学员"
    ),
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> PaginatedResponse:
    data = dm.load_all()
    df = apply_filters(data.get("students", pd.DataFrame()), filters)

    if df.empty:
        return PaginatedResponse(items=[], total=0, page=page, size=size, pages=0)

    # 围场筛选
    if enclosure:
        lc_col = "生命周期"
        if lc_col in df.columns:
            df = df[df[lc_col].astype(str).str.contains(enclosure, na=False)]

    # CC 筛选
    if cc:
        cc_col = "末次CC员工姓名"
        if cc_col in df.columns:
            df = df[df[cc_col].astype(str).str.contains(cc, na=False)]

    # 失联天数筛选
    if contact_days:
        contact_col = next(
            (
                c
                for c in ["CC末次接通日期(day)", "CC末次拨打日期(day)"]
                if c in df.columns
            ),
            None,
        )
        if contact_col:
            df = df.copy()
            df["_contact_days"] = df[contact_col].apply(_contact_days_int)
            if contact_days == "le7":
                df = df[df["_contact_days"].notna() & (df["_contact_days"] <= 7)]
            elif contact_days == "8to14":
                cd = df["_contact_days"]
                df = df[cd.notna() & (cd >= 8) & (cd <= 14)]
            elif contact_days == "ge15":
                cd = df["_contact_days"]
                df = df[cd.isna() | (cd >= 15)]

    # 次卡健康度筛选
    if card_health:
        expiry_col = "次卡距到期天数"
        if expiry_col in df.columns:
            df = df.copy()
            df["_expiry"] = pd.to_numeric(df[expiry_col], errors="coerce")
            if card_health == "healthy":
                df = df[df["_expiry"] > 30]
            elif card_health == "watch":
                df = df[df["_expiry"].between(15, 30)]
            elif card_health == "risk":
                df = df[df["_expiry"].notna() & (df["_expiry"] <= 14)]

    # 有带新记录筛选
    if has_referral is True:
        reg_col = next(
            (c for c in ["当月推荐注册人数", "本月推荐注册数"] if c in df.columns), None
        )
        if reg_col:
            df = df.copy()
            df["_reg"] = pd.to_numeric(df[reg_col], errors="coerce").fillna(0)
            df = df[df["_reg"] > 0]

    total = len(df)
    pages = math.ceil(total / size) if total > 0 else 0
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
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> StudentDetail:
    data = dm.load_all()
    df = apply_filters(data.get("students", pd.DataFrame()), filters)

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
