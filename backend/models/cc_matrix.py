"""CC 矩阵 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel


class HeatmapCell(BaseModel):
    """CC×围场 热力矩阵单元"""

    cc_name: str
    segment: str
    value: float | None = None


class CCRadarData(BaseModel):
    """单个CC的5维能力雷达"""

    cc_name: str
    participation_rate: float | None = None   # 转介绍参与率
    conversion_rate: float | None = None       # 注册转化率
    checkin_rate: float | None = None          # 当月有效打卡率
    contact_rate: float | None = None          # CC触达率
    carry_ratio: float | None = None           # 带货比


class DrilldownStudent(BaseModel):
    """CC下钻学员列表项"""

    stdt_id: str | None = None
    enclosure: str | None = None
    lifecycle: str | None = None
    cc_name: str | None = None
    region: str | None = None
    paid_amount_usd: float | None = None
    referral_paid_count: float | None = None
    referral_revenue_usd: float | None = None
