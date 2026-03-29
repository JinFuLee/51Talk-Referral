"""跟进质量分析 API — CC 末次接通质量 + 失联天数 + 备注及时性"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()

# 接通质量阈值（秒）
_HIGH_QUALITY_SEC = 120
_LOW_QUALITY_SEC = 30
_LOST_CONTACT_DAYS = 14

# SS/LP 暂未接入 D4 末次接通列
_SS_LP_NOT_SUPPORTED = {
    "summary": None,
    "by_person": [],
    "message": "SS/LP 跟进数据暂未接入",
}


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


def _to_date(val) -> pd.Timestamp | None:
    """统一转换日期列（YYYYMMDD / Timestamp / NaN）"""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        ts = pd.to_datetime(val, format="%Y%m%d", errors="coerce")
        if pd.isna(ts):
            ts = pd.to_datetime(val, errors="coerce")
        return None if pd.isna(ts) else ts
    except Exception:
        return None


def _days_since(date_val, today: pd.Timestamp) -> float | None:
    """计算距今天数"""
    ts = _to_date(date_val)
    if ts is None:
        return None
    delta = (today - ts).days
    return float(delta) if delta >= 0 else None


def _note_delay(contact_date_val, note_date_val) -> float | None:
    """备注及时性：备注日期 - 接通日期，单位天"""
    t_contact = _to_date(contact_date_val)
    t_note = _to_date(note_date_val)
    if t_contact is None or t_note is None:
        return None
    delta = (t_note - t_contact).days
    return float(delta) if delta >= 0 else None


def _call_quality_level(duration_sec: float | None) -> str:
    """根据接通时长返回质量等级"""
    if duration_sec is None:
        return "unknown"
    if duration_sec >= _HIGH_QUALITY_SEC:
        return "high"
    if duration_sec >= _LOW_QUALITY_SEC:
        return "low"
    return "suspicious"


@router.get(
    "/analysis/followup-quality",
    summary="跟进质量分析 — CC末次接通质量 / 失联天数 / 备注及时性",
)
def get_followup_quality(
    request: Request,
    role: str = Query(default="cc", description="岗位筛选: cc / ss / lp"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict[str, Any]:
    role = role.lower().strip()

    # SS/LP 暂未接入
    if role in ("ss", "lp"):
        return _SS_LP_NOT_SUPPORTED

    data = dm.load_all()
    df = apply_filters(data.get("students", pd.DataFrame()), filters)
    if df.empty:
        return {"summary": None, "by_person": [], "message": "暂无数据"}

    df = df.copy()

    # 列名兼容：支持两种命名风格
    duration_col = next(
        (c for c in ["CC末次接通时长", "CC末次接通时长(秒)"] if c in df.columns), None
    )
    contact_date_col = next(
        (c for c in ["CC末次接通日期(day)", "CC末次接通日期"] if c in df.columns), None
    )
    note_date_col = next(
        (c for c in ["CC末次备注日期(day)", "CC末次备注日期"] if c in df.columns), None
    )
    total_calls_col = next(
        (c for c in ["总CC拨打次数", "CC总拨打次数"] if c in df.columns), None
    )
    cc_name_col = next(
        (
            c
            for c in [
                "last_cc_name",
                "末次CC员工姓名",
                "末次（当前）分配CC员工姓名",
                "末次(当前)分配CC员工姓名",
            ]
            if c in df.columns
        ),
        None,
    )
    cc_group_col = next(
        (
            c
            for c in [
                "last_cc_group_name",
                "末次CC员工组名称",
                "末次（当前）分配CC员工组名称",
                "末次(当前)分配CC员工组名称",
            ]
            if c in df.columns
        ),
        None,
    )

    # 必须有接通时长列才能做质量分析
    if duration_col is None:
        cols_preview = list(df.columns[:20])
        msg = f"D4 中未找到接通时长列（CC末次接通时长），当前列: {cols_preview}"
        return {"summary": None, "by_person": [], "message": msg}

    today = pd.Timestamp.now(tz=None).normalize()

    # 计算各行指标
    df["_duration_sec"] = pd.to_numeric(df[duration_col], errors="coerce")
    df["_quality_level"] = df["_duration_sec"].apply(_call_quality_level)

    df["_lost_days"] = (
        df[contact_date_col].apply(lambda v: _days_since(v, today))
        if contact_date_col
        else None
    )

    df["_note_delay"] = (
        df.apply(
            lambda r: _note_delay(r.get(contact_date_col), r.get(note_date_col)),
            axis=1,
        )
        if (contact_date_col and note_date_col)
        else None
    )

    df["_total_calls"] = (
        pd.to_numeric(df[total_calls_col], errors="coerce") if total_calls_col else None
    )

    # ── 全局汇总 ──────────────────────────────────────────────────────────────
    total = len(df)
    valid_duration = df["_duration_sec"].dropna()
    high_count = int((valid_duration >= _HIGH_QUALITY_SEC).sum())
    in_low_range = (valid_duration >= _LOW_QUALITY_SEC) & (
        valid_duration < _HIGH_QUALITY_SEC
    )
    low_count = int(in_low_range.sum())
    suspicious_count = int((valid_duration < _LOW_QUALITY_SEC).sum())
    valid_total = len(valid_duration)

    _empty_f = pd.Series([], dtype=float)
    lost_days_series = (
        df["_lost_days"].dropna() if "_lost_days" in df.columns else _empty_f
    )
    avg_lost = (
        round(float(lost_days_series.mean()), 1) if not lost_days_series.empty else None
    )
    lost_14d = (
        int((lost_days_series > _LOST_CONTACT_DAYS).sum())
        if not lost_days_series.empty
        else 0
    )

    summary: dict[str, Any] = {
        "total_students": total,
        "high_quality_pct": round(high_count / valid_total, 4) if valid_total else None,
        "low_quality_pct": round(low_count / valid_total, 4) if valid_total else None,
        "suspicious_pct": (
            round(suspicious_count / valid_total, 4) if valid_total else None
        ),
        "avg_lost_days": avg_lost,
        "lost_contact_count": lost_14d,
    }

    # ── 按 CC 人员聚合 ────────────────────────────────────────────────────────
    if cc_name_col is None:
        return {"summary": summary, "by_person": [], "message": "D4 中未找到 CC 姓名列"}

    by_person: list[dict[str, Any]] = []
    for cc_name, grp in df.groupby(cc_name_col, dropna=False):
        if not cc_name or str(cc_name).strip() in ("", "nan", "NaN"):
            continue

        grp_dur = grp["_duration_sec"].dropna()
        g_high = int((grp_dur >= _HIGH_QUALITY_SEC).sum())
        g_low = int(
            ((grp_dur >= _LOW_QUALITY_SEC) & (grp_dur < _HIGH_QUALITY_SEC)).sum()
        )
        g_suspicious = int((grp_dur < _LOW_QUALITY_SEC).sum())

        _ef = pd.Series([], dtype=float)
        g_lost = grp["_lost_days"].dropna() if "_lost_days" in grp.columns else _ef
        g_avg_lost = round(float(g_lost.mean()), 1) if not g_lost.empty else None
        g_lost_14d = int((g_lost > _LOST_CONTACT_DAYS).sum()) if not g_lost.empty else 0

        g_note = grp["_note_delay"].dropna() if "_note_delay" in grp.columns else _ef
        g_avg_note_delay = round(float(g_note.mean()), 1) if not g_note.empty else None

        g_calls = grp["_total_calls"].dropna() if "_total_calls" in grp.columns else _ef
        g_total_calls = int(g_calls.sum()) if not g_calls.empty else 0

        g_avg_dur = round(float(grp_dur.mean()), 1) if not grp_dur.empty else None

        cc_group = ""
        if cc_group_col:
            groups = grp[cc_group_col].dropna().astype(str).unique()
            cc_group = str(groups[0]) if len(groups) > 0 else ""

        by_person.append(
            {
                "cc_name": str(cc_name),
                "cc_group": cc_group,
                "students": len(grp),
                "avg_call_duration_sec": g_avg_dur,
                "high_quality_count": g_high,
                "low_quality_count": g_low,
                "suspicious_count": g_suspicious,
                "avg_lost_days": g_avg_lost,
                "lost_14d_count": g_lost_14d,
                "avg_note_delay_days": g_avg_note_delay,
                "total_calls": g_total_calls,
            }
        )

    # 按平均接通时长降序排列
    by_person.sort(key=lambda x: x.get("avg_call_duration_sec") or 0, reverse=True)

    return {"summary": summary, "by_person": by_person}
