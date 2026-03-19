"""漏斗分析数据模型"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class FunnelStage(BaseModel):
    name: str
    target: Optional[float] = None
    actual: Optional[float] = None
    gap: Optional[float] = None
    achievement_rate: Optional[float] = None
    conversion_rate: Optional[float] = None


class FunnelResult(BaseModel):
    date: Optional[str] = None
    stages: list[FunnelStage] = []
    target_revenue: Optional[float] = None
    actual_revenue: Optional[float] = None
    revenue_gap: Optional[float] = None
    revenue_achievement: Optional[float] = None


class ScenarioResult(BaseModel):
    """漏斗场景推演结果 — 假设某环节提升到目标值后的影响"""

    scenario_stage: str
    scenario_rate_current: Optional[float] = None
    scenario_rate_target: Optional[float] = None
    stages: list[FunnelStage] = []
    incremental_payments: Optional[float] = None
    incremental_revenue: Optional[float] = None
