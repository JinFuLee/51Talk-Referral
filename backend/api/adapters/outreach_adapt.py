"""
backend/api/adapters/outreach_adapt.py
外呼 / 体验课跟进 / 订单类 adapt 函数。

对应引擎输出 key：outreach_analysis, trial_followup, order_analysis
"""

from __future__ import annotations

from typing import Any

from backend.api.utils import safe_div
from backend.models.adapter_types import OrdersResult, OutreachResult, TrialResult

# ── Outreach ──────────────────────────────────────────────────────────────────


def _adapt_outreach(raw: dict[str, Any]) -> OutreachResult:
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
        (d.get("effective_calls") or d.get("total_effective") or 0) for d in by_date
    )

    # 派生汇率
    contact_rate = (
        safe_div(total_connects, total_calls)
        if total_calls
        else (compliance.get("compliance_rate") or 0.0)
    )
    effective_rate = (
        safe_div(total_effective, total_calls)
        if total_calls
        else (trial_fu.get("call_rate_24h") or 0.0)
    )

    # cc_breakdown：把 by_cc dict 转为前端期望的 list
    cc_breakdown = []
    for name, cc_data in by_cc.items():
        if isinstance(cc_data, dict):
            cc_total = cc_data.get("total_calls", 0) or 0
            cc_connects = cc_data.get("total_connects", 0) or 0
            cc_effective = cc_data.get("total_effective", 0) or 0
            avg_dur_s = cc_data.get("avg_duration_s")
            cc_breakdown.append(
                {
                    "cc_name": name,
                    "team": cc_data.get("team"),
                    "total_calls": cc_total,
                    "total_connects": cc_connects,
                    "total_effective": cc_effective,
                    "contact_rate": cc_data.get("contact_rate")
                    or safe_div(cc_connects, cc_total),
                    "effective_rate": cc_data.get("effective_rate")
                    or safe_div(cc_effective, cc_total),
                    "avg_duration_s": avg_dur_s,
                    "avg_duration_min": round(avg_dur_s / 60, 1) if avg_dur_s else None,
                    # legacy aliases
                    "name": name,
                    "calls": cc_total,
                    "achieved": cc_data.get("achieved", False),
                }
            )

    # daily_trend
    daily_trend = [
        {
            "date": d.get("date", ""),
            "calls": d.get("total_calls", 0),
            "connects": d.get("connected_calls")
            or d.get("total_connects")
            or d.get("contacted")
            or 0,
            "effective_calls": d.get("effective_calls")
            or d.get("total_effective")
            or 0,
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


# ── Trial Followup ────────────────────────────────────────────────────────────


def _adapt_trial(raw: dict[str, Any]) -> TrialResult:
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
    attendance_rate = f11_summary.get("overall_attendance_rate") or correlation.get(
        "pre_call_attendance"
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
        "connect_rate": pre_class.get("connect_rate")
        or f11_summary.get("overall_connect_rate"),
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
            by_cc_merged.append(
                {
                    "cc_name": cc_name,
                    "team": item.get("team"),
                    # pre-class metrics from F11
                    "pre_call_rate": f11_cc.get("call_rate")
                    or item.get("pre_call_rate"),
                    "pre_connect_rate": f11_cc.get("connect_rate")
                    or item.get("pre_connect_rate"),
                    "total_classes": f11_cc.get("total_classes")
                    or item.get("total_classes")
                    or 0,
                    "pre_class_call": f11_cc.get("pre_class_call") or 0,
                    # post-class metrics from F10
                    "post_call_rate": item.get("post_call_rate"),
                    "post_connect_rate": item.get("post_connect_rate"),
                    # attendance
                    "attendance_rate": f11_cc.get("attendance_rate")
                    or item.get("attendance_rate"),
                    "attended": f11_cc.get("attended") or 0,
                    # checkin_rate from D5 (not in this data source; pass None)
                    "checkin_rate": item.get("checkin_rate"),
                    # stage breakdown for frontend
                    "pre_class": {
                        "call_rate": f11_cc.get("call_rate")
                        or item.get("pre_call_rate"),
                        "count": f11_cc.get("pre_class_call") or 0,
                    },
                    "post_class": {
                        "call_rate": item.get("post_call_rate"),
                        "count": item.get("post_class_call") or 0,
                    },
                }
            )
    elif isinstance(f11_by_cc, dict):
        # fallback: build from f11_by_cc only
        for cc_name, f11_cc in f11_by_cc.items():
            if not isinstance(f11_cc, dict):
                continue
            by_cc_merged.append(
                {
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
                    "pre_class": {
                        "call_rate": f11_cc.get("call_rate"),
                        "count": f11_cc.get("pre_class_call", 0),
                    },
                    "post_class": {"call_rate": None, "count": 0},
                }
            )

    # Bug 2 fix: 从 by_cc_merged 汇总课后跟进 count，替换硬编码 0
    post_class_count = sum(
        (item.get("post_class", {}).get("count") or 0) for item in by_cc_merged
    )

    # by_stage: stage-level summary (aggregated from pre/post for chart use)
    by_stage = [
        {
            "stage": "课前外呼",
            "count": pre_class_summary.get("total_called", 0),
            "rate": pre_call_rate,
        },
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


# ── Orders ────────────────────────────────────────────────────────────────────


def _adapt_orders(raw: dict[str, Any]) -> OrdersResult:
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
                    existing[pt] = {
                        "type": pt,
                        "count": 0,
                        "revenue_usd": round(amt, 2),
                    }
            by_type = sorted(
                existing.values(), key=lambda x: -(x.get("revenue_usd") or 0)
            )

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
            "date": r.get("date"),
            "cc_name": r.get("seller") or r.get("cc_name"),
            "student_name": r.get("student_id") or r.get("student_name"),
            "channel": r.get("channel"),
            "package": r.get("product") or r.get("package"),
            "amount_usd": r.get("amount_usd"),
            "amount_thb": round((r.get("amount_usd") or 0) * 34, 0)
            if r.get("amount_usd")
            else None,
            "amount": r.get("amount_usd"),  # legacy alias
            "order_tag": r.get("order_tag"),
            "team": r.get("team"),
        }
        for r in raw_records
    ]

    return {
        "total_orders": total,
        "new_orders": summary.get("new", 0) or 0,
        "renewal_orders": summary.get("renewal", 0) or 0,
        "total_revenue": rev_usd,
        "avg_order_value": safe_div(rev_usd, total),
        "by_type": by_type,
        "package_distribution": by_type,  # alias expected by some components
        "daily_series": daily_series,
        "channel_breakdown": channel_breakdown,
        "items": items,
    }
