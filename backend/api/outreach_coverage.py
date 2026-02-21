"""
F11 课前外呼覆盖缺口 → $ 损失量化
GET /api/analysis/outreach-coverage

数据来源：
  - cache["trial_followup"]["f11_summary"]  — F11 汇总（by _analyze_trial_followup 透传）
  - cache["trial_followup"]["f11_by_cc"]    — F11 CC 聚合
  - cache["trial_followup"]["f11_by_lead_type"] — F11 lead 类型聚合
  - cache["trial_followup"]["f11_records"]  — F11 学员级明细（按 lead_grade 聚合用）
  - cache["meta"]["targets"]["客单价"]       — 客单价（USD）
  - cache["summary"]                        — 出席→付费转化率
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["analysis"])

_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


def _require_full_cache() -> dict[str, Any]:
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    return result


def _safe_div(a: float, b: float) -> float:
    try:
        return a / b if b else 0.0
    except (TypeError, ZeroDivisionError):
        return 0.0


def _build_coverage_data(cache: dict[str, Any]) -> dict[str, Any]:
    """
    从缓存中构建课前外呼覆盖缺口数据。

    数据路径：
      trial_followup → f11_summary / f11_by_cc / f11_by_lead_type / f11_records
      客单价 → meta.targets["客单价"] 或 850 USD（默认）
      出席→付费转化率 → summary 或 funnel 推算
    """
    trial_followup = cache.get("trial_followup") or {}
    f11_summary = trial_followup.get("f11_summary") or {}
    f11_by_cc: dict = trial_followup.get("f11_by_cc") or {}
    f11_by_lead_type: dict = trial_followup.get("f11_by_lead_type") or {}
    f11_records: list = trial_followup.get("f11_records") or []

    # ── 获取客单价（USD）────────────────────────────────────────────────────────
    meta = cache.get("meta") or {}
    targets = meta.get("targets") or {}
    avg_order_usd: float = float(targets.get("客单价") or 850)

    # ── 获取出席→付费转化率 ────────────────────────────────────────────────────
    summary = cache.get("summary") or {}
    funnel = cache.get("funnel") or {}

    paid_actual = summary.get("paid_actual") or 0
    attend_actual = summary.get("attend_actual") or 0
    attend_to_paid_rate: float = _safe_div(paid_actual, attend_actual) if attend_actual else 0.0
    if attend_to_paid_rate <= 0:
        # 从 funnel 推算
        funnel_attend = funnel.get("attend_actual") or attend_actual
        funnel_paid = funnel.get("paid_actual") or paid_actual
        attend_to_paid_rate = _safe_div(funnel_paid, funnel_attend) if funnel_attend else 0.15

    # ── 构建汇总指标 ───────────────────────────────────────────────────────────
    total_records = f11_summary.get("total_records") or len(f11_records) or 0
    total_pre_called = f11_summary.get("total_pre_called") or 0
    total_pre_connected = f11_summary.get("total_pre_connected") or 0
    total_attended = f11_summary.get("total_attended") or 0

    overall_call_rate = f11_summary.get("overall_call_rate") or _safe_div(total_pre_called, total_records)
    overall_connect_rate = f11_summary.get("overall_connect_rate") or _safe_div(total_pre_connected, total_records)
    overall_attendance_rate = f11_summary.get("overall_attendance_rate") or _safe_div(total_attended, total_records)

    # 未被外呼的学员数 & 覆盖缺口
    uncovered_count = max(0, total_records - total_pre_called)
    uncovered_rate = 1.0 - overall_call_rate

    # 预计损失出席人数 = 未覆盖人数 × 平均出席率
    estimated_lost_attendance = round(uncovered_count * overall_attendance_rate)

    # 预计损失付费人数 = 损失出席 × 出席→付费转化率
    estimated_lost_paid = round(estimated_lost_attendance * attend_to_paid_rate)

    # 预计损失收入 = 损失付费 × 客单价
    estimated_lost_revenue_usd = round(estimated_lost_paid * avg_order_usd, 2)

    # ── 漏斗数据 ─────────────────────────────────────────────────────────────
    funnel_stages = [
        {
            "stage": "总学员数",
            "count": total_records,
            "rate": 1.0,
            "estimated_revenue_loss": None,
        },
        {
            "stage": "已外呼",
            "count": total_pre_called,
            "rate": round(overall_call_rate, 4),
            "estimated_revenue_loss": None,
        },
        {
            "stage": "已接通",
            "count": total_pre_connected,
            "rate": round(overall_connect_rate, 4),
            "estimated_revenue_loss": None,
        },
        {
            "stage": "已出席",
            "count": total_attended,
            "rate": round(overall_attendance_rate, 4),
            "estimated_revenue_loss": round(
                uncovered_count * overall_attendance_rate * attend_to_paid_rate * avg_order_usd, 2
            ),
        },
    ]

    # ── by_lead_grade 覆盖率分组 ────────────────────────────────────────────────
    # 优先从 f11_records 按 lead_grade 聚合，fallback 用 by_lead_type
    by_grade: list[dict] = []
    if f11_records:
        grade_agg: dict[str, dict] = {}
        for rec in f11_records:
            grade = rec.get("lead_grade")
            if grade is None:
                grade_key = "未知"
            else:
                try:
                    grade_key = str(int(float(grade)))
                except (ValueError, TypeError):
                    grade_key = str(grade)

            if grade_key not in grade_agg:
                grade_agg[grade_key] = {"total": 0, "called": 0, "connected": 0, "attended": 0}
            grade_agg[grade_key]["total"] += 1
            grade_agg[grade_key]["called"] += rec.get("pre_called") or 0
            grade_agg[grade_key]["connected"] += rec.get("pre_connected") or 0
            grade_agg[grade_key]["attended"] += rec.get("attended") or 0

        for grade_key, agg in sorted(grade_agg.items()):
            t = agg["total"]
            by_grade.append(
                {
                    "grade": grade_key,
                    "total": t,
                    "covered": agg["called"],
                    "uncovered": t - agg["called"],
                    "covered_rate": round(_safe_div(agg["called"], t), 4),
                    "connect_rate": round(_safe_div(agg["connected"], t), 4),
                    "attendance_rate": round(_safe_div(agg["attended"], t), 4),
                }
            )
    elif f11_by_lead_type:
        # fallback：按 lead_type 分组
        for lt, agg in f11_by_lead_type.items():
            t = agg.get("total_classes") or 0
            called = agg.get("pre_class_call") or 0
            by_grade.append(
                {
                    "grade": lt,
                    "total": t,
                    "covered": called,
                    "uncovered": t - called,
                    "covered_rate": round(agg.get("call_rate") or 0, 4),
                    "connect_rate": round(agg.get("connect_rate") or 0, 4),
                    "attendance_rate": round(agg.get("attendance_rate") or 0, 4),
                }
            )

    # ── by_cc 覆盖排名 ─────────────────────────────────────────────────────────
    by_cc_list: list[dict] = []
    for cc_name, agg in f11_by_cc.items():
        total_cls = agg.get("total_classes") or 0
        called = agg.get("pre_class_call") or 0
        connected = agg.get("pre_class_connect") or 0
        attended_cc = agg.get("attended") or 0
        call_rate = agg.get("call_rate") or _safe_div(called, total_cls)
        by_cc_list.append(
            {
                "cc_name": cc_name,
                "team": agg.get("team"),
                "total": total_cls,
                "covered": called,
                "connected": connected,
                "attended": attended_cc,
                "call_rate": round(call_rate, 4),
                "connect_rate": round(agg.get("connect_rate") or _safe_div(connected, total_cls), 4),
                "attendance_rate": round(agg.get("attendance_rate") or _safe_div(attended_cc, total_cls), 4),
            }
        )
    # 按覆盖率升序排（低覆盖率在前，显示最需改进的 CC）
    by_cc_list.sort(key=lambda x: x["call_rate"])

    return {
        "summary": {
            "total_records": total_records,
            "total_pre_called": total_pre_called,
            "total_pre_connected": total_pre_connected,
            "total_attended": total_attended,
            "overall_call_rate": round(overall_call_rate, 4),
            "overall_connect_rate": round(overall_connect_rate, 4),
            "overall_attendance_rate": round(overall_attendance_rate, 4),
        },
        "coverage_gap": {
            "uncovered_students": uncovered_count,
            "uncovered_rate": round(max(0.0, uncovered_rate), 4),
            "estimated_lost_attendance": estimated_lost_attendance,
            "estimated_lost_paid": estimated_lost_paid,
            "estimated_lost_revenue_usd": estimated_lost_revenue_usd,
        },
        "assumptions": {
            "avg_order_usd": avg_order_usd,
            "attend_to_paid_rate": round(attend_to_paid_rate, 4),
        },
        "funnel": funnel_stages,
        "by_grade": by_grade,
        "by_cc": by_cc_list,
    }


@router.get("/outreach-coverage")
def get_outreach_coverage() -> dict[str, Any]:
    """
    F11 课前外呼覆盖缺口 → $ 损失量化

    返回：
    - summary: 整体覆盖率汇总（总学员/已外呼/已接通/已出席 + 各率）
    - coverage_gap: 未覆盖人数 + 预计损失（出席/付费/收入）
    - assumptions: 计算假设（客单价/出席付费转化率）
    - funnel: 漏斗各层数据（总学员→已外呼→已接通→已出席）
    - by_grade: 按 lead_grade 分组的覆盖率（高评级优先外呼验证）
    - by_cc: CC 覆盖排名（覆盖率低→高，优先显示最需改进的 CC）
    """
    cache = _require_full_cache()
    return _build_coverage_data(cache)
