"""
Integration / unit edge case tests
~17 test cases: None inputs, missing fields, invalid params, special chars, large values
"""

from datetime import datetime

import pytest

from backend.core.analyzers.context import AnalyzerContext
from backend.core.analyzers.order_analyzer import OrderAnalyzer
from backend.core.analyzers.summary_analyzer import SummaryAnalyzer
from backend.core.analyzers.utils import _clean_for_json, _norm_cc, _safe_div, _safe_pct
from backend.core.impact_chain import ImpactChainEngine


class TestNullInputHandling:
    def test_safe_div_both_none(self):
        assert _safe_div(None, None) is None

    def test_clean_for_json_deeply_nested_nan(self):
        import math

        obj = {"a": {"b": [float("nan"), {"c": float("inf")}]}}
        result = _clean_for_json(obj)
        assert result["a"]["b"][0] is None
        assert result["a"]["b"][1]["c"] is None

    def test_norm_cc_none_input(self):
        # None should return empty string (via str(None) = "none".lower())
        result = _norm_cc(None)
        assert isinstance(result, str)

    def test_analyzer_context_empty_dict(self):
        ctx = AnalyzerContext(data={}, targets={}, report_date=datetime(2026, 2, 15))
        elapsed, remaining = ctx.calc_workdays()
        assert isinstance(elapsed, int)
        assert isinstance(remaining, int)


class TestMissingFieldHandling:
    def test_summary_analyzer_missing_leads(self, sample_targets, report_date):
        data = {"order": {}, "kpi": {}}
        ctx = AnalyzerContext(
            data=data, targets=sample_targets, report_date=report_date
        )
        sa = SummaryAnalyzer(ctx)
        result = sa.analyze_summary()
        assert result["registration"]["actual"] == 0

    def test_summary_analyzer_missing_kpi(self, sample_targets, report_date):
        data = {
            "leads": {
                "leads_achievement": {"by_channel": {"总计": {"注册": 100, "付费": 20}}}
            }
        }
        ctx = AnalyzerContext(
            data=data, targets=sample_targets, report_date=report_date
        )
        sa = SummaryAnalyzer(ctx)
        result = sa.analyze_summary()
        # Should not raise; checkin_rate may be None
        assert "checkin_24h" in result

    def test_order_analyzer_missing_attendance(self, sample_targets, report_date):
        data = {
            "order": {
                "order_detail": {"summary": {}, "by_team": {}, "by_channel": {}},
                "cc_attendance": [],
                "ss_attendance": [],
            }
        }
        ctx = AnalyzerContext(
            data=data, targets=sample_targets, report_date=report_date
        )
        oa = OrderAnalyzer(ctx)
        result = oa.analyze_productivity()
        # cc_active should be None (empty attendance list)
        assert result["cc"]["active_count"] is None

    def test_impact_chain_missing_valid_students(self, sample_targets):
        funnel = {
            "total": {"register": 0, "reserve": 0, "valid_students": 0, "rates": {}}
        }
        engine = ImpactChainEngine(summary={}, targets=sample_targets, funnel=funnel)
        result = engine.compute_all_chains()
        # No upstream_base means no chains can be computed
        assert result["total_lost_revenue_usd"] == 0.0


class TestInvalidParameterHandling:
    def test_impact_chain_what_if_boundary_zero(
        self, minimal_summary, minimal_funnel, sample_targets
    ):
        engine = ImpactChainEngine(
            summary=minimal_summary,
            targets=sample_targets,
            funnel=minimal_funnel,
        )
        result = engine.what_if("checkin_rate", 0.0)
        # new_value=0 should still return a dict
        assert isinstance(result, dict)
        assert "delta_revenue_usd" in result

    def test_impact_chain_what_if_above_target(
        self, minimal_summary, minimal_funnel, sample_targets
    ):
        engine = ImpactChainEngine(
            summary=minimal_summary,
            targets=sample_targets,
            funnel=minimal_funnel,
        )
        result = engine.what_if("checkin_rate", 0.95)
        # Above target means simulated loss=0, delta >= 0
        assert result["delta_revenue_usd"] >= 0


class TestLargeValues:
    def test_safe_div_large_numbers(self):
        result = _safe_div(1_000_000_000, 3)
        assert result == pytest.approx(333_333_333.333)

    def test_clean_for_json_large_float(self):
        result = _clean_for_json(1e308)
        assert isinstance(result, float)

    def test_summary_analyzer_huge_actual(self, sample_targets, report_date):
        data = {
            "leads": {
                "leads_achievement": {
                    "by_channel": {
                        "总计": {"注册": 999999, "预约": 0, "出席": 0, "付费": 50000}
                    }
                }
            }
        }
        ctx = AnalyzerContext(
            data=data, targets=sample_targets, report_date=report_date
        )
        sa = SummaryAnalyzer(ctx)
        result = sa.analyze_summary()
        assert result["registration"]["actual"] == 999999


class TestSpecialCharacters:
    def test_norm_cc_unicode(self):
        result = _norm_cc("แอลิซ ")
        assert result == "แอลิซ"

    def test_norm_cc_mixed(self):
        result = _norm_cc("CC-Alice123 ")
        assert result == "cc-alice123"

    def test_clean_for_json_unicode_keys(self):
        obj = {"注册": 100, "付费": 80}
        result = _clean_for_json(obj)
        assert result["注册"] == 100
        assert result["付费"] == 80
