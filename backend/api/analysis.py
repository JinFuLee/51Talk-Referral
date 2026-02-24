"""
分析引擎 API 端点 (V2)
所有需要 AnalysisService 缓存的 GET 端点，以及触发分析的 POST 端点。
引擎已升级为 AnalysisEngineV2（35 源跨源联动）。
所有 GET 端点支持 period 查询参数（默认 "this_month"），缓存按 period 分槽。
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

# ── 二级适配缓存 ────────────────────────────────────────────────────────────────
# key → (version: float, result: Any)
# version = _service._last_run_ats[period].timestamp()，引擎重算时自动失效旧条目。
# GIL 保证 dict 赋值原子性，无需额外锁。
_adapt_cache: dict[str, tuple[float, Any]] = {}


def _cache_version(period: str) -> float:
    """返回指定 period 的引擎缓存版本号（上次 run 的 Unix 时间戳）。
    若 _service 未就绪或尚无该 period 的运行记录，返回 0.0（表示"无版本"）。
    """
    try:
        ts = _service._last_run_ats.get(period)  # type: ignore[union-attr]
        return ts.timestamp() if ts is not None else 0.0
    except Exception:
        return 0.0


def _get_adapted(key: str, version: float, adapt_fn: Any, *args: Any) -> Any:
    """返回缓存的 adapt 结果；version 变化时重算并写入缓存。

    当某个 period 产生新 version 时，批量驱逐**同 period** 下版本号不同的旧条目
    （key 格式为 "{name}:{period}" 或 "{name}:{period}:{extra}"，period 在第二段）。
    不同 period 可能有各自的 version，不互相驱逐。
    """
    cached = _adapt_cache.get(key)
    if cached is not None and cached[0] == version:
        return cached[1]
    result = adapt_fn(*args)
    # 提取 key 中的 period（第二个冒号分隔段）
    parts = key.split(":", 2)
    period_seg = parts[1] if len(parts) >= 2 else ""
    if period_seg:
        # 仅清理同 period 下 version 已过期的条目
        stale_keys = [
            k for k, (v, _) in _adapt_cache.items()
            if v != version and k.split(":", 2)[1:2] == [period_seg]
        ]
        for k in stale_keys:
            _adapt_cache.pop(k, None)
    _adapt_cache[key] = (version, result)
    return result


# ── 白名单常量 ─────────────────────────────────────────────────────────────────

_VALID_PERIODS = {"this_week", "this_month", "last_month", "last_week", "custom"}


def _validate_period(period: str) -> str:
    if period not in _VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"period 必须是: {', '.join(sorted(_VALID_PERIODS))}",
        )
    return period


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
    period: str = "this_month"           # 时间维度
    custom_start: Optional[str] = None  # YYYY-MM-DD（period="custom" 时使用）
    custom_end: Optional[str] = None    # YYYY-MM-DD（period="custom" 时使用）


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_cache(key: str, period: str = "this_month") -> Any:
    """从缓存中取指定 key，缓存不存在则 404，提示先 POST /api/analysis/run"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result(period)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 尚无分析缓存，请先 POST /api/analysis/run 触发分析",
        )
    value = result.get(key)
    if value is None:
        raise HTTPException(
            status_code=404,
            detail=f"no_data: 分析结果中不含 '{key}'，请先运行分析",
        )
    return value


def _require_full_cache(period: str = "this_month") -> dict[str, Any]:
    """返回完整缓存，缓存不存在则 404，提示先 POST /api/analysis/run"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result(period)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 尚无分析缓存，请先 POST /api/analysis/run 触发分析",
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
    narrow_sum: dict[str, Any] = {"register": 0, "reserve": 0, "attend": 0, "paid": 0, "valid_students": 0}
    has_narrow = False
    for k in narrow_keys:
        if k in raw:
            has_narrow = True
            adapted[k] = _to_channel(raw[k])
            for f in ["register", "reserve", "attend", "paid"]:
                narrow_sum[f] += raw[k].get(f, 0)
            # valid_students 是全局共享池，各通道相同，取最大值而非累加
            narrow_sum["valid_students"] = max(
                narrow_sum["valid_students"],
                raw[k].get("valid_students", 0),
            )

    # 合并窄口为 narrow
    if has_narrow:
        reg = narrow_sum["register"]
        paid = narrow_sum["paid"]
        rsv = narrow_sum["reserve"]
        att = narrow_sum["attend"]
        # contact_rate / participation_rate 同为全局指标，取第一个非零值
        all_narrow_rates = [raw[k].get("rates", {}) for k in narrow_keys if k in raw]
        def _first_nonzero(key: str) -> float:
            for r in all_narrow_rates:
                v = r.get(key)
                if v:
                    return v
            return 0
        narrow_sum["rates"] = {
            "reserve_rate":       round(rsv / reg, 4) if reg else 0,
            "attend_rate":        round(att / rsv, 4) if rsv else 0,
            "paid_rate":          round(paid / att, 4) if att else 0,
            "register_paid_rate": round(paid / reg, 4) if reg else 0,
            "contact_rate":       _first_nonzero("contact_rate"),
            "participation_rate": _first_nonzero("participation_rate"),
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
    { total_cost, total_revenue, roi_ratio, currency, cost_breakdown?, by_product? }
    """
    return {
        "total_cost": raw.get("total_cost_usd", 0),
        "total_revenue": raw.get("total_revenue_usd", 0),
        "roi_ratio": raw.get("overall_roi", 0),
        "currency": "USD",
        "cost_breakdown": raw.get("cost_breakdown"),
        "cost_list": raw.get("cost_list"),
        "by_product": raw.get("by_product"),
        "is_estimated": raw.get("is_estimated", True),
        "data_source": raw.get("data_source", "none"),
        # 保留扩展字段
        "by_month": raw.get("by_month"),
        "optimal_months": raw.get("optimal_months"),
        "decay_summary": raw.get("decay_summary"),
    }


