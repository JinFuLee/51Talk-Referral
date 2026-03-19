"""渠道归因数据模型"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class ChannelMetrics(BaseModel):
    channel: str  # CC窄 / SS窄 / LP窄 / 宽口
    registrations: Optional[float] = None
    appointments: Optional[float] = None
    attendance: Optional[float] = None
    payments: Optional[float] = None
    revenue_usd: Optional[float] = None
    share_pct: Optional[float] = None


class RevenueContribution(BaseModel):
    channel: str
    revenue: Optional[float] = None
    share: Optional[float] = None
    per_capita: Optional[float] = None


class ThreeFactorComparison(BaseModel):
    """三因素对标：预约率/出席率/付费率 × 渠道"""

    channel: str
    expected_volume: Optional[float] = None
    actual_volume: Optional[float] = None
    gap: Optional[float] = None
    appt_factor: Optional[float] = None
    show_factor: Optional[float] = None
    pay_factor: Optional[float] = None
