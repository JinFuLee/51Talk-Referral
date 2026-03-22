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


class DailyContact(BaseModel):
    """学员单日联络记录（与前端 cross-analysis.ts DailyContact 对齐）"""

    date: str = ""
    # 前端期望 cc_connected（原 cc_contact）
    cc_connected: bool = False
    # 前端期望 ss_connected（原 ss_contact）
    ss_connected: bool = False
    # 前端期望 lp_connected（原 lp_contact）
    lp_connected: bool = False
    # 前端期望 valid_checkin（原 checkin）
    valid_checkin: bool = False
    # 前端期望 new_reg（原 registrations）
    new_reg: float | None = None
    # 前端期望 new_attend（原 attendance）
    new_attend: float | None = None
    # 前端期望 new_paid（原 payments）
    new_paid: float | None = None


class WarroomTimelineProfile(BaseModel):
    """时间线中的学员身份摘要"""

    cc_name: str = ""
    ss_name: str = ""
    enclosure: str = ""


class WarroomTimeline(BaseModel):
    """高潜学员时间线（与前端 cross-analysis.ts WarroomTimeline 对齐）"""

    stdt_id: str
    profile: WarroomTimelineProfile = WarroomTimelineProfile()
    daily_log: list[DailyContact] = []
    is_high_potential: bool = False


class TimelineEvent(BaseModel):
    """高潜学员时间线单日事件（来自 D3，内部 → 映射到 DailyContact 输出）"""

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
    """高潜学员完整时间线（D3 + D4 + D5 联合，内部用）"""

    stdt_id: str
    in_high_potential: bool = False
    hp_info: dict[str, Any] | None = None   # D5 高潜摘要
    d4_info: dict[str, Any] | None = None   # D4 学员基本信息
    timeline: list[TimelineEvent] = []
    timeline_length: int = 0
