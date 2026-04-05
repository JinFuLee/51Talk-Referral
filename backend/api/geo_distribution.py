"""地理分布 API — 按常登录国家聚合学员数据

GET /api/analysis/geo-distribution
"""

from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, Depends

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()


@router.get(
    "/analysis/geo-distribution",
    summary="按常登录国家聚合学员分布及推荐效果",
)
def get_geo_distribution(
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> list[dict]:
    """
    返回各国家/地区的学员分布及平均推荐指标。
    字段: country, student_count, pct, avg_referral_registrations, avg_payments
    """
    raw = dm.get("students")
    students = apply_filters(raw if raw is not None else pd.DataFrame(), filters)
    if students.empty:
        return []

    col = "常登录国家"
    if col not in students.columns:
        return []

    # 检查可聚合列
    reg_col = "当月推荐注册的人数" if "当月推荐注册的人数" in students.columns else None
    pay_col = "本月推荐付费数" if "本月推荐付费数" in students.columns else None

    # 构建 id 列
    id_col = next(
        (c for c in ["学员id", "stdt_id"] if c in students.columns),
        students.columns[0],
    )

    agg_dict: dict = {id_col: "count"}
    if reg_col:
        agg_dict[reg_col] = "mean"
    if pay_col:
        agg_dict[pay_col] = "mean"

    grouped = students.groupby(col).agg(agg_dict).reset_index()
    grouped = grouped.rename(columns={id_col: "student_count"})

    total = int(grouped["student_count"].sum())

    result = []
    for _, row in grouped.iterrows():
        count = int(row["student_count"])
        item: dict = {
            "country": str(row[col]),
            "student_count": count,
            "pct": round(count / total * 100, 1) if total > 0 else 0,
            "avg_referral_registrations": (
                round(float(row[reg_col]), 2)
                if reg_col and pd.notna(row.get(reg_col))
                else None
            ),
            "avg_payments": (
                round(float(row[pay_col]), 2)
                if pay_col and pd.notna(row.get(pay_col))
                else None
            ),
        }
        result.append(item)

    return sorted(result, key=lambda x: x["student_count"], reverse=True)
