"""续费风险分析 API"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, parse_filters

router = APIRouter()

# 风险分段定义（天数 → 标签）
RISK_SEGMENTS = [
    ("high_risk", 0, 30, "高风险（≤30天未续费）"),
    ("medium_risk", 31, 60, "中风险（31-60天未续费）"),
    ("low_risk", 61, 90, "低风险（61-90天未续费）"),
    ("watch", 91, None, "观察（>90天未续费）"),
]


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


def _row_to_item(row: pd.Series, days_since_renewal: float | None) -> dict[str, Any]:
    # 总次卡数（历史购买规模）
    total_lesson_packages = _safe(
        row.get("总次卡数") or row.get("历史总次卡数") or row.get("累计次卡数")
    )
    # 总1v1续费订单数（高续费=高价值）
    total_renewal_orders = _safe(
        row.get("总1v1续费订单数")
        or row.get("1v1续费订单数")
        or row.get("续费订单总数")
        or row.get("历史续费次数")
    )
    return {
        "stdt_id": str(row.get("学员id", "") or row.get("stdt_id", "") or ""),
        "enclosure": str(row.get("生命周期", "") or ""),
        "cc_name": str(row.get("末次CC员工姓名", "") or ""),
        "days_since_last_renewal": days_since_renewal,
        "days_to_expiry": _safe(row.get("次卡距到期天数")),
        "monthly_referral_registrations": _safe(
            row.get("当月推荐注册人数") or row.get("本月推荐注册数")
        ),
        "monthly_referral_payments": _safe(
            row.get("本月推荐付费数") or row.get("当月推荐付费数")
        ),
        "total_lesson_packages": total_lesson_packages,
        "total_renewal_orders": total_renewal_orders,
    }


@router.get(
    "/analysis/renewal-risk",
    summary="续费风险分布 — 按末次续费距今天数分段",
)
def get_renewal_risk(
    request: Request,
    top_n: int = 50,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    data = dm.load_all()
    df = data.get("students")
    if df is None or df.empty:
        return {"segments": [], "high_risk_students": [], "summary": "暂无数据"}

    renewal_col = "末次续费日期距今天数"
    # 尝试备用列名
    if renewal_col not in df.columns:
        candidates = [c for c in df.columns if "续费" in c and "天" in c]
        if candidates:
            renewal_col = candidates[0]
        else:
            return {
                "segments": [],
                "high_risk_students": [],
                "summary": f"数据中未找到续费天数列，可用列: {list(df.columns[:10])}",
            }

    df = df.copy()
    df["_renewal_days"] = pd.to_numeric(df[renewal_col], errors="coerce")
    valid = df[df["_renewal_days"].notna()]

    # 按分段统计
    segments_out = []
    all_high_risk = []
    for seg_id, lo, hi, label in RISK_SEGMENTS:
        if hi is not None:
            mask = (valid["_renewal_days"] >= lo) & (valid["_renewal_days"] <= hi)
        else:
            mask = valid["_renewal_days"] > lo

        seg_df = valid[mask]
        seg_count = len(seg_df)

        segments_out.append(
            {
                "segment_id": seg_id,
                "label": label,
                "count": seg_count,
                "days_range": f"{lo}-{hi}" if hi is not None else f">{lo}",
            }
        )

        if seg_id == "high_risk":
            # 按续费天数降序（风险最高在前）
            seg_sorted = seg_df.sort_values("_renewal_days", ascending=False)
            for _, row in seg_sorted.head(top_n).iterrows():
                all_high_risk.append(_row_to_item(row, _safe(row["_renewal_days"])))

    total_valid = len(valid)
    high_risk_count = next(
        (s["count"] for s in segments_out if s["segment_id"] == "high_risk"), 0
    )

    return {
        "segments": segments_out,
        "high_risk_students": all_high_risk,
        "total_students_with_data": total_valid,
        "high_risk_rate": round(high_risk_count / total_valid, 4)
        if total_valid > 0
        else None,
        "renewal_col_used": renewal_col,
    }
