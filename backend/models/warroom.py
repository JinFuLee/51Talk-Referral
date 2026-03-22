"""高潜作战室 Pydantic 模型"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class WarroomStudent(BaseModel):
    """高潜作战室学员条目（D5 × D3 联合）"""

    stdt_id: str | None = None
    region: str | None = None
    business_line: str | None = None
    enclosure: str | None = None
    total_new: float | None = None
    attendance: float | None = None
    payments: float | None = None
    # 责任人
    cc_name: str | None = None
    cc_group: str | None = None
    ss_name: str | None = None
    ss_group: str | None = None
    lp_name: str | None = None
    lp_group: str | None = None
    # 时间
    stat_date: str | None = None
    last_contact_date: str | None = None
    days_remaining: int | None = None
    # 联络指标（来自 D3）
    checkin_7d: float | None = None
    contact_count_7d: float | None = None
    # 紧急度
    urgency_level: str | None = None  # "red" / "yellow" / "green"


class TimelineEvent(BaseModel):
    """高潜学员时间线单日事件（来自 D3）"""

    date: str | None = None
    enclosure: str | None = None
    registrations: float | None = None
    invitations: float | None = None
    attendance: float | None = None
    payments: float | None = None
    revenue_usd: float | None = None
    checkin: float | None = None
    cc_contact: float | None = None
    ss_contact: float | None = None
    lp_contact: float | None = None


class StudentTimeline(BaseModel):
    """高潜学员完整时间线（D3 + D4 + D5 联合）"""

    stdt_id: str
    in_high_potential: bool = False
    hp_info: dict[str, Any] | None = None   # D5 高潜摘要
    d4_info: dict[str, Any] | None = None   # D4 学员基本信息
    timeline: list[TimelineEvent] = []
    timeline_length: int = 0
