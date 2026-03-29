"""次卡到期预警 API"""

from __future__ import annotations

import math
from datetime import date
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.expiry_alert import ExpiryAlertItem, ExpiryAlertSummary
from backend.models.filters import UnifiedFilter, parse_filters

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


def _tier(days: float) -> str:
    if days <= 7:
        return "urgent"
    elif days <= 14:
        return "warning"
    else:
        return "watch"


def _contact_days(raw_date) -> float | None:
    """计算 CC末次接通距今天数，返回 None 表示无记录"""
    if raw_date is None:
        return None
    s = str(raw_date)
    if s.startswith("1970") or not s or s == "nan":
        return None
    try:
        d = pd.to_datetime(s[:10]).date()
        return (date.today() - d).days
    except Exception:
        return None


def _risk_level(days_to_expiry: float | None, days_since_contact: float | None) -> str:
    """综合风险等级：到期近 + 失联久 = 高风险"""
    expiry_urgent = days_to_expiry is not None and days_to_expiry <= 14
    contact_lost = days_since_contact is not None and days_since_contact >= 15
    contact_none = days_since_contact is None
    if expiry_urgent and (contact_lost or contact_none):
        return "high"
    if expiry_urgent or contact_lost:
        return "medium"
    return "low"


@router.get(
    "/students/expiry-alert",
    response_model=list[ExpiryAlertItem],
    summary="次卡到期预警学员列表（按到期天数分层）",
)
def get_expiry_alert(
    request: Request,
    days: int = Query(
        default=30, ge=1, le=90, description="预警窗口天数（默认 30 天）"
    ),
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> list[ExpiryAlertItem]:
    data = dm.load_all()
    df = data.get("students")
    if df is None or df.empty:
        return []

    # 次卡距到期天数列
    expiry_col = "次卡距到期天数"
    if expiry_col not in df.columns:
        return []

    df = df.copy()
    df["_expiry_days"] = pd.to_numeric(df[expiry_col], errors="coerce")

    # 筛选 0 ~ days 内到期（已到期=0 也纳入预警）
    mask = (df["_expiry_days"] >= 0) & (df["_expiry_days"] <= days)
    filtered = df[mask].copy()

    if filtered.empty:
        return []

    # 按到期天数升序
    filtered = filtered.sort_values("_expiry_days")

    items = []
    for _, row in filtered.iterrows():
        d = _safe(row["_expiry_days"])
        # 失联天数：支持两种列名
        contact_raw = row.get("CC末次接通日期(day)") or row.get("CC末次拨打日期(day)")
        days_contact = _contact_days(contact_raw)
        items.append(
            ExpiryAlertItem(
                stdt_id=str(row.get("学员id", "") or row.get("stdt_id", "") or ""),
                enclosure=str(row.get("生命周期", "") or ""),
                cc_name=str(row.get("末次CC员工姓名", "") or ""),
                days_to_expiry=d,
                days_since_last_contact=days_contact,
                risk_level=_risk_level(d, days_contact),
                current_cards=_safe(row.get("当前有效次卡数") or row.get("次卡数")),
                monthly_referral_registrations=_safe(
                    row.get("当月推荐注册人数") or row.get("本月推荐注册数")
                ),
                monthly_referral_payments=_safe(
                    row.get("本月推荐付费数") or row.get("当月推荐付费数")
                ),
                urgency_tier=_tier(d) if d is not None else None,
            )
        )

    return items


@router.get(
    "/students/expiry-alert/summary",
    response_model=ExpiryAlertSummary,
    summary="次卡到期预警各层人数统计",
)
def get_expiry_alert_summary(
    request: Request,
    days: int = Query(
        default=30, ge=1, le=90, description="预警窗口天数（默认 30 天）"
    ),
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> ExpiryAlertSummary:
    items = get_expiry_alert(request=request, days=days, filters=filters, dm=dm)

    urgent = sum(1 for i in items if i.urgency_tier == "urgent")
    warning = sum(1 for i in items if i.urgency_tier == "warning")
    watch = sum(1 for i in items if i.urgency_tier == "watch")

    return ExpiryAlertSummary(
        urgent_count=urgent,
        warning_count=warning,
        watch_count=watch,
        total=len(items),
    )
