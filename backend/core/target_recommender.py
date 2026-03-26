"""TargetRecommender — 三档目标推荐器

基于历史 ≥3 个月 monthly_archives 数据，自动生成三档目标推荐：
  - conservative（保守）= P25 历史百分位
  - moderate（持平）    = P50 历史百分位
  - aggressive（激进）  = P75 × 增长斜率

口径拆分：总目标 × 历史口径贡献比例
转化率目标：
  - conservative = 历史最低月
  - moderate     = 上月实际
  - aggressive   = 历史最高月

数据不足（< 3 个月）时返回 None + message 说明原因。

输出格式对齐 frontend/lib/types/report.ts 中的 TargetRecommendation 类型：
  {
    tier: 'conservative' | 'moderate' | 'aggressive',
    registrations: number,
    appointments: number,
    payments: number,
    revenue_usd: number,
    appt_rate: number,
    attend_rate: number,
    paid_rate: number,
    asp: number,
    channel_targets: Record<string, number>,  # 各渠道注册数目标
  }
"""

from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

# 三档百分位配置
_TIERS = [
    ("conservative", 25),
    ("moderate", 50),
    ("aggressive", 75),
]

# 量化指标列（取百分位）
_VOLUME_METRICS = [
    "final_registrations",
    "final_appointments",
    "final_payments",
    "final_revenue_usd",
    "final_asp",
]

# 转化率指标列（conservative=min, moderate=上月实际, aggressive=max）
_RATE_METRICS = [
    "final_appt_rate",
    "final_attend_rate",
    "final_paid_rate",
]


def _safe_float(val: Any) -> float | None:
    """安全转为 float，无效值返回 None。"""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return None


def _percentile(values: list[float], p: int) -> float:
    """计算百分位数（线性插值）。

    Args:
        values: 已排序的数值列表
        p:      0-100 的百分位数

    Returns:
        百分位数值
    """
    if not values:
        return 0.0
    n = len(values)
    if n == 1:
        return values[0]
    sorted_vals = sorted(values)
    # 线性插值
    idx = (p / 100) * (n - 1)
    lo = int(idx)
    hi = min(lo + 1, n - 1)
    frac = idx - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def _compute_growth_slope(values: list[float]) -> float:
    """计算增长斜率（简单线性回归，返回斜率相对值）。

    Returns:
        相对增长系数，如 1.05 表示预测下一期比均值高 5%
    """
    n = len(values)
    if n < 2:
        return 1.0

    # 使用加权最小二乘，近期数据权重更高
    weights = list(range(1, n + 1))
    total_w = sum(weights)
    mean_x = sum(w * i for i, w in enumerate(weights)) / total_w
    mean_y = sum(w * v for v, w in zip(values, weights, strict=True)) / total_w

    numerator = sum(
        w * (i - mean_x) * (v - mean_y)
        for i, (v, w) in enumerate(zip(values, weights, strict=True))
    )
    denominator = sum(w * (i - mean_x) ** 2 for i, w in enumerate(weights))

    if denominator == 0 or mean_y == 0:
        return 1.0

    slope = numerator / denominator
    # 预测下一期（index = n）相对于均值的比率
    next_y = mean_y + slope * (n - mean_x)
    ratio = next_y / mean_y if mean_y != 0 else 1.0

    # 限制在合理范围内：0.8 ~ 1.5
    return max(0.8, min(1.5, ratio))


