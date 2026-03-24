"""SS/LP 围场过程数据模型"""

from __future__ import annotations

from pydantic import BaseModel


class EnclosureSSMetrics(BaseModel):
    enclosure: str
    ss_group: str | None = None
    ss_name: str | None = None
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
    registration_rate: float | None = None


class EnclosureLPMetrics(BaseModel):
    enclosure: str
    lp_group: str | None = None
    lp_name: str | None = None
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
    registration_rate: float | None = None
