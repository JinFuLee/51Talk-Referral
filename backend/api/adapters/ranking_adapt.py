"""
backend/api/adapters/ranking_adapt.py
排名 / 归因 / 套餐 / 渠道收入类 adapt 函数。

对应引擎输出 key：cc_ranking, ss_ranking, lp_ranking, attribution, package_mix, channel_revenue
"""

from __future__ import annotations

from typing import Any

from backend.api.adapters.summary_adapt import _CHANNEL_LABEL_MAP
from backend.models.adapter_types import (
    AttributionResult,
    ChannelRevenueResult,
    PackageMixResult,
    RankingItemDict,
    TeamPackageMixResult,
)

# ── Ranking ───────────────────────────────────────────────────────────────────


def _adapt_ranking_item(item: dict[str, Any]) -> RankingItemDict:
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


def _adapt_ranking(raw: Any) -> list[RankingItemDict] | dict[str, Any] | Any:
    """将排名列表或含 items key 的 dict 中的每项做字段映射"""
    if not isinstance(raw, list):
        if isinstance(raw, dict) and "items" in raw:
            raw = dict(raw)
            raw["items"] = [_adapt_ranking_item(i) for i in raw["items"]]
            return raw
        return raw
    return [_adapt_ranking_item(item) for item in raw]


# ── Attribution ───────────────────────────────────────────────────────────────


