"""CC 矩阵 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel


class HeatmapCell(BaseModel):
    """CC×围场 热力矩阵单元（与前端 CCHeatmapCell 对齐）"""

    cc_name: str
    segment: str
    value: float | None = None


class CCHeatmapResponse(BaseModel):
    """热力矩阵响应（与前端 CCHeatmapResponse 对齐）"""

    # 前端期望 rows（原 cc_names）
    rows: list[str] = []
    # 前端期望 cols（原 segments）
    cols: list[str] = []
    # 前端期望 data（原 cells）
    data: list[HeatmapCell] = []


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
