from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# RunAnalysisRequest 已移至 backend/api/analysis.py（含 force/period/custom_start/custom_end 等完整字段）
# 此处不再重复定义，避免字段定义分裂导致的行为不一致。


class AnalysisResult(BaseModel):
    """
    AnalysisEngine.analyze() 返回的完整结构。
    复杂嵌套字段统一用 Dict[str, Any] / List 兜底，避免过度 schema 化。
    """
    # 元数据
    meta: Dict[str, Any] = {}

    # 整体进度看板
    summary: Dict[str, Any] = {}

    # 时间进度（浮点数，0.0~1.0）
    time_progress: float = 0.0

    # 漏斗分析
    funnel: Dict[str, Any] = {}

    # 渠道对比
    channel_comparison: Dict[str, Any] = {}

    # CC 团队排名（来自主数据表）
    team_data: List[Dict[str, Any]] = []

    # 客单价分析
    unit_price: Dict[str, Any] = {}

    # 风险预警
    risk_alerts: List[Dict[str, Any]] = []

    # ROI 估算
    roi_estimate: Dict[str, Any] = {}

    # 趋势分析
    trend: Dict[str, Any] = {}

    # 归因分析
    attribution: Dict[str, Any] = {}

    # 预测模型
    prediction: Dict[str, Any] = {}

    # 多数据源分析（有多数据源时才存在）
    cohort_analysis: Dict[str, Any] = {}
    checkin_analysis: Dict[str, Any] = {}
    leads_achievement: Dict[str, Any] = {}
    followup_analysis: Dict[str, Any] = {}
    order_analysis: Dict[str, Any] = {}
    mom_trend: Dict[str, Any] = {}
    yoy_trend: Dict[str, Any] = {}

    # 个人排名
    cc_ranking: Dict[str, Any] = {}
    ss_ranking: Dict[str, Any] = {}
    lp_ranking: Dict[str, Any] = {}

    # 已出席未付费
    attended_not_paid: Dict[str, Any] = {}

    # 异常检测
    anomalies: List[Dict[str, Any]] = []

    # LTV 分析
    ltv: Dict[str, Any] = {}

    # CC 成长曲线（历史快照）
    cc_growth: Dict[str, Any] = {}

    # AI 增强分析（可选）
    ai_root_cause: Dict[str, Any] = {}
    ai_insights: Dict[str, Any] = {}

    # 报告文件路径
    report_paths: Dict[str, str] = {}

    # 生成时间戳
    generated_at: Optional[str] = None

    class Config:
        extra = "allow"  # 允许未定义字段（引擎可能随版本新增 key）
