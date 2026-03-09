"""
backend/models/adapter_types.py
Adapter 层返回结构的类型定义。

使用 TypedDict 而非 Pydantic model，原因：
1. adapter 函数返回 dict，TypedDict 添加类型注解零运行时开销
2. 嵌套结构含大量 Optional 字段，TypedDict 可精确表达
3. 不破坏现有 API contract（调用方直接消费 dict）
4. 若需序列化验证，可通过 AdapterResponse Pydantic model 包装

共 13 个 adapter 函数对应 TypedDict：
  SummaryMetricDict, SummaryAdaptResult, FunnelChannelDict, FunnelAdaptResult,
  ChannelStatDict, ChannelComparisonResult, PredictionResult, ROIResult,
  ProductivityResult, OutreachResult, TrialResult, OrdersResult,
  TrendResult, RankingItemDict, AttributionResult,
  PackageMixResult, TeamPackageMixResult, ChannelRevenueResult
"""

from __future__ import annotations

from typing import Any

from typing_extensions import TypedDict

# ─────────────────────────────────────────────────────────────────────────────
# Summary adapt
# ─────────────────────────────────────────────────────────────────────────────


class SummaryMetricDict(TypedDict, total=False):
    """_adapt_summary 内各 KPI 子结构"""

    actual: float
    target: float
    progress: float
    status: str
    daily_avg: float | None
    remaining_daily_avg: float | None
    efficiency_lift_pct: float | None
    absolute_gap: float | None
    pace_daily_needed: float | None
    remaining_workdays: int | None
    # revenue 独有
    thb: float | None
    # checkin 独有
    impact: Any | None


class SummaryAdaptResult(TypedDict, total=False):
    """_adapt_summary() 返回值"""

    registrations: SummaryMetricDict
    payments: SummaryMetricDict
    revenue: SummaryMetricDict
    appointments: SummaryMetricDict
    attendances: SummaryMetricDict
    checkin: SummaryMetricDict


# ─────────────────────────────────────────────────────────────────────────────
# Funnel adapt
# ─────────────────────────────────────────────────────────────────────────────


class FunnelChannelDict(TypedDict, total=False):
    """_adapt_funnel → _to_channel() 单渠道结构"""

    valid_students: int
    contact_rate: float
    participation_rate: float
    checkin_rate: float
    new_coefficient: float
    referral_ratio: float
    registrations: int
    register: int
    reserve: int
    attend: int
    payments: int
    paid: int
    conversion_rate: float
    rates: dict[str, float]


class FunnelAdaptResult(TypedDict, total=False):
    """_adapt_funnel() 返回值"""

    total: FunnelChannelDict
    narrow: FunnelChannelDict
    cc_narrow: FunnelChannelDict
    ss_narrow: FunnelChannelDict
    lp_narrow: FunnelChannelDict
    wide: FunnelChannelDict


# ─────────────────────────────────────────────────────────────────────────────
# Channel Comparison adapt
# ─────────────────────────────────────────────────────────────────────────────


class ChannelStatDict(TypedDict, total=False):
    """_adapt_channel_comparison → channels list item"""

    channel: str
    label: str
    registrations: int
    payments: int
    conversion_rate: float
    target: Any | None
    progress: float | None
    gap: float | None
    efficiency_index: float | None


class ChannelComparisonResult(TypedDict):
    """_adapt_channel_comparison() 返回值"""

    channels: list[ChannelStatDict]


# ─────────────────────────────────────────────────────────────────────────────
# Prediction adapt
# ─────────────────────────────────────────────────────────────────────────────


class PredictionResult(TypedDict, total=False):
    """_adapt_prediction() 返回值"""

    eom_registrations: float | None
    eom_payments: float | None
    eom_revenue: float | None
    model_used: str | None
    confidence: float | None
    daily_series: Any | None
    _raw: dict[str, Any]


# ─────────────────────────────────────────────────────────────────────────────
# ROI adapt
# ─────────────────────────────────────────────────────────────────────────────


class ROIResult(TypedDict, total=False):
    """_adapt_roi() 返回值"""

    total_cost: float
    total_revenue: float
    roi_ratio: float
    currency: str
    cost_breakdown: Any | None
    cost_list: Any | None
    by_product: Any | None
    is_estimated: bool
    data_source: str
    by_month: Any | None
    optimal_months: Any | None
    decay_summary: Any | None


# ─────────────────────────────────────────────────────────────────────────────
# Productivity adapt
# ─────────────────────────────────────────────────────────────────────────────


class ProductivityRoleDict(TypedDict, total=False):
    """单角色生产力指标"""

    per_capita: float
    per_capita_usd: float
    total_revenue: float
    total_revenue_usd: float


class ProductivityResult(TypedDict, total=False):
    """_adapt_productivity() 返回值"""

    roles: dict[str, ProductivityRoleDict]


# ─────────────────────────────────────────────────────────────────────────────
# Outreach adapt
# ─────────────────────────────────────────────────────────────────────────────


class OutreachDailyTrendItem(TypedDict, total=False):
    date: str
    calls: int
    connects: int
    effective_calls: int
    contacted: int


class OutreachCCBreakdownItem(TypedDict, total=False):
    cc_name: str
    team: str | None
    total_calls: int
    total_connects: int
    total_effective: int
    contact_rate: float
    effective_rate: float
    avg_duration_s: float | None
    avg_duration_min: float | None
    name: str
    calls: int
    achieved: bool


class OutreachResult(TypedDict, total=False):
    """_adapt_outreach() 返回值"""

    total_calls: int
    total_connects: int
    total_effective: int
    contact_rate: float
    effective_rate: float
    avg_duration_min: float | None
    daily_trend: list[OutreachDailyTrendItem]
    cc_breakdown: list[OutreachCCBreakdownItem]
    _raw: dict[str, Any]


