"""LeverageEngine — 收入杠杆矩阵

对每个渠道口径的每个转化环节计算杠杆分：
    leverage_score = revenue_impact × feasibility × urgency

三个维度：
  - revenue_impact : 若将该环节转化率补齐到目标，增量收入（USD）
  - feasibility    : min(1.0, (historical_best - actual) / (target - actual))
                     衡量"历史上达到过该目标的程度"
  - urgency        : 1.5 = 近3期趋势下降 | 1.0 = 持平 | 0.7 = 上升
                     趋势下降越紧急，趋势上升说明自然恢复可能性高

潜力判定（依赖均值截断）：
  - 高潜力🟢 = leverage_score > 均值 且 feasibility ≥ 0.7 且 趋势非下降
  - 待改善🟡 = leverage_score > 均值 但 feasibility < 0.7 或 趋势下降
  - 已饱和⚪ = leverage_score ≤ 均值 或 已达标

输入：
  - channel_funnel_data : {渠道名: 指标字典}，来自 ChannelFunnelEngine
  - targets             : 指标目标值字典（appt_rate/attend_rate/paid_rate/asp）
  - historical_best     : {指标名: 历史最佳值}，从 monthly_archives 查询
  - recent_trend_data   : 最近3期每期的各指标值 [{stage: value}]，用于趋势判断

输出：FunnelLeverage 格式（对齐 frontend/lib/types/report.ts）
"""

from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

# 漏斗三个转化阶段
_FUNNEL_STAGES = ["appt_rate", "attend_rate", "paid_rate"]

# 漏斗阶段中文标签
_STAGE_LABELS = {
    "appt_rate": "预约率",
    "attend_rate": "出席率",
    "paid_rate": "付费率",
}


def _safe_float(val: Any) -> float:
    """安全转为 float，无效值返回 0.0。"""
    if val is None:
        return 0.0
    try:
        f = float(val)
        return 0.0 if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return 0.0


def _compute_trend_urgency(recent_values: list[float]) -> float:
    """根据近3期趋势值判断紧迫度系数。

    Args:
        recent_values: 最近3期的指标值（从早到晚排列），长度可为 1-3

    Returns:
        紧迫度系数：1.5（下降）| 1.0（持平/不足3期）| 0.7（上升）
    """
    if len(recent_values) < 2:
        return 1.0

    # 用近3期线性趋势斜率判断
    vals = recent_values[-3:]  # 最多取3期
    n = len(vals)
    if n < 2:
        return 1.0

    # 简单判断：最后一期 vs 第一期
    first = vals[0]
    last = vals[-1]
    if first == 0.0 or first is None:
        return 1.0

    delta = last - first
    threshold = abs(first) * 0.02  # 2% 变化才算趋势

    if delta < -threshold:
        return 1.5  # 下降，紧迫
    elif delta > threshold:
        return 0.7  # 上升，自然改善中
    else:
        return 1.0  # 持平


def _compute_revenue_impact(
    stage: str,
    channel_metrics: dict[str, float],
    target_rate: float,
) -> float:
    """计算将某转化阶段补齐到目标带来的增量收入（USD）。

    公式（逐环节独立测算，不累乘）：
      appt_rate  -> gap × registrations × actual_attend_rate × actual_paid_rate × asp
      attend_rate -> appointments × gap × actual_paid_rate × asp
      paid_rate  -> attendance × gap × asp
    """
    actual_rate = _safe_float(channel_metrics.get(stage, 0.0))
    gap = target_rate - actual_rate

    if gap <= 0:
        return 0.0  # 已达标或超标，无增量

    registrations = _safe_float(channel_metrics.get("registrations", 0))
    appointments = _safe_float(channel_metrics.get("appointments", 0))
    attendance = _safe_float(channel_metrics.get("attendance", 0))
    actual_attend_rate = _safe_float(channel_metrics.get("attend_rate", 0))
    actual_paid_rate = _safe_float(channel_metrics.get("paid_rate", 0))
    asp = _safe_float(channel_metrics.get("asp", 0))

    if stage == "appt_rate":
        return gap * registrations * actual_attend_rate * actual_paid_rate * asp
    elif stage == "attend_rate":
        return appointments * gap * actual_paid_rate * asp
    elif stage == "paid_rate":
        return attendance * gap * asp
    return 0.0


