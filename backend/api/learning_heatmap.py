"""学习热图 API — 按围场聚合各周转码率

GET /api/analysis/learning-heatmap
"""

from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, Depends

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()


@router.get(
    "/analysis/learning-heatmap",
    summary="按围场聚合各周转码率，用于学习活跃度热图",
)
def get_learning_heatmap(
    dm: DataManager = Depends(get_data_manager),
) -> list[dict]:
    """
    返回每个围场（生命周期段）的每周平均转码次数。
    字段: enclosure, week1_avg, week2_avg, week3_avg, week4_avg
    """
    students = dm.get("students")
    if students is None or students.empty:
        return []

    week_cols = ["第1周转码", "第2周转码", "第3周转码", "第4周转码"]
    available = [c for c in week_cols if c in students.columns]

    if not available or "生命周期" not in students.columns:
        return []

    grouped = (
        students.groupby("生命周期")[available]
        .mean()
        .reset_index()
    )

    result = []
    for _, row in grouped.iterrows():
        item: dict = {"enclosure": str(row["生命周期"])}
        for wc in week_cols:
            key = (
                wc.replace("第", "week")
                .replace("周转码", "_avg")
            )
            if wc in available:
                val = row[wc]
                item[key] = round(float(val), 2) if pd.notna(val) else None
            else:
                item[key] = None
        result.append(item)

    return result
