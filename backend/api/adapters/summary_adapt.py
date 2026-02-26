"""
backend/api/adapters/summary_adapt.py
Summary / Funnel / Channel / Prediction / ROI / Productivity 类 adapt 函数。

对应引擎输出 key：summary, funnel, channel_comparison, prediction, roi_estimate, productivity
"""
from __future__ import annotations

from typing import Any

from backend.models.adapter_types import (
    ChannelComparisonResult,
    FunnelAdaptResult,
    PredictionResult,
    ProductivityResult,
    ROIResult,
    SummaryAdaptResult,
)

# ── 渠道标签映射 ───────────────────────────────────────────────────────────────

_CHANNEL_LABEL_MAP = [
    ("CC窄口径",  "cc_narrow", "CC 窄口径"),
    ("SS窄口径",  "ss_narrow", "SS 窄口径"),
    ("LP窄口径",  "lp_narrow", "LP 窄口径"),
    ("宽口径",    "wide",      "宽口径"),
]


# ── 状态推算 ──────────────────────────────────────────────────────────────────

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


# ── Summary ──────────────────────────────────────────────────────────────────

def _adapt_summary(raw: dict[str, Any]) -> SummaryAdaptResult:
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


# ── Funnel ────────────────────────────────────────────────────────────────────

def _adapt_funnel(raw: dict[str, Any]) -> FunnelAdaptResult:
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


# ── Channel Comparison ────────────────────────────────────────────────────────

def _adapt_channel_comparison(raw: dict[str, Any]) -> ChannelComparisonResult:
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


# ── Prediction ────────────────────────────────────────────────────────────────

def _adapt_prediction(raw: dict[str, Any]) -> PredictionResult:
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


# ── ROI ───────────────────────────────────────────────────────────────────────

def _adapt_roi(raw: dict[str, Any]) -> ROIResult:
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


# ── Productivity ──────────────────────────────────────────────────────────────

def _adapt_productivity(raw: dict[str, Any]) -> ProductivityResult:
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
