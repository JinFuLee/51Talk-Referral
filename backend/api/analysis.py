"""
分析引擎 API 端点 (V2)
所有需要 AnalysisService 缓存的 GET 端点，以及触发分析的 POST 端点。
引擎已升级为 AnalysisEngineV2（35 源跨源联动）。
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

router = APIRouter()

# 模块级单例（由 main.py startup 注入）
_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


# ── Request Models ────────────────────────────────────────────────────────────

class RunAnalysisRequest(BaseModel):
    input_dir: Optional[str] = None
    report_date: Optional[str] = None   # ISO 格式 YYYY-MM-DD
    lang: str = "zh"
    targets: Optional[dict[str, Any]] = None
    force: bool = False                  # True 时忽略 TTL 强制重算


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_cache(key: str) -> Any:
    """从缓存中取指定 key，不存在则返回 404"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    value = result.get(key)
    if value is None:
        raise HTTPException(
            status_code=404,
            detail=f"no_data: 分析结果中不含 '{key}'，请先运行分析",
        )
    return value


def _require_full_cache() -> dict[str, Any]:
    """返回完整缓存，不存在则 404"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    return result


# ── 适配器函数（引擎输出 → 前端 TypeScript 类型）──────────────────────────────

def _calc_status(actual: float, target: float, time_progress: float) -> str:
    """根据实际/目标/时间进度推算状态标签"""
    if target <= 0:
        return "green"
    progress = actual / target
    if progress >= time_progress:
        return "green"
    if progress >= time_progress * 0.95:
        return "yellow"
    return "red"


def _adapt_summary(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 summary（单数 key + revenue 拆包结构）转换为前端 SummaryMetric 格式。
    前端期望：registrations / payments / revenue / appointments / attendances
    每个字段结构：{ actual, target, progress, status }
    """
    time_progress: float = raw.get("time_progress", 0.0)
    adapted: dict[str, Any] = {}

    # registration → registrations
    if "registration" in raw:
        r = raw["registration"]
        adapted["registrations"] = {
            "actual": r.get("actual") or 0,
            "target": r.get("target") or 0,
            "progress": r.get("progress") or 0,
            "status": r.get("status") or "red",
            "daily_avg": r.get("daily_avg"),
            "remaining_daily_avg": r.get("remaining_daily_avg"),
            "efficiency_lift_pct": r.get("efficiency_lift_pct"),
            "absolute_gap": r.get("absolute_gap"),
            "pace_daily_needed": r.get("pace_daily_needed"),
            "remaining_workdays": r.get("remaining_workdays"),
        }

    # payment → payments
    if "payment" in raw:
        p = raw["payment"]
        adapted["payments"] = {
            "actual": p.get("actual") or 0,
            "target": p.get("target") or 0,
            "progress": p.get("progress") or 0,
            "status": p.get("status") or "red",
            "daily_avg": p.get("daily_avg"),
            "remaining_daily_avg": p.get("remaining_daily_avg"),
            "efficiency_lift_pct": p.get("efficiency_lift_pct"),
            "absolute_gap": p.get("absolute_gap"),
            "pace_daily_needed": p.get("pace_daily_needed"),
            "remaining_workdays": p.get("remaining_workdays"),
        }

    # revenue: { cny, usd, thb, target_usd, progress, status } → SummaryMetric (USD + THB)
    if "revenue" in raw:
        rev = raw["revenue"]
        actual_usd = rev.get("usd") or 0
        target_usd = rev.get("target_usd") or 0
        progress = rev.get("progress") or (round(actual_usd / target_usd, 4) if target_usd else 0)
        adapted["revenue"] = {
            "actual": actual_usd,
            "target": target_usd,
            "progress": progress,
            "status": rev.get("status") or _calc_status(actual_usd, target_usd, time_progress),
            "thb": rev.get("thb"),
            "daily_avg": rev.get("daily_avg"),
            "remaining_daily_avg": rev.get("remaining_daily_avg"),
            "efficiency_lift_pct": rev.get("efficiency_lift_pct"),
            "absolute_gap": rev.get("absolute_gap"),
            "pace_daily_needed": rev.get("pace_daily_needed"),
            "remaining_workdays": rev.get("remaining_workdays"),
        }

    # appointment → appointments（target 为 None 时跳过，避免虚假进度）
    if "appointment" in raw:
        a = raw["appointment"]
        actual_val = a.get("actual") or 0
        target_val = a.get("target")
        if target_val is not None and target_val > 0:
            adapted["appointments"] = {
                "actual": actual_val,
                "target": target_val,
                "progress": round(actual_val / target_val, 4),
                "status": _calc_status(actual_val, target_val, time_progress),
            }

    # attendance → attendances（target 为 None 时跳过）
    if "attendance" in raw:
        a = raw["attendance"]
        actual_val = a.get("actual") or 0
        target_val = a.get("target")
        if target_val is not None and target_val > 0:
            adapted["attendances"] = {
                "actual": actual_val,
                "target": target_val,
                "progress": round(actual_val / target_val, 4),
                "status": _calc_status(actual_val, target_val, time_progress),
            }

    # checkin_24h → checkin（rate 为 None 时跳过，避免前端显示虚假 0%）
    if "checkin_24h" in raw:
        c = raw["checkin_24h"]
        rate = c.get("rate")
        if rate is not None:
            target_rate = c.get("target") or 0
            achievement = c.get("achievement") or 0
            adapted["checkin"] = {
                "actual": round(rate * 100, 1),
                "target": round(target_rate * 100, 1),
                "progress": achievement,
                "status": "green" if achievement >= 1 else ("yellow" if achievement >= 0.95 else "red"),
                "impact": c.get("impact"),
            }

    # leads（若引擎直接提供则透传，否则用 registrations 作为替代）
    if "leads" in raw:
        ld = raw["leads"]
        if isinstance(ld, dict) and "actual" in ld:
            actual_val = ld.get("actual", 0)
            target_val = ld.get("target", 0) or 1
            adapted["leads"] = {
                "actual": actual_val,
                "target": target_val,
                "progress": round(actual_val / target_val, 4) if target_val else 0,
                "status": _calc_status(actual_val, target_val, time_progress),
            }
    # 若引擎无 leads，用 registrations 作为兜底（ops/dashboard 取 leads 显示）
    if "leads" not in adapted and "registrations" in adapted:
        adapted["leads"] = adapted["registrations"]

    return adapted


