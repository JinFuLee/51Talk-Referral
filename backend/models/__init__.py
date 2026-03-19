"""数据模型包"""

from .channel import ChannelMetrics, RevenueContribution, ThreeFactorComparison
from .common import DataSourceStatus, PaginatedResponse
from .enclosure import EnclosureCCMetrics
from .funnel import FunnelResult, FunnelStage, ScenarioResult
from .member import HighPotentialStudent, StudentBrief, StudentDetail

__all__ = [
    "DataSourceStatus",
    "PaginatedResponse",
    "FunnelStage",
    "FunnelResult",
    "ScenarioResult",
    "ChannelMetrics",
    "RevenueContribution",
    "ThreeFactorComparison",
    "EnclosureCCMetrics",
    "StudentBrief",
    "StudentDetail",
    "HighPotentialStudent",
]
