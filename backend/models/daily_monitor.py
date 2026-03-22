"""日报监控 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel


class ContactSegmentStat(BaseModel):
    """单个围场段的触达统计"""

    segment: str
    cc_rate: float | None = None
    ss_rate: float | None = None
    lp_rate: float | None = None
    student_count: int | None = None


class FunnelStat(BaseModel):
    """带新漏斗汇总"""

    registrations: float | None = None
    attendance: float | None = None
    paid_count: float | None = None


class DailyContactStats(BaseModel):
    """D3 日报触达率汇总"""

    overall_cc_rate: float | None = None
    overall_ss_rate: float | None = None
    overall_lp_rate: float | None = None
    segment_breakdown: list[ContactSegmentStat] = []
    funnel: FunnelStat = FunnelStat()


class CCRankingItem(BaseModel):
    """CC 触达排行榜单项"""

    cc_name: str
    role: str  # "cc" / "ss" / "lp"
    contact_count: float | None = None
    contact_rate: float | None = None
    student_count: int | None = None
    rank: int | None = None


class ContactConversionPoint(BaseModel):
    """CC 维度：接通率 × 转化率 散点"""

    cc_name: str
    contact_rate: float | None = None  # D3 CC接通 mean
    conversion_rate: float | None = None  # D2 注册转化率 mean