# ── 渠道标签映射 ───────────────────────────────────────────────────────────────

_CHANNEL_LABEL_MAP = [
    ("CC窄口径",  "cc_narrow", "CC 窄口径"),
    ("SS窄口径",  "ss_narrow", "SS 窄口径"),
    ("LP窄口径",  "lp_narrow", "LP 窄口径"),
    ("宽口径",    "wide",      "宽口径"),
]


def _adapt_funnel(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 funnel（{ total, cc_narrow, ss_narrow, lp_narrow, wide }，每项含 register/reserve/attend/paid/rates）
    转换为前端 FunnelData 格式（narrow = cc+ss+lp 合并，total，wide）。
    前端 FunnelChannel 字段：valid_students, registrations, payments, conversion_rate, reserve, attend, ...
    """
    def _to_channel(d: dict[str, Any]) -> dict[str, Any]:
        rates = d.get("rates", {})
        reg = d.get("register", 0)
        paid = d.get("paid", 0)
        reserve = d.get("reserve", 0)
        attend = d.get("attend", 0)
        return {
            "valid_students": d.get("valid_students", 0),
            "contact_rate": rates.get("contact_rate", 0),
            "participation_rate": rates.get("participation_rate", 0),
            "checkin_rate": rates.get("checkin_rate", 0),
            "new_coefficient": rates.get("new_coefficient", 0),
            "referral_ratio": rates.get("referral_ratio", 0),
            "registrations": reg,
            "register": reg,          # 保留原字段供 FunnelDataBiz 兼容
            "reserve": reserve,
            "attend": attend,
            "payments": paid,
            "paid": paid,
            "conversion_rate": rates.get(
                "register_paid_rate",
                round(paid / reg, 4) if reg else 0,
            ),
            "rates": rates,
        }

    adapted: dict[str, Any] = {}

    # total
    if "total" in raw:
        adapted["total"] = _to_channel(raw["total"])

    # cc_narrow / ss_narrow / lp_narrow 单独透传（供详细页面）
    narrow_keys = ["cc_narrow", "ss_narrow", "lp_narrow"]
    narrow_sum: dict[str, Any] = {"register": 0, "reserve": 0, "attend": 0, "paid": 0}
    has_narrow = False
    for k in narrow_keys:
        if k in raw:
            has_narrow = True
            adapted[k] = _to_channel(raw[k])
            for f in ["register", "reserve", "attend", "paid"]:
                narrow_sum[f] += raw[k].get(f, 0)

    # 合并窄口为 narrow
    if has_narrow:
        reg = narrow_sum["register"]
        paid = narrow_sum["paid"]
        rsv = narrow_sum["reserve"]
        att = narrow_sum["attend"]
        narrow_sum["rates"] = {
            "reserve_rate": round(rsv / reg, 4) if reg else 0,
            "attend_rate": round(att / rsv, 4) if rsv else 0,
            "paid_rate": round(paid / att, 4) if att else 0,
            "register_paid_rate": round(paid / reg, 4) if reg else 0,
        }
        adapted["narrow"] = _to_channel(narrow_sum)

    # wide
    if "wide" in raw:
        adapted["wide"] = _to_channel(raw["wide"])

    return adapted


def _adapt_channel_comparison(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 channel_comparison（中文 key dict）转换为前端 ChannelComparisonData 格式。
    前端期望：{ channels: ChannelStat[] }
    ChannelStat: { channel, label, registrations, payments, conversion_rate, target?, progress?, gap? }
    """
    channels = []
    for zh_key, en_key, label in _CHANNEL_LABEL_MAP:
        if zh_key in raw:
            d = raw[zh_key]
            reg = d.get("register", 0)
            paid = d.get("paid", 0)
            channels.append({
                "channel": en_key,
                "label": label,
                "registrations": reg,
                "payments": paid,
                "conversion_rate": round(paid / reg, 4) if reg else 0,
                "target": d.get("target"),
                "progress": d.get("progress"),
                "gap": d.get("gap"),
                "efficiency_index": d.get("efficiency_index"),
            })
    # 若引擎已是前端格式（含 channels key），直接透传
    if not channels and "channels" in raw:
        return raw
    return {"channels": channels}


def _adapt_prediction(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 prediction（{ revenue, registration, payment } 各含 predicted/model/confidence）
    转换为前端 PredictionData 格式：
    { eom_registrations, eom_payments, eom_revenue, model_used, confidence, daily_series? }
    """
    reg = raw.get("registration", {})
    pay = raw.get("payment", {})
    rev = raw.get("revenue", {})
    return {
        "eom_registrations": reg.get("predicted"),
        "eom_payments": pay.get("predicted"),
        "eom_revenue": rev.get("predicted"),
        "model_used": rev.get("model") or reg.get("model"),
        "confidence": rev.get("confidence") or reg.get("confidence"),
        "daily_series": raw.get("daily_series"),
        # 保留原始数据供其他消费方
        "_raw": raw,
    }


def _adapt_ranking_item(item: dict[str, Any]) -> dict[str, Any]:
    """将单条排名项从引擎字段映射为前端 RankingItem 字段"""
    adapted = dict(item)
    # 新排名体系已直出标准字段:
    #   composite_score, process_score, result_score, efficiency_score,
    #   registrations, payments, revenue_usd, checkin_rate, conversion_rate, detail
    # 兼容旧格式字段映射（cc_360 / 旧排名）
    # score → composite_score
    if "score" in adapted and "composite_score" not in adapted:
        adapted["composite_score"] = adapted.pop("score")
    # paid → payments
    if "paid" in adapted and "payments" not in adapted:
        adapted["payments"] = adapted.pop("paid")
    # leads → registrations（leads 在此上下文 = 注册）
    if "leads" in adapted and "registrations" not in adapted:
        adapted["registrations"] = adapted.pop("leads")
    # checkin_24h → checkin_rate
    if "checkin_24h" in adapted and "checkin_rate" not in adapted:
        adapted["checkin_rate"] = adapted.pop("checkin_24h")
    return adapted


def _adapt_ranking(raw: Any) -> Any:
    """将排名列表或含 items key 的 dict 中的每项做字段映射"""
    if not isinstance(raw, list):
        if isinstance(raw, dict) and "items" in raw:
            raw = dict(raw)
            raw["items"] = [_adapt_ranking_item(i) for i in raw["items"]]
            return raw
        return raw
    return [_adapt_ranking_item(item) for item in raw]


def _adapt_roi(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 roi_estimate（含 total_cost_usd / total_revenue_usd / overall_roi）
    转换为前端 ROIData 格式：
    { total_cost, total_revenue, roi_ratio, currency, cost_breakdown? }
    """
    return {
        "total_cost": raw.get("total_cost_usd", 0),
        "total_revenue": raw.get("total_revenue_usd", 0),
        "roi_ratio": raw.get("overall_roi", 0),
        "currency": "USD",
        "cost_breakdown": raw.get("cost_breakdown"),
        # 保留扩展字段
        "by_month": raw.get("by_month"),
        "optimal_months": raw.get("optimal_months"),
        "decay_summary": raw.get("decay_summary"),
    }


def _adapt_productivity(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 productivity（含 per_capita_usd / total_revenue_usd 等 _usd 后缀字段）
    补充前端期望的 per_capita / total_revenue 无后缀字段。
    """
    adapted = dict(raw)
    for role in ("cc", "ss", "lp"):
        if role in adapted and isinstance(adapted[role], dict):
            r = dict(adapted[role])
            if "per_capita_usd" in r and "per_capita" not in r:
                r["per_capita"] = r["per_capita_usd"]
            if "total_revenue_usd" in r and "total_revenue" not in r:
                r["total_revenue"] = r["total_revenue_usd"]
            adapted[role] = r
    return adapted


def _safe_div(a: Any, b: Any) -> float:
    """安全除法，除数为 0 或 None 时返回 0.0"""
    try:
        if b is None or b == 0:
            return 0.0
        return (a or 0) / b
    except (TypeError, ZeroDivisionError):
        return 0.0


def _adapt_outreach(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 outreach_analysis 嵌套结构拍平为前端期望的平铺字段。
    引擎结构：{ daily_outreach: {by_date, by_cc}, trial_followup: {...}, compliance: {...} }
    前端期望：{ total_calls, contact_rate, effective_rate, avg_duration_s, daily_trend, cc_breakdown }
    """
    daily_outreach = raw.get("daily_outreach", {}) or {}
    by_date = daily_outreach.get("by_date", []) or []
    by_cc = daily_outreach.get("by_cc", {}) or {}
    compliance = raw.get("compliance", {}) or {}
    trial_fu = raw.get("trial_followup", {}) or {}

    # 总拨打量 = 所有日期 total_calls 之和
    total_calls = sum((d.get("total_calls") or 0) for d in by_date)

    # cc_breakdown：把 by_cc dict 转为前端期望的 list
    cc_breakdown = []
    for name, cc_data in by_cc.items():
        if isinstance(cc_data, dict):
            cc_breakdown.append({
                "name": name,
                "calls": cc_data.get("total_calls", 0),
                "contact_rate": cc_data.get("contact_rate"),
                "effective_rate": cc_data.get("effective_rate"),
                "avg_duration_s": cc_data.get("avg_duration_s"),
                "achieved": cc_data.get("achieved", False),
            })

    # daily_trend：保留 by_date 原始列表，前端用 date/calls/contacted/effective_calls
    daily_trend = [
        {
            "date": d.get("date", ""),
            "calls": d.get("total_calls", 0),
            "contacted": d.get("connected_calls") or d.get("contacted") or 0,
            "effective_calls": d.get("effective_calls") or 0,
        }
        for d in by_date
    ]

    return {
        "total_calls": total_calls,
        "contact_rate": compliance.get("compliance_rate"),
        "effective_rate": trial_fu.get("call_rate_24h"),
        "avg_duration_s": None,
        "daily_trend": daily_trend,
        "cc_breakdown": cc_breakdown,
        # 保留原始嵌套结构供其他消费方
        "_raw": raw,
    }


def _adapt_trial(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 trial_followup 结构映射为前端体验课页面期望的字段。
    引擎结构：{ pre_class: {call_rate, ...}, post_class: {call_rate, ...}, by_cc, f11_summary }
    前端期望：{ pre_call_rate, attendance_rate, by_stage, post_call_rate, followup_rate }
    """
    pre_class = raw.get("pre_class", {}) or {}
    post_class = raw.get("post_class", {}) or {}
    f11_summary = raw.get("f11_summary", {}) or {}
    by_cc_raw = raw.get("by_cc", []) or []
    correlation = raw.get("correlation", {}) or {}

    # attendance_rate：从 f11_summary 取，fallback 到 correlation
    attendance_rate = (
        f11_summary.get("overall_attendance_rate")
        or correlation.get("pre_call_attendance")
    )

    # by_stage: by_cc 列表直接作为阶段明细（前端遍历 stage/count/rate）
    by_stage: list[Any] = []
    if isinstance(by_cc_raw, list):
        for item in by_cc_raw:
            if isinstance(item, dict):
                by_stage.append({
                    "stage": item.get("cc_name") or item.get("name") or item.get("stage", ""),
                    "count": item.get("count") or item.get("total", 0),
                    "rate": item.get("rate") or item.get("call_rate"),
                })

    return {
        "pre_call_rate": pre_class.get("call_rate"),
        "attendance_rate": attendance_rate,
        "by_stage": by_stage,
        "post_call_rate": post_class.get("call_rate"),
        # followup_rate 供 FollowupData 兼容
        "followup_rate": post_class.get("call_rate"),
        # 透传原始子结构
        "pre_class": pre_class,
        "post_class": post_class,
        "f11_summary": f11_summary,
    }


def _adapt_orders(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 order_analysis（summary.* 子层）拍平为前端 OrderData 格式。
    引擎结构：{ summary: {total, new, renewal, revenue_usd}, daily_trend, package_distribution, by_channel }
    前端期望：{ total_orders, new_orders, renewal_orders, total_revenue, avg_order_value, by_type, daily_series, channel_breakdown }
    """
    summary = raw.get("summary", {}) or {}
    total = summary.get("total", 0) or 0
    rev_usd = summary.get("revenue_usd", 0) or 0

    by_type = [
        {"type": k, "count": v}
        for k, v in (raw.get("package_distribution") or {}).items()
        if isinstance(v, (int, float))
    ]

    daily_series = [
        {
            "date": d.get("date", ""),
            "orders": d.get("order_count") or 0,
            "revenue": d.get("revenue_cny") or d.get("revenue_usd") or 0,
        }
        for d in (raw.get("daily_trend") or [])
    ]

    return {
        "total_orders": total,
        "new_orders": summary.get("new", 0) or 0,
        "renewal_orders": summary.get("renewal", 0) or 0,
        "total_revenue": rev_usd,
        "avg_order_value": _safe_div(rev_usd, total),
        "by_type": by_type,
        "daily_series": daily_series,
        "channel_breakdown": raw.get("by_channel") or {},
        # 明细行（by_team 含个人级明细，供订单明细表格）
        "items": raw.get("by_team") or [],
    }


def _adapt_trend(raw: dict[str, Any], compare_type: str) -> dict[str, Any]:
    """
    将引擎 trend 转换为前端 TrendData 格式：
    { series: TrendPoint[], compare_type, direction?, compare_data?, mom?, yoy?, wow? }

    raw 结构：{ daily, direction, mom: {months, data, direction}, yoy: {...}, wow: {available, weeks, ...} }

    按 compare_type 从正确的数据源构建 series：
      - daily（默认）：来自 raw.daily（日趋势）
      - mom：来自 raw.mom.data（月度环比，key=月份字符串，value=该月指标 dict）
      - wow：来自 raw.wow.weeks（周环比，每行含 avg_value/week_start）
      - yoy：无时间序列，保留 daily_series 作为图表数据
    """
    mom_raw = raw.get("mom") or {}
    yoy_raw = raw.get("yoy") or {}
    wow_raw = raw.get("wow") or {}

    # 日趋势 series（所有 compare_type 共享底线）
    daily_series: list[dict[str, Any]] = [
        {
            "date": p.get("date", ""),
            "revenue": p.get("revenue_cny") or p.get("revenue") or 0,
            "payments": p.get("order_count") or p.get("payments") or 0,
            "registrations": p.get("registrations") or 0,
        }
        for p in (raw.get("daily") or [])
    ]

    # 按 compare_type 选 series
    compare_data: Any = None
    if compare_type == "mom":
        mom_data = mom_raw.get("data") or {}
        months_sorted = sorted(mom_data.keys())
        series: list[dict[str, Any]] = [
            {
                "date": month,
                "revenue": mom_data[month].get("revenue_cny") or mom_data[month].get("revenue") or 0,
                "payments": mom_data[month].get("payments") or mom_data[month].get("paid") or 0,
                "registrations": mom_data[month].get("registrations") or mom_data[month].get("register") or 0,
            }
            for month in months_sorted
        ]
        if not series:
            series = daily_series
        compare_data = mom_raw
    elif compare_type == "wow":
        weeks = wow_raw.get("weeks") or []
        series = [
            {
                "date": w.get("week_start") or w.get("date") or "",
                "revenue": w.get("revenue") or w.get("avg_value") or 0,
                "payments": w.get("payments") or 0,
                "registrations": w.get("registrations") or w.get("avg_value") or 0,
            }
            for w in weeks
        ]
        if not series:
            series = daily_series
        compare_data = wow_raw
    elif compare_type == "yoy":
        series = daily_series
        compare_data = yoy_raw or raw.get("yoy_by_channel")
    else:
        series = daily_series
        compare_data = None

    return {
        "series":         series,
        "daily_series":   daily_series,
        "compare_type":   compare_type,
        "direction":      raw.get("direction"),
        "compare_data":   compare_data,
        "peak":           raw.get("peak"),
        "valley":         raw.get("valley"),
        # 保留全部子结构供前端按需读取
        "mom":            mom_raw,
        "yoy":            yoy_raw,
        "wow":            wow_raw,
        # 向后兼容旧字段名
        "yoy_by_channel": raw.get("yoy_by_channel"),
    }


# ── Endpoints — 触发 & 全量结果 ────────────────────────────────────────────────

@router.post("/run")
def run_analysis(body: RunAnalysisRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    触发完整 35 源分析管线（AnalysisEngineV2）。
    若 5 分钟 TTL 内已有缓存则直接返回缓存摘要，除非 force=true。
    """
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    try:
        summary = _service.run(
            input_dir=body.input_dir,
            report_date=body.report_date,
            lang=body.lang,
            targets=body.targets,
            force=body.force,
        )
        return {"status": "ok", "summary": summary}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=422, detail={"error": "FileNotFoundError", "detail": str(exc)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": type(exc).__name__, "detail": str(exc)})


@router.get("/result")
def get_result() -> dict[str, Any]:
    """返回最新完整分析结果（缓存）"""
    return _require_full_cache()


# ── Endpoints — 核心指标（原有，URL 不变）────────────────────────────────────

@router.get("/summary")
def get_summary() -> dict[str, Any]:
    """
    返回进度看板 summary + meta + time_progress。
    summary 字段已适配为前端 SummaryMetric 格式（registrations/payments/revenue/...），
    同时在顶层展开同名 key，兼容 ops/dashboard（直接读顶层）和 biz/overview（读 .summary.*）。
    """
    cache = _require_full_cache()
    raw_summary: dict[str, Any] = cache.get("summary") or {}
    # 注入 time_progress 供 _adapt_summary 计算 _calc_status 使用
    raw_summary_with_tp = {**raw_summary, "time_progress": cache.get("time_progress", 0.0)}
    adapted = _adapt_summary(raw_summary_with_tp)
    return {
        # biz/overview 用: summaryResp?.summary?.registrations?.actual
        "summary": adapted,
        # ops/dashboard 用: summaryData["registrations"]（把整个响应当 Record<string,SummaryMetric>）
        **adapted,
        "meta": cache.get("meta"),
        "time_progress": cache.get("time_progress"),
    }


@router.get("/funnel")
def get_funnel() -> dict[str, Any]:
    """
    返回漏斗转化数据（各口径）。
    输出已适配为前端 FunnelData 格式：narrow（cc+ss+lp 合并）/ total / wide。
    """
    raw = _require_cache("funnel")
    if isinstance(raw, dict):
        return _adapt_funnel(raw)
    return raw


@router.get("/channel-comparison")
def get_channel_comparison() -> dict[str, Any]:
    """
    返回渠道对比数据。
    输出已适配为前端 ChannelComparisonData 格式：{ channels: ChannelStat[] }。
    """
    raw = _require_cache("channel_comparison")
    if isinstance(raw, dict):
        return _adapt_channel_comparison(raw)
    return {"channels": []}


@router.get("/team-data")
def get_team_data() -> list[Any]:
    """
    返回团队成员数据列表（TeamMemberData[]）。
    从 cc_ranking / ss_ranking / lp_ranking 聚合，兼容前端 analysisAPI.getTeamData()。
    """
    cache = _require_full_cache()
    members: list[Any] = []
    for key in ("cc_ranking", "ss_ranking", "lp_ranking"):
        data = cache.get(key)
        if isinstance(data, list):
            members.extend(data)
        elif isinstance(data, dict) and "profiles" in data:
            members.extend(data["profiles"])
    return members


@router.get("/cc-ranking")
def get_cc_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(default="composite"),
) -> Any:
    """返回 CC 综合绩效排名"""
    data = _require_cache("cc_ranking")
    if isinstance(data, list):
        return _adapt_ranking(data[:top_n])
    return _adapt_ranking(data)


@router.get("/ss-ranking")
def get_ss_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
) -> Any:
    """返回 SS（EA）绩效排名"""
    data = _require_cache("ss_ranking")
    if isinstance(data, list):
        return _adapt_ranking(data[:top_n])
    return _adapt_ranking(data)


@router.get("/lp-ranking")
def get_lp_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
) -> Any:
    """返回 LP（CM）绩效排名"""
    data = _require_cache("lp_ranking")
    if isinstance(data, list):
        return _adapt_ranking(data[:top_n])
    return _adapt_ranking(data)


@router.get("/prediction")
def get_prediction() -> Any:
    """返回三模型预测输出（线性/WMA/EWM 三选优），已适配为前端 PredictionData 格式"""
    raw = _require_cache("prediction")
    if isinstance(raw, dict):
        return _adapt_prediction(raw)
    return raw


@router.get("/roi")
def get_roi() -> Any:
    """返回 ROI 估算（Cohort × ROI 联动），已适配为前端 ROIData 格式"""
    raw = _require_cache("roi_estimate")
    if isinstance(raw, dict):
        return _adapt_roi(raw)
    return raw


@router.get("/anomalies")
def get_anomalies() -> Any:
    """返回动态阈值异常检测结果（±2σ）"""
    return _require_cache("anomalies")


@router.get("/trend")
def get_trend(
    compare_type: str = Query(default="mom", description="mom=月环比, yoy=年同比, wow=周环比"),
) -> Any:
    """
    返回趋势数据，已适配为前端 TrendData 格式。
    compare_type: mom（默认）| yoy | wow

    始终使用完整 trend 对象（含 daily/mom/yoy/wow 三层）作为输入，
    由 _adapt_trend 按 compare_type 从正确子结构构建 series。
    """
    cache = _require_full_cache()
    # 始终取完整 trend 对象，让适配器按 compare_type 选取正确子结构
    trend_full = cache.get("trend") or {}
    if not trend_full:
        raise HTTPException(
            status_code=404,
            detail="no_data: 分析结果中不含趋势数据，请先运行分析",
        )
    if isinstance(trend_full, dict):
        return _adapt_trend(trend_full, compare_type)
    return trend_full


# ── Endpoints — 向后兼容别名（老端点保留）────────────────────────────────────

@router.get("/cohort")
def get_cohort() -> Any:
    """返回围场（cohort）分析 [alias → enclosure_cross]"""
    return _require_cache("cohort_analysis")


@router.get("/checkin")
def get_checkin() -> Any:
    """返回打卡率分析 [alias → checkin_analysis]"""
    return _require_cache("checkin_analysis")


@router.get("/leads")
def get_leads() -> Any:
    """返回 Leads 达成分析 [alias → funnel]"""
    return _require_cache("leads_achievement")


@router.get("/followup")
def get_followup() -> Any:
    """返回外呼监控数据（outreach_analysis），已适配为前端平铺字段格式"""
    raw = _require_cache("followup_analysis")
    if isinstance(raw, dict):
        return _adapt_outreach(raw)
    return raw


@router.get("/orders")
def get_orders() -> Any:
    """返回订单分析，已适配为前端 OrderData 格式（summary 子层已拍平）"""
    raw = _require_cache("order_analysis")
    if isinstance(raw, dict):
        return _adapt_orders(raw)
    return raw


@router.get("/ltv")
def get_ltv() -> Any:
    """返回 LTV 分析"""
    return _require_cache("ltv")


@router.get("/risk-alerts")
def get_risk_alerts() -> Any:
    """返回风险预警列表"""
    return _require_cache("risk_alerts")


# ── Endpoints — 新增跨源联动端点 ──────────────────────────────────────────────

@router.get("/student-journey")
def get_student_journey() -> Any:
    """
    学员全旅程跨源联动
    A3 leads明细 × E3 订单 × F6 体验跟进 × F11 课前外呼
    """
    return _require_cache("student_journey")


@router.get("/cc-360")
def get_cc_360(
    top_n: int = Query(default=20, ge=1, le=200),
) -> Any:
    """
    CC 360° 画像跨源联动
    D1 打卡率 × F5 外呼 × A4 个人 leads × E3 订单 × F9 付费用户跟进
    """
    data = _require_cache("cc_360")
    if isinstance(data, dict):
        profiles = data.get("profiles", [])
        return {
            **data,
            "profiles": profiles[:top_n],
            "top_performers": data.get("top_performers", []),
            "needs_attention": data.get("needs_attention", []),
            "team_averages": data.get("team_averages", {}),
        }
    return data


@router.get("/cohort-roi")
def get_cohort_roi() -> Any:
    """
    Cohort × ROI 跨源联动
    C1-C5 衰减曲线 × B1 成本模型
    """
    return _require_cache("cohort_roi")


@router.get("/enclosure")
def get_enclosure() -> Any:
    """
    围场交叉分析
    D2-D4 围场 KPI × F8 围场跟进 × A2 围场效率
    """
    return _require_cache("enclosure_cross")


@router.get("/checkin-impact")
def get_checkin_impact() -> Any:
    """
    打卡因果分析
    D1 × D5 已打卡/未打卡参与率、带新系数对比
    """
    return _require_cache("checkin_impact")


@router.get("/productivity")
def get_productivity() -> Any:
    """
    人效分析
    E1/E2 上班人数 × E3 订单 × E5 业绩趋势
    已适配为前端 ProductivityData 格式（per_capita / total_revenue 无 _usd 后缀）
    """
    raw = _require_cache("productivity")
    if isinstance(raw, dict):
        return _adapt_productivity(raw)
    return raw


@router.get("/outreach")
def get_outreach() -> dict[str, Any]:
    """
    外呼分析
    F5 每日外呼 + F6 体验跟进 + F7 付费用户跟进
    """
    return {"status": "ok", "data": _require_cache("outreach_analysis")}


@router.get("/trial-followup")
def get_trial_followup() -> dict[str, Any]:
    """
    体验课跟进（F10 课前课后 + F11 课前外呼覆盖），已适配为前端平铺字段格式
    """
    raw = _require_cache("trial_followup")
    if isinstance(raw, dict):
        return _adapt_trial(raw)
    return raw


@router.get("/risk-alerts-v2")
def get_risk_alerts_v2() -> dict[str, Any]:
    """
    风险预警（V2 完整格式）
    基于 summary 缺口 + anomalies 汇总生成
    """
    return {"status": "ok", "data": _require_cache("risk_alerts")}
