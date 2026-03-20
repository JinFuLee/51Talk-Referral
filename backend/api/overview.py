"""概览 API — GET /api/overview"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.core.time_period import compute_month_progress

router = APIRouter()


@router.get("/overview", summary="转介绍核心指标概览")
def get_overview(
    request: Request,
    dm: DataManager = Depends(get_data_manager),  # noqa: B008
) -> dict[str, Any]:
    """返回 D1 结果行的所有核心指标 + 数据源状态 + 时间进度"""
    data = dm.load_all()
    result_df = data.get("result")

    metrics: dict[str, Any] = {}
    if result_df is not None and not result_df.empty:
        row = result_df.iloc[0]
        for col in result_df.columns:
            val = row[col]
            if pd.isna(val) if not isinstance(val, (list, dict)) else False:
                metrics[col] = None
            else:
                try:
                    f = float(val)
                    metrics[col] = None if math.isnan(f) else f
                except (ValueError, TypeError):
                    metrics[col] = str(val) if val else None

    statuses = [s.model_dump() for s in dm.get_status()]

    # 时间进度（按 CLAUDE.md 工作日规则：周三权重 0，周六日 1.4）
    mp = compute_month_progress()
    time_progress_info: dict[str, Any] = {
        "today": mp.today.isoformat(),
        "month_start": mp.month_start.isoformat(),
        "month_end": mp.month_end.isoformat(),
        "elapsed_workdays": mp.elapsed_workdays,
        "remaining_workdays": mp.remaining_workdays,
        "total_workdays": mp.total_workdays,
        "time_progress": mp.time_progress,
        "elapsed_calendar_days": mp.elapsed_calendar_days,
        "total_calendar_days": mp.total_calendar_days,
    }

    # 为关键指标计算 daily_avg 和 pace_daily_needed
    kpi_pace: dict[str, Any] = {}
    kpi_keys = {
        "转介绍注册数": "register",
        "预约数": "appointment",
        "出席数": "showup",
        "转介绍付费数": "paid",
        "总带新付费金额USD": "revenue",
    }
    target_keys = {
        "转介绍付费数": "转介绍基础业绩单量标",
        "总带新付费金额USD": "转介绍基础业绩标USD",
    }

    elapsed = mp.elapsed_workdays or 1.0  # 防除零
    remaining = mp.remaining_workdays or 1.0

    for metric_key, pace_key in kpi_keys.items():
        actual = metrics.get(metric_key)
        target_field = target_keys.get(metric_key)
        target = metrics.get(target_field) if target_field else None

        if actual is None:
            kpi_pace[pace_key] = None
            continue

        daily_avg = actual / elapsed if actual is not None else None

        pace_daily_needed: float | None = None
        if target is not None and remaining > 0:
            needed = target * mp.time_progress - actual
            pace_daily_needed = max(0.0, needed) / remaining

        kpi_pace[pace_key] = {
            "actual": actual,
            "target": target,
            "daily_avg": round(daily_avg, 2) if daily_avg is not None else None,
            "pace_daily_needed": (
                round(pace_daily_needed, 2) if pace_daily_needed is not None else None
            ),
        }

    return {
        "metrics": metrics,
        "data_sources": statuses,
        "time_progress": time_progress_info,
        "kpi_pace": kpi_pace,
    }
