"""
Unit tests for core.analyzers.ops_analyzer.OpsAnalyzer
~26 test cases covering: analyze_outreach, analyze_trial_followup
"""

from datetime import datetime

import pytest

from backend.core.analyzers.context import AnalyzerContext
from backend.core.analyzers.ops_analyzer import OpsAnalyzer

# ── Fixtures ──────────────────────────────────────────────────────────────────

REPORT_DATE = datetime(2026, 2, 15)
BASE_TARGETS = {"时间进度": 0.5, "客单价": 850}


def _make_ctx(data: dict) -> AnalyzerContext:
    return AnalyzerContext(data=data, targets=BASE_TARGETS, report_date=REPORT_DATE)


def _outreach_data(cc_names: list[str], calls_per_cc: int = 60, days: int = 2) -> dict:
    """构造完整 F5/F6/F7 外呼数据。"""
    by_cc = {
        name: {
            "total_calls": calls_per_cc,
            "total_connects": calls_per_cc // 2,
            "total_effective": calls_per_cc // 4,
            "dates": [f"2026-02-{d:02d}" for d in range(1, days + 1)],
        }
        for name in cc_names
    }
    return {
        "ops": {
            "daily_outreach": {
                "by_date": [
                    {"date": f"2026-02-{d:02d}", "calls": calls_per_cc * len(cc_names)}
                    for d in range(1, days + 1)
                ],
                "by_cc": by_cc,
            },
            "trial_followup": {
                "summary": {"call_rate_24h": 0.80, "connect_rate_24h": 0.55},
                "by_cc": {name: {"called_24h": 5} for name in cc_names},
            },
            "paid_user_followup": {
                "summary": {"total_students": 200, "total_monthly_called": 160},
                "by_cc": {name: {"monthly_called": 10} for name in cc_names},
            },
        }
    }


def _trial_followup_data(
    pre_call_rate: float = 0.70, overall_att: float = 0.80, called_att: float = 0.90
) -> dict:
    """构造 F10/F11 体验课跟进数据。"""
    return {
        "ops": {
            "trial_class_followup": {
                "by_cc": [{"cc_name": "Alice", "pre_called": 5, "post_called": 4}],
                "by_channel": {
                    "转介绍": {
                        "pre_call_rate": pre_call_rate,
                        "pre_connect_rate": 0.60,
                        "post_call_rate": 0.65,
                        "post_connect_rate": 0.50,
                        "attendance_rate": overall_att,
                    }
                },
            },
            "pre_class_outreach": {
                "summary": {
                    "overall_call_rate": pre_call_rate,
                    "overall_connect_rate": 0.60,
                    "overall_attendance_rate": overall_att,
                },
                "by_lead_type": {"转介绍": {"attendance_rate": called_att}},
                "by_cc": {},
                "records": [],
            },
        }
    }


# ── analyze_outreach ──────────────────────────────────────────────────────────


class TestAnalyzeOutreachNormal:
    def test_returns_dict(self):
        ctx = _make_ctx(_outreach_data(["Alice", "Bob"]))
        result = OpsAnalyzer(ctx).analyze_outreach()
        assert isinstance(result, dict)

    def test_required_top_level_keys(self):
        ctx = _make_ctx(_outreach_data(["Alice"]))
        result = OpsAnalyzer(ctx).analyze_outreach()
        for key in ("daily_outreach", "trial_followup", "paid_followup", "compliance"):
            assert key in result, f"缺失键: {key}"

    def test_paid_followup_coverage_between_0_and_1(self):
        ctx = _make_ctx(_outreach_data(["Alice", "Bob"]))
        result = OpsAnalyzer(ctx).analyze_outreach()
        cov = result["paid_followup"]["coverage"]
        if cov is not None:
            assert 0.0 <= cov <= 1.0

    def test_paid_followup_totals_propagated(self):
        ctx = _make_ctx(_outreach_data(["Alice"]))
        result = OpsAnalyzer(ctx).analyze_outreach()
        pf = result["paid_followup"]
        assert pf["total_students"] == 200
        assert pf["total_called"] == 160

    def test_trial_followup_rates_present(self):
        ctx = _make_ctx(_outreach_data(["Alice"]))
        result = OpsAnalyzer(ctx).analyze_outreach()
        tf = result["trial_followup"]
        assert tf["call_rate_24h"] == pytest.approx(0.80)
        assert tf["connect_rate_24h"] == pytest.approx(0.55)

    def test_compliance_target_is_30(self):
        ctx = _make_ctx(_outreach_data(["Alice"]))
        result = OpsAnalyzer(ctx).analyze_outreach()
        assert result["compliance"]["target_calls_per_day"] == 30

    def test_compliance_rate_within_0_1(self):
        ctx = _make_ctx(_outreach_data(["Alice", "Bob"], calls_per_cc=60, days=2))
        result = OpsAnalyzer(ctx).analyze_outreach()
        rate = result["compliance"]["compliance_rate"]
        if rate is not None:
            assert 0.0 <= rate <= 1.0

    def test_avg_actual_calls_computed(self):
        ctx = _make_ctx(_outreach_data(["Alice"], calls_per_cc=60, days=2))
        result = OpsAnalyzer(ctx).analyze_outreach()
        avg = result["compliance"]["avg_actual"]
        # 60 calls / 2 days = 30.0
        assert avg == pytest.approx(30.0, abs=0.1)

    def test_compliance_rate_caps_at_1_when_calls_exceed_target(self):
        """外呼量超过目标 30 次/天时 compliance_rate 不超过 1.0。"""
        ctx = _make_ctx(_outreach_data(["Alice"], calls_per_cc=200, days=2))
        result = OpsAnalyzer(ctx).analyze_outreach()
        rate = result["compliance"]["compliance_rate"]
        if rate is not None:
            assert rate <= 1.0

    def test_daily_outreach_by_date_is_list(self):
        ctx = _make_ctx(_outreach_data(["Alice"]))
        result = OpsAnalyzer(ctx).analyze_outreach()
        assert isinstance(result["daily_outreach"]["by_date"], list)


