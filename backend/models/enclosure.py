"""围场数据模型"""

from __future__ import annotations

from pydantic import BaseModel


class EnclosureCCMetrics(BaseModel):
    enclosure: str  # 0~30 / 31~60 / 61~90 / 91~180 / 181+
    cc_group: str | None = None
    cc_name: str | None = None
    students: float | None = None
    participation_rate: float | None = None
    new_coefficient: float | None = None
    cargo_ratio: float | None = None
    checkin_rate: float | None = None
    cc_reach_rate: float | None = None
    ss_reach_rate: float | None = None
    lp_reach_rate: float | None = None
    registrations: float | None = None
    payments: float | None = None
    revenue_usd: float | None = None