# ─────────────────────────────────────────────────────────────────────────────
# Trial adapt
# ─────────────────────────────────────────────────────────────────────────────


class TrialStageDict(TypedDict, total=False):
    stage: str
    count: int
    rate: float | None


class TrialCCSummaryDict(TypedDict, total=False):
    call_rate: float | None
    connect_rate: float | None
    attendance_rate: float | None
    total_records: int
    total_called: int
    total_connected: int


class TrialResult(TypedDict, total=False):
    """_adapt_trial() 返回值"""

    pre_call_rate: float | None
    post_call_rate: float | None
    attendance_rate: float | None
    pre_class_summary: TrialCCSummaryDict
    post_class_summary: dict[str, Any]
    by_cc: list[dict[str, Any]]
    by_stage: list[TrialStageDict]
    pre_class: dict[str, Any]
    post_class: dict[str, Any]
    f11_summary: dict[str, Any]
    correlation: dict[str, Any]


# ─────────────────────────────────────────────────────────────────────────────
# Orders adapt
# ─────────────────────────────────────────────────────────────────────────────


class OrdersByTypeItem(TypedDict, total=False):
    type: str
    count: int
    revenue_usd: float


class OrdersDailySeriesItem(TypedDict, total=False):
    date: str
    orders: int
    revenue: float


class OrdersChannelBreakdownItem(TypedDict, total=False):
    channel: str
    orders: int
    revenue_usd: float
    revenue_thb: float
    new_orders: int
    renewal_orders: int


class OrdersItemDict(TypedDict, total=False):
    date: str | None
    cc_name: str | None
    student_name: str | None
    channel: str | None
    package: str | None
    amount_usd: float | None
    amount_thb: float | None
    amount: float | None
    order_tag: str | None
    team: str | None


class OrdersResult(TypedDict, total=False):
    """_adapt_orders() 返回值"""

    total_orders: int
    new_orders: int
    renewal_orders: int
    total_revenue: float
    avg_order_value: float
    by_type: list[OrdersByTypeItem]
    package_distribution: list[OrdersByTypeItem]
    daily_series: list[OrdersDailySeriesItem]
    channel_breakdown: list[OrdersChannelBreakdownItem]
    items: list[OrdersItemDict]


# ─────────────────────────────────────────────────────────────────────────────
# Trend adapt
# ─────────────────────────────────────────────────────────────────────────────


class TrendPointDict(TypedDict, total=False):
    date: str
    revenue: float
    payments: int
    registrations: int


class TrendResult(TypedDict, total=False):
    """_adapt_trend() 返回值"""

    series: list[TrendPointDict]
    daily_series: list[TrendPointDict]
    compare_type: str
    direction: str | None
    compare_data: Any | None
    peak: Any | None
    valley: Any | None
    mom: dict[str, Any]
    yoy: dict[str, Any]
    wow: dict[str, Any]
    yoy_by_channel: Any | None


# ─────────────────────────────────────────────────────────────────────────────
# Ranking adapt
# ─────────────────────────────────────────────────────────────────────────────


class RankingItemDict(TypedDict, total=False):
    """_adapt_ranking_item() 返回值（兼容新旧格式）"""

    composite_score: float
    process_score: float
    result_score: float
    efficiency_score: float
    registrations: int
    payments: int
    revenue_usd: float
    checkin_rate: float
    conversion_rate: float
    detail: dict[str, Any] | None


# ─────────────────────────────────────────────────────────────────────────────
# Attribution adapt
# ─────────────────────────────────────────────────────────────────────────────


class AttributionFactorDict(TypedDict, total=False):
    factor: str
    label: str
    contribution: float
    registrations: int
    payments: int
    conversion_rate: float
    paid_contribution: float
    reg_contribution: float


class FunnelAttributionStageDict(TypedDict, total=False):
    stage: str
    label: str
    count: int
    from_count: int
    conversion_rate: float
    loss_count: int
    loss_rate: float
    cumulative_rate: float


class ApertureAttributionDict(TypedDict, total=False):
    aperture: str
    label: str
    registrations: int
    payments: int
    conversion_rate: float
    paid_contribution: float
    reg_contribution: float


class AttributionResult(TypedDict):
    """_adapt_attribution() 返回值"""

    factors: list[AttributionFactorDict]
    channel_attribution: list[AttributionFactorDict]
    funnel_attribution: list[FunnelAttributionStageDict]
    aperture_attribution: list[ApertureAttributionDict]


# ─────────────────────────────────────────────────────────────────────────────
# Package Mix adapt
# ─────────────────────────────────────────────────────────────────────────────


class PackageMixItemDict(TypedDict, total=False):
    product_type: str
    count: int
    revenue_usd: float
    percentage: float


class PackageMixResult(TypedDict):
    """_adapt_package_mix() 返回值"""

    items: list[PackageMixItemDict]


class TeamPackageMixResult(TypedDict):
    """_adapt_team_package_mix() 返回值"""

    teams: list[dict[str, Any]]


# ─────────────────────────────────────────────────────────────────────────────
# Channel Revenue adapt
# ─────────────────────────────────────────────────────────────────────────────


class ChannelRevenueItemDict(TypedDict, total=False):
    channel: str
    revenue_usd: float
    revenue_thb: float
    percentage: float


class ChannelRevenueResult(TypedDict):
    """_adapt_channel_revenue() 返回值"""

    channels: list[ChannelRevenueItemDict]
    total_usd: float
