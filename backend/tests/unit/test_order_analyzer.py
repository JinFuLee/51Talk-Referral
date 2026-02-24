"""
Unit tests for core.analyzers.order_analyzer.OrderAnalyzer
~10 test cases
"""
import pytest

from core.analyzers.context import AnalyzerContext
from core.analyzers.order_analyzer import OrderAnalyzer


class TestOrderAnalyzer:
    def test_analyze_orders_returns_dict(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa.analyze_orders()
        assert isinstance(result, dict)

    def test_analyze_orders_has_summary(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa.analyze_orders()
        assert "summary" in result
        summary = result["summary"]
        assert "total" in summary
        assert "revenue_usd" in summary

    def test_analyze_orders_summary_values(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa.analyze_orders()
        summary = result["summary"]
        assert summary["total"] == 90
        assert summary["new"] == 70
        assert summary["renewal"] == 20
        assert summary["revenue_usd"] == pytest.approx(40000.0)

    def test_analyze_orders_daily_trend_is_list(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa.analyze_orders()
        assert isinstance(result["daily_trend"], list)

    def test_analyze_productivity_returns_dict(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa.analyze_productivity()
        assert isinstance(result, dict)
        assert "cc" in result
        assert "ss" in result

    def test_analyze_productivity_cc_revenue(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa.analyze_productivity()
        # THCC-A: 15000 + THCC-B: 15000 = 30000
        assert result["cc"]["total_revenue_usd"] == pytest.approx(30000.0)

    def test_analyze_productivity_ss_revenue(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa.analyze_productivity()
        assert result["ss"]["total_revenue_usd"] == pytest.approx(5000.0)

    def test_empty_orders_degrades_gracefully(self, sample_targets, report_date):
        """空订单数据不应抛异常"""
        ctx = AnalyzerContext(data={}, targets=sample_targets, report_date=report_date)
        oa = OrderAnalyzer(ctx)
        result = oa.analyze_orders()
        assert result["summary"]["total"] == 0
        assert result["summary"]["revenue_usd"] == 0.0

    def test_normalize_team_package_empty(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa._normalize_team_package([])
        assert result == []

    def test_normalize_channel_revenue_empty(self, analyzer_context):
        oa = OrderAnalyzer(analyzer_context)
        result = oa._normalize_channel_revenue([])
        assert result == []