def _adapt_productivity(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 productivity（含 per_capita_usd / total_revenue_usd 等 _usd 后缀字段）
    补充前端期望的 per_capita / total_revenue 无后缀字段。
    前端 ProductivityData 类型要求 { roles: Record<string, ProductivityMetrics> }，
    将 cc/ss/lp 包装到 roles 字段。
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
    roles: dict[str, Any] = {}
    for role in ("cc", "ss", "lp"):
        if role in adapted:
            roles[role] = adapted.pop(role)
    adapted["roles"] = roles
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
    前端期望：{ total_calls, total_connects, total_effective, contact_rate, effective_rate,
               avg_duration_min, daily_trend, cc_breakdown }
    """
    daily_outreach = raw.get("daily_outreach", {}) or {}
    by_date = daily_outreach.get("by_date", []) or []
    by_cc = daily_outreach.get("by_cc", {}) or {}
    compliance = raw.get("compliance", {}) or {}
    trial_fu = raw.get("trial_followup", {}) or {}

    # 总量汇总
    total_calls = sum((d.get("total_calls") or 0) for d in by_date)
    total_connects = sum(
        (d.get("connected_calls") or d.get("total_connects") or d.get("contacted") or 0)
        for d in by_date
    )
    total_effective = sum(
        (d.get("effective_calls") or d.get("total_effective") or 0)
        for d in by_date
    )

    # 派生汇率
    contact_rate = _safe_div(total_connects, total_calls) if total_calls else (
        compliance.get("compliance_rate") or 0.0
    )
    effective_rate = _safe_div(total_effective, total_calls) if total_calls else (
        trial_fu.get("call_rate_24h") or 0.0
    )

    # cc_breakdown：把 by_cc dict 转为前端期望的 list
    cc_breakdown = []
    for name, cc_data in by_cc.items():
        if isinstance(cc_data, dict):
            cc_total = cc_data.get("total_calls", 0) or 0
            cc_connects = cc_data.get("total_connects", 0) or 0
            cc_effective = cc_data.get("total_effective", 0) or 0
            avg_dur_s = cc_data.get("avg_duration_s")
            cc_breakdown.append({
                "cc_name": name,
                "team": cc_data.get("team"),
                "total_calls": cc_total,
                "total_connects": cc_connects,
                "total_effective": cc_effective,
                "contact_rate": cc_data.get("contact_rate") or _safe_div(cc_connects, cc_total),
                "effective_rate": cc_data.get("effective_rate") or _safe_div(cc_effective, cc_total),
                "avg_duration_s": avg_dur_s,
                "avg_duration_min": round(avg_dur_s / 60, 1) if avg_dur_s else None,
                # legacy aliases
                "name": name,
                "calls": cc_total,
                "achieved": cc_data.get("achieved", False),
            })

    # daily_trend
    daily_trend = [
        {
            "date": d.get("date", ""),
            "calls": d.get("total_calls", 0),
            "connects": d.get("connected_calls") or d.get("total_connects") or d.get("contacted") or 0,
            "effective_calls": d.get("effective_calls") or d.get("total_effective") or 0,
            # legacy aliases
            "contacted": d.get("connected_calls") or d.get("contacted") or 0,
        }
        for d in by_date
    ]

    return {
        "total_calls": total_calls,
        "total_connects": total_connects,
        "total_effective": total_effective,
        "contact_rate": round(contact_rate, 4),
        "effective_rate": round(effective_rate, 4),
        "avg_duration_min": None,
        "daily_trend": daily_trend,
        "cc_breakdown": cc_breakdown,
        # 保留原始嵌套结构供其他消费方
        "_raw": raw,
    }


def _adapt_trial(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 trial_followup 结构映射为前端体验课页面期望的字段。
    引擎结构：{ pre_class: {call_rate, ...}, post_class: {call_rate, ...},
               by_cc (list from F10), f11_summary, f11_by_cc, f11_by_lead_type }
    前端期望：{ pre_call_rate, attendance_rate, by_stage, post_call_rate, followup_rate,
               pre_class_summary, post_class_summary, by_cc (per-CC detail), checkin_rate }
    """
    pre_class = raw.get("pre_class", {}) or {}
    post_class = raw.get("post_class", {}) or {}
    f11_summary = raw.get("f11_summary", {}) or {}
    by_cc_raw = raw.get("by_cc", []) or []
    f11_by_cc = raw.get("f11_by_cc", {}) or {}
    correlation = raw.get("correlation", {}) or {}

    # attendance_rate：从 f11_summary 取，fallback 到 correlation
    attendance_rate = (
        f11_summary.get("overall_attendance_rate")
        or correlation.get("pre_call_attendance")
    )
    # Bug 3 fix: 若两个来源均无数据，从 by_cc_raw 中计算均值作为最终 fallback
    if not attendance_rate and isinstance(by_cc_raw, list):
        att_rates = [
            item.get("attendance_rate")
            for item in by_cc_raw
            if isinstance(item, dict) and item.get("attendance_rate") is not None
        ]
        if att_rates:
            attendance_rate = sum(att_rates) / len(att_rates)

    pre_call_rate = pre_class.get("call_rate") or f11_summary.get("overall_call_rate")
    post_call_rate = post_class.get("call_rate")

    # pre_class_summary / post_class_summary with rates
    pre_class_summary = {
        "call_rate": pre_call_rate,
        "connect_rate": pre_class.get("connect_rate") or f11_summary.get("overall_connect_rate"),
        "attendance_rate": attendance_rate,
        "total_records": f11_summary.get("total_records", 0),
        "total_called": f11_summary.get("total_pre_called", 0),
        "total_connected": f11_summary.get("total_pre_connected", 0),
    }
    post_class_summary = {
        "call_rate": post_call_rate,
        "connect_rate": post_class.get("connect_rate"),
    }

    # by_cc: merge F10 by_cc (list) with F11 by_cc (dict) for per-CC detail
    # F10 by_cc list items have: cc_name, pre_call_rate, post_call_rate, etc.
    by_cc_merged: list[dict[str, Any]] = []
    if isinstance(by_cc_raw, list):
        for item in by_cc_raw:
            if not isinstance(item, dict):
                continue
            cc_name = item.get("cc_name") or item.get("name") or ""
            f11_cc = f11_by_cc.get(cc_name, {}) if isinstance(f11_by_cc, dict) else {}
            by_cc_merged.append({
                "cc_name": cc_name,
                "team": item.get("team"),
                # pre-class metrics from F11
                "pre_call_rate": f11_cc.get("call_rate") or item.get("pre_call_rate"),
                "pre_connect_rate": f11_cc.get("connect_rate") or item.get("pre_connect_rate"),
                "total_classes": f11_cc.get("total_classes") or item.get("total_classes") or 0,
                "pre_class_call": f11_cc.get("pre_class_call") or 0,
                # post-class metrics from F10
                "post_call_rate": item.get("post_call_rate"),
                "post_connect_rate": item.get("post_connect_rate"),
                # attendance
                "attendance_rate": f11_cc.get("attendance_rate") or item.get("attendance_rate"),
                "attended": f11_cc.get("attended") or 0,
                # checkin_rate from D5 (not in this data source; pass None)
                "checkin_rate": item.get("checkin_rate"),
                # stage breakdown for frontend
                "pre_class": {
                    "call_rate": f11_cc.get("call_rate") or item.get("pre_call_rate"),
                    "count": f11_cc.get("pre_class_call") or 0,
                },
                "post_class": {
                    "call_rate": item.get("post_call_rate"),
                    "count": item.get("post_class_call") or 0,
                },
            })
    elif isinstance(f11_by_cc, dict):
        # fallback: build from f11_by_cc only
        for cc_name, f11_cc in f11_by_cc.items():
            if not isinstance(f11_cc, dict):
                continue
            by_cc_merged.append({
                "cc_name": cc_name,
                "team": f11_cc.get("team"),
                "pre_call_rate": f11_cc.get("call_rate"),
                "pre_connect_rate": f11_cc.get("connect_rate"),
                "total_classes": f11_cc.get("total_classes", 0),
                "pre_class_call": f11_cc.get("pre_class_call", 0),
                "post_call_rate": None,
                "attendance_rate": f11_cc.get("attendance_rate"),
                "attended": f11_cc.get("attended", 0),
                "checkin_rate": None,
                "pre_class": {"call_rate": f11_cc.get("call_rate"), "count": f11_cc.get("pre_class_call", 0)},
                "post_class": {"call_rate": None, "count": 0},
            })

    # Bug 2 fix: 从 by_cc_merged 汇总课后跟进 count，替换硬编码 0
    post_class_count = sum(
        (item.get("post_class", {}).get("count") or 0)
        for item in by_cc_merged
    )

    # by_stage: stage-level summary (aggregated from pre/post for chart use)
    by_stage = [
        {"stage": "课前外呼", "count": pre_class_summary.get("total_called", 0), "rate": pre_call_rate},
        {"stage": "课后跟进", "count": post_class_count, "rate": post_call_rate},
    ]

    # Bug 1 fix: 在 pre_class / post_class 中注入 by_cc 明细，前端路径 followup.pre_class.by_cc
    pre_class_with_by_cc = {
        **pre_class,
        "by_cc": [
            {
                "cc_name": item.get("cc_name"),
                "team": item.get("team"),
                "call_rate": item.get("pre_call_rate"),
                "connect_rate": item.get("pre_connect_rate"),
                "count": (item.get("pre_class") or {}).get("count") or 0,
                "total_classes": item.get("total_classes", 0),
                "attended": item.get("attended", 0),
            }
            for item in by_cc_merged
        ],
    }
    post_class_with_by_cc = {
        **post_class,
        "by_cc": [
            {
                "cc_name": item.get("cc_name"),
                "team": item.get("team"),
                "call_rate": item.get("post_call_rate"),
                "connect_rate": item.get("post_connect_rate"),
                "count": (item.get("post_class") or {}).get("count") or 0,
            }
            for item in by_cc_merged
        ],
    }

    return {
        "pre_call_rate": pre_call_rate,
        "post_call_rate": post_call_rate,
        "attendance_rate": attendance_rate,
        "pre_class_summary": pre_class_summary,
        "post_class_summary": post_class_summary,
        "by_cc": by_cc_merged,
        "by_stage": by_stage,
        # 透传原始子结构（含注入的 by_cc 明细）
        "pre_class": pre_class_with_by_cc,
        "post_class": post_class_with_by_cc,
        "f11_summary": f11_summary,
        "correlation": correlation,
    }


def _adapt_orders(raw: dict[str, Any]) -> dict[str, Any]:
    """
    将引擎 order_analysis（summary.* 子层）拍平为前端 OrderData 格式。
    引擎结构：{ summary: {total, new, renewal, revenue_usd}, daily_trend, package_distribution, by_channel }
    前端期望：{ total_orders, new_orders, renewal_orders, total_revenue, avg_order_value,
               by_type, daily_series, channel_breakdown (list), package_distribution,
               items (with amount_usd + amount_thb) }
    """
    summary = raw.get("summary", {}) or {}
    total = summary.get("total", 0) or 0
    rev_usd = summary.get("revenue_usd", 0) or summary.get("revenue_usd", 0) or 0

    # package_distribution: E6 data — can be a dict of {product_type: count/ratio} or nested
    pkg_dist_raw = raw.get("package_distribution") or {}
    if isinstance(pkg_dist_raw, dict):
        # Try flat numeric values first (product_type → count)
        by_type = [
            {"type": k, "count": v, "revenue_usd": 0}
            for k, v in pkg_dist_raw.items()
            if isinstance(v, (int, float)) and v > 0
        ]
        # If nested, try records inside
        if not by_type:
            records_inner = pkg_dist_raw.get("records") or []
            ptype_totals: dict[str, Any] = {}
            for rec in records_inner:
                if not isinstance(rec, dict):
                    continue
                for k, v in rec.items():
                    if isinstance(v, (int, float)) and v > 0:
                        ptype_totals[k] = ptype_totals.get(k, 0) + v
            by_type = [
                {"type": k, "count": v, "revenue_usd": 0}
                for k, v in sorted(ptype_totals.items(), key=lambda x: -x[1])
                if v > 0
            ]
    else:
        by_type = []

    # Enrich by_type from channel_product (E8) for revenue_usd
    channel_product = raw.get("channel_product") or []
    if isinstance(channel_product, list) and channel_product:
        cp_by_type: dict[str, float] = {}
        for cp in channel_product:
            if not isinstance(cp, dict):
                continue
            pt = cp.get("product") or cp.get("product_type") or ""
            amt = cp.get("amount_usd", 0) or 0
            if pt:
                cp_by_type[pt] = cp_by_type.get(pt, 0.0) + amt
        # Update or create by_type entries with revenue_usd
        if cp_by_type:
            existing = {item["type"]: item for item in by_type}
            for pt, amt in cp_by_type.items():
                if pt in existing:
                    existing[pt]["revenue_usd"] = round(amt, 2)
                else:
                    existing[pt] = {"type": pt, "count": 0, "revenue_usd": round(amt, 2)}
            by_type = sorted(existing.values(), key=lambda x: -(x.get("revenue_usd") or 0))

    daily_series = [
        {
            "date": d.get("date", ""),
            "orders": d.get("order_count") or 0,
            "revenue": d.get("revenue_usd") or d.get("revenue_cny") or 0,
        }
        for d in (raw.get("daily_trend") or [])
    ]

    # channel_breakdown: convert dict → list for frontend
    by_channel_raw = raw.get("by_channel") or {}
    if isinstance(by_channel_raw, dict):
        channel_breakdown = [
            {
                "channel": ch,
                "orders": d.get("total_orders") or d.get("order_count") or 0,
                "revenue_usd": d.get("revenue_usd") or 0,
                "revenue_thb": round((d.get("revenue_usd") or 0) * 34, 0),
                "new_orders": d.get("new_orders") or 0,
                "renewal_orders": d.get("renewal_orders") or 0,
            }
            for ch, d in by_channel_raw.items()
            if isinstance(d, dict)
        ]
    else:
        channel_breakdown = by_channel_raw or []

    # E3 明细行：将 records 字段映射到前端期望的 cc_name/student_name 等列名
    raw_records: list[Any] = raw.get("records") or []
    items = [
        {
            "date":         r.get("date"),
            "cc_name":      r.get("seller") or r.get("cc_name"),
            "student_name": r.get("student_id") or r.get("student_name"),
            "channel":      r.get("channel"),
            "package":      r.get("product") or r.get("package"),
            "amount_usd":   r.get("amount_usd"),
            "amount_thb":   round((r.get("amount_usd") or 0) * 34, 0) if r.get("amount_usd") else None,
            "amount":       r.get("amount_usd"),       # legacy alias
            "order_tag":    r.get("order_tag"),
            "team":         r.get("team"),
        }
        for r in raw_records
    ]

    return {
        "total_orders": total,
        "new_orders": summary.get("new", 0) or 0,
        "renewal_orders": summary.get("renewal", 0) or 0,
        "total_revenue": rev_usd,
        "avg_order_value": _safe_div(rev_usd, total),
        "by_type": by_type,
        "package_distribution": by_type,   # alias expected by some components
        "daily_series": daily_series,
        "channel_breakdown": channel_breakdown,
        "items": items,
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
        def _mom_row(v) -> dict:
            """兼容 mom_data[month] 为 dict 或 list（多渠道记录）两种结构"""
            if isinstance(v, list):
                # 找总计行，或转介绍行
                row = next((r for r in v if isinstance(r, dict) and (
                    "总计" in str(r.get("name", "")) or
                    "总计" in str(r.get("channel_type", "")) or
                    "转介绍" in str(r.get("channel_type", ""))
                )), None)
                if row is None:
                    row = v[0] if v else {}
                return row if isinstance(row, dict) else {}
            return v if isinstance(v, dict) else {}
        series: list[dict[str, Any]] = []
        for month in months_sorted:
            row = _mom_row(mom_data[month])  # 缓存调用结果，避免重复搜索
            series.append({
                "date": month,
                "revenue": row.get("revenue_usd") or row.get("amount_usd") or row.get("revenue") or row.get("revenue_cny") or 0,
                "payments": row.get("payments") or row.get("paid") or 0,
                "registrations": row.get("registrations") or row.get("register") or 0,
            })
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
    使用 BackgroundTasks 以后台运行的方式避免阻塞 API 响应。
    """
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    background_tasks.add_task(
        _service.run,
        input_dir=body.input_dir,
        report_date=body.report_date,
        lang=body.lang,
        targets=body.targets,
        force=body.force,
        period=body.period,
        custom_start=body.custom_start,
        custom_end=body.custom_end,
    )
    return {"status": "processing", "summary": {}, "message": "分析任务已提交后台运行"}


@router.get("/result")
def get_result(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """返回最新完整分析结果（缓存）"""
    period = _validate_period(period)
    return _require_full_cache(period)


# ── Endpoints — 核心指标（原有，URL 不变）────────────────────────────────────

@router.get("/summary")
def get_summary(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    返回进度看板 summary + meta + time_progress。
    summary 字段已适配为前端 SummaryMetric 格式（registrations/payments/revenue/...），
    同时在顶层展开同名 key，兼容 ops/dashboard（直接读顶层）和 biz/overview（读 .summary.*）。
    每个 metric 内嵌 MoM 数据（mom_prev / mom_change / mom_change_pct），来自 trend.mom 缓存。
    """
    period = _validate_period(period)
    version = _cache_version(period)
    adapt_key = f"summary:{period}"
    cached_resp = _adapt_cache.get(adapt_key)
    if cached_resp is not None and cached_resp[0] == version:
        return cached_resp[1]

    from datetime import date as _date

    cache = _require_full_cache(period)
    raw_summary: dict[str, Any] = cache.get("summary") or {}
    # 注入 time_progress 供 _adapt_summary 计算 _calc_status 使用
    raw_summary_with_tp = {**raw_summary, "time_progress": cache.get("time_progress", 0.0)}
    adapted = _adapt_summary(raw_summary_with_tp)

    # ── 内嵌 MoM 环比数据（不修改 _adapt_summary，在端点层注入）──────────────
    # 数据来源：trend.mom.data（F3 loader 预聚合的多月数据）
    # 结构：{ "202501": [{channel_type, paid, amount_usd, allocations, ...}], "202502": [...] }
    try:
        trend_data: dict[str, Any] = cache.get("trend") or {}
        mom_data: dict[str, Any] = trend_data.get("mom", {}).get("data", {}) or {}

        if mom_data:
            # 确定当前月和上月 key
            curr_month_key = _date.today().strftime("%Y%m")
            sorted_months = sorted(mom_data.keys())
            prev_month_key: Optional[str] = None

            if curr_month_key in sorted_months:
                idx = sorted_months.index(curr_month_key)
                if idx > 0:
                    prev_month_key = sorted_months[idx - 1]
            elif len(sorted_months) >= 2:
                # 当前月尚无数据时，取最后两个月中更早的那个
                prev_month_key = sorted_months[-2]

            if prev_month_key and prev_month_key in mom_data:
                prev_entries = mom_data[prev_month_key]
                if not isinstance(prev_entries, list):
                    prev_entries = [prev_entries]

                # 聚合上月所有渠道的总量
                prev_paid = sum((e.get("paid") or 0) for e in prev_entries)
                prev_revenue_usd = sum((e.get("amount_usd") or 0) for e in prev_entries)
                # allocations 字段近似注册分配数（F3 loader 预聚合字段）
                prev_allocations = sum((e.get("allocations") or 0) for e in prev_entries)

                def _inject_mom(metric_dict: dict[str, Any], curr_actual: float, prev_value: float) -> None:
                    """将上月值和变化量注入到 metric 字典（原地修改）"""
                    metric_dict["mom_prev"] = prev_value
                    change = (curr_actual or 0) - prev_value
                    metric_dict["mom_change"] = round(change, 4)
                    metric_dict["mom_change_pct"] = (
                        round(change / prev_value * 100, 1) if prev_value else None
                    )

                if "registrations" in adapted and isinstance(adapted["registrations"], dict):
                    _inject_mom(
                        adapted["registrations"],
                        adapted["registrations"].get("actual", 0),
                        prev_allocations,
                    )
                if "payments" in adapted and isinstance(adapted["payments"], dict):
                    _inject_mom(
                        adapted["payments"],
                        adapted["payments"].get("actual", 0),
                        prev_paid,
                    )
                if "revenue" in adapted and isinstance(adapted["revenue"], dict):
                    _inject_mom(
                        adapted["revenue"],
                        adapted["revenue"].get("actual", 0),
                        prev_revenue_usd,
                    )
                if "leads" in adapted and isinstance(adapted["leads"], dict):
                    _inject_mom(
                        adapted["leads"],
                        adapted["leads"].get("actual", 0),
                        prev_allocations,
                    )
    except Exception as _mom_err:
        import logging as _log
        _log.getLogger(__name__).warning(f"get_summary: MoM 注入失败（不影响主响应）: {_mom_err}")
    # ─────────────────────────────────────────────────────────────────────────

    response = {
        # biz/overview 用: summaryResp?.summary?.registrations?.actual
        "summary": adapted,
        # ops/dashboard 用: summaryData["registrations"]（把整个响应当 Record<string,SummaryMetric>）
        **adapted,
        "meta": cache.get("meta"),
        "time_progress": cache.get("time_progress"),
    }
    # 写入 adapt 缓存（直接赋值，跳过 adapt_fn 调用；驱逐同 period 旧条目）
    parts = adapt_key.split(":", 2)
    period_seg = parts[1] if len(parts) >= 2 else ""
    if period_seg:
        stale_keys = [
            k for k, (v, _) in _adapt_cache.items()
            if v != version and k.split(":", 2)[1:2] == [period_seg]
        ]
        for k in stale_keys:
            _adapt_cache.pop(k, None)
    _adapt_cache[adapt_key] = (version, response)
    return response


@router.get("/funnel")
def get_funnel(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    返回漏斗转化数据（各口径）。
    输出已适配为前端 FunnelData 格式：narrow（cc+ss+lp 合并）/ total / wide。
    """
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("funnel", period)
    if isinstance(raw, dict):
        return _get_adapted(f"funnel:{period}", version, _adapt_funnel, raw)
    return raw


@router.get("/channel-comparison")
def get_channel_comparison(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    返回渠道对比数据。
    输出已适配为前端 ChannelComparisonData 格式：{ channels: ChannelStat[] }。
    """
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("channel_comparison", period)
    if isinstance(raw, dict):
        return _get_adapted(f"channel_comparison:{period}", version, _adapt_channel_comparison, raw)
    return {"channels": []}


@router.get("/team-data")
def get_team_data(
    period: str = Query(default="this_month", description="时间维度"),
) -> list[Any]:
    """
    返回团队成员数据列表（TeamMemberData[]）。
    从 cc_ranking / ss_ranking / lp_ranking 聚合，兼容前端 analysisAPI.getTeamData()。
    """
    period = _validate_period(period)
    cache = _require_full_cache(period)
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
    period: str = Query(default="this_month", description="时间维度"),
    cc_name: Optional[str] = Query(default=None, description="筛选指定 CC（精确匹配）"),
) -> Any:
    """返回 CC 综合绩效排名，若传 cc_name 则只返回该 CC 的数据"""
    period = _validate_period(period)
    version = _cache_version(period)
    data = _require_cache("cc_ranking", period)
    items: list[Any] = data if isinstance(data, list) else data.get("items", [])
    if cc_name:
        items = [item for item in items if (item.get("cc_name") or item.get("name")) == cc_name]
        adapt_key = f"cc_ranking:{period}:name:{cc_name}"
    else:
        items = items[:top_n]
        adapt_key = f"cc_ranking:{period}:top:{top_n}"
    return _get_adapted(adapt_key, version, _adapt_ranking, items)


@router.get("/ss-ranking")
def get_ss_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
    period: str = Query(default="this_month", description="时间维度"),
    cc_name: Optional[str] = Query(default=None, description="筛选指定 SS（精确匹配）"),
) -> Any:
    """返回 SS（EA）绩效排名，若传 cc_name 则只返回该 SS 的数据"""
    period = _validate_period(period)
    version = _cache_version(period)
    data = _require_cache("ss_ranking", period)
    items: list[Any] = data if isinstance(data, list) else data.get("items", [])
    if cc_name:
        items = [item for item in items if (item.get("cc_name") or item.get("name")) == cc_name]
        adapt_key = f"ss_ranking:{period}:name:{cc_name}"
    else:
        items = items[:top_n]
        adapt_key = f"ss_ranking:{period}:top:{top_n}"
    return _get_adapted(adapt_key, version, _adapt_ranking, items)


@router.get("/lp-ranking")
def get_lp_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
    period: str = Query(default="this_month", description="时间维度"),
    cc_name: Optional[str] = Query(default=None, description="筛选指定 LP（精确匹配）"),
) -> Any:
    """返回 LP（CM）绩效排名，若传 cc_name 则只返回该 LP 的数据"""
    period = _validate_period(period)
    version = _cache_version(period)
    data = _require_cache("lp_ranking", period)
    items: list[Any] = data if isinstance(data, list) else data.get("items", [])
    if cc_name:
        items = [item for item in items if (item.get("cc_name") or item.get("name")) == cc_name]
        adapt_key = f"lp_ranking:{period}:name:{cc_name}"
    else:
        items = items[:top_n]
        adapt_key = f"lp_ranking:{period}:top:{top_n}"
    return _get_adapted(adapt_key, version, _adapt_ranking, items)


