"""次卡到期预警数据模型"""

from __future__ import annotations

from pydantic import BaseModel


class ExpiryAlertItem(BaseModel):
    stdt_id: str | None = None
    enclosure: str | None = None
    cc_name: str | None = None
    days_to_expiry: float | None = None
    current_cards: float | None = None
    monthly_referral_registrations: float | None = None
    monthly_referral_payments: float | None = None
    urgency_tier: str | None = None  # urgent / warning / watch


class ExpiryAlertSummary(BaseModel):
    urgent_count: int = 0    # ≤7 天
    warning_count: int = 0   # 8-14 天
    watch_count: int = 0     # 15-30 天
    total: int = 0
