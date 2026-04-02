"""TargetRecommender — WMA 三档目标推荐器（Holt 1957 指数平滑）

算法：加权移动平均（WMA, n=6 月）+ 线性趋势修正（OLS）
  - 权重：最近月 6/21, 前1月 5/21, ..., 前5月 1/21（等差递减）
  - 趋势：近 n 月 revenue_total 线性回归斜率 / WMA，得月均增长率
  - base_target = WMA_revenue × (1 + trend_slope)

三档系数：
  - stable（稳达标）   × 1.0 — 默认
  - stretch（冲刺）    × 1.15
  - ambitious（大票）  × 1.50

全链路拆解（每档各口径独立）：
  总业绩 → 各口径业绩 → 付费 → 出席 → 预约 → 注册
  每口径用该口径自己的历史转化率 + 客单价（WMA）

数据不足（< 3 个月）时返回 message 说明，三档返回空。

理论锚定：Holt (1957) "Forecasting seasonals and trends by exponentially weighted
  moving averages", ONR Memo 52.  权重设计参考：NIST/SEMATECH e-Handbook of
  Statistical Methods, Sec 6.4.3.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from backend.core.date_override import get_today

logger = logging.getLogger(__name__)

# ── 三档配置 ──────────────────────────────────────────────────────────────────

_TIERS: list[tuple[str, str, float]] = [
    ("stable",    "稳达标", 1.00),
    ("stretch",   "冲刺",   1.15),
    ("ambitious", "大票",   1.50),
]

# 渠道名映射（monthly_archives 中宽口存为"其它"）
_CHANNEL_DISPLAY_TO_ARCHIVE: dict[str, str] = {
    "CC窄口": "CC窄口",
    "SS窄口": "SS窄口",
    "LP窄口": "LP窄口",
    "宽口":   "其它",
}

# WMA 权重分母 n*(n+1)/2，n=6 → 21
_WMA_N = 6
_WMA_WEIGHTS = list(range(1, _WMA_N + 1))  # [1,2,3,4,5,6]
_WMA_DENOM = sum(_WMA_WEIGHTS)  # 21


# ── 工具函数 ──────────────────────────────────────────────────────────────────


def _safe_float(val: Any) -> float | None:
    """安全转为 float，无效值返回 None。"""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return None


def _wma(values: list[float]) -> float:
    """加权移动平均（最近期权重最高）。

    values 应按时间升序（最早在前，最近在后）。
    若 values 长度 < n，取所有项做等差权重加权。
    """
    n = len(values)
    if n == 0:
        return 0.0
    if n == 1:
        return values[0]
    # 取最近 min(n, _WMA_N) 期
    use = values[-_WMA_N:] if n > _WMA_N else values
    k = len(use)
    weights = list(range(1, k + 1))
    denom = sum(weights)
    return sum(w * v for w, v in zip(weights, use, strict=True)) / denom


def _ols_trend_slope(values: list[float]) -> float:
    """OLS 线性回归斜率（相对值）。

    Returns:
        月均增长率（如 0.05 = 平均每月增长 5%），
        限制在 [-0.15, +0.30] 内，防止极端值。
    """
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    if mean_y == 0:
        return 0.0
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values, strict=True))
    den = sum((x - mean_x) ** 2 for x in xs)
    if den == 0:
        return 0.0
    slope = num / den  # 绝对斜率（每月增量）
    rel_slope = slope / mean_y  # 相对斜率（每月增长率）
    return max(-0.15, min(0.30, rel_slope))


# ── 核心函数：WMA 全链路推荐 ─────────────────────────────────────────────────


def recommend_targets_wma(
    snapshot_service: Any,
    n_months: int = 6,
) -> dict[str, Any]:
    """WMA 三档目标推荐（Holt 1957）。

    Args:
        snapshot_service: DailySnapshotService 实例
        n_months:         查询历史月份数，默认 6 个月

    Returns:
        {
            "basis_months": ["202509", ...],        # 计算基础的月份列表
            "method": "WMA+trend (Holt 1957)",
            "tiers": {
                "stable": {
                    "multiplier": 1.0,
                    "label": "稳达标",
                    "total": {registrations, appointments, attendance,
                              payments, revenue_usd, asp, reg_to_pay_rate},
                    "channels": {
                        "CC窄口": {registrations, appointments, attendance,
                                  payments, revenue_usd, revenue_share,
                                  appt_rate, attend_rate, paid_rate, asp},
                        "SS窄口": {...}, "LP窄口": {...}, "宽口": {...}
                    }
                },
                "stretch": {...},
                "ambitious": {...}
            },
            "default_tier": "stable",
            "data_months": N,
            "message": null | str,  # 数据不足时说明
        }
    """
    today = get_today()

    # ── 1. 计算目标月份列表（近 n 个自然月，不含当月） ─────────────────────
    month_keys: list[str] = []
    for i in range(1, n_months + 1):
        y, m = today.year, today.month - i
        while m <= 0:
            m += 12
            y -= 1
        month_keys.append(f"{y:04d}{m:02d}")
    month_keys = list(reversed(month_keys))  # 升序（最早在前）

    # ── 2. 从 monthly_archives 拉数据 ────────────────────────────────────────
    total_rows: list[dict[str, Any]] = []
    channel_rows_by_month: dict[str, dict[str, dict[str, Any]]] = {}
    # channel_rows_by_month[month_key][archive_channel_name] = row

    for mk in month_keys:
        rows = snapshot_service.query_monthly_archive(mk)
        for row in rows:
            row_d = dict(row)
            ch = row_d.get("channel", "total")
            if ch == "total":
                total_rows.append(row_d)
            else:
                if mk not in channel_rows_by_month:
                    channel_rows_by_month[mk] = {}
                channel_rows_by_month[mk][ch] = row_d

    data_months = len(total_rows)
    if data_months < 3:
        return {
            "basis_months": month_keys,
            "method": "WMA+trend (Holt 1957)",
            "tiers": {},
            "default_tier": "stable",
            "data_months": data_months,
            "message": (
                f"需积累 {3 - data_months} 月数据"
                f"（当前 {data_months} 月，至少需要 3 月）"
            ),
        }

    # 以实际有数据的月份为准
    basis_months = [r["month_key"] for r in total_rows]

    # ── 3. Total 口径 WMA + 趋势 ─────────────────────────────────────────────
    rev_series = [_safe_float(r.get("final_revenue_usd")) or 0.0 for r in total_rows]
    wma_revenue = _wma(rev_series)
    trend = _ols_trend_slope(rev_series)
    base_revenue = wma_revenue * (1.0 + trend)

    # Total 口径其他指标 WMA（用于汇总层 fallback）
    def _total_wma(field: str) -> float:
        vals = [_safe_float(r.get(field)) or 0.0 for r in total_rows]
        return _wma(vals)

    # ── 4. 各口径 WMA 转化率 + 客单价 ────────────────────────────────────────
    channel_wma: dict[str, dict[str, Any]] = {}
    _RATE_FIELDS = [
        "final_appt_rate",
        "final_attend_rate",
        "final_paid_rate",
        "final_asp",
    ]

    for display_name, archive_name in _CHANNEL_DISPLAY_TO_ARCHIVE.items():
        rate_fields = _RATE_FIELDS
        series: dict[str, list[float]] = {f: [] for f in rate_fields}
        rev_ch_series: list[float] = []

        for mk in basis_months:
            ch_data = channel_rows_by_month.get(mk, {})
            row = ch_data.get(archive_name)
            if row is None:
                # 该月无渠道数据，补 0（不会影响 WMA，因为后面过滤 > 0）
                for f in rate_fields:
                    series[f].append(0.0)
                rev_ch_series.append(0.0)
            else:
                for f in rate_fields:
                    v = _safe_float(row.get(f))
                    series[f].append(v if v is not None and v > 0 else 0.0)
                rev = _safe_float(row.get("final_revenue_usd"))
                rev_ch_series.append(rev if rev is not None else 0.0)

        # 只用非零期计算 WMA（防止缺数据月份干扰）
        def _wma_nonzero(vals: list[float]) -> float:
            nonzero = [v for v in vals if v > 0]
            if not nonzero:
                return 0.0
            return _wma(nonzero)

        channel_wma[display_name] = {
            "appt_rate":   _wma_nonzero(series["final_appt_rate"]),
            "attend_rate": _wma_nonzero(series["final_attend_rate"]),
            "paid_rate":   _wma_nonzero(series["final_paid_rate"]),
            "asp":         _wma_nonzero(series["final_asp"]),
            "rev_series":  rev_ch_series,
        }

    # ── 5. 上月各口径 revenue share（拆分用） ───────────────────────────────
    last_mk = basis_months[-1]
    last_ch_rows = channel_rows_by_month.get(last_mk, {})
    channel_last_rev: dict[str, float] = {}
    for display_name, archive_name in _CHANNEL_DISPLAY_TO_ARCHIVE.items():
        row = last_ch_rows.get(archive_name, {})
        rev = _safe_float(row.get("final_revenue_usd")) if row else None
        channel_last_rev[display_name] = rev if rev is not None and rev > 0 else 0.0

    total_last_rev = sum(channel_last_rev.values())
    # fallback: 若渠道合计为 0，用 total 口径数据做等比
    if total_last_rev <= 0:
        _last_rev_candidate = next(
            (
                r.get("final_revenue_usd")
                for r in total_rows
                if r["month_key"] == last_mk
            ),
            None,
        )
        total_fallback = _safe_float(_last_rev_candidate) or 1.0
        # 用等比分配（四等分）
        for k in channel_last_rev:
            channel_last_rev[k] = total_fallback / 4
        total_last_rev = total_fallback

    # 归一化 revenue_share
    revenue_shares: dict[str, float] = {
        k: v / total_last_rev for k, v in channel_last_rev.items()
    }

    # Total fallback 转化率（全局 WMA，用于渠道数据缺失时降级）
    total_wma_appt   = _total_wma("final_appt_rate")
    total_wma_attend = _total_wma("final_attend_rate")
    total_wma_paid   = _total_wma("final_paid_rate")
    total_wma_asp    = _total_wma("final_asp")

    # ── 6. 构建三档 ───────────────────────────────────────────────────────────
    tiers_out: dict[str, Any] = {}

    for tier_key, tier_label, multiplier in _TIERS:
        tier_revenue = base_revenue * multiplier

        total_reg_t    = 0.0
        total_appt_t   = 0.0
        total_attend_t = 0.0
        total_pay_t    = 0.0
        channels_out: dict[str, Any] = {}

        for display_name, rev_share in revenue_shares.items():
            wma = channel_wma[display_name]

            # 各口径指标（降级到 total WMA）
            ch_appt   = wma["appt_rate"]   or total_wma_appt   or 0.77
            ch_attend = wma["attend_rate"]  or total_wma_attend or 0.66
            ch_paid   = wma["paid_rate"]    or total_wma_paid   or 0.40
            ch_asp    = wma["asp"]          or total_wma_asp    or 850.0

            # 该口径收入目标
            ch_rev_t = tier_revenue * rev_share

            # 全链路反推
            ch_pay_t    = ch_rev_t / ch_asp    if ch_asp    > 0 else 0.0
            ch_attend_t = ch_pay_t / ch_paid   if ch_paid   > 0 else 0.0
            ch_appt_t   = ch_attend_t / ch_attend if ch_attend > 0 else 0.0
            ch_reg_t    = ch_appt_t / ch_appt  if ch_appt   > 0 else 0.0

            channels_out[display_name] = {
                "registrations": round(ch_reg_t, 1),
                "appointments":  round(ch_appt_t, 1),
                "attendance":    round(ch_attend_t, 1),
                "payments":      round(ch_pay_t, 1),
                "revenue_usd":   round(ch_rev_t, 2),
                "revenue_share": round(rev_share, 6),
                "appt_rate":     round(ch_appt, 6),
                "attend_rate":   round(ch_attend, 6),
                "paid_rate":     round(ch_paid, 6),
                "asp":           round(ch_asp, 2),
            }

            total_reg_t    += ch_reg_t
            total_appt_t   += ch_appt_t
            total_attend_t += ch_attend_t
            total_pay_t    += ch_pay_t

        # Total 层汇总
        total_asp_t  = tier_revenue / total_pay_t  if total_pay_t  > 0 else 0.0
        total_r2p_t  = total_pay_t  / total_reg_t  if total_reg_t  > 0 else 0.0

        tiers_out[tier_key] = {
            "multiplier": multiplier,
            "label": tier_label,
            "total": {
                "registrations": round(total_reg_t, 1),
                "appointments":  round(total_appt_t, 1),
                "attendance":    round(total_attend_t, 1),
                "payments":      round(total_pay_t, 1),
                "revenue_usd":   round(tier_revenue, 2),
                "asp":           round(total_asp_t, 2),
                "reg_to_pay_rate": round(total_r2p_t, 6),
            },
            "channels": channels_out,
        }

    logger.info(
        f"WMA 三档推荐完成：基于 {data_months} 月数据，"
        f"WMA 业绩 ${wma_revenue:,.0f}，趋势 {trend:+.1%}，"
        f"稳达标基数 ${base_revenue:,.0f}"
    )

    return {
        "basis_months": basis_months,
        "method": "WMA+trend (Holt 1957)",
        "tiers": tiers_out,
        "default_tier": "stable",
        "data_months": data_months,
        "message": None,
    }


# ── 兼容旧接口（被 daily report 消费） ───────────────────────────────────────


def recommend_targets(
    snapshot_service: Any,
    n_months: int = 6,
    channels: list[str] | None = None,
) -> dict[str, Any]:
    """旧接口兼容层：将 WMA 三档转为 report.ts TargetRecommendation[] 格式。

    返回格式：
        {
            "recommendations": [TargetRecommendation × 3] | None,
            "message": str | None,
            "data_months": int,
        }
    其中 TargetRecommendation 保留旧字段 tier/registrations/appointments/
    payments/revenue_usd/appt_rate/attend_rate/paid_rate/asp/channel_targets
    以兼容前端 report.ts DailyReport.target_recommendations。
    """
    wma_result = recommend_targets_wma(snapshot_service, n_months)

    if not wma_result.get("tiers"):
        return {
            "recommendations": None,
            "message": wma_result.get("message"),
            "data_months": wma_result.get("data_months", 0),
        }

    # 旧 tier 名映射（旧前端消费）
    _old_tier_map = {
        "stable":    "conservative",
        "stretch":   "moderate",
        "ambitious": "aggressive",
    }

    recommendations: list[dict[str, Any]] = []
    for tier_key, old_tier in _old_tier_map.items():
        tier_data = wma_result["tiers"].get(tier_key, {})
        total = tier_data.get("total", {})
        channels_data = tier_data.get("channels", {})

        # channel_targets = 各渠道注册数（旧格式）
        channel_targets: dict[str, float] = {
            ch: float(v.get("registrations", 0))
            for ch, v in channels_data.items()
        }

        # 各率从所有口径加权平均
        total_reg = total.get("registrations") or 1.0
        _appt_sum = sum(
            v.get("appt_rate", 0) * v.get("registrations", 0)
            for v in channels_data.values()
        )
        _attend_sum = sum(
            v.get("attend_rate", 0) * v.get("registrations", 0)
            for v in channels_data.values()
        )
        _paid_sum = sum(
            v.get("paid_rate", 0) * v.get("registrations", 0)
            for v in channels_data.values()
        )

        recommendations.append({
            "tier": old_tier,
            "registrations": total.get("registrations", 0),
            "appointments":  total.get("appointments", 0),
            "payments":      total.get("payments", 0),
            "revenue_usd":   total.get("revenue_usd", 0),
            "appt_rate": (
                round(_appt_sum / total_reg, 6) if total_reg > 0 else 0.0
            ),
            "attend_rate": (
                round(_attend_sum / total_reg, 6) if total_reg > 0 else 0.0
            ),
            "paid_rate": (
                round(_paid_sum / total_reg, 6) if total_reg > 0 else 0.0
            ),
            "asp":           total.get("asp", 0),
            "channel_targets": channel_targets,
        })

    return {
        "recommendations": recommendations,
        "message": None,
        "data_months": wma_result.get("data_months", 0),
    }


# ── 三档场景引擎（TargetTierEngine） ─────────────────────────────────────────


class TargetTierEngine:
    """三档目标场景引擎（M33 新架构）

    三档业务含义：
      pace   — 稳达标：当前效率照跑到月底，保证达标
      share  — 占比达标：公司总业绩 × 转介绍占比，反推全链路
      custom — 自定义：用户填若干字段，系统 WMA 推算其余

    所有档均返回统一结构：
        {
            "tier": str,
            "label": str,
            "total": {registrations, appointments, attendance,
                      payments, revenue_usd, asp,
                      appt_rate, attend_rate, paid_rate, reg_to_pay_rate},
            "channels": {
                "CC窄口": {registrations, appointments, attendance,
                           payments, revenue_usd, revenue_share,
                           appt_rate, attend_rate, paid_rate, asp},
                ...
            }
        }
    """

    def __init__(self, snapshot_service: Any, data_manager: Any = None) -> None:
        self._svc = snapshot_service
        self._dm = data_manager
        self._wma_cache: dict[str, Any] | None = None

    # ── 公开 API ──────────────────────────────────────────────────────────────

    def tier_pace(
        self, current_actuals: dict[str, Any], bm_pct: float
    ) -> dict[str, Any]:
        """一档：稳达标 — 当前效率外推到月底

        Args:
            current_actuals: 当前累计实绩（含各口径 channel 字段）
            bm_pct:          当前工作日进度（0-1），如 0.815
        """
        if bm_pct <= 0:
            bm_pct = 0.01

        wma = self._get_wma_data()

        # 总量外推：注册 / bm_pct
        reg_actual = float(current_actuals.get("registrations") or 0)
        appt_actual = float(current_actuals.get("appointments") or 0)
        attend_actual = float(current_actuals.get("attendance") or 0)
        pay_actual = float(current_actuals.get("payments") or 0)
        rev_actual = float(current_actuals.get("revenue_usd") or 0)

        appt_rate = float(
            current_actuals.get("appt_rate")
            or (_safe_float(appt_actual / reg_actual) if reg_actual > 0 else 0)
            or wma.get("total_appt_rate", 0.77)
        )
        attend_rate = float(
            current_actuals.get("attend_rate")
            or (_safe_float(attend_actual / appt_actual) if appt_actual > 0 else 0)
            or wma.get("total_attend_rate", 0.66)
        )
        paid_rate = float(
            current_actuals.get("paid_rate")
            or (_safe_float(pay_actual / attend_actual) if attend_actual > 0 else 0)
            or wma.get("total_paid_rate", 0.40)
        )
        asp = float(
            current_actuals.get("asp")
            or (_safe_float(rev_actual / pay_actual) if pay_actual > 0 else 0)
            or wma.get("total_asp", 850.0)
        )

        proj_reg = reg_actual / bm_pct
        proj_appt = proj_reg * appt_rate
        proj_attend = proj_appt * attend_rate
        proj_pay = proj_attend * paid_rate
        proj_rev = proj_pay * asp

        # 口径拆分：按当前各口径实际占比
        channel_actuals = current_actuals.get("channels", {})
        total_ch_reg = sum(
            float(v.get("registrations", 0)) for v in channel_actuals.values()
        )
        if total_ch_reg <= 0:
            total_ch_reg = reg_actual or 1.0

        channels_out: dict[str, Any] = {}
        for ch_name in _CHANNEL_DISPLAY_TO_ARCHIVE:
            ch_data = channel_actuals.get(ch_name, {})
            ch_reg_actual = float(ch_data.get("registrations") or 0)
            ch_share = ch_reg_actual / total_ch_reg if total_ch_reg > 0 else 0.25

            ch_proj_reg = proj_reg * ch_share
            ch_appt_r = float(ch_data.get("appt_rate") or appt_rate)
            ch_attend_r = float(ch_data.get("attend_rate") or attend_rate)
            ch_paid_r = float(ch_data.get("paid_rate") or paid_rate)
            ch_asp = float(ch_data.get("asp") or asp)

            ch_proj_appt = ch_proj_reg * ch_appt_r
            ch_proj_attend = ch_proj_appt * ch_attend_r
            ch_proj_pay = ch_proj_attend * ch_paid_r
            ch_proj_rev = ch_proj_pay * ch_asp

            channels_out[ch_name] = {
                "registrations": round(ch_proj_reg, 1),
                "appointments":  round(ch_proj_appt, 1),
                "attendance":    round(ch_proj_attend, 1),
                "payments":      round(ch_proj_pay, 1),
                "revenue_usd":   round(ch_proj_rev, 2),
                "revenue_share": round(ch_share, 6),
                "appt_rate":     round(ch_appt_r, 6),
                "attend_rate":   round(ch_attend_r, 6),
                "paid_rate":     round(ch_paid_r, 6),
                "asp":           round(ch_asp, 2),
            }

        reg_to_pay = paid_rate * attend_rate * appt_rate

        return {
            "tier":  "pace",
            "label": "稳达标",
            "total": {
                "registrations": round(proj_reg, 1),
                "appointments":  round(proj_appt, 1),
                "attendance":    round(proj_attend, 1),
                "payments":      round(proj_pay, 1),
                "revenue_usd":   round(proj_rev, 2),
                "asp":           round(asp, 2),
                "appt_rate":     round(appt_rate, 6),
                "attend_rate":   round(attend_rate, 6),
                "paid_rate":     round(paid_rate, 6),
                "reg_to_pay_rate": round(reg_to_pay, 6),
            },
            "channels": channels_out,
        }

    def tier_share(
        self,
        company_revenue: float,
        referral_share: float = 0.30,
    ) -> dict[str, Any]:
        """二档：占比达标 — 公司总业绩 × 转介绍占比，WMA 历史率反推全链路

        Args:
            company_revenue: 公司总业绩目标（USD）
            referral_share:  转介绍占比（0-1），默认 0.30
        """
        wma = self._get_wma_data()
        referral_rev = company_revenue * referral_share
        return self._decompose_to_channels(referral_rev, wma, "share", "占比达标")

    def tier_custom(self, user_inputs: dict[str, Any]) -> dict[str, Any]:
        """三档：自定义 — 用户填若干字段，系统 WMA 推算其余

        user_inputs 可填任意组合（至少一个）：
          revenue_target, asp, reg_to_pay_rate, appt_rate, attend_rate,
          paid_rate, registrations, company_revenue, referral_share_pct
        冲突处理：revenue_target 优先，重算 payments = revenue / asp
        """
        wma = self._get_wma_data()

        # 1. 确定 revenue_target
        rev = _safe_float(user_inputs.get("revenue_target"))
        if rev is None or rev <= 0:
            company_rev = _safe_float(user_inputs.get("company_revenue"))
            share_pct = _safe_float(user_inputs.get("referral_share_pct")) or 0.30
            if company_rev and company_rev > 0:
                rev = company_rev * share_pct
            else:
                rev = wma.get("total_revenue", 0.0)

        # 2. ASP（用户 > WMA fallback）
        asp = _safe_float(user_inputs.get("asp")) or wma.get("total_asp") or 850.0

        # 3. 全局转化率（用户 > WMA fallback）
        appt_rate = (
            _safe_float(user_inputs.get("appt_rate"))
            or wma.get("total_appt_rate") or 0.77
        )
        attend_rate = (
            _safe_float(user_inputs.get("attend_rate"))
            or wma.get("total_attend_rate") or 0.66
        )
        paid_rate = (
            _safe_float(user_inputs.get("paid_rate"))
            or wma.get("total_paid_rate") or 0.40
        )
        reg_to_pay = (
            _safe_float(user_inputs.get("reg_to_pay_rate"))
            or (appt_rate * attend_rate * paid_rate)
        )

        # 4. 付费数（revenue 优先，避免 revenue ≠ payments × asp 冲突）
        payments = rev / asp if asp > 0 else 0.0

        # 5. 注册数（用户填 > reg / reg_to_pay）
        user_reg = _safe_float(user_inputs.get("registrations"))
        registrations = user_reg if (user_reg and user_reg > 0) else (
            payments / reg_to_pay if reg_to_pay > 0 else 0.0
        )

        # 6. 全链路反推
        appointments = registrations * appt_rate
        attendance = appointments * attend_rate

        total_out: dict[str, Any] = {
            "registrations": round(registrations, 1),
            "appointments":  round(appointments, 1),
            "attendance":    round(attendance, 1),
            "payments":      round(payments, 1),
            "revenue_usd":   round(rev, 2),
            "asp":           round(asp, 2),
            "appt_rate":     round(appt_rate, 6),
            "attend_rate":   round(attend_rate, 6),
            "paid_rate":     round(paid_rate, 6),
            "reg_to_pay_rate": round(reg_to_pay, 6),
        }

        channels_out = self._decompose_to_channels(
            rev, wma, "custom", "自定义"
        )["channels"]

        return {
            "tier":     "custom",
            "label":    "自定义",
            "total":    total_out,
            "channels": channels_out,
        }

    def get_all_tiers(
        self,
        current_actuals: dict[str, Any],
        bm_pct: float,
        company_revenue: float = 0,
        referral_share: float = 0.30,
        custom_inputs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """返回三档完整预览

        Args:
            current_actuals: 当前实绩（含 channels 子字典）
            bm_pct:          当前工作日进度
            company_revenue: 公司总业绩目标（二档需要）
            referral_share:  转介绍占比（二档）
            custom_inputs:   用户自定义输入（三档）
        """
        pace = self.tier_pace(current_actuals, bm_pct)
        share = (
            self.tier_share(company_revenue, referral_share)
            if company_revenue > 0
            else None
        )
        custom = (
            self.tier_custom(custom_inputs)
            if custom_inputs
            else None
        )

        return {
            "tiers": {
                "pace":   pace,
                "share":  share,
                "custom": custom,
            },
            "default_tier": "pace",
        }

    # ── 内部方法 ──────────────────────────────────────────────────────────────

    def _decompose_to_channels(
        self,
        total_revenue: float,
        wma: dict[str, Any],
        tier_key: str,
        tier_label: str,
    ) -> dict[str, Any]:
        """全链路口径拆分（三档共用）

        用 WMA 历史各口径 revenue_share 分配总目标，
        再用各口径自己的历史转化率反推注册→预约→出席→付费。
        """
        channel_wma: dict[str, dict[str, float]] = wma.get("channels", {})
        revenue_shares: dict[str, float] = wma.get("revenue_shares", {})

        # fallback 等分
        if not revenue_shares:
            equal = 1.0 / len(_CHANNEL_DISPLAY_TO_ARCHIVE)
            revenue_shares = {k: equal for k in _CHANNEL_DISPLAY_TO_ARCHIVE}

        total_asp_f = wma.get("total_asp") or 850.0
        total_appt_r = wma.get("total_appt_rate") or 0.77
        total_attend_r = wma.get("total_attend_rate") or 0.66
        total_paid_r = wma.get("total_paid_rate") or 0.40

        channels_out: dict[str, Any] = {}
        total_reg_t = total_appt_t = total_attend_t = total_pay_t = 0.0

        for ch_name in _CHANNEL_DISPLAY_TO_ARCHIVE:
            ch_wma = channel_wma.get(ch_name, {})
            ch_count = len(_CHANNEL_DISPLAY_TO_ARCHIVE)
            rev_share = revenue_shares.get(ch_name, 1.0 / ch_count)

            ch_rev_t = total_revenue * rev_share
            ch_appt   = ch_wma.get("appt_rate")   or total_appt_r
            ch_attend  = ch_wma.get("attend_rate") or total_attend_r
            ch_paid    = ch_wma.get("paid_rate")   or total_paid_r
            ch_asp     = ch_wma.get("asp")         or total_asp_f

            ch_pay_t    = ch_rev_t / ch_asp if ch_asp > 0 else 0.0
            ch_attend_t = ch_pay_t / ch_paid if ch_paid > 0 else 0.0
            ch_appt_t   = ch_attend_t / ch_attend if ch_attend > 0 else 0.0
            ch_reg_t    = ch_appt_t / ch_appt if ch_appt > 0 else 0.0

            channels_out[ch_name] = {
                "registrations": round(ch_reg_t, 1),
                "appointments":  round(ch_appt_t, 1),
                "attendance":    round(ch_attend_t, 1),
                "payments":      round(ch_pay_t, 1),
                "revenue_usd":   round(ch_rev_t, 2),
                "revenue_share": round(rev_share, 6),
                "appt_rate":     round(ch_appt, 6),
                "attend_rate":   round(ch_attend, 6),
                "paid_rate":     round(ch_paid, 6),
                "asp":           round(ch_asp, 2),
            }

            total_reg_t    += ch_reg_t
            total_appt_t   += ch_appt_t
            total_attend_t += ch_attend_t
            total_pay_t    += ch_pay_t

        total_asp_t  = total_revenue / total_pay_t if total_pay_t > 0 else 0.0
        total_r2p_t  = total_pay_t / total_reg_t if total_reg_t > 0 else 0.0
        total_appt_r_t = total_appt_t / total_reg_t if total_reg_t > 0 else 0.0
        total_attend_r_t = total_attend_t / total_appt_t if total_appt_t > 0 else 0.0
        total_paid_r_t = total_pay_t / total_attend_t if total_attend_t > 0 else 0.0

        return {
            "tier":  tier_key,
            "label": tier_label,
            "total": {
                "registrations": round(total_reg_t, 1),
                "appointments":  round(total_appt_t, 1),
                "attendance":    round(total_attend_t, 1),
                "payments":      round(total_pay_t, 1),
                "revenue_usd":   round(total_revenue, 2),
                "asp":           round(total_asp_t, 2),
                "appt_rate":     round(total_appt_r_t, 6),
                "attend_rate":   round(total_attend_r_t, 6),
                "paid_rate":     round(total_paid_r_t, 6),
                "reg_to_pay_rate": round(total_r2p_t, 6),
            },
            "channels": channels_out,
        }

    def _get_wma_data(self, n_months: int = 6) -> dict[str, Any]:
        """从 monthly_archives 读取近 N 月数据，计算 WMA 汇总

        Returns 结构：
          {
            "total_revenue": float,
            "total_asp": float,
            "total_appt_rate": float,
            "total_attend_rate": float,
            "total_paid_rate": float,
            "revenue_shares": {"CC窄口": float, ...},
            "channels": {"CC窄口": {appt_rate, attend_rate, paid_rate, asp}, ...}
          }
        """
        if self._wma_cache is not None:
            return self._wma_cache

        today = get_today()
        month_keys: list[str] = []
        for i in range(1, n_months + 1):
            y, m = today.year, today.month - i
            while m <= 0:
                m += 12
                y -= 1
            month_keys.append(f"{y:04d}{m:02d}")
        month_keys = list(reversed(month_keys))

        total_rows: list[dict[str, Any]] = []
        channel_rows_by_month: dict[str, dict[str, dict[str, Any]]] = {}

        for mk in month_keys:
            rows = self._svc.query_monthly_archive(mk)
            for row in rows:
                row_d = dict(row)
                ch = row_d.get("channel", "total")
                if ch == "total":
                    total_rows.append(row_d)
                else:
                    if mk not in channel_rows_by_month:
                        channel_rows_by_month[mk] = {}
                    channel_rows_by_month[mk][ch] = row_d

        basis_months = [r["month_key"] for r in total_rows]

        # Total 口径 WMA
        def _t_wma(field: str) -> float:
            vals = [_safe_float(r.get(field)) or 0.0 for r in total_rows]
            nonzero = [v for v in vals if v > 0]
            return _wma(nonzero) if nonzero else 0.0

        total_revenue = _t_wma("final_revenue_usd")
        total_asp = _t_wma("final_asp")
        total_appt_rate = _t_wma("final_appt_rate")
        total_attend_rate = _t_wma("final_attend_rate")
        total_paid_rate = _t_wma("final_paid_rate")

        # 各口径 WMA 转化率
        channel_wma: dict[str, dict[str, float]] = {}
        for display_name, archive_name in _CHANNEL_DISPLAY_TO_ARCHIVE.items():
            series: dict[str, list[float]] = {
                "appt_rate": [], "attend_rate": [], "paid_rate": [], "asp": [],
            }
            rev_series: list[float] = []

            for mk in basis_months:
                ch_data = channel_rows_by_month.get(mk, {})
                row = ch_data.get(archive_name)
                if row:
                    for f in series:
                        v = _safe_float(row.get(f"final_{f}"))
                        series[f].append(v if v and v > 0 else 0.0)
                    rev = _safe_float(row.get("final_revenue_usd"))
                    rev_series.append(rev if rev else 0.0)
                else:
                    for f in series:
                        series[f].append(0.0)
                    rev_series.append(0.0)

            def _wma_nz(vals: list[float]) -> float:
                nz = [v for v in vals if v > 0]
                return _wma(nz) if nz else 0.0

            channel_wma[display_name] = {
                "appt_rate":   _wma_nz(series["appt_rate"]),
                "attend_rate": _wma_nz(series["attend_rate"]),
                "paid_rate":   _wma_nz(series["paid_rate"]),
                "asp":         _wma_nz(series["asp"]),
                "rev_wma":     _wma_nz(rev_series),
            }

        # Revenue shares：取上月各口径占比
        last_mk = basis_months[-1] if basis_months else ""
        last_ch_rows = channel_rows_by_month.get(last_mk, {})
        channel_last_rev: dict[str, float] = {}
        for display_name, archive_name in _CHANNEL_DISPLAY_TO_ARCHIVE.items():
            row = last_ch_rows.get(archive_name, {})
            rev = _safe_float(row.get("final_revenue_usd")) if row else None
            channel_last_rev[display_name] = rev if rev and rev > 0 else 0.0

        total_last_rev = sum(channel_last_rev.values())
        if total_last_rev <= 0:
            equal = 1.0 / len(_CHANNEL_DISPLAY_TO_ARCHIVE)
            revenue_shares = {k: equal for k in _CHANNEL_DISPLAY_TO_ARCHIVE}
        else:
            revenue_shares = {
                k: v / total_last_rev for k, v in channel_last_rev.items()
            }

        result: dict[str, Any] = {
            "total_revenue":     total_revenue,
            "total_asp":         total_asp,
            "total_appt_rate":   total_appt_rate,
            "total_attend_rate": total_attend_rate,
            "total_paid_rate":   total_paid_rate,
            "revenue_shares":    revenue_shares,
            "channels":          channel_wma,
            "basis_months":      basis_months,
        }
        self._wma_cache = result
        return result


# ── 旧函数保留（decompose_targets_from_last_month 被 config API 消费） ────────


def _safe_div(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return a / b


def decompose_targets_from_last_month(
    snapshot_service: Any,
    total_revenue_target: float,
) -> dict[str, Any]:
    """将总收入目标按上月各口径实际 revenue share 拆解到各漏斗层级。

    Args:
        snapshot_service:     DailySnapshotService 实例
        total_revenue_target: 总收入目标（USD），如 200444

    Returns:
        {
            "total": {registrations, appointments, attendance, payments, revenue_usd,
                      conversion_rate, asp},
            "channels": {
                "CC窄口": {registrations, appointments, attendance, payments,
                           revenue_usd, appt_rate, attend_rate, paid_rate,
                           reg_to_pay_rate, asp, revenue_share},
                "SS窄口": {...}, "LP窄口": {...}, "宽口": {...},
            },
            "basis": "YYYYMM",
            "message": str | None,
        }
    """
    today = get_today()
    y, m = today.year, today.month - 1
    if m <= 0:
        m += 12
        y -= 1
    last_month_key = f"{y:04d}{m:02d}"

    rows = snapshot_service.query_monthly_archive(last_month_key)
    if not rows:
        return {
            "total": {},
            "channels": {},
            "basis": last_month_key,
            "message": f"上月（{last_month_key}）无归档数据，无法自动拆解目标",
        }

    row_by_channel: dict[str, dict[str, Any]] = {}
    for row in rows:
        ch = row.get("channel", "")
        row_by_channel[ch] = row

    total_row = row_by_channel.get("total", {})

    channel_map = {
        "CC窄口": "CC窄口",
        "SS窄口": "SS窄口",
        "LP窄口": "LP窄口",
        "宽口":   "其它",
    }

    channel_revenues: dict[str, float] = {}
    for display_name, archive_name in channel_map.items():
        ch_row = row_by_channel.get(archive_name, {})
        rev = _safe_float(ch_row.get("final_revenue_usd"))
        channel_revenues[display_name] = rev if rev is not None else 0.0

    total_ch_rev = sum(channel_revenues.values())

    if total_ch_rev <= 0:
        total_rev = _safe_float(total_row.get("final_revenue_usd")) or 0.0
        if total_rev <= 0:
            return {
                "total": {},
                "channels": {},
                "basis": last_month_key,
                "message": f"上月（{last_month_key}）营收数据为空，无法拆解",
            }
        total_reg_archive = _safe_float(total_row.get("final_registrations")) or 0.0
        for display_name, archive_name in channel_map.items():
            ch_row = row_by_channel.get(archive_name, {})
            ch_reg = _safe_float(ch_row.get("final_registrations")) or 0.0
            channel_revenues[display_name] = (
                ch_reg / total_reg_archive * total_rev if total_reg_archive > 0 else 0.0
            )
        total_ch_rev = sum(channel_revenues.values()) or total_rev

    channels_out: dict[str, dict[str, Any]] = {}
    total_reg_target = 0.0
    total_appt_target = 0.0
    total_attend_target = 0.0
    total_pay_target = 0.0

    for display_name, archive_name in channel_map.items():
        ch_row = row_by_channel.get(archive_name, {})
        rev_share = channel_revenues[display_name] / total_ch_rev

        ch_rev_target = total_revenue_target * rev_share

        ch_asp        = _safe_float(ch_row.get("final_asp"))        or 0.0
        ch_paid_rate  = _safe_float(ch_row.get("final_paid_rate"))  or 0.0
        ch_attend_rate = _safe_float(ch_row.get("final_attend_rate")) or 0.0
        ch_appt_rate  = _safe_float(ch_row.get("final_appt_rate"))  or 0.0

        if ch_asp <= 0:
            ch_asp = _safe_float(total_row.get("final_asp")) or 850.0
        if ch_paid_rate <= 0:
            ch_paid_rate = _safe_float(total_row.get("final_paid_rate")) or 0.23
        if ch_attend_rate <= 0:
            ch_attend_rate = _safe_float(total_row.get("final_attend_rate")) or 0.66
        if ch_appt_rate <= 0:
            ch_appt_rate = _safe_float(total_row.get("final_appt_rate")) or 0.77

        ch_pay_target    = ch_rev_target / ch_asp if ch_asp > 0 else 0.0
        ch_attend_target = (
            ch_pay_target / ch_paid_rate if ch_paid_rate > 0 else 0.0
        )
        ch_appt_target   = (
            ch_attend_target / ch_attend_rate if ch_attend_rate > 0 else 0.0
        )
        ch_reg_target    = (
            ch_appt_target / ch_appt_rate if ch_appt_rate > 0 else 0.0
        )
        ch_reg_to_pay    = ch_paid_rate * ch_attend_rate * ch_appt_rate

        channels_out[display_name] = {
            "registrations": round(ch_reg_target, 1),
            "appointments":  round(ch_appt_target, 1),
            "attendance":    round(ch_attend_target, 1),
            "payments":      round(ch_pay_target, 1),
            "revenue_usd":   round(ch_rev_target, 2),
            "appt_rate":     round(ch_appt_rate, 6),
            "attend_rate":   round(ch_attend_rate, 6),
            "paid_rate":     round(ch_paid_rate, 6),
            "reg_to_pay_rate": round(ch_reg_to_pay, 6),
            "asp":           round(ch_asp, 2),
            "revenue_share": round(rev_share, 6),
        }

        total_reg_target    += ch_reg_target
        total_appt_target   += ch_appt_target
        total_attend_target += ch_attend_target
        total_pay_target    += ch_pay_target

    total_asp = (
        total_revenue_target / total_pay_target if total_pay_target > 0 else 0.0
    )
    total_conv = (
        total_pay_target / total_reg_target if total_reg_target > 0 else 0.0
    )

    logger.info(
        f"目标拆解完成：基于 {last_month_key} 历史数据，"
        f"总目标 ${total_revenue_target:,.0f} → 注册 {total_reg_target:.0f}"
    )

    return {
        "total": {
            "registrations": round(total_reg_target, 1),
            "appointments":  round(total_appt_target, 1),
            "attendance":    round(total_attend_target, 1),
            "payments":      round(total_pay_target, 1),
            "revenue_usd":   round(total_revenue_target, 2),
            "conversion_rate": round(total_conv, 6),
            "asp":           round(total_asp, 2),
        },
        "channels": channels_out,
        "basis": last_month_key,
        "message": None,
    }