def _compute_feasibility(
    actual: float,
    target: float,
    historical_best: float,
) -> float:
    """计算可行性分数（0-1）。

    公式：min(1.0, (historical_best - actual) / (target - actual))
    含义：历史上已经达到的改善幅度占所需改善幅度的比例。
    """
    gap = target - actual
    if gap <= 0:
        return 1.0  # 已达标，视为完全可行

    improvement_seen = historical_best - actual
    if improvement_seen <= 0:
        return 0.0  # 历史最佳也没超过当前，改善空间未验证

    feasibility = improvement_seen / gap
    return min(1.0, max(0.0, feasibility))


def compute_leverage_matrix(
    channel_funnel_data: dict[str, dict[str, Any]],
    targets: dict[str, float],
    historical_best: dict[str, float] | None = None,
    recent_trend_data: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """计算完整的收入杠杆矩阵。

    Args:
        channel_funnel_data: {渠道名: 指标字典}，来自 ChannelFunnelEngine
        targets:             目标值字典，key 为指标名
                             （appt_rate/attend_rate/paid_rate/asp）
        historical_best:     各指标历史最佳值，key 格式为 "{stage}"（单维）
                             或 "{channel}.{stage}"（渠道维）
        recent_trend_data:   最近3期各指标快照列表（每期为 {渠道名: {stage: value}}），
                             按时间升序

    Returns:
        {
            "scores": [LeverageScore, ...],
            "top_bottleneck": LeverageScore,
        }
    """
    if historical_best is None:
        historical_best = {}
    if recent_trend_data is None:
        recent_trend_data = []

    scores: list[dict[str, Any]] = []

    for channel, metrics in channel_funnel_data.items():
        for stage in _FUNNEL_STAGES:
            actual_rate = _safe_float(metrics.get(stage, 0.0))
            target_rate = _safe_float(targets.get(stage, actual_rate))

            gap = target_rate - actual_rate

            # 计算增量收入影响
            revenue_impact = _compute_revenue_impact(stage, metrics, target_rate)

            # 计算可行性：优先查渠道级历史最佳，再查全局
            hist_key_channel = f"{channel}.{stage}"
            hist_key_global = stage
            if hist_key_channel in historical_best:
                hist_best_val = _safe_float(historical_best[hist_key_channel])
            elif hist_key_global in historical_best:
                hist_best_val = _safe_float(historical_best[hist_key_global])
            else:
                # 无历史数据时，以目标值作为历史最佳（可行性中等）
                hist_best_val = target_rate

            feasibility = _compute_feasibility(actual_rate, target_rate, hist_best_val)

            # 计算趋势紧迫度
            trend_values: list[float] = []
            for period_data in recent_trend_data:
                ch_data = period_data.get(channel, {})
                if isinstance(ch_data, dict):
                    v = ch_data.get(stage)
                    if v is not None:
                        trend_values.append(_safe_float(v))
            urgency = _compute_trend_urgency(trend_values)

            # 综合杠杆分
            leverage_score = revenue_impact * feasibility * urgency

            scores.append(
                {
                    "channel": channel,
                    "stage": stage,
                    "actual_rate": round(actual_rate, 6),
                    "target_rate": round(target_rate, 6),
                    "gap": round(gap, 6),
                    "revenue_impact": round(revenue_impact, 2),
                    "feasibility": round(feasibility, 4),
                    "urgency": urgency,
                    "leverage_score": round(leverage_score, 2),
                    "is_bottleneck": False,  # 稍后标记
                    "potential_label": "",   # 稍后标记
                }
            )

    if not scores:
        empty_score: dict[str, Any] = {
            "channel": "N/A",
            "stage": "appt_rate",
            "actual_rate": 0.0,
            "target_rate": 0.0,
            "gap": 0.0,
            "revenue_impact": 0.0,
            "feasibility": 0.0,
            "urgency": 1.0,
            "leverage_score": 0.0,
            "is_bottleneck": True,
            "potential_label": "已饱和⚪",
        }
        return {"scores": [empty_score], "top_bottleneck": empty_score}

    # 计算均值，用于潜力判定
    all_leverage = [s["leverage_score"] for s in scores]
    mean_leverage = sum(all_leverage) / len(all_leverage) if all_leverage else 0.0

    # 标记潜力等级
    for score in scores:
        ls = score["leverage_score"]
        f = score["feasibility"]
        u = score["urgency"]
        gap = score["gap"]

        if gap <= 0:
            # 已达标
            score["potential_label"] = "已饱和⚪"
        elif ls > mean_leverage and f >= 0.7 and u < 1.5:
            score["potential_label"] = "高潜力🟢"
        elif ls > mean_leverage:
            score["potential_label"] = "待改善🟡"
        else:
            score["potential_label"] = "已饱和⚪"

    # 找每个渠道的最大瓶颈
    channel_max: dict[str, float] = {}
    for score in scores:
        ch = score["channel"]
        if score["leverage_score"] > channel_max.get(ch, -1):
            channel_max[ch] = score["leverage_score"]

    for score in scores:
        ch = score["channel"]
        if abs(score["leverage_score"] - channel_max[ch]) < 1e-9:
            score["is_bottleneck"] = True

    # 全局最大瓶颈（leverage_score 最高单条）
    top_bottleneck = max(scores, key=lambda s: s["leverage_score"])

    logger.info(
        f"杠杆矩阵计算完成：{len(scores)} 条评分，"
        f"最大瓶颈 {top_bottleneck['channel']}.{top_bottleneck['stage']} "
        f"= {top_bottleneck['leverage_score']:.2f}"
    )

    return {
        "scores": scores,
        "top_bottleneck": top_bottleneck,
    }


def query_historical_best(
    snapshot_service: Any,
    n_months: int = 6,
) -> dict[str, float]:
    """从 DailySnapshotService 查询最近 N 个月的历史最佳转化率。

    Returns:
        {"{stage}": best_value, "{channel}.{stage}": best_value, ...}
    """
    from datetime import date

    historical_best: dict[str, float] = {}

    try:
        # 查询最近 N 期月度归档
        today = date.today()
        queried_months: list[str] = []
        for i in range(n_months):
            y = today.year
            m = today.month - i
            while m <= 0:
                m += 12
                y -= 1
            queried_months.append(f"{y:04d}{m:02d}")

        for month_key in queried_months:
            rows = snapshot_service.query_monthly_archive(month_key)
            for row in rows:
                channel = row.get("channel", "total")
                for stage in _FUNNEL_STAGES:
                    field = f"final_{stage}"
                    val = row.get(field)
                    if val is None:
                        continue
                    v = _safe_float(val)
                    if v <= 0:
                        continue

                    # 全局最佳
                    if v > historical_best.get(stage, 0.0):
                        historical_best[stage] = v

                    # 渠道级最佳
                    if channel != "total":
                        key = f"{channel}.{stage}"
                        if v > historical_best.get(key, 0.0):
                            historical_best[key] = v

    except Exception as e:
        logger.warning(f"查询历史最佳失败，使用空字典：{e}")

    return historical_best


def query_recent_trend(
    snapshot_service: Any,
    n_months: int = 3,
) -> list[dict[str, Any]]:
    """从 DailySnapshotService 查询最近 N 期月度归档，构造趋势数据。

    Returns:
        [{渠道名: {stage: value}}, ...]，按时间升序
    """
    from datetime import date

    trend_list: list[dict[str, Any]] = []

    try:
        today = date.today()
        month_keys: list[str] = []
        for i in range(n_months, 0, -1):
            y = today.year
            m = today.month - i
            while m <= 0:
                m += 12
                y -= 1
            month_keys.append(f"{y:04d}{m:02d}")

        for month_key in month_keys:
            rows = snapshot_service.query_monthly_archive(month_key)
            period_data: dict[str, Any] = {}
            for row in rows:
                channel = row.get("channel", "total")
                ch_metrics: dict[str, float] = {}
                for stage in _FUNNEL_STAGES:
                    field = f"final_{stage}"
                    val = row.get(field)
                    if val is not None:
                        ch_metrics[stage] = _safe_float(val)
                if ch_metrics:
                    period_data[channel] = ch_metrics
            if period_data:
                trend_list.append(period_data)

    except Exception as e:
        logger.warning(f"查询趋势数据失败，返回空列表：{e}")

    return trend_list
