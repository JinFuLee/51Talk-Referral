"""日报监控 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel


class ContactSegmentStat(BaseModel):
    """单个围场段的触达统计（与前端 SegmentContactItem 对齐）"""

    segment: str
    cc_rate: float | None = None
    ss_rate: float | None = None
    lp_rate: float | None = None
    # 前端期望 students（原 student_count）
    students: int | None = None
    # 保留原字段别名供内部兼容
    student_count: int | None = None


class FunnelStat(BaseModel):
    """带新漏斗汇总（与前端 FunnelStats 对齐）"""

    registrations: float | None = None
    invitations: float | None = None
    attendance: float | None = None
    # 前端期望 payments（原 paid_count）
    payments: float | None = None
    revenue_usd: float | None = None
    # 保留原字段别名供内部兼容
    paid_count: float | None = None


class DailyContactStats(BaseModel):
    """D3 日报触达率汇总（与前端 DailyMonitorStats 对齐）"""

    # 前端期望 total_students
    total_students: int | None = None
    # 前端期望 cc_contact_rate（原 overall_cc_rate）
    cc_contact_rate: float | None = None
    # 前端期望 ss_contact_rate（原 overall_ss_rate）
    ss_contact_rate: float | None = None
    # 前端期望 lp_contact_rate（原 overall_lp_rate）
    lp_contact_rate: float | None = None
    # 前端期望 by_segment（原 segment_breakdown）
    by_segment: list[ContactSegmentStat] = []
    funnel: FunnelStat = FunnelStat()
    # 前端期望 checkin_rate
    checkin_rate: float | None = None


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