class TestAnalyzeOutreachEdgeCases:
    def test_empty_data_returns_dict(self):
        ctx = _make_ctx({})
        result = OpsAnalyzer(ctx).analyze_outreach()
        assert isinstance(result, dict)

    def test_empty_data_compliance_rate_is_none(self):
        ctx = _make_ctx({})
        result = OpsAnalyzer(ctx).analyze_outreach()
        assert result["compliance"]["compliance_rate"] is None

    def test_empty_data_avg_calls_is_none(self):
        ctx = _make_ctx({})
        result = OpsAnalyzer(ctx).analyze_outreach()
        assert result["compliance"]["avg_actual"] is None

    def test_zero_paid_students_coverage_is_none(self):
        data = {
            "ops": {
                "daily_outreach": {"by_date": [], "by_cc": {}},
                "trial_followup": {"summary": {}, "by_cc": {}},
                "paid_user_followup": {
                    "summary": {"total_students": 0, "total_monthly_called": 0},
                    "by_cc": {},
                },
            }
        }
        ctx = _make_ctx(data)
        result = OpsAnalyzer(ctx).analyze_outreach()
        # _safe_pct(0, 0) returns None
        assert result["paid_followup"]["coverage"] is None


# ── analyze_trial_followup ────────────────────────────────────────────────────


class TestAnalyzeTrialFollowupNormal:
    def test_returns_dict(self):
        ctx = _make_ctx(_trial_followup_data())
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert isinstance(result, dict)

    def test_required_top_level_keys(self):
        ctx = _make_ctx(_trial_followup_data())
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        for key in ("pre_class", "post_class", "by_cc", "correlation", "f11_summary"):
            assert key in result, f"缺失键: {key}"

    def test_pre_class_call_rate_correct(self):
        ctx = _make_ctx(_trial_followup_data(pre_call_rate=0.70))
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert result["pre_class"]["call_rate"] == pytest.approx(0.70)

    def test_post_class_keys_present(self):
        ctx = _make_ctx(_trial_followup_data())
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert "call_rate" in result["post_class"]
        assert "connect_rate" in result["post_class"]

    def test_correlation_pre_call_attendance_populated(self):
        ctx = _make_ctx(_trial_followup_data(called_att=0.90))
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert result["correlation"]["pre_call_attendance"] == pytest.approx(0.90)

    def test_no_call_attendance_derived_correctly(self):
        """反推：not_called_att = (overall - called * call_rate) / (1 - call_rate)"""
        pre_call_rate = 0.70
        overall_att = 0.80
        called_att = 0.90
        ctx = _make_ctx(_trial_followup_data(pre_call_rate, overall_att, called_att))
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        derived = result["correlation"]["no_call_attendance"]
        if derived is not None:
            expected = (overall_att - called_att * pre_call_rate) / (
                1.0 - pre_call_rate
            )
            assert derived == pytest.approx(expected, abs=1e-4)

    def test_no_call_attendance_clamped_to_0_1(self):
        """反推结果应被 clamp 到 [0, 1]。"""
        ctx = _make_ctx(
            _trial_followup_data(pre_call_rate=0.70, overall_att=0.80, called_att=0.90)
        )
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        val = result["correlation"]["no_call_attendance"]
        if val is not None:
            assert 0.0 <= val <= 1.0

    def test_zero_division_when_call_rate_equals_one(self):
        """call_rate = 1.0 时不应抛出 ZeroDivisionError。"""
        ctx = _make_ctx(_trial_followup_data(pre_call_rate=1.0))
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        # no_call_attendance 无法计算（1 - call_rate = 0），应返回 None
        assert result["correlation"]["no_call_attendance"] is None

    def test_by_cc_is_list(self):
        ctx = _make_ctx(_trial_followup_data())
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert isinstance(result["by_cc"], list)

    def test_f11_fields_present(self):
        ctx = _make_ctx(_trial_followup_data())
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert "f11_by_cc" in result
        assert "f11_by_lead_type" in result
        assert "f11_records" in result


class TestAnalyzeTrialFollowupEdgeCases:
    def test_empty_data_returns_dict(self):
        ctx = _make_ctx({})
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert isinstance(result, dict)

    def test_empty_data_pre_class_call_rate_is_none(self):
        ctx = _make_ctx({})
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert result["pre_class"]["call_rate"] is None

    def test_empty_data_correlation_is_none(self):
        ctx = _make_ctx({})
        result = OpsAnalyzer(ctx).analyze_trial_followup()
        assert result["correlation"]["pre_call_attendance"] is None
        assert result["correlation"]["no_call_attendance"] is None