def recommend_targets(
    snapshot_service: Any,
    n_months: int = 6,
    channels: list[str] | None = None,
) -> dict[str, Any]:
    """生成三档目标推荐。

    Args:
        snapshot_service: DailySnapshotService 实例
        n_months:         查询历史月份数，默认 6 个月
        channels:         需要拆分的渠道列表，None 则使用历史归档中出现的渠道

    Returns:
        {
            "recommendations": [TargetRecommendation × 3],  # 三档推荐
            "message": str | None,  # 数据不足时的说明
            "data_months": int,     # 实际可用历史月份数
        }
    """
    from datetime import date

    today = date.today()

    # ── 查询历史月度归档 ──────────────────────────────────────────────────────
    month_keys: list[str] = []
    for i in range(1, n_months + 1):  # 不含当月
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        month_keys.append(f"{y:04d}{m:02d}")

    # 按时间升序（最早的在前）
    month_keys = list(reversed(month_keys))

    total_rows: list[dict[str, Any]] = []
    channel_rows_by_month: dict[str, list[dict[str, Any]]] = {}

    for mk in month_keys:
        rows = snapshot_service.query_monthly_archive(mk)
        for row in rows:
            ch = row.get("channel", "total")
            if ch == "total":
                total_rows.append(dict(row))
            else:
                if mk not in channel_rows_by_month:
                    channel_rows_by_month[mk] = []
                channel_rows_by_month[mk].append(dict(row))

    data_months = len(total_rows)

    if data_months < 3:
        remaining = 3 - data_months
        return {
            "recommendations": None,
            "message": (
                f"需积累 {remaining} 月数据"
                f"（当前 {data_months} 月，至少需要 3 月）"
            ),
            "data_months": data_months,
        }

    # ── 上月实际（最近一期） ──────────────────────────────────────────────────
    last_month_row = total_rows[-1]

    # ── 量化指标百分位 ────────────────────────────────────────────────────────
    volume_values: dict[str, list[float]] = {m: [] for m in _VOLUME_METRICS}
    for row in total_rows:
        for metric in _VOLUME_METRICS:
            v = _safe_float(row.get(metric))
            if v is not None and v > 0:
                volume_values[metric].append(v)

    # ── 转化率指标历史最高/最低 ───────────────────────────────────────────────
    rate_values: dict[str, list[float]] = {m: [] for m in _RATE_METRICS}
    for row in total_rows:
        for metric in _RATE_METRICS:
            v = _safe_float(row.get(metric))
            if v is not None and v > 0:
                rate_values[metric].append(v)

    # ── 渠道贡献比例（按历史注册数占比均值） ──────────────────────────────────
    channel_contrib: dict[str, list[float]] = {}
    for _mk, ch_rows in channel_rows_by_month.items():
        total_reg = sum(
            _safe_float(r.get("final_registrations")) or 0.0
            for r in ch_rows
        )
        if total_reg <= 0:
            continue
        for row in ch_rows:
            ch = row.get("channel", "")
            if not ch:
                continue
            if channels is not None and ch not in channels:
                continue
            reg = _safe_float(row.get("final_registrations")) or 0.0
            ratio = reg / total_reg
            if ch not in channel_contrib:
                channel_contrib[ch] = []
            channel_contrib[ch].append(ratio)

    # 各渠道平均贡献比
    channel_avg_contrib: dict[str, float] = {
        ch: sum(v) / len(v)
        for ch, v in channel_contrib.items()
        if v
    }

    # 归一化（确保贡献比之和为 1）
    total_contrib = sum(channel_avg_contrib.values())
    if total_contrib > 0:
        channel_avg_contrib = {
            ch: v / total_contrib
            for ch, v in channel_avg_contrib.items()
        }

    # ── 激进档增长斜率 ────────────────────────────────────────────────────────
    reg_time_series = [
        _safe_float(r.get("final_registrations")) or 0.0
        for r in total_rows
        if _safe_float(r.get("final_registrations")) is not None
    ]
    growth_slope = _compute_growth_slope(reg_time_series)

    # ── 构建三档推荐 ──────────────────────────────────────────────────────────
    recommendations: list[dict[str, Any]] = []

    for tier, pct in _TIERS:
        rec: dict[str, Any] = {"tier": tier}

        # 量化指标
        for metric in _VOLUME_METRICS:
            vals = volume_values[metric]
            if not vals:
                rec[metric.replace("final_", "")] = 0.0
                continue
            p_val = _percentile(vals, pct)
            # 激进档追加增长斜率（仅对注册数/付费数/营收）
            if tier == "aggressive" and metric in (
                "final_registrations",
                "final_appointments",
                "final_payments",
                "final_revenue_usd",
            ):
                p_val = p_val * growth_slope
            rec[metric.replace("final_", "")] = round(p_val, 2)

        # 转化率指标
        for metric in _RATE_METRICS:
            rate_key = metric.replace("final_", "")
            vals = rate_values[metric]
            if not vals:
                rec[rate_key] = 0.0
                continue

            if tier == "conservative":
                rec[rate_key] = round(min(vals), 6)
            elif tier == "moderate":
                # 上月实际
                last_val = _safe_float(last_month_row.get(metric))
                fallback = _percentile(vals, 50)
                rec[rate_key] = round(
                    last_val if last_val is not None else fallback, 6
                )
            else:  # aggressive
                rec[rate_key] = round(max(vals), 6)

        # 口径拆分目标（各渠道注册数）
        total_reg_target = rec.get("registrations", 0.0)
        channel_targets: dict[str, float] = {}
        for ch, ratio in channel_avg_contrib.items():
            channel_targets[ch] = round(total_reg_target * ratio, 1)
        rec["channel_targets"] = channel_targets

        recommendations.append(rec)

    logger.info(
        f"三档目标推荐完成：基于 {data_months} 个月历史数据，"
        f"渠道 {list(channel_avg_contrib.keys())}"
    )

    return {
        "recommendations": recommendations,
        "message": None,
        "data_months": data_months,
    }
