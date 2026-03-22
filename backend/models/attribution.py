"""达成归因 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel


class AttributionSummary(BaseModel):
    """D1 结果摘要（第一行全字段，英文 key，与前端 cross-analysis.ts 对齐）"""

    stat_date: str | None = None
    region: str | None = None
    registrations: float | None = None
    appointments: float | None = None
    # 前端期望 attendances（原 attendance）
    attendances: float | None = None
    # 前端期望 payments（原 paid_count）
    payments: float | None = None
    # 前端期望 avg_order_value（原 avg_price）
    avg_order_value: float | None = None
    # 前端期望 total_revenue（原 total_revenue_usd）
    total_revenue: float | None = None
    reg_to_appt_rate: float | None = None
    appt_to_attend_rate: float | None = None
    # 前端期望 attend_to_pay_rate（原 attend_to_paid_rate）
    attend_to_pay_rate: float | None = None
    # 前端期望 registration_conversion_rate（原 reg_to_paid_rate）
    registration_conversion_rate: float | None = None
    # 前端期望 monthly_target_units（原 target_paid_count）
    monthly_target_units: float | None = None
    # 前端期望 monthly_target_revenue（原 target_revenue_usd）
    monthly_target_revenue: float | None = None
    # 前端期望 target_order_value（原 target_avg_price_usd）
    target_order_value: float | None = None
    # 前端期望 unit_achievement_rate（原 region_count_attainment）
    unit_achievement_rate: float | None = None
    # 前端期望 revenue_achievement_rate（原 region_revenue_attainment）
    revenue_achievement_rate: float | None = None
    # 前端期望 order_value_achievement_rate（原 region_price_attainment）
    order_value_achievement_rate: float | None = None


class AttributionBreakdownItem(BaseModel):
    """归因拆解单项（与前端 cross-analysis.ts 对齐）"""

    # 前端期望 group_key（原 label）
    group_key: str = ""
    # dimension 字段后端内部使用，前端不用但无害
    dimension: str = ""
    paid_count: float | None = None
    # 前端期望 revenue（原 total_revenue_usd）
    revenue: float | None = None
    pct_of_target: float | None = None  # 占目标单量百分比


class SimulationResult(BaseModel):
    """转化率模拟预测结果（与前端 cross-analysis.ts 对齐）"""

    segment: str | None = None  # 被模拟的围场 segment
    new_rate: float | None = None  # 假设新转化率
    current_rate: float | None = None  # 当前均值转化率
    current_registrations: float | None = None
    current_paid: float | None = None
    new_paid: float | None = None  # 模拟后付费数
    # 前端期望 predicted_achievement（原 predicted_attainment_pct）
    predicted_achievement: float | None = None
    # 以下字段后端内部使用，前端不用但无害
    delta: float | None = None
    d1_paid_count: float | None = None
    d1_target_paid: float | None = None
