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
        # 无 Loader 数据时，从 cohort_roi 退化
        return _fallback_decay(metric, raw)

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

    # 无真实数据时降级为演示数据
    if not by_month:
        by_month = _demo_coefficient_by_month()
        data_source = "demo"
    else:
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


def _fallback_decay(metric: str, raw: dict) -> dict:
    """从 cohort_roi 降级构造衰减数据"""
    cohort_roi = raw.get("cohort_roi") or raw.get("roi_estimate") or {}
    by_month_raw = cohort_roi.get("by_month") or []

    decay_rates = {
        "reach_rate": [
            1.0,
            0.79,
            0.61,
            0.46,
            0.37,
            0.30,
            0.27,
            0.23,
            0.21,
            0.18,
            0.17,
            0.15,
        ],
        "participation_rate": [
            1.0,
            0.72,
            0.52,
            0.36,
            0.28,
            0.20,
            0.16,
            0.16,
            0.12,
            0.12,
            0.08,
            0.08,
        ],
        "checkin_rate": [
            1.0,
            0.83,
            0.69,
            0.59,
            0.53,
            0.51,
            0.48,
            0.45,
            0.43,
            0.40,
            0.37,
            0.35,
        ],
        "referral_coefficient": [
            1.0,
            0.83,
            0.72,
            0.61,
            0.50,
            0.44,
            0.39,
            0.36,
            0.33,
            0.31,
            0.28,
            0.25,
        ],
        "conversion_ratio": [
            1.0,
            0.73,
            0.50,
            0.33,
            0.23,
            0.17,
            0.13,
            0.12,
            0.10,
            0.08,
            0.07,
            0.06,
        ],
    }
    base_m1 = {
        "reach_rate": 0.82,
        "participation_rate": 0.25,
        "checkin_rate": 0.75,
        "referral_coefficient": 1.80,
        "conversion_ratio": 0.30,
    }

    # 尝试从 cohort_roi 取最近 m1 值
    if by_month_raw:
        last = by_month_raw[-1]
        if metric == "reach_rate" and last.get("reach_rate_m1") is not None:
            base_m1["reach_rate"] = float(last["reach_rate_m1"])
        if metric == "participation_rate" and last.get("participation_m1") is not None:
            base_m1["participation_rate"] = float(last["participation_m1"])

    # 生成演示月份
    demo_months = ["2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11"]
    rates = decay_rates.get(metric, [1.0] * 12)
    base = base_m1.get(metric, 0.5)

    series = []
    for month in demo_months:
        row: dict[str, Any] = {"月份": month}
        for i, r in enumerate(rates):
            row[f"m{i + 1}"] = round(base * r, 4)
        series.append(row)

    summary_decay = _compute_summary_decay(series)

    return {
        "series": series,
        "metric": metric,
        "metric_label": METRIC_KEYS[metric],
        "group_by": "month",
        "summary_decay": summary_decay,
        "data_source": "demo",
    }


def _demo_coefficient_by_month() -> list[dict]:
    """生成 C4 带新系数演示数据（6个入组月 × m1-m12）"""
    decay_rates = [
        1.0,
        0.83,
        0.72,
        0.61,
        0.50,
        0.44,
        0.39,
        0.36,
        0.33,
        0.31,
        0.28,
        0.25,
    ]
    demo_months = [
        ("2025-06", 1.60),
        ("2025-07", 1.70),
        ("2025-08", 1.75),
        ("2025-09", 1.80),
        ("2025-10", 1.72),
        ("2025-11", 1.85),
    ]
    rows = []
    for month, base in demo_months:
        row: dict[str, Any] = {"月份": month}
        for i, r in enumerate(decay_rates):
            row[f"m{i + 1}"] = round(base * r, 4)
        rows.append(row)
    return rows
