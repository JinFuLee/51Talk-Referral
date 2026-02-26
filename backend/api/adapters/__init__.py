"""
backend/api/adapters/__init__.py
统一导出所有 adapt 函数，方便 analysis.py 一次性导入。
"""
from backend.api.adapters.outreach_adapt import (
    _adapt_orders,
    _adapt_outreach,
    _adapt_trial,
)
from backend.api.adapters.ranking_adapt import (
    _adapt_attribution,
    _adapt_channel_revenue,
    _adapt_package_mix,
    _adapt_ranking,
    _adapt_ranking_item,
    _adapt_team_package_mix,
)
from backend.api.adapters.summary_adapt import (
    _CHANNEL_LABEL_MAP,
    _adapt_channel_comparison,
    _adapt_funnel,
    _adapt_prediction,
    _adapt_productivity,
    _adapt_roi,
    _adapt_summary,
    _calc_status,
)
from backend.api.adapters.trend_adapt import (
    _adapt_trend,
)

__all__ = [
    # summary_adapt
    "_CHANNEL_LABEL_MAP",
    "_calc_status",
    "_adapt_summary",
    "_adapt_funnel",
    "_adapt_channel_comparison",
    "_adapt_prediction",
    "_adapt_roi",
    "_adapt_productivity",
    # outreach_adapt
    "_adapt_outreach",
    "_adapt_trial",
    "_adapt_orders",
    # trend_adapt
    "_adapt_trend",
    # ranking_adapt
    "_adapt_ranking_item",
    "_adapt_ranking",
    "_adapt_attribution",
    "_adapt_package_mix",
    "_adapt_team_package_mix",
    "_adapt_channel_revenue",
]
