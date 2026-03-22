"""围场健康度 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel


class EnclosureHealthScore(BaseModel):
    """围场加权健康评分（与前端 cross-analysis.ts EnclosureHealthScore 对齐）"""

    segment: str
    # 前端期望 participation（原 participation_rate）
    participation: float | None = None  # 转介绍参与率（权重 0.3）
    # 前端期望 conversion（原 conversion_rate）
    conversion: float | None = None     # 注册转化率（权重 0.4）
    # 前端期望 checkin（原 checkin_rate）
    checkin: float | None = None        # 当月有效打卡率（权重 0.3）
    health_score: float | None = None
    # 前端期望 level：>=80→green, 60-80→yellow, <60→red
    level: str | None = None
    # cc_count 后端内部使用，前端不用但无害
    cc_count: int | None = None


class EnclosureBenchmark(BaseModel):
    """围场4指标对标"""

    segment: str
    participation_rate: float | None = None
    conversion_rate: float | None = None
    checkin_rate: float | None = None
    contact_rate: float | None = None
    carry_ratio: float | None = None


class CCVarianceData(BaseModel):
    """同围场内CC带新系数方差分析"""

    segment: str
    variance: float | None = None
    std_dev: float | None = None
    min_value: float | None = None
    max_value: float | None = None
    median_value: float | None = None
    cc_count: int | None = None