@router.get("/prediction")
def get_prediction(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回三模型预测输出（线性/WMA/EWM 三选优），已适配为前端 PredictionData 格式"""
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("prediction", period)
    if isinstance(raw, dict):
        return _get_adapted(f"prediction:{period}", version, _adapt_prediction, raw)
    return raw


@router.get("/roi")
def get_roi(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回 ROI 估算（Cohort × ROI 联动），已适配为前端 ROIData 格式"""
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("roi_estimate", period)
    if isinstance(raw, dict):
        return _get_adapted(f"roi:{period}", version, _adapt_roi, raw)
    return raw


@router.get("/anomalies")
def get_anomalies(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回动态阈值异常检测结果（±2σ）"""
    period = _validate_period(period)
    return _require_cache("anomalies", period)


@router.get("/trend")
def get_trend(
    compare_type: str = Query(default="mom", description="mom=月环比, yoy=年同比, wow=周环比"),
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """
    返回趋势数据，已适配为前端 TrendData 格式。
    compare_type: mom（默认）| yoy | wow

    始终使用完整 trend 对象（含 daily/mom/yoy/wow 三层）作为输入，
    由 _adapt_trend 按 compare_type 从正确子结构构建 series。
    """
    period = _validate_period(period)
    version = _cache_version(period)
    cache = _require_full_cache(period)
    # 始终取完整 trend 对象，让适配器按 compare_type 选取正确子结构
    trend_full = cache.get("trend") or {}
    if not trend_full:
        raise HTTPException(
            status_code=404,
            detail="no_data: 分析结果中不含趋势数据，请先运行分析",
        )
    if isinstance(trend_full, dict):
        return _get_adapted(f"trend:{period}:{compare_type}", version, _adapt_trend, trend_full, compare_type)
    return trend_full


# ── Endpoints — 向后兼容别名（老端点保留）────────────────────────────────────

@router.get("/cohort")
def get_cohort(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回围场（cohort）分析 [alias → enclosure_cross]"""
    period = _validate_period(period)
    return _require_cache("cohort_analysis", period)


@router.get("/checkin")
def get_checkin(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回打卡率分析 [alias → checkin_analysis]"""
    period = _validate_period(period)
    return _require_cache("checkin_analysis", period)


@router.get("/leads")
def get_leads(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回 Leads 达成分析 [alias → funnel]"""
    period = _validate_period(period)
    return _require_cache("leads_achievement", period)


@router.get("/followup")
def get_followup(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回外呼监控数据（outreach_analysis），已适配为前端平铺字段格式"""
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("followup_analysis", period)
    if isinstance(raw, dict):
        return _get_adapted(f"followup:{period}", version, _adapt_outreach, raw)
    return raw


@router.get("/orders")
def get_orders(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回订单分析，已适配为前端 OrderData 格式（summary 子层已拍平）"""
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("order_analysis", period)
    if isinstance(raw, dict):
        return _get_adapted(f"orders:{period}", version, _adapt_orders, raw)
    return raw


@router.get("/ltv")
def get_ltv(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回 LTV 分析"""
    period = _validate_period(period)
    return _require_cache("ltv", period)


@router.get("/risk-alerts")
def get_risk_alerts(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """返回风险预警列表"""
    period = _validate_period(period)
    return _require_cache("risk_alerts", period)


# ── Endpoints — 新增跨源联动端点 ──────────────────────────────────────────────

@router.get("/student-journey")
def get_student_journey(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """
    学员全旅程跨源联动
    A3 leads明细 × E3 订单 × F6 体验跟进 × F11 课前外呼
    """
    period = _validate_period(period)
    return _require_cache("student_journey", period)


@router.get("/cc-360")
def get_cc_360(
    top_n: int = Query(default=20, ge=1, le=200),
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """
    CC 360° 画像跨源联动
    D1 打卡率 × F5 外呼 × A4 个人 leads × E3 订单 × F9 付费用户跟进
    """
    period = _validate_period(period)
    data = _require_cache("cc_360", period)
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
def get_cohort_roi(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """
    Cohort × ROI 跨源联动
    C1-C5 衰减曲线 × B1 成本模型
    """
    period = _validate_period(period)
    return _require_cache("cohort_roi", period)


@router.get("/enclosure")
def get_enclosure(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """
    围场交叉分析
    D2-D4 围场 KPI × F8 围场跟进 × A2 围场效率
    """
    period = _validate_period(period)
    return _require_cache("enclosure_cross", period)


@router.get("/checkin-impact")
def get_checkin_impact(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """
    打卡因果分析
    D1 × D5 已打卡/未打卡参与率、带新系数对比
    """
    period = _validate_period(period)
    return _require_cache("checkin_impact", period)


@router.get("/productivity")
def get_productivity(
    period: str = Query(default="this_month", description="时间维度"),
) -> Any:
    """
    人效分析
    E1/E2 上班人数 × E3 订单 × E5 业绩趋势
    已适配为前端 ProductivityData 格式（per_capita / total_revenue 无 _usd 后缀）
    """
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("productivity", period)
    if isinstance(raw, dict):
        return _get_adapted(f"productivity:{period}", version, _adapt_productivity, raw)
    return raw


@router.get("/outreach")
def get_outreach(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    外呼分析（已适配为前端平铺字段格式）
    F5 每日外呼 + F6 体验跟进 + F7 付费用户跟进
    前端期望：total_calls / total_connects / total_effective / contact_rate /
              effective_rate / avg_duration_min / daily_trend / cc_breakdown
    """
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("outreach_analysis", period)
    if isinstance(raw, dict):
        return _get_adapted(f"outreach:{period}", version, _adapt_outreach, raw)
    return raw


@router.get("/trial-followup")
def get_trial_followup(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    体验课跟进（F10 课前课后 + F11 课前外呼覆盖），已适配为前端平铺字段格式
    """
    period = _validate_period(period)
    version = _cache_version(period)
    raw = _require_cache("trial_followup", period)
    if isinstance(raw, dict):
        return _get_adapted(f"trial_followup:{period}", version, _adapt_trial, raw)
    return raw


@router.get("/risk-alerts-v2")
def get_risk_alerts_v2(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    风险预警（V2 完整格式）
    基于 summary 缺口 + anomalies 汇总生成
    """
    period = _validate_period(period)
    return {"status": "ok", "data": _require_cache("risk_alerts", period)}


# ── ROI 成本明细（B1 真实数据）────────────────────────────────────────────────

@router.get("/roi/cost-breakdown")
def get_roi_cost_breakdown(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    返回 B1 真实成本明细数据，替代前端硬编码 COST_BREAKDOWN。
    格式：{ items: ROICostItem[], total_cost_usd: float, by_product: dict }
    ROICostItem: { 奖励类型, 内外场激励, 激励详情, 推荐动作, 赠送数, 成本单价USD, 成本USD }
    """
    period = _validate_period(period)
    raw = _require_cache("roi_estimate", period)
    cost_list: list[Any] = raw.get("cost_list") or []
    by_product: dict[str, Any] = raw.get("by_product") or {}
    total_cost: float = raw.get("total_cost_usd") or 0.0

    # 若 cost_list 为空（B1 文件未找到），返回空列表而非 404
    return {
        "items": cost_list,
        "total_cost_usd": total_cost,
        "by_product": by_product,
    }


# ── M13: 影响链 ────────────────────────────────────────────────────────────────

@router.get("/impact-chain")
def get_impact_chain(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """返回全效率指标影响链"""
    period = _validate_period(period)
    cache = _require_full_cache(period)
    from core.impact_chain import ImpactChainEngine
    engine = ImpactChainEngine(
        summary=cache.get("summary", {}),
        targets=cache.get("meta", {}).get("targets", {}),
        funnel=cache.get("funnel", {}),
    )
    return engine.compute_all_chains()


class WhatIfRequest(BaseModel):
    metric: str
    new_value: float
    period: str = "this_month"


@router.post("/what-if")
def post_what_if(req: WhatIfRequest) -> dict[str, Any]:
    """模拟某效率指标提升后的全链收益变化"""
    cache = _require_full_cache(req.period)
    from core.impact_chain import ImpactChainEngine
    engine = ImpactChainEngine(
        summary=cache.get("summary", {}),
        targets=cache.get("meta", {}).get("targets", {}),
        funnel=cache.get("funnel", {}),
    )
    try:
        return engine.what_if(req.metric, req.new_value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# ── M16: 归因分析 ────────────────────────────────────────────────────────────

def _adapt_attribution(cache: dict[str, Any]) -> dict[str, Any]:
    """
    多维归因分析，返回三个归因维度：
    - channel_attribution: 各渠道（CC窄/SS窄/LP窄/宽口径）对付费数的贡献占比
    - funnel_attribution:  各漏斗阶段（注册→约课→出席→付费）的转化贡献及损耗
    - aperture_attribution: 窄口/宽口对付费的贡献对比
    - factors: 兼容旧前端格式（渠道贡献列表）

    数据来源：channel_comparison + funnel + summary
    """
    channel_comparison = cache.get("channel_comparison") or {}
    funnel = cache.get("funnel") or {}
    summary = cache.get("summary") or {}

    # ── 1. 渠道归因 ──────────────────────────────────────────────────────────
    channels_raw: list[dict[str, Any]] = []
    if isinstance(channel_comparison, dict):
        if "channels" in channel_comparison:
            channels_raw = channel_comparison["channels"]
        else:
            for zh_key, en_key, label in _CHANNEL_LABEL_MAP:
                if zh_key in channel_comparison:
                    d = channel_comparison[zh_key]
                    regs = d.get("register", 0) or 0
                    paid = d.get("paid", 0) or 0
                    channels_raw.append({
                        "channel": en_key,
                        "label": label,
                        "registrations": regs,
                        "payments": paid,
                        "conversion_rate": round(paid / regs, 4) if regs > 0 else 0.0,
                    })

    total_channel_payments = sum(c.get("payments", 0) or 0 for c in channels_raw) or 1
    total_channel_regs = sum(c.get("registrations", 0) or 0 for c in channels_raw) or 1

    channel_attribution: list[dict[str, Any]] = []
    for ch in channels_raw:
        paid = ch.get("payments", 0) or 0
        regs = ch.get("registrations", 0) or 0
        channel_attribution.append({
            "factor": ch.get("channel", ""),
            "label": ch.get("label", ch.get("channel", "")),
            "registrations": regs,
            "payments": paid,
            "conversion_rate": ch.get("conversion_rate", 0.0),
            "paid_contribution": round(paid / total_channel_payments, 4),
            "reg_contribution": round(regs / total_channel_regs, 4),
        })

    # ── 2. 漏斗归因 ──────────────────────────────────────────────────────────
    # 从 funnel.total 提取各阶段数值，计算阶段转化率与损耗
    funnel_attribution: list[dict[str, Any]] = []
    funnel_total = {}
    if isinstance(funnel, dict):
        funnel_total = funnel.get("total", {}) or {}

    if isinstance(funnel_total, dict):
        regs = int(funnel_total.get("register", 0) or 0)
        reserve = int(funnel_total.get("reserve", 0) or 0)
        attend = int(funnel_total.get("attend", 0) or 0)
        paid = int(funnel_total.get("paid", 0) or 0)
        rates = funnel_total.get("rates", {}) or {}

        if regs > 0:
            funnel_stages = [
                ("register",  "注册",  regs,    regs,    1.0),
                ("reserve",   "约课",  reserve, regs,    round(reserve / regs, 4) if regs else 0.0),
                ("attend",    "出席",  attend,  reserve, round(attend / reserve, 4) if reserve else 0.0),
                ("paid",      "付费",  paid,    attend,  round(paid / attend, 4) if attend else 0.0),
            ]
            prev_count = regs
            for stage_key, stage_label, stage_count, from_count, stage_rate in funnel_stages:
                loss = max(0, from_count - stage_count) if stage_key != "register" else 0
                loss_pct = round(loss / from_count, 4) if from_count > 0 else 0.0
                paid_contribution = round(stage_count / regs, 4) if regs > 0 else 0.0
                funnel_attribution.append({
                    "stage": stage_key,
                    "label": stage_label,
                    "count": stage_count,
                    "from_count": from_count,
                    "conversion_rate": stage_rate,
                    "loss_count": loss,
                    "loss_rate": loss_pct,
                    "cumulative_rate": paid_contribution,
                })
                prev_count = stage_count

    if not funnel_attribution:
        funnel_attribution = [{"stage": "unknown", "label": "漏斗数据待接入", "count": 0,
                               "from_count": 0, "conversion_rate": 0.0, "loss_count": 0,
                               "loss_rate": 0.0, "cumulative_rate": 0.0}]

    # ── 3. 口径归因：窄口 vs 宽口 ────────────────────────────────────────────
    narrow_paid = 0
    narrow_regs = 0
    wide_paid = 0
    wide_regs = 0

    if isinstance(funnel, dict):
        if "narrow" in funnel:
            narrow_paid = int(funnel["narrow"].get("payments", 0) or funnel["narrow"].get("paid", 0) or 0)
            narrow_regs = int(funnel["narrow"].get("register", 0) or 0)
        else:
            for k in ("cc_narrow", "ss_narrow", "lp_narrow"):
                if k in funnel:
                    narrow_paid += int(funnel[k].get("paid", 0) or 0)
                    narrow_regs += int(funnel[k].get("register", 0) or 0)
        if "wide" in funnel:
            wide_paid = int(funnel["wide"].get("payments", 0) or funnel["wide"].get("paid", 0) or 0)
            wide_regs = int(funnel["wide"].get("register", 0) or 0)

    total_aperture_paid = (narrow_paid + wide_paid) or 1
    total_aperture_regs = (narrow_regs + wide_regs) or 1

    aperture_attribution: list[dict[str, Any]] = [
        {
            "aperture": "narrow",
            "label": "窄口径（CC/SS/LP学员链接绑定）",
            "registrations": narrow_regs,
            "payments": narrow_paid,
            "conversion_rate": round(narrow_paid / narrow_regs, 4) if narrow_regs > 0 else 0.0,
            "paid_contribution": round(narrow_paid / total_aperture_paid, 4),
            "reg_contribution": round(narrow_regs / total_aperture_regs, 4),
        },
        {
            "aperture": "wide",
            "label": "宽口径（UserA学员链接绑定）",
            "registrations": wide_regs,
            "payments": wide_paid,
            "conversion_rate": round(wide_paid / wide_regs, 4) if wide_regs > 0 else 0.0,
            "paid_contribution": round(wide_paid / total_aperture_paid, 4),
            "reg_contribution": round(wide_regs / total_aperture_regs, 4),
        },
    ]

    # ── 4. 兼容旧格式：factors ────────────────────────────────────────────────
    if channel_attribution:
        factors = [
            {"factor": a["factor"], "contribution": a["paid_contribution"], "label": a["label"]}
            for a in channel_attribution
        ]
    elif narrow_paid or wide_paid:
        factors = [
            {"factor": "narrow", "contribution": round(narrow_paid / total_aperture_paid, 4), "label": "窄口径"},
            {"factor": "wide",   "contribution": round(wide_paid / total_aperture_paid, 4),  "label": "宽口径"},
        ]
    else:
        factors = [{"factor": "unknown", "contribution": 1.0, "label": "数据待接入"}]

    return {
        "factors": factors,
        "channel_attribution": channel_attribution,
        "funnel_attribution": funnel_attribution,
        "aperture_attribution": aperture_attribution,
    }


@router.get("/attribution")
def get_attribution(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    多维归因分析：渠道归因 + 漏斗阶段归因 + 口径（窄口/宽口）归因。

    返回格式：
    - factors: 兼容旧前端（渠道贡献列表）
    - channel_attribution: 各渠道的注册/付费贡献占比
    - funnel_attribution: 注册→约课→出席→付费 各阶段转化率与损耗
    - aperture_attribution: 窄口径 vs 宽口径 付费贡献对比

    数据来源：channel_comparison + funnel（AnalysisEngineV2 缓存）
    """
    period = _validate_period(period)
    version = _cache_version(period)
    cache = _require_full_cache(period)
    return _get_adapted(f"attribution:{period}", version, _adapt_attribution, cache)


# ── E6/E7/E8: 套餐结构 + 渠道收入 ─────────────────────────────────────────────

def _adapt_package_mix(raw: dict[str, Any]) -> dict[str, Any]:
    """
    从 order_analysis 提取 E6 套餐占比，适配为前端饼图格式：
    { items: [{ product_type, count, revenue_usd, percentage }] }
    """
    order_data = raw.get("order_analysis", {}) or {}
    pkg_dist = order_data.get("package_distribution", {}) or {}

    records: list[dict[str, Any]] = []
    if isinstance(pkg_dist, dict):
        by_ch = pkg_dist.get("by_channel", {}) or {}
        if isinstance(by_ch, dict):
            records = by_ch.get("records", []) or []

    # 从 records 中汇总套餐类型
    type_totals: dict[str, float] = {}
    for rec in records:
        if not isinstance(rec, dict):
            continue
        for k, v in rec.items():
            if isinstance(v, (int, float)) and v > 0:
                type_totals[k] = type_totals.get(k, 0.0) + float(v)

    total_val = sum(type_totals.values()) or 1.0
    items = [
        {
            "product_type": k,
            "count": 0,
            "revenue_usd": round(v, 2),
            "percentage": round(v / total_val * 100, 1),
        }
        for k, v in sorted(type_totals.items(), key=lambda x: -x[1])
        if v > 0
    ]

    # 兜底: 从 E8 channel_product 聚合套餐维度
    if not items:
        channel_product = order_data.get("channel_product", []) or []
        ptype_totals: dict[str, float] = {}
        for cp in channel_product:
            if not isinstance(cp, dict):
                continue
            pt = cp.get("product", "未知")
            amt = cp.get("amount_usd", 0) or 0
            ptype_totals[pt] = ptype_totals.get(pt, 0.0) + amt
        total_cp = sum(ptype_totals.values()) or 1.0
        items = [
            {
                "product_type": k,
                "count": 0,
                "revenue_usd": round(v, 2),
                "percentage": round(v / total_cp * 100, 1),
            }
            for k, v in sorted(ptype_totals.items(), key=lambda x: -x[1])
            if v > 0
        ]

    return {"items": items}


def _adapt_team_package_mix(raw: dict[str, Any]) -> dict[str, Any]:
    """E7 团队套餐结构: { teams: [{ team, items: [{ product_type, ratio }] }] }"""
    order_data = raw.get("order_analysis", {}) or {}
    team_package = order_data.get("team_package", []) or []
    return {"teams": team_package}


def _adapt_channel_revenue(raw: dict[str, Any]) -> dict[str, Any]:
    """
    E8 渠道收入: { channels: [{ channel, revenue_usd, revenue_thb, percentage }], total_usd }
    从 channel_product 按 channel 聚合金额
    """
    order_data = raw.get("order_analysis", {}) or {}
    channel_product = order_data.get("channel_product", []) or []

    channel_totals: dict[str, float] = {}
    for cp in channel_product:
        if not isinstance(cp, dict):
            continue
        ch = cp.get("channel", "未知")
        amt = cp.get("amount_usd", 0) or 0
        channel_totals[ch] = channel_totals.get(ch, 0.0) + amt

    total_usd = sum(channel_totals.values())
    total_denom = total_usd or 1.0

    channels = [
        {
            "channel": ch,
            "revenue_usd": round(rev, 2),
            "revenue_thb": round(rev * 34, 0),
            "percentage": round(rev / total_denom * 100, 1),
        }
        for ch, rev in sorted(channel_totals.items(), key=lambda x: -x[1])
        if rev > 0
    ]

    # 兜底: 若 E8 无数据, 用 E3 by_channel
    if not channels:
        e3_by_channel = order_data.get("by_channel") or {}
        if isinstance(e3_by_channel, dict):
            total_e3 = sum(
                (v.get("revenue_usd", 0) or 0)
                for v in e3_by_channel.values()
                if isinstance(v, dict)
            )
            total_e3_denom = total_e3 or 1.0
            channels = [
                {
                    "channel": ch,
                    "revenue_usd": round(d.get("revenue_usd", 0) or 0, 2),
                    "revenue_thb": round((d.get("revenue_usd", 0) or 0) * 34, 0),
                    "percentage": round(
                        (d.get("revenue_usd", 0) or 0) / total_e3_denom * 100, 1
                    ),
                }
                for ch, d in sorted(
                    e3_by_channel.items(),
                    key=lambda x: -(x[1].get("revenue_usd", 0) or 0) if isinstance(x[1], dict) else 0,
                )
                if isinstance(d, dict) and (d.get("revenue_usd", 0) or 0) > 0
            ]
            total_usd = total_e3

    return {"channels": channels, "total_usd": round(total_usd, 2)}


@router.get("/package-mix")
def get_package_mix(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """E6: 套餐类型占比（饼图数据）"""
    period = _validate_period(period)
    version = _cache_version(period)
    cache = _require_full_cache(period)
    return _get_adapted(f"package_mix:{period}", version, _adapt_package_mix, cache)


@router.get("/team-package-mix")
def get_team_package_mix(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """E7: 小组套餐结构"""
    period = _validate_period(period)
    version = _cache_version(period)
    cache = _require_full_cache(period)
    return _get_adapted(f"team_package_mix:{period}", version, _adapt_team_package_mix, cache)


@router.get("/channel-revenue")
def get_channel_revenue(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """E8: 渠道收入 Waterfall 数据"""
    period = _validate_period(period)
    version = _cache_version(period)
    cache = _require_full_cache(period)
    return _get_adapted(f"channel_revenue:{period}", version, _adapt_channel_revenue, cache)


# ── D2×D3 围场对比 + D4 合并围场总览 ──────────────────────────────────────────

def _safe_div_local(numerator: Any, denominator: Any) -> Optional[float]:
    """安全除法，分母为0或None时返回None"""
    try:
        n = float(numerator)
        d = float(denominator)
        return round(n / d, 4) if d != 0 else None
    except (TypeError, ValueError):
        return None


@router.get("/enclosure-compare")
def get_enclosure_compare(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    D2×D3 围场对比：市场围场 vs 转介绍围场
    返回每个围场段的双渠道核心指标，用于 EnclosureCompareChart 双 Bar 图。
    """
    period = _validate_period(period)
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]

    # 使用按 period 过滤后的原始数据
    raw_data = _service.get_raw_data(period)
    kpi_data = raw_data.get("kpi", {}) if isinstance(raw_data, dict) else {}

    d2 = kpi_data.get("enclosure_market", {})
    d3 = kpi_data.get("enclosure_referral", {})

    d2_map = {r["enclosure"]: r for r in (d2.get("by_enclosure", []) or [])}
    d3_map = {r["enclosure"]: r for r in (d3.get("by_enclosure", []) or [])}

    comparison = []
    for enc in enc_order:
        m = d2_map.get(enc, {})
        r = d3_map.get(enc, {})
        comparison.append({
            "enclosure": enc,
            "market_conv": m.get("conversion_rate"),
            "referral_conv": r.get("conversion_rate"),
            "market_participation": m.get("participation_rate"),
            "referral_participation": r.get("participation_rate"),
            "market_students": m.get("active_students"),
            "referral_students": r.get("active_students"),
            "market_mobilization": _safe_div_local(
                m.get("monthly_active_referrers"), m.get("active_students")
            ),
            "referral_mobilization": _safe_div_local(
                r.get("monthly_active_referrers"), r.get("active_students")
            ),
            "market_monthly_paid": m.get("monthly_b_paid"),
            "referral_monthly_paid": r.get("monthly_b_paid"),
            "conv_gap": round(
                (r.get("conversion_rate") or 0) - (m.get("conversion_rate") or 0), 4
            ) if (r.get("conversion_rate") is not None and m.get("conversion_rate") is not None) else None,
        })

    return {"comparison": comparison, "segments": enc_order}


@router.get("/enclosure-combined")
def get_enclosure_combined(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    D4 合并围场总览：市场+转介绍合并视图
    返回各围场段合并后的核心指标卡片数据，用于 EnclosureCombinedOverview。
    """
    period = _validate_period(period)
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]

    # 使用按 period 过滤后的原始数据
    raw_data = _service.get_raw_data(period)
    kpi_data = raw_data.get("kpi", {}) if isinstance(raw_data, dict) else {}

    d4 = kpi_data.get("enclosure_combined", {})
    by_enc = d4.get("by_enclosure", []) or []
    total = d4.get("total", {}) or {}

    enc_map = {r["enclosure"]: r for r in by_enc}

    segments = []
    for enc in enc_order:
        row = enc_map.get(enc, {})
        students = row.get("active_students") or 0
        referrers = row.get("monthly_active_referrers") or 0
        segments.append({
            "enclosure": enc,
            "active_students": students,
            "monthly_b_registrations": row.get("monthly_b_registrations"),
            "monthly_b_paid": row.get("monthly_b_paid"),
            "monthly_active_referrers": referrers,
            "conversion_rate": row.get("conversion_rate"),
            "participation_rate": row.get("participation_rate"),
            "mobilization_rate": _safe_div_local(referrers, students),
            "ratio": row.get("ratio"),
        })

    return {
        "segments": segments,
        "total": {
            "active_students": total.get("active_students"),
            "monthly_b_paid": total.get("monthly_b_paid"),
            "monthly_b_registrations": total.get("monthly_b_registrations"),
            "conversion_rate": total.get("conversion_rate"),
            "participation_rate": total.get("participation_rate"),
        },
    }


# ── A1: 按团队分组的漏斗对比 ──────────────────────────────────────────────────

@router.get("/funnel/team")
def get_funnel_team(
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    A1 按团队分组的漏斗数据（注册/预约/出席/付费），供 TeamFunnelComparison 图表使用。
    数据来源：A1 leads_achievement.by_team（每行含 CC窄口径/SS窄口径/LP窄口径/总计 各口径漏斗值）
    输出：{ teams: [{ team, group, 注册, 预约, 出席, 付费, conversion_rate }] }
    """
    period = _validate_period(period)
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    # 使用按 period 过滤后的原始数据
    raw_data = _service.get_raw_data(period)
    leads_raw = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}
    achievement = leads_raw.get("leads_achievement", {}) if isinstance(leads_raw, dict) else {}
    by_team_raw: list[Any] = achievement.get("by_team", []) or []

    teams: list[dict[str, Any]] = []
    for row in by_team_raw:
        if not isinstance(row, dict):
            continue
        team = row.get("团队")
        group = row.get("小组")
        if not team and not group:
            continue
        # 跳过小计/总计行
        team_str = str(team or "").strip()
        group_str = str(group or "").strip()
        if team_str in ("小计", "总计") or group_str in ("小计", "总计"):
            continue

        # 从"总计"口径取漏斗数值（含 CC+SS+LP+宽 全量）
        total = row.get("总计", {}) or {}
        reg = total.get("注册") or 0
        rsv = total.get("预约") or 0
        att = total.get("出席") or 0
        paid = total.get("付费") or 0

        # 同时提取 CC 窄口径供对比
        cc = row.get("CC窄口径", {}) or {}
        ss = row.get("SS窄口径", {}) or {}
        lp = row.get("LP窄口径", {}) or {}
        wide = row.get("宽口径", {}) or {}

        teams.append({
            "team": team_str or group_str,
            "group": group_str,
            "注册": reg,
            "预约": rsv,
            "出席": att,
            "付费": paid,
            "conversion_rate": round(paid / reg, 4) if reg else 0,
            "cc_narrow": {
                "注册": cc.get("注册") or 0,
                "预约": cc.get("预约") or 0,
                "出席": cc.get("出席") or 0,
                "付费": cc.get("付费") or 0,
            },
            "ss_narrow": {
                "注册": ss.get("注册") or 0,
                "预约": ss.get("预约") or 0,
                "出席": ss.get("出席") or 0,
                "付费": ss.get("付费") or 0,
            },
            "lp_narrow": {
                "注册": lp.get("注册") or 0,
                "预约": lp.get("预约") or 0,
                "出席": lp.get("出席") or 0,
                "付费": lp.get("付费") or 0,
            },
            "wide": {
                "注册": wide.get("注册") or 0,
                "预约": wide.get("预约") or 0,
                "出席": wide.get("出席") or 0,
                "付费": wide.get("付费") or 0,
            },
        })

    # 按团队名去重（同团队多行小组取合并）
    merged: dict[str, dict[str, Any]] = {}
    for t in teams:
        key = t["team"]
        if key not in merged:
            merged[key] = dict(t)
        else:
            for metric in ("注册", "预约", "出席", "付费"):
                merged[key][metric] = (merged[key].get(metric) or 0) + (t.get(metric) or 0)
            reg_total = merged[key].get("注册") or 0
            paid_total = merged[key].get("付费") or 0
            merged[key]["conversion_rate"] = round(paid_total / reg_total, 4) if reg_total else 0

    result_teams = list(merged.values())
    return {"teams": result_teams, "total_teams": len(result_teams)}


# ── M28: 对比分析端点 ────────────────────────────────────────────────────────

def _extract_metric_actual(summary: dict[str, Any], metric_key: str) -> Optional[float]:
    """
    从 summary dict 中提取指定指标的 actual 值。
    - metric_key 为引擎层英文 key（registration/payment/revenue/leads）
    - revenue 特殊处理：取 usd 字段
    - leads 在引擎层无独立 key，退回 registration
    """
    data = summary.get(metric_key)
    # leads 在引擎层与 registration 等价
    if data is None and metric_key == "leads":
        data = summary.get("registration")
    if not isinstance(data, dict):
        return None
    if metric_key == "revenue":
        return data.get("usd") or data.get("actual")
    return data.get("actual")


def _build_metric_compare(
    current_actual: Optional[float],
    compare_actual: Optional[float],
    compare_date: Optional[str] = None,
) -> dict[str, Any]:
    """
    构建单个指标的对比结果 dict。
    若 compare_actual 为 None，则 change/change_pct 也为 None。
    """
    if current_actual is None or compare_actual is None:
        return {
            "current": current_actual,
            "compare": compare_actual,
            "compare_date": compare_date,
            "change": None,
            "change_pct": None,
        }
    change = round(current_actual - compare_actual, 4)
    if compare_actual != 0:
        change_pct = round(change / compare_actual * 100, 2)
    else:
        # 对比期为 0 时：若当前也为 0 → 0%，否则无穷大用 None 表示
        change_pct = None if current_actual != 0 else 0.0
    return {
        "current": current_actual,
        "compare": compare_actual,
        "compare_date": compare_date,
        "change": change,
        "change_pct": change_pct,
    }


@router.get("/compare-summary")
def compare_summary(
    period: str = Query(default="this_month", description="当前选中的时间维度"),
    mode: str = Query(..., description="对比模式: pop=环比, yoy=同比, peak=巅峰, valley=低谷"),
    custom_start: str = Query(default=None, description="自定义起始日期 YYYY-MM-DD"),
    custom_end: str = Query(default=None, description="自定义结束日期 YYYY-MM-DD"),
) -> dict[str, Any]:
    """
    对比分析端点，支持四种对比模式：
      - pop（环比）: 与上一个等长周期对比
      - yoy（同比）: 与去年同期对比
      - peak（巅峰）: 与历史快照中各指标最高值对比
      - valley（低谷）: 与历史快照中各指标最低值对比

    响应格式：
    {
        "available": bool,
        "mode": "pop"|"yoy"|"peak"|"valley",
        "label": "环比上月",
        "compare_period": "custom",
        "metrics": {
            "registrations": { "current", "compare", "compare_date", "change", "change_pct" },
            "payments": { ... },
            "revenue": { ... },
            "leads": { ... }
        },
        "unavailable_reason": null | "说明文字"
    }
    """
    period = _validate_period(period)
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    # 确保当前期间已分析完毕
    current_cache = _require_full_cache(period)
    current_summary = current_cache.get("summary", {})

    # 4 个核心 KPI（引擎层英文 key → 响应层前端 key）
    metric_map: list[tuple[str, str]] = [
        ("registration", "registrations"),
        ("payment",      "payments"),
        ("revenue",      "revenue"),
        ("leads",        "leads"),
    ]

    # ── 模式 1/2: pop（环比）或 yoy（同比）────────────────────────────────────
    if mode in ("pop", "yoy"):
        from core.period_compare import resolve_pop_period, resolve_yoy_period

        if mode == "pop":
            comp = resolve_pop_period(period, custom_start, custom_end)
        else:
            comp = resolve_yoy_period(period, custom_start, custom_end)

        # 检查对比期缓存是否已存在（不触发同步计算，保持 GET 幂等性）
        comp_cache = _service.get_cached_result(
            comp.period, comp.custom_start, comp.custom_end
        )
        if not comp_cache:
            period_hint = comp.period
            if comp.custom_start and comp.custom_end:
                period_hint = f"custom&custom_start={comp.custom_start}&custom_end={comp.custom_end}"
            return {
                "available": False,
                "mode": mode,
                "label": comp.label,
                "compare_period": comp.period,
                "compare_start": comp.custom_start,
                "compare_end": comp.custom_end,
                "metrics": {},
                "unavailable_reason": f"对比期尚未分析，请先 POST /api/analysis/run?period={period_hint}",
            }
        comp_summary = comp_cache.get("summary", {})

        # 若对比期所有指标均为 0，标注不可用
        comp_values = [
            _extract_metric_actual(comp_summary, eng_key)
            for eng_key, _ in metric_map
        ]
        all_zero = all((v or 0) == 0 for v in comp_values)
        if not comp_summary or all_zero:
            return {
                "available": False,
                "mode": mode,
                "label": comp.label,
                "compare_period": comp.period,
                "compare_start": comp.custom_start,
                "compare_end": comp.custom_end,
                "metrics": {},
                "unavailable_reason": "对比期数据全部为零，可能超出当前数据源覆盖范围",
            }

        # 构建各指标对比
        metrics: dict[str, Any] = {}
        for eng_key, fe_key in metric_map:
            curr_val = _extract_metric_actual(current_summary, eng_key)
            cmp_val = _extract_metric_actual(comp_summary, eng_key)
            metrics[fe_key] = _build_metric_compare(curr_val, cmp_val)

        return {
            "available": True,
            "mode": mode,
            "label": comp.label,
            "compare_period": comp.period,
            "compare_start": comp.custom_start,
            "compare_end": comp.custom_end,
            "metrics": metrics,
            "unavailable_reason": None,
        }

    # ── 模式 3/4: peak（巅峰）或 valley（低谷）──────────────────────────────
    if mode in ("peak", "valley"):
        # 初始化快照存储
        try:
            from core.snapshot_store import SnapshotStore
            store = SnapshotStore()
        except Exception as e:
            return {
                "available": False,
                "mode": mode,
                "label": "历史巅峰" if mode == "peak" else "历史低谷",
                "compare_period": None,
                "compare_start": None,
                "compare_end": None,
                "metrics": {},
                "unavailable_reason": f"快照数据库初始化失败: {e}",
            }

        # 注意：snapshot_store 存储英文 key（registration/payment/revenue），
        # 而 analysis_engine_v2._get_peak_valley() 传入的是中文 key（注册/付费/金额）——已知 bug。
        # 本端点直接使用正确的英文 key。
        pv_metric_map: list[tuple[str, str]] = [
            ("registration", "registrations"),
            ("payment",      "payments"),
            ("revenue",      "revenue"),
            # leads 无快照数据，单独处理
        ]

        metrics = {}
        any_available = False

        for eng_key, fe_key in pv_metric_map:
            curr_val = _extract_metric_actual(current_summary, eng_key)
            try:
                pv = store.get_peak_valley(eng_key)
                pv_entry = pv.get(mode)  # peak 或 valley
            except Exception as e:
                import logging as _log
                _log.getLogger(__name__).warning(f"compare-summary peak/valley: metric={eng_key} 查询失败: {e}")
                pv_entry = None

            if pv_entry is not None:
                any_available = True
                compare_val = pv_entry.get("value")
                compare_date = pv_entry.get("date")
            else:
                compare_val = None
                compare_date = None

            metrics[fe_key] = _build_metric_compare(curr_val, compare_val, compare_date)

        # leads 无快照数据，直接用 None 标记 compare
        curr_leads = _extract_metric_actual(current_summary, "leads")
        metrics["leads"] = {
            "current": curr_leads,
            "compare": None,
            "compare_date": None,
            "change": None,
            "change_pct": None,
        }

        if not any_available:
            return {
                "available": False,
                "mode": mode,
                "label": "历史巅峰" if mode == "peak" else "历史低谷",
                "compare_period": None,
                "compare_start": None,
                "compare_end": None,
                "metrics": metrics,
                "unavailable_reason": "历史快照数据不足，需要系统积累每日快照数据后才能确定巅峰/低谷值",
            }

        return {
            "available": True,
            "mode": mode,
            "label": "历史巅峰" if mode == "peak" else "历史低谷",
            "compare_period": None,
            "compare_start": None,
            "compare_end": None,
            "metrics": metrics,
            "unavailable_reason": None,
        }

    # ── 未知 mode ────────────────────────────────────────────────────────────
    raise HTTPException(
        status_code=422,
        detail=f"不支持的对比模式 mode='{mode}'，有效值: pop, yoy, peak, valley",
    )


# ── CC 人员详情抽屉 ──────────────────────────────────────────────────────────

@router.get("/cc-detail/{cc_name}")
def get_cc_detail(
    cc_name: str,
    period: str = Query(default="this_month", description="时间维度"),
) -> dict[str, Any]:
    """
    CC 人员详情抽屉数据：排名、综合得分、跟进历史、月度趋势、雷达图得分。

    数据来源：
    - cc_ranking（三类18维加权排名）→ rank / composite_score / radar_scores / 关键业务指标
    - ops.daily_outreach.by_cc → followup_history（外呼日级数据，graceful degradation）
    - trend.mom.data → monthly_trend（月度注册/付费/收入趋势）

    graceful degradation：
    - followup_history：如无日级数据则返回空数组
    - monthly_trend：如无历史 MoM 数据则返回空数组
    """
    period = _validate_period(period)
    from core.analyzers.utils import _norm_cc

    cache = _require_full_cache(period)

    # ── 1. 从 cc_ranking 找目标 CC ─────────────────────────────────────────
    cc_ranking: list[dict[str, Any]] = cache.get("cc_ranking") or []
    norm_target = _norm_cc(cc_name)

    matched: Optional[dict[str, Any]] = None
    for item in cc_ranking:
        if _norm_cc(item.get("cc_name", "")) == norm_target:
            matched = item
            break

    if matched is None:
        raise HTTPException(
            status_code=404,
            detail=f"未找到 CC 人员: {cc_name}，请先运行分析或确认姓名拼写",
        )

    # ── 2. 雷达图得分 ────────────────────────────────────────────────────────
    radar_scores = {
        "process":    matched.get("process_score") or 0.0,
        "result":     matched.get("result_score") or 0.0,
        "efficiency": matched.get("efficiency_score") or 0.0,
    }

    # ── 3. 跟进历史（日级别外呼数据，graceful degradation）───────────────────
    followup_history: list[dict[str, Any]] = []
    raw_data: dict[str, Any] = {}
    try:
        raw_data = _service.get_raw_data(period) or {}
    except Exception:
        pass

    if raw_data:
        ops_data = raw_data.get("ops", {}) or {}
        daily_outreach = ops_data.get("daily_outreach", {}) or {}
        by_cc_raw: dict[str, Any] = daily_outreach.get("by_cc", {}) or {}

        # by_cc 结构：{ "CC姓名": { dates: [...], calls: [...], connects: [...] } }
        cc_outreach: dict[str, Any] = {}
        for name, val in by_cc_raw.items():
            if _norm_cc(name) == norm_target:
                cc_outreach = val if isinstance(val, dict) else {}
                break

        if cc_outreach:
            dates: list[str] = cc_outreach.get("dates", []) or []
            calls_list: list[int] = cc_outreach.get("calls", []) or []
            connects_list: list[int] = cc_outreach.get("connects", []) or []
            effective_list: list[int] = cc_outreach.get("effective", []) or []

            for i, date_str in enumerate(dates):
                followup_history.append({
                    "date": date_str,
                    "type": "outreach",
                    "count": calls_list[i] if i < len(calls_list) else 0,
                    "effective": effective_list[i] if i < len(effective_list) else (
                        connects_list[i] if i < len(connects_list) else 0
                    ),
                })

    # ── 4. 月度趋势（MoM 数据，graceful degradation）────────────────────────
    monthly_trend: list[dict[str, Any]] = []
    try:
        trend_data: dict[str, Any] = cache.get("trend") or {}
        mom_data: dict[str, Any] = trend_data.get("mom", {}).get("data", {}) or {}

        for month_key in sorted(mom_data.keys()):
            entries = mom_data[month_key]
            if not isinstance(entries, list):
                entries = [entries] if isinstance(entries, dict) else []

            # 聚合该月所有渠道的 CC 相关数据
            total_paid = 0
            total_revenue = 0.0
            total_reg = 0
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                total_reg += entry.get("registrations") or entry.get("register") or 0
                total_paid += entry.get("payments") or entry.get("paid") or 0
                total_revenue += entry.get("revenue_usd") or entry.get("amount_usd") or 0.0

            # month_key 格式为 "202501"，转换为 "2025-01"
            month_display = f"{month_key[:4]}-{month_key[4:6]}" if len(month_key) >= 6 else month_key

            monthly_trend.append({
                "month": month_display,
                "registrations": total_reg,
                "payments": total_paid,
                "revenue_usd": round(total_revenue, 2),
            })
    except Exception:
        pass

    total_cc = len(cc_ranking) if cc_ranking else None

    return {
        "cc_name": matched.get("cc_name", cc_name),
        "rank": matched.get("rank"),
        "total_cc": total_cc,
        "composite_score": matched.get("composite_score"),
        "process_score": matched.get("process_score"),
        "result_score": matched.get("result_score"),
        "efficiency_score": matched.get("efficiency_score"),
        "team": matched.get("team"),
        "detail": matched.get("detail") or {},
        "metrics": {
            "registrations": matched.get("registrations"),
            "payments": matched.get("payments"),
            "revenue_usd": matched.get("revenue_usd"),
            "conversion_rate": matched.get("conversion_rate"),
            "checkin_rate": matched.get("checkin_rate"),
            "participation_rate": matched.get("participation_rate"),
            "outreach_count": matched.get("outreach_count"),
            "connected_count": matched.get("connected_count"),
        },
        # top-level aliases kept for backward compatibility
        "registrations": matched.get("registrations"),
        "payments": matched.get("payments"),
        "revenue_usd": matched.get("revenue_usd"),
        "checkin_rate": matched.get("checkin_rate"),
        "conversion_rate": matched.get("conversion_rate"),
        "followup_history": followup_history,
        "monthly_trend": monthly_trend,
        "radar_scores": radar_scores,
    }


# ── KPI Sparkline 端点 ────────────────────────────────────────────────────────

@router.get("/kpi-sparkline")
def get_kpi_sparkline(
    days: int = Query(default=14, ge=7, le=90, description="回看天数（7-90）"),
) -> dict[str, Any]:
    """
    返回核心 KPI 的近 N 天每日数据 + 历史巅峰/低谷，用于前端 Sparkline 小图渲染。

    轻量端点：仅读取 snapshot_store，不触发任何分析计算。
    若快照数据不足，返回 available=false 和原因说明。

    响应结构：
    {
      "available": bool,
      "days": int,
      "metrics": {
        "registration": {
          "daily": [{"date": "2026-02-01", "value": 120}, ...],
          "peak":   {"date": "...", "value": ...} | None,
          "valley": {"date": "...", "value": ...} | None
        },
        "payment": { ... },
        "revenue": { ... }
      },
      "unavailable_reason": str | None
    }
    """
    from datetime import date as _date, timedelta as _timedelta

    # 初始化快照存储，失败则返回 available=false（不抛 500）
    try:
        from core.snapshot_store import SnapshotStore
        store = SnapshotStore()
    except Exception as _init_err:
        return {
            "available": False,
            "days": days,
            "metrics": {},
            "unavailable_reason": f"快照数据库初始化失败: {_init_err}",
        }

    # T-1 数据：查询范围为今天-days 到昨天
    end_date = (_date.today() - _timedelta(days=1)).isoformat()
    start_date = (_date.today() - _timedelta(days=days)).isoformat()

    result: dict[str, Any] = {}
    for metric in ("registration", "payment", "revenue"):
        try:
            daily_rows = store.get_daily_kpi(start_date, end_date, metric) or []
            pv = store.get_peak_valley(metric)
        except Exception as _q_err:
            import logging as _log
            _log.getLogger(__name__).warning(f"kpi-sparkline: metric={metric} 查询失败: {_q_err}")
            daily_rows = []
            pv = {"peak": None, "valley": None}

        result[metric] = {
            "daily": [
                {"date": r["snapshot_date"], "value": r["value"]}
                for r in daily_rows
            ],
            "peak": pv.get("peak") if pv else None,
            "valley": pv.get("valley") if pv else None,
        }

    # 判断是否有任何可用数据
    has_data = any(len(v["daily"]) > 0 for v in result.values())

    return {
        "available": has_data,
        "days": days,
        "metrics": result,
        "unavailable_reason": (
            "快照数据不足，系统需运行数天后积累每日快照" if not has_data else None
        ),
    }
