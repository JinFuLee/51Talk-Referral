"""
Unit tests for core.analyzers.context.AnalyzerContext
and core.analyzers.summary_analyzer.SummaryAnalyzer
~12 test cases
"""

from datetime import datetime

import pytest

from backend.core.analyzers.context import AnalyzerContext
from backend.core.analyzers.summary_analyzer import SummaryAnalyzer

# ── AnalyzerContext ────────────────────────────────────────────────────────────


class TestAnalyzerContext:
    def test_data_date_is_t_minus_1(self, sample_data, sample_targets, report_date):
        ctx = AnalyzerContext(
            data=sample_data, targets=sample_targets, report_date=report_date
        )
        assert ctx.data_date == report_date.replace(day=14)  # 15-1=14

    def test_default_gap_thresholds(self, sample_data, sample_targets, report_date):
        ctx = AnalyzerContext(
            data=sample_data, targets=sample_targets, report_date=report_date
        )
        assert ctx.GAP_GREEN == 0.0
        assert ctx.GAP_YELLOW == -0.05

    def test_calc_workdays_returns_tuple(
        self, sample_data, sample_targets, report_date
    ):
        ctx = AnalyzerContext(
            data=sample_data, targets=sample_targets, report_date=report_date
        )
        elapsed, remaining = ctx.calc_workdays()
        assert isinstance(elapsed, int)
        assert isinstance(remaining, int)
        assert elapsed > 0
        assert remaining >= 0

    def test_calc_workdays_elapsed_plus_remaining_leq_month(
        self, sample_data, sample_targets, report_date
    ):
        import calendar

        ctx = AnalyzerContext(
            data=sample_data, targets=sample_targets, report_date=report_date
        )
        elapsed, remaining = ctx.calc_workdays()
        # Feb 2026 has 28 days; elapsed + remaining <= 28
        assert elapsed + remaining <= 28

    def test_build_meta_keys(self, sample_data, sample_targets, report_date):
        ctx = AnalyzerContext(
            data=sample_data, targets=sample_targets, report_date=report_date
        )
        meta = ctx.build_meta()
        assert "report_date" in meta
        assert "data_date" in meta
        assert "time_progress" in meta
        assert "current_day" in meta

    def test_get_peak_valley_no_snapshot(
        self, sample_data, sample_targets, report_date
    ):
        ctx = AnalyzerContext(
            data=sample_data, targets=sample_targets, report_date=report_date
        )
        pv = ctx.get_peak_valley("注册")
        assert pv == {"peak": None, "valley": None}

    def test_get_real_asp_fallback(self, sample_data, sample_targets, report_date):
        """无 avg_order_value 时使用默认 850"""
        data = {**sample_data}
        data["order"] = {}
        ctx = AnalyzerContext(
            data=data, targets=sample_targets, report_date=report_date
        )
        asp, conv = ctx.get_real_asp_and_conversion()
        assert asp == 850.0
        assert abs(conv - 0.23) < 0.01  # approx


# ── SummaryAnalyzer ───────────────────────────────────────────────────────────


class TestSummaryAnalyzer:
    def test_analyze_summary_returns_dict(self, analyzer_context):
        sa = SummaryAnalyzer(analyzer_context)
        result = sa.analyze_summary()
        assert isinstance(result, dict)

    def test_registration_block_present(self, analyzer_context):
        sa = SummaryAnalyzer(analyzer_context)
        result = sa.analyze_summary()
        assert "registration" in result
        reg = result["registration"]
        assert "actual" in reg
        assert "target" in reg

    def test_absolute_gap_calculation(self, analyzer_context):
        sa = SummaryAnalyzer(analyzer_context)
        result = sa.analyze_summary()
        reg = result["registration"]
        # actual=350, target=500 → absolute_gap = -150
        assert reg["absolute_gap"] == pytest.approx(350 - 500)

    def test_revenue_has_usd_thb(self, analyzer_context):
        sa = SummaryAnalyzer(analyzer_context)
        result = sa.analyze_summary()
        rev = result["revenue"]
        assert "usd" in rev
        assert "thb" in rev
        assert rev["thb"] == pytest.approx(rev["usd"] * 34.0, rel=0.01)

    def test_empty_data_degrades_gracefully(self, sample_targets, report_date):
        """空数据不应抛异常，返回 actual=0"""
        ctx = AnalyzerContext(data={}, targets=sample_targets, report_date=report_date)
        sa = SummaryAnalyzer(ctx)
        result = sa.analyze_summary()
        assert result["registration"]["actual"] == 0
        assert result["payment"]["actual"] == 0
