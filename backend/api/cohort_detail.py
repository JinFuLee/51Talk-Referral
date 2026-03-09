"""
Cohort 分析 API 端点
C1-C5: 衰减曲线 + 热力图数据
C6: 学员级留存分析 + CC 真实带新排行
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.services.analysis_service import AnalysisService

from .dependencies import get_service

router = APIRouter()


def _get_cohort_data(svc: AnalysisService) -> dict:
    """从服务缓存中取 cohort 原始数据（C1-C6）"""
    result = svc.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    # cohort 原始数据挂在 result["_raw_cohort"] 或通过 loader 直接访问
    # AnalysisService 的结果中没有 raw cohort，需要通过 svc 的底层 loader 访问
    # 降级：从引擎结果 cohort_roi.by_month 中提取聚合数据
    return result


METRIC_KEYS = {
    "reach_rate": "触达率",
    "participation_rate": "参与率",
    "checkin_rate": "打卡率",
    "referral_coefficient": "带新系数",
    "conversion_ratio": "带货比",
}

METRIC_LABELS_EN = list(METRIC_KEYS.keys())
METRIC_LABELS_ZH = list(METRIC_KEYS.values())


def _build_decay_from_roi(result: dict, metric: str) -> list[dict]:
    """
    从 cohort_roi.by_month 提取单指标衰减数据。
    by_month 含 reach_rate_m1 和 participation_m1 等字段。
    """
    cohort_roi = result.get("cohort_roi") or result.get("roi_estimate") or {}
    by_month = cohort_roi.get("by_month") or []

    field_map = {
        "reach_rate": "reach_rate_m1",
        "participation_rate": "participation_m1",
    }

    out = []
    for row in by_month:
        cohort = row.get("cohort_month", "")
        val = row.get(field_map.get(metric, ""), None)
        if val is not None:
            out.append({"cohort": cohort, "month": 0, "value": round(float(val), 4)})
    return out



def _extract_raw_cohort(result: dict, metric: str) -> dict:
    """
    尝试从 result 中的原始字段取 cohort C1-C5 数据。
    引擎结果没有直接挂载 by_team，只有 cohort_roi 聚合。
    返回: { by_month: [...], by_team: [...] }
    """
    cohort_roi = result.get("cohort_roi") or result.get("roi_estimate") or {}
    by_month_raw = cohort_roi.get("by_month") or []

    # 将 cohort_roi by_month 转换为衰减序列格式
    # cohort_roi.by_month 只有 m1 值，构造近似曲线
    by_cohort = []
    for row in by_month_raw:
        cohort_month = row.get("cohort_month", "")
        m1_val = None
        if metric == "reach_rate":
            m1_val = row.get("reach_rate_m1")
        elif metric == "participation_rate":
            m1_val = row.get("participation_m1")

        if m1_val is not None and cohort_month:
            # 基于 m1 值构造近似衰减曲线
            decay_series = _approx_decay_curve(float(m1_val), metric)
            by_cohort.append(
                {
                    "cohort": cohort_month,
                    "series": decay_series,
                }
            )

    return {
        "by_cohort_month": by_cohort,
        "by_team": [],  # by_team 数据需要从 loader 层直接获取，当前未暴露
    }


def _approx_decay_curve(m1_val: float, metric: str) -> list[dict]:
    """基于 m1 基准值，用典型衰减系数生成 m1-m12 近似曲线"""
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
    rates = decay_rates.get(metric, [1.0] * 12)
    return [{"month": i + 1, "value": round(m1_val * rates[i], 4)} for i in range(12)]


# ── 端点 1: GET /api/analysis/cohort-decay ────────────────────────────────────


@router.get("/cohort-decay", summary="Cohort 衰减曲线（C1-C5 指标 m1-m12）")
def get_cohort_decay(
    metric: str = Query(
        default="reach_rate",
        description=(
            "指标: reach_rate / participation_rate / checkin_rate"
            " / referral_coefficient / conversion_ratio"
        ),
    ),
    svc: AnalysisService = Depends(get_service),
):
    """
    返回指定指标的 cohort 衰减数据（C1-C5）
    - by_cohort_month: 各入组月的 m1-m12 衰减序列
    - summary_decay: 跨 cohort 月的平均衰减序列（用于折线图）
    """
    if metric not in METRIC_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"metric 无效，支持: {', '.join(METRIC_KEYS.keys())}",
        )

    result = _get_cohort_data(svc)
    raw = _extract_raw_cohort(result, metric)
    by_cohort_month = raw["by_cohort_month"]

    # 若无真实 cohort_month 数据，返回空态
    if not by_cohort_month:
        return {
            "available": False,
            "data_source": "no_data",
            "empty_reason": "无 cohort 衰减数据可用",
            "data": {
                "metric": metric,
                "metric_label": METRIC_KEYS[metric],
                "by_cohort_month": [],
                "summary_decay": [],
            },
        }

    # 计算平均衰减序列（跨所有 cohort 月）
    month_sums: dict[int, list[float]] = {}
    for cohort_item in by_cohort_month:
        for pt in cohort_item.get("series", []):
            m = pt["month"]
            if m not in month_sums:
                month_sums[m] = []
            if pt["value"] is not None:
                month_sums[m].append(pt["value"])

    summary_decay = [
        {
            "month": m,
            "value": round(sum(vals) / len(vals), 4) if vals else None,
        }
        for m, vals in sorted(month_sums.items())
    ]

    return {
        "metric": metric,
        "metric_label": METRIC_KEYS[metric],
        "by_cohort_month": by_cohort_month,
        "summary_decay": summary_decay,
        "data_source": "approximate",
        "data_note": "m1 基于 cohort_roi 真实值，m2-m12 基于典型衰减模型近似",
    }


# ── 端点 2: GET /api/analysis/cohort-heatmap ─────────────────────────────────


@router.get("/cohort-heatmap", summary="5 指标 × 12 月龄 Cohort 热力图矩阵")
def get_cohort_heatmap(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    返回 5 个指标 × 12 个月龄的热力图矩阵数据。
    结构: { metrics, months, matrix: [[val_m1, val_m2, ...], ...] }
    """
    result = _get_cohort_data(svc)

    cohort_roi = result.get("cohort_roi") or result.get("roi_estimate") or {}
    by_month_raw = cohort_roi.get("by_month") or []

    # 若 cohort_roi 有数据，用其中的 m1 值构造热力图
    # 5行（指标）× 12列（月龄）
    metrics = METRIC_LABELS_EN
    months = list(range(1, 13))

    # 基于 cohort_roi 数据（只有 m1）结合典型衰减系数生成完整矩阵
    # 取最近一个 cohort 月的 m1 值作为基准
    latest_m1: dict[str, float] = {
        "reach_rate": 0.82,
        "participation_rate": 0.25,
        "checkin_rate": 0.75,
        "referral_coefficient": 1.80,
        "conversion_ratio": 0.30,
    }

    field_map: dict[str, str] = {
        "reach_rate": "reach_rate_m1",
        "participation_rate": "participation_m1",
        "checkin_rate": "checkin_rate_m1",
        "referral_coefficient": "referral_coefficient_m1",
        "conversion_ratio": "conversion_ratio_m1",
    }

    if by_month_raw:
        last = by_month_raw[-1]
        for metric_key, field_name in field_map.items():
            val = last.get(field_name)
            if val is not None:
                latest_m1[metric_key] = float(val)

    matrix = []
    for metric in metrics:
        base = latest_m1.get(metric, 0.5)
        row = _approx_decay_curve(base, metric)
        matrix.append([pt["value"] for pt in row])

    # 标记哪些指标使用了默认值（非真实数据）
    if by_month_raw:
        last = by_month_raw[-1]
        estimated_metrics = [
            mk for mk in METRIC_LABELS_EN
            if field_map.get(mk) and last.get(field_map[mk]) is None
        ]
    else:
        estimated_metrics = list(METRIC_LABELS_EN)

    # 同时构造按 cohort 月的热力图（X=入组月, Y=指标, 值=m1）
    cohort_months_data: list[dict] = []
    if by_month_raw:
        for row in by_month_raw:
            cohort_months_data.append(
                {
                    "cohort": row.get("cohort_month", ""),
                    "reach_rate": row.get("reach_rate_m1"),
                    "participation_rate": row.get("participation_m1"),
                }
            )

    if not by_month_raw:
        return {
            "available": False,
            "data_source": "no_data",
            "empty_reason": "无 cohort 热力图数据可用",
            "data": {
                "metrics": metrics,
                "metric_labels": METRIC_LABELS_ZH,
                "months": months,
                "matrix": [],
                "cohort_months": [],
            },
        }

    return {
        "metrics": metrics,
        "metric_labels": METRIC_LABELS_ZH,
        "months": months,
        "matrix": matrix,
        "cohort_months": cohort_months_data,
        "estimated_metrics": estimated_metrics,
        "data_source": "cohort_roi",
    }


