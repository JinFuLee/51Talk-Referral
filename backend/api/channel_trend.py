"""
F4 渠道月度趋势 API 端点
GET /api/analysis/channel-trend — 渠道注册占比、效率指标月度趋势
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from backend.services.analysis_service import AnalysisService

from .dependencies import get_service

router = APIRouter()


def _get_result(svc: AnalysisService) -> dict:
    result = svc.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    return result


def _safe_float(val: Any) -> float | None:
    """安全转换为 float，失败返回 None"""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (f != f) else f  # NaN check
    except (TypeError, ValueError):
        return None


def _pivot_f4(records: list[dict], months: list[str]) -> list[dict]:
    """
    将 F4 宽表 records 转换为前端友好的按渠道结构：
    [{ channel, metrics: [{ month, registrations, reg_share, reg_paid_rate,
                            unit_price_usd, appt_rate, appt_attend_rate, attend_paid_rate,
                            mom_reg_pct }] }]
    """
    if not records or not months:
        return []

    out = []
    for rec in records:
        channel = rec.get("channel", "")
        if not channel:
            continue

        month_metrics = []
        prev_reg: float | None = None

        for month in months:
            reg = _safe_float(rec.get(f"注册数__{month}"))
            reg_share = _safe_float(rec.get(f"注册占比__{month}"))
            reg_paid_rate = _safe_float(rec.get(f"注册付费率__{month}"))
            unit_price = _safe_float(rec.get(f"客单价__{month}"))
            appt_rate = _safe_float(rec.get(f"预约率__{month}"))
            appt_attend = _safe_float(rec.get(f"预约出席率__{month}"))
            attend_paid = _safe_float(rec.get(f"出席付费率__{month}"))

            # 计算环比变化（注册数 MoM %）
            mom_pct: float | None = None
            if prev_reg is not None and prev_reg > 0 and reg is not None:
                mom_pct = round((reg - prev_reg) / prev_reg * 100, 2)
            prev_reg = reg

            month_metrics.append(
                {
                    "month": month,
                    "registrations": reg,
                    "reg_share": reg_share,
                    "reg_paid_rate": reg_paid_rate,
                    "unit_price_usd": unit_price,
                    "appt_rate": appt_rate,
                    "appt_attend_rate": appt_attend,
                    "attend_paid_rate": attend_paid,
                    "mom_reg_pct": mom_pct,
                }
            )

        out.append({"channel": channel, "metrics": month_metrics})

    return out


@router.get("/channel-trend", summary="F4 渠道注册占比 + 效率指标月度趋势")
def get_channel_trend(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    F4 渠道月度趋势数据。
    返回:
    - records: 原始宽表记录（渠道行，列名 = {指标}__{月份}）
    - months: 可用月份列表（yyyyMM 字符串）
    - by_channel: 转换后的按渠道结构（前端友好）
    - summary: 各月汇总注册数（跨所有渠道求和）
    """
    try:
        result = _get_result(svc)
    except HTTPException:
        # 数据不可用时返回空结构
        return {
            "records": [],
            "months": [],
            "by_channel": [],
            "summary": [],
        }

    ops_raw = result.get("ops_raw") or {}
    f4 = ops_raw.get("channel_mom") or {}

    records: list[dict] = f4.get("records") or []
    months: list[str] = f4.get("months") or []

    by_channel = _pivot_f4(records, months)

    # 各月汇总：所有渠道注册数加总
    summary = []
    for month in months:
        total_reg = 0.0
        for rec in records:
            v = _safe_float(rec.get(f"注册数__{month}"))
            if v is not None:
                total_reg += v
        summary.append({"month": month, "total_registrations": round(total_reg)})

    return {
        "records": records,
        "months": months,
        "by_channel": by_channel,
        "summary": summary,
    }