def _adapt_attribution(cache: dict[str, Any]) -> AttributionResult:
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
                    channels_raw.append(
                        {
                            "channel": en_key,
                            "label": label,
                            "registrations": regs,
                            "payments": paid,
                            "conversion_rate": round(paid / regs, 4)
                            if regs > 0
                            else 0.0,
                        }
                    )

    total_channel_payments = sum(c.get("payments", 0) or 0 for c in channels_raw) or 1
    total_channel_regs = sum(c.get("registrations", 0) or 0 for c in channels_raw) or 1

    channel_attribution: list[dict[str, Any]] = []
    for ch in channels_raw:
        paid = ch.get("payments", 0) or 0
        regs = ch.get("registrations", 0) or 0
        channel_attribution.append(
            {
                "factor": ch.get("channel", ""),
                "label": ch.get("label", ch.get("channel", "")),
                "registrations": regs,
                "payments": paid,
                "conversion_rate": ch.get("conversion_rate", 0.0),
                "paid_contribution": round(paid / total_channel_payments, 4),
                "reg_contribution": round(regs / total_channel_regs, 4),
            }
        )

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

        if regs > 0:
            funnel_stages = [
                ("register", "注册", regs, regs, 1.0),
                (
                    "reserve",
                    "约课",
                    reserve,
                    regs,
                    round(reserve / regs, 4) if regs else 0.0,
                ),
                (
                    "attend",
                    "出席",
                    attend,
                    reserve,
                    round(attend / reserve, 4) if reserve else 0.0,
                ),
                (
                    "paid",
                    "付费",
                    paid,
                    attend,
                    round(paid / attend, 4) if attend else 0.0,
                ),
            ]
            for (
                stage_key,
                stage_label,
                stage_count,
                from_count,
                stage_rate,
            ) in funnel_stages:
                loss = (
                    max(0, from_count - stage_count) if stage_key != "register" else 0
                )
                loss_pct = round(loss / from_count, 4) if from_count > 0 else 0.0
                paid_contribution = round(stage_count / regs, 4) if regs > 0 else 0.0
                funnel_attribution.append(
                    {
                        "stage": stage_key,
                        "label": stage_label,
                        "count": stage_count,
                        "from_count": from_count,
                        "conversion_rate": stage_rate,
                        "loss_count": loss,
                        "loss_rate": loss_pct,
                        "cumulative_rate": paid_contribution,
                    }
                )

    if not funnel_attribution:
        funnel_attribution = [
            {
                "stage": "unknown",
                "label": "漏斗数据待接入",
                "count": 0,
                "from_count": 0,
                "conversion_rate": 0.0,
                "loss_count": 0,
                "loss_rate": 0.0,
                "cumulative_rate": 0.0,
            }
        ]

    # ── 3. 口径归因：窄口 vs 宽口 ────────────────────────────────────────────
    narrow_paid = 0
    narrow_regs = 0
    wide_paid = 0
    wide_regs = 0

    if isinstance(funnel, dict):
        if "narrow" in funnel:
            narrow_paid = int(
                funnel["narrow"].get("payments", 0)
                or funnel["narrow"].get("paid", 0)
                or 0
            )
            narrow_regs = int(funnel["narrow"].get("register", 0) or 0)
        else:
            for k in ("cc_narrow", "ss_narrow", "lp_narrow"):
                if k in funnel:
                    narrow_paid += int(funnel[k].get("paid", 0) or 0)
                    narrow_regs += int(funnel[k].get("register", 0) or 0)
        if "wide" in funnel:
            wide_paid = int(
                funnel["wide"].get("payments", 0) or funnel["wide"].get("paid", 0) or 0
            )
            wide_regs = int(funnel["wide"].get("register", 0) or 0)

    total_aperture_paid = (narrow_paid + wide_paid) or 1
    total_aperture_regs = (narrow_regs + wide_regs) or 1

    aperture_attribution: list[dict[str, Any]] = [
        {
            "aperture": "narrow",
            "label": "窄口径（CC/SS/LP学员链接绑定）",
            "registrations": narrow_regs,
            "payments": narrow_paid,
            "conversion_rate": round(narrow_paid / narrow_regs, 4)
            if narrow_regs > 0
            else 0.0,
            "paid_contribution": round(narrow_paid / total_aperture_paid, 4),
            "reg_contribution": round(narrow_regs / total_aperture_regs, 4),
        },
        {
            "aperture": "wide",
            "label": "宽口径（UserA学员链接绑定）",
            "registrations": wide_regs,
            "payments": wide_paid,
            "conversion_rate": round(wide_paid / wide_regs, 4)
            if wide_regs > 0
            else 0.0,
            "paid_contribution": round(wide_paid / total_aperture_paid, 4),
            "reg_contribution": round(wide_regs / total_aperture_regs, 4),
        },
    ]

    # ── 4. 兼容旧格式：factors ────────────────────────────────────────────────
    if channel_attribution:
        factors = [
            {
                "factor": a["factor"],
                "contribution": a["paid_contribution"],
                "label": a["label"],
            }
            for a in channel_attribution
        ]
    elif narrow_paid or wide_paid:
        factors = [
            {
                "factor": "narrow",
                "contribution": round(narrow_paid / total_aperture_paid, 4),
                "label": "窄口径",
            },
            {
                "factor": "wide",
                "contribution": round(wide_paid / total_aperture_paid, 4),
                "label": "宽口径",
            },
        ]
    else:
        factors = [{"factor": "unknown", "contribution": 1.0, "label": "数据待接入"}]

    return {
        "factors": factors,
        "channel_attribution": channel_attribution,
        "funnel_attribution": funnel_attribution,
        "aperture_attribution": aperture_attribution,
    }


# ── Package Mix ───────────────────────────────────────────────────────────────


def _adapt_package_mix(raw: dict[str, Any]) -> PackageMixResult:
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


# ── Team Package Mix ──────────────────────────────────────────────────────────


def _adapt_team_package_mix(raw: dict[str, Any]) -> TeamPackageMixResult:
    """E7 团队套餐结构: { teams: [{ team, items: [{ product_type, ratio }] }] }"""
    order_data = raw.get("order_analysis", {}) or {}
    team_package = order_data.get("team_package", []) or []
    return {"teams": team_package}


# ── Channel Revenue ───────────────────────────────────────────────────────────


def _adapt_channel_revenue(raw: dict[str, Any]) -> ChannelRevenueResult:
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
                    key=lambda x: (
                        -(x[1].get("revenue_usd", 0) or 0)
                        if isinstance(x[1], dict)
                        else 0
                    ),
                )
                if isinstance(d, dict) and (d.get("revenue_usd", 0) or 0) > 0
            ]
            total_usd = total_e3

    return {"channels": channels, "total_usd": round(total_usd, 2)}
