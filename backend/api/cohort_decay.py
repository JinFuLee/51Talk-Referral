"""
Cohort Decay + C4 带新系数 API 端点
直接读取 _service._raw_data["cohort"] 的原始 Loader 数据。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.services.analysis_service import AnalysisService

from .dependencies import get_service

router = APIRouter()


def _get_raw(svc: AnalysisService) -> dict:
    raw = getattr(svc, "_raw_data", None)
    if not raw:
        raise HTTPException(
            status_code=503,
            detail="数据未加载，请先运行分析 POST /api/analysis/run",
        )
    return raw


METRIC_KEYS = {
    "reach_rate": "触达率",
    "participation_rate": "参与率",
    "checkin_rate": "打卡率",
    "checkin_rate_actual": "打卡率(实测)",
    "referral_coefficient": "带新系数",
    "conversion_ratio": "带货比",
}


@router.get("/cohort-decay-raw")
def get_cohort_decay_raw(
    metric: str = Query(
        default="reach_rate",
        description="指标: reach_rate / participation_rate / checkin_rate / referral_coefficient / conversion_ratio",
    ),
    group_by: str = Query(
        default="month",
        description="group_by: month（按入组月）| team（按小组）",
    ),
    svc: AnalysisService = Depends(get_service),
):
    """
    返回 C1-C5 cohort 衰减数据，直接读取 Loader 层原始数据。
    metric 可选: reach_rate / participation_rate / checkin_rate / referral_coefficient / conversion_ratio
    """
    if metric not in METRIC_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"metric 无效，支持: {', '.join(METRIC_KEYS.keys())}",
        )

    raw = _get_raw(svc)
    cohort = raw.get("cohort", {})
    metric_data = cohort.get(metric, {})

    if not metric_data:
        # 无 Loader 数据时返回空态
        return _fallback_decay(metric)

    if group_by == "team":
        series = metric_data.get("by_team", [])
    else:
        series = metric_data.get("by_month", [])

    # 补充计算 summary_decay（m1-m12 均值）
    summary_decay = _compute_summary_decay(series)

    return {
        "series": series,
        "metric": metric,
        "metric_label": METRIC_KEYS[metric],
        "group_by": group_by,
        "summary_decay": summary_decay,
        "data_source": "loader",
    }


@router.get("/cohort-coefficient")
def get_cohort_coefficient(
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    返回 C4 带新系数 cohort 数据 + 黄金窗口月份。
    黄金窗口 = 所有入组月中平均带新系数最高的月龄（m1-m12）。
    """
    raw = _get_raw(svc)
    cohort = raw.get("cohort", {})
    coef_data = cohort.get("referral_coefficient", {})
    by_month = coef_data.get("by_month", [])

    # 无真实数据时返回空态
    if not by_month:
        return {
            "available": False,
            "data_source": "no_data",
            "empty_reason": "无带新系数数据可用",
            "data": {"decay_curve": [], "coefficients": []},
        }

    data_source = "loader"

    # 找黄金窗口（m1-m12 中各月龄跨所有入组月的平均值最高处）
    golden_window = None
    golden_window_value = 0.0

    for m_idx in range(1, 13):
        key = f"m{m_idx}"
        vals = [row.get(key) for row in by_month if row.get(key) is not None]
        if vals:
            avg = sum(vals) / len(vals)
            if avg > golden_window_value:
                golden_window_value = avg
                golden_window = m_idx

    # 构造前端折线图数据：每条线 = 一个入组月份，X轴 = m1-m12
    lines: list[dict] = []
    for row in by_month:
        cohort_month = row.get("月份", row.get("cohort_month", ""))
        points = []
        for m_idx in range(1, 13):
            key = f"m{m_idx}"
            val = row.get(key)
            if val is not None:
                points.append({"month": m_idx, "value": round(float(val), 4)})
        if cohort_month and points:
            lines.append({"cohort": cohort_month, "series": points})

    return {
        "by_month": by_month,
        "lines": lines,
        "golden_window_month": golden_window,
        "golden_window_value": round(golden_window_value, 4),
        "data_source": data_source,
    }


# ── Helpers ────────────────────────────────────────────────────────────────────


def _compute_summary_decay(series: list) -> list[dict]:
    """计算跨入组月的各月龄均值衰减曲线"""
    if not series:
        return []

    # series 可能是 by_month 格式：[{月份, m1, m2, ..., m12}, ...]
    month_sums: dict[int, list[float]] = {}
    for row in series:
        if not isinstance(row, dict):
            continue
        for m_idx in range(1, 13):
            key = f"m{m_idx}"
            val = row.get(key)
            if val is not None:
                month_sums.setdefault(m_idx, []).append(float(val))

    return [
        {
            "month": m,
            "value": round(sum(vals) / len(vals), 4) if vals else None,
        }
        for m, vals in sorted(month_sums.items())
    ]


def _fallback_decay(metric: str) -> dict:
    """无衰减数据时返回空态"""
    return {
        "available": False,
        "data_source": "no_data",
        "empty_reason": "无衰减数据可用",
        "data": {"decay_curve": [], "coefficients": []},
    }
