"""学员数据模型"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class StudentBrief(BaseModel):
    id: str | None = None
    name: str | None = None
    enclosure: str | None = None
    lifecycle: str | None = None
    cc_name: str | None = None
    cc_group: str | None = None
    registrations: float | None = None
    appointments: float | None = None
    attendance: float | None = None
    payments: float | None = None


class StudentDetail(StudentBrief):
    """扩展 StudentBrief，附加 D4 完整字段"""

    region: str | None = None
    business_line: str | None = None
    country: str | None = None
    teacher_level: str | None = None
    first_paid_date: str | None = None
    checkin_last_month: float | None = None
    checkin_this_month: float | None = None
    referral_reward_status: str | None = None
    ss_name: str | None = None
    ss_group: str | None = None
    lp_name: str | None = None
    lp_group: str | None = None
    total_revenue_usd: float | None = None
    # 额外字段（dict 存储剩余59列原始值）
    extra: dict[str, Any] | None = None


class HighPotentialStudent(BaseModel):
    id: str | None = None
    enclosure: str | None = None
    total_new: float | None = None
    attendance: float | None = None
    payments: float | None = None
    cc_name: str | None = None
    cc_group: str | None = None
    ss_name: str | None = None
    ss_group: str | None = None
    lp_name: str | None = None
    lp_group: str | None = None
