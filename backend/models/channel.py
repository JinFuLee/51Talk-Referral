"""渠道归因数据模型"""

from __future__ import annotations

from pydantic import BaseModel


class ChannelMetrics(BaseModel):
    channel: str  # CC窄 / SS窄 / LP窄 / 宽口
    registrations: float | None = None
    appointments: float | None = None
    attendance: float | None = None
    payments: float | None = None
    revenue_usd: float | None = None
    share_pct: float | None = None


class RevenueContribution(BaseModel):
    channel: str
    revenue: float | None = None
    share: float | None = None
    per_capita: float | None = None


class ThreeFactorComparison(BaseModel):
    """三因素对标：预约率/出席率/付费率 × 渠道"""

    channel: str
    expected_volume: float | None = None
    actual_volume: float | None = None
    gap: float | None = None
    appt_factor: float | None = None
    show_factor: float | None = None
    pay_factor: float | None = None
