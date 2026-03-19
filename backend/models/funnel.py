"""漏斗分析数据模型"""

from __future__ import annotations

from pydantic import BaseModel


class FunnelStage(BaseModel):
    name: str
    target: float | None = None
    actual: float | None = None
    gap: float | None = None
    achievement_rate: float | None = None
    conversion_rate: float | None = None


class FunnelResult(BaseModel):
    date: str | None = None
    stages: list[FunnelStage] = []
    target_revenue: float | None = None
    actual_revenue: float | None = None
    revenue_gap: float | None = None
    revenue_achievement: float | None = None


class ScenarioResult(BaseModel):
    """漏斗场景推演结果 — 假设某环节提升到目标值后的影响"""

    scenario_stage: str
    scenario_rate_current: float | None = None
    scenario_rate_target: float | None = None
    stages: list[FunnelStage] = []
    incremental_payments: float | None = None
    incremental_revenue: float | None = None