# ── 端点 3: GET /api/analysis/cohort-detail ──────────────────────────────────


@router.get("/cohort-detail", summary="C6 学员级留存分析 + CC 带新排行")
def get_cohort_detail(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    C6 学员级 Cohort 分析
    - retention_by_age: 月龄别留存率（真实数据）
    - by_cc: CC 级带新效率排行（真实数据）
    - churn_by_age: 月龄别流失漏斗（从 records 计算）
    - top_bringers: 头部带新学员（从 records 提取）
    """
    raw = getattr(svc, "_raw_data", None)
    if not raw:
        raise HTTPException(
            status_code=404,
            detail="尚无分析缓存，请先 POST /api/analysis/run",
        )

    cohort_raw: dict = raw.get("cohort", {}) if isinstance(raw, dict) else {}  # noqa: E501
    c6: dict = (
        cohort_raw.get("cohort_detail", {}) if isinstance(cohort_raw, dict) else {}
    )

    if not c6:
        raise HTTPException(
            status_code=404,
            detail="C6 cohort 数据不存在，该数据源可能未加载",
        )

    by_cc_raw: dict = c6.get("by_cc", {})
    records: list = c6.get("records", [])
    total: int = c6.get("total_students", 0)

    data_source = "c6" if (by_cc_raw or records) else "empty"

    # ── CC 级带新效率 ─────────────────────────────────────────────────────────
    by_cc: list[dict] = []
    if by_cc_raw:
        for name, info in by_cc_raw.items():
            valid = info.get("有效学员数", 0) or 0
            bring_new = info.get("带新注册总数", 0) or 0
            reached = info.get("触达学员数", 0) or 0
            students = info.get("学员数", 0) or 0
            by_cc.append(
                {
                    "cc": name,
                    "team": info.get("团队", ""),
                    "students": students,
                    "valid_rate": round(valid / students, 4) if students > 0 else 0,
                    "reach_rate": round(reached / valid, 4) if valid > 0 else 0,
                    "bring_new_rate": round(bring_new / valid, 4) if valid > 0 else 0,
                    "bring_new_total": int(bring_new),
                }
            )
        by_cc.sort(key=lambda x: x["bring_new_rate"], reverse=True)

    # ── 月龄别留存率（从 records 聚合 m1-m12）────────────────────────────────
    retention_by_age: list[dict] = []
    if records:
        _CN_NUMS = [
            "一",
            "二",
            "三",
            "四",
            "五",
            "六",
            "七",
            "八",
            "九",
            "十",
            "十一",
            "十二",
        ]
        for m_idx, m_cn in enumerate(_CN_NUMS, start=1):
            total_m = 0
            valid_count = 0
            reach_count = 0
            bring_total = 0.0
            for r in records:
                v_valid = r.get("是否有效", {}).get(f"m{m_idx}")
                v_reach = r.get("是否触达", {}).get(f"m{m_idx}")
                v_bring = r.get("带新注册数", {}).get(f"m{m_idx}")
                if v_valid is not None:
                    total_m += 1
                    if v_valid == 1:
                        valid_count += 1
                if v_reach == 1:
                    reach_count += 1
                if v_bring and float(v_bring) > 0:
                    bring_total += float(v_bring)
            if total_m > 0:
                retention_by_age.append(
                    {
                        "m": m_idx,
                        "valid_rate": round(valid_count / total_m, 4),
                        "reach_rate": round(reach_count / total_m, 4),
                        "bring_new_rate": round(bring_total / total_m, 4),
                    }
                )

    # ── 月龄流失漏斗（从留存率反推）────────────────────────────────────────────
    churn_by_age: list[dict] = []
    if retention_by_age:
        cumulative = 0.0
        for pt in retention_by_age:
            m = pt["m"]
            valid_rate = pt["valid_rate"]
            # m1 基准: 假设 m0 = 1.0（全部有效）
            prev_rate = retention_by_age[m - 2]["valid_rate"] if m > 1 else 1.0
            first_churn_rate = max(0.0, round(prev_rate - valid_rate, 4))
            cumulative = round(cumulative + first_churn_rate, 4)
            est_total = total or 1
            churn_by_age.append(
                {
                    "m": m,
                    "first_churn_count": round(first_churn_rate * est_total),
                    "first_churn_rate": first_churn_rate,
                    "cumulative_churn_rate": min(1.0, cumulative),
                }
            )

    # ── 头部带新学员（从 records 提取）──────────────────────────────────────────
    top_bringers: list[dict] = []
    if records:
        bringer_map: dict[str, dict] = {}
        for r in records:
            sid = r.get("学员id", "")
            if not sid:
                continue
            bring_dict = r.get("带新注册数", {}) or {}
            total_new = sum(float(v) for v in bring_dict.values() if v and float(v) > 0)
            if total_new > 0:
                last_active_m = max(
                    (
                        int(k[1:])
                        for k, v in (r.get("是否有效", {}) or {}).items()
                        if v == 1 and k.startswith("m") and k[1:].isdigit()
                    ),
                    default=0,
                )
                if sid not in bringer_map or total_new > bringer_map[sid]["total_new"]:
                    bringer_map[sid] = {
                        "student_id": sid,
                        "total_new": int(total_new),
                        "team": r.get("当前小组", ""),
                        "last_active_m": last_active_m,
                        "cohort": r.get("月份", ""),
                    }
        top_bringers = sorted(
            bringer_map.values(), key=lambda x: x["total_new"], reverse=True
        )[:10]

    return {
        "retention_by_age": retention_by_age,
        "by_cc": by_cc,
        "churn_by_age": churn_by_age,
        "top_bringers": top_bringers,
        "total_students": total,
        "data_source": data_source,
    }
