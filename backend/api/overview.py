"""概览 API — GET /api/overview"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()


@router.get("/overview", summary="转介绍核心指标概览")
def get_overview(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """返回 D1 结果行的所有核心指标 + 数据源状态"""
    data = dm.load_all()
    result_df = data.get("result")

    metrics: dict[str, Any] = {}
    if result_df is not None and not result_df.empty:
        row = result_df.iloc[0]
        for col in result_df.columns:
            val = row[col]
            import math

            import pandas as pd

            if pd.isna(val) if not isinstance(val, (list, dict)) else False:
                metrics[col] = None
            else:
                try:
                    f = float(val)
                    metrics[col] = None if math.isnan(f) else f
                except (ValueError, TypeError):
                    metrics[col] = str(val) if val else None

    statuses = [s.model_dump() for s in dm.get_status()]

    return {
        "metrics": metrics,
        "data_sources": statuses,
    }
