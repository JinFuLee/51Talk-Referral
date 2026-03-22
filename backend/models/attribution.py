"""达成归因 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel


class AttributionSummary(BaseModel):
    """D1 结果摘要（第一行全字段，英文 key）"""

    stat_date: str | None = None
    region: str | None = None
    registrations: float | None = None
    appointments: float | None = None
    attendance: float | None = None
    paid_count: float | None = None
    avg_price: float | None = None
    total_revenue_usd: float | None = None
    reg_to_appt_rate: float | None = None
    appt_to_attend_rate: float | None = None
    attend_to_paid_rate: float | None = None
    reg_to_paid_rate: float | None = None
    target_paid_count: float | None = None
    target_revenue_usd: float | None = None
    target_avg_price_usd: float | None = None
    region_count_attainment: float | None = None
    region_revenue_attainment: float | None = None
    region_price_attainment: float | None = None


class AttributionBreakdownItem(BaseModel):
    """归因拆解单项"""

    dimension: str  # "enclosure" / "cc" / "channel" / "lifecycle"
    label: str  # 维度值（围场段 / CC姓名 / 渠道名 / 生命周期）
    paid_count: float | None = None
    total_revenue_usd: float | None = None
    pct_of_target: float | None = None  # 占目标单量百分比


class SimulationResult(BaseModel):
    """转化率模拟预测结果"""

    segment: str | None = None  # 被模拟的围场 segment
    new_rate: float | None = None  # 假设新转化率
    current_rate: float | None = None  # 当前均值转化率
    current_registrations: float | None = None
    current_paid: float | None = None
    new_paid: float | None = None  # 模拟后付费数
    delta: float | None = None  # 付费数变化量
    predicted_attainment_pct: float | None = None  # 预测达成率 %
    d1_paid_count: float | None = None  # D1 整体付费数
    d1_target_paid: float | None = None  # D1 目标单量
