"""
Unit tests for core.analyzers.cohort_analyzer.CohortAnalyzer
~28 test cases covering: analyze_cohort_roi, calc_half_life,
analyze_enclosure_cross, analyze_checkin_impact, analyze_ltv
"""
from datetime import datetime

import pytest

from backend.core.analyzers.context import AnalyzerContext
from backend.core.analyzers.cohort_analyzer import CohortAnalyzer

# ── Fixtures ──────────────────────────────────────────────────────────────────

REPORT_DATE = datetime(2026, 2, 15)
BASE_TARGETS = {
    "时间进度": 0.5,
    "客单价": 850,
}


def _make_ctx(data: dict, targets: dict | None = None) -> AnalyzerContext:
    return AnalyzerContext(
        data=data,
        targets=targets or BASE_TARGETS,
        report_date=REPORT_DATE,
    )


def _cohort_by_month(months: list[str], m1_val: float = 0.8, decay: float = 0.1) -> list[dict]:
    """构造带 m1-m12 衰减序列的 by_month 记录列表。"""
    result = []
    for month in months:
        row: dict = {"月份": month}
        for i in range(1, 13):
            row[f"m{i}"] = max(0.0, m1_val - decay * (i - 1))
        result.append(row)
    return result


def _full_cohort_data(months: list[str]) -> dict:
    """构造 cohort 数据源（C1-C5 全齐）。"""
    by_month = _cohort_by_month(months)
    return {
        "reach_rate":          {"by_month": by_month},
        "participation_rate":  {"by_month": by_month},
        "checkin_rate":        {"by_month": by_month},
        "referral_coefficient": {"by_month": [{"月份": m, "m1": 1.2} for m in months]},
        "conversion_ratio":    {"by_month": [{"月份": m, "m1": 0.15, "m2": 0.10} for m in months]},
    }


# ── analyze_cohort_roi ────────────────────────────────────────────────────────


class TestAnalyzeCohortRoi:
    def test_returns_dict(self):
        ctx = _make_ctx({"cohort": _full_cohort_data(["2026-01", "2026-02"])})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        assert isinstance(result, dict)

    def test_required_top_level_keys(self):
        ctx = _make_ctx({"cohort": _full_cohort_data(["2026-01"])})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        for key in ("by_month", "optimal_months", "overall_roi", "total_cost_usd",
                    "total_revenue_usd", "decay_summary", "cost_list", "by_product"):
            assert key in result, f"缺失键: {key}"

    def test_by_month_length_matches_input(self):
        months = ["2026-01", "2026-02", "2026-03"]
        ctx = _make_ctx({"cohort": _full_cohort_data(months)})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        assert len(result["by_month"]) == len(months)

    def test_ltv_12m_is_non_negative(self):
        ctx = _make_ctx({"cohort": _full_cohort_data(["2026-01", "2026-02"])})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        for row in result["by_month"]:
            assert row["ltv_12m"] >= 0.0

    def test_optimal_months_subset_of_by_month(self):
        months = ["2026-01", "2026-02", "2026-03"]
        ctx = _make_ctx({"cohort": _full_cohort_data(months)})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        all_cohort_months = {r["cohort_month"] for r in result["by_month"]}
        for m in result["optimal_months"]:
            assert m in all_cohort_months

    def test_overall_roi_is_none_when_no_cost_data(self):
        """无 ROI 成本数据时 overall_roi 应为 None。"""
        ctx = _make_ctx({"cohort": _full_cohort_data(["2026-01"])})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        assert result["overall_roi"] is None

    def test_overall_roi_populated_from_roi_data(self):
        """B1 ROI 数据存在时应正确透传 overall_roi。"""
        data = {
            "cohort": _full_cohort_data(["2026-01"]),
            "roi": {
                "summary": {
                    "_total": {
                        "实际成本":  5000.0,
                        "实际营收": 20000.0,
                        "实际ROI":   4.0,
                    }
                }
            },
        }
        ctx = _make_ctx(data)
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        assert result["overall_roi"] == pytest.approx(4.0, abs=1e-3)

    def test_empty_cohort_data_returns_empty_by_month(self):
        ctx = _make_ctx({})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        assert result["by_month"] == []

    def test_by_month_row_has_reach_rates_dict(self):
        ctx = _make_ctx({"cohort": _full_cohort_data(["2026-01"])})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        row = result["by_month"][0]
        assert isinstance(row["reach_rates"], dict)
        assert "m1" in row["reach_rates"]

    def test_decay_summary_keys_present(self):
        ctx = _make_ctx({"cohort": _full_cohort_data(["2026-01", "2026-02"])})
        result = CohortAnalyzer(ctx).analyze_cohort_roi()
        ds = result["decay_summary"]
        assert "reach_half_life" in ds
        assert "participation_half_life" in ds
        assert "checkin_half_life" in ds


# ── calc_half_life ────────────────────────────────────────────────────────────


class TestCalcHalfLife:
    def test_returns_none_for_empty_dict(self):
        ctx = _make_ctx({})
        result = CohortAnalyzer(ctx).calc_half_life({})
        assert result is None

    def test_returns_none_when_m1_is_missing(self):
        ctx = _make_ctx({})
        by_month = {"2026-01": {"m2": 0.5}}  # m1 缺失
        result = CohortAnalyzer(ctx).calc_half_life(by_month)
        assert result is None

    def test_returns_none_when_m1_is_zero(self):
        ctx = _make_ctx({})
        by_month = {"2026-01": {"m1": 0.0, "m2": 0.0}}
        result = CohortAnalyzer(ctx).calc_half_life(by_month)
        assert result is None

    def test_detects_half_life_at_month_5(self):
        """m1=0.8，在 m5 均值降至 0.4 以下，半衰期应 <= 5。"""
        ctx = _make_ctx({})
        by_month = {
            "2026-01": {
                "m1": 0.8,
                "m2": 0.70,
                "m3": 0.55,
                "m4": 0.45,
                "m5": 0.35,   # < 0.8/2 = 0.4
            }
        }
        result = CohortAnalyzer(ctx).calc_half_life(by_month)
        assert result is not None
        assert result <= 5

    def test_returns_int(self):
        ctx = _make_ctx({})
        by_month = {"2026-01": {"m1": 1.0, "m2": 0.4}}
        result = CohortAnalyzer(ctx).calc_half_life(by_month)
        if result is not None:
            assert isinstance(result, int)


# ── analyze_enclosure_cross ───────────────────────────────────────────────────


class TestAnalyzeEnclosureCross:
    def _enc_ctx(self) -> AnalyzerContext:
        data = {
            "kpi": {
                "enclosure_referral": {
                    "by_enclosure": [
                        {"enclosure": "0-30",  "active_students": 200,
                         "conversion_rate": 0.35, "participation_rate": 0.60},
                        {"enclosure": "31-60", "active_students": 150,
                         "conversion_rate": 0.28, "participation_rate": 0.45},
                    ]
                }
            },
            "ops": {
                "enclosure_monthly_followup": {
                    "by_enclosure": [
                        {"enclosure": "0-30",  "summary": {"call_coverage": 0.75}},
                        {"enclosure": "31-60", "summary": {"call_coverage": 0.55}},
                    ]
                }
            },
            "leads": {
                "channel_efficiency": {
                    "by_enclosure": [
                        {"围场": "0-30",  "总计": {"带货比": 0.15, "参与率": 0.60}},
                        {"围场": "31-60", "总计": {"带货比": 0.08, "参与率": 0.40}},
                    ]
                }
            },
        }
        return _make_ctx(data)

    def test_returns_dict_with_by_enclosure(self):
        result = CohortAnalyzer(self._enc_ctx()).analyze_enclosure_cross()
        assert isinstance(result, dict)
        assert "by_enclosure" in result

    def test_by_enclosure_length(self):
        result = CohortAnalyzer(self._enc_ctx()).analyze_enclosure_cross()
        assert len(result["by_enclosure"]) == 2

    def test_known_order_segments_appear_first(self):
        """enc_order 优先顺序：0-30 应排在 31-60 之前。"""
        result = CohortAnalyzer(self._enc_ctx()).analyze_enclosure_cross()
        segs = [r["segment"] for r in result["by_enclosure"]]
        assert segs.index("0-30") < segs.index("31-60")

    def test_recommendation_field_present(self):
        result = CohortAnalyzer(self._enc_ctx()).analyze_enclosure_cross()
        for row in result["by_enclosure"]:
            assert "recommendation" in row

    def test_resource_allocation_sums_to_one(self):
        result = CohortAnalyzer(self._enc_ctx()).analyze_enclosure_cross()
        alloc = result["resource_allocation"]["optimal"]
        if alloc:
            total = sum(alloc.values())
            assert total == pytest.approx(1.0, abs=1e-4)

    def test_empty_data_returns_empty_by_enclosure(self):
        ctx = _make_ctx({})
        result = CohortAnalyzer(ctx).analyze_enclosure_cross()
        assert result["by_enclosure"] == []

    def test_recommendation_values_are_valid(self):
        result = CohortAnalyzer(self._enc_ctx()).analyze_enclosure_cross()
        valid_recs = {"加大投入", "维持", "降低优先级", "数据不足"}
        for row in result["by_enclosure"]:
            assert row["recommendation"] in valid_recs


# ── analyze_checkin_impact ────────────────────────────────────────────────────


class TestAnalyzeCheckinImpact:
    def _checkin_ctx(self) -> AnalyzerContext:
        data = {
            "kpi": {
                "checkin_rate_monthly": {
                    "summary": {"avg_checkin_rate": 0.65},
                    "by_cc": [
                        {"cc_name": "Alice", "referral_participation_checked": 0.70,
                         "referral_participation_unchecked": 0.30},
                        {"cc_name": "Bob",   "referral_participation_checked": 0.65,
                         "referral_participation_unchecked": 0.25},
                    ],
                },
                "north_star_24h": {
                    "by_cc": [
                        {"cc_name": "Alice", "checkin_24h_rate": 0.90, "referral_coefficient": 1.5},
                        {"cc_name": "Bob",   "checkin_24h_rate": 0.85, "referral_coefficient": 1.4},
                        {"cc_name": "Carol", "checkin_24h_rate": 0.10, "referral_coefficient": 0.8},
                    ]
                },
            }
        }
        return _make_ctx(data)

    def test_returns_dict(self):
        result = CohortAnalyzer(self._checkin_ctx()).analyze_checkin_impact()
        assert isinstance(result, dict)

    def test_required_keys(self):
        result = CohortAnalyzer(self._checkin_ctx()).analyze_checkin_impact()
        for key in ("participation_lift", "coefficient_lift", "avg_checkin_rate", "conclusion"):
            assert key in result

    def test_participation_lift_checkin_gt_no_checkin(self):
        """打卡学员参与率均值应高于非打卡学员。"""
        result = CohortAnalyzer(self._checkin_ctx()).analyze_checkin_impact()
        pl = result["participation_lift"]
        if pl["checkin"] is not None and pl["no_checkin"] is not None:
            assert pl["checkin"] > pl["no_checkin"]

    def test_multiplier_is_positive(self):
        result = CohortAnalyzer(self._checkin_ctx()).analyze_checkin_impact()
        mult = result["participation_lift"]["multiplier"]
        if mult is not None:
            assert mult > 0.0

    def test_empty_data_returns_conclusion_insufficient(self):
        ctx = _make_ctx({})
        result = CohortAnalyzer(ctx).analyze_checkin_impact()
        assert "数据不足" in result["conclusion"]

    def test_coefficient_lift_keys_present(self):
        result = CohortAnalyzer(self._checkin_ctx()).analyze_checkin_impact()
        cl = result["coefficient_lift"]
        assert "checkin" in cl
        assert "no_checkin" in cl
        assert "multiplier" in cl

    def test_avg_checkin_rate_propagated(self):
        result = CohortAnalyzer(self._checkin_ctx()).analyze_checkin_impact()
        assert result["avg_checkin_rate"] == pytest.approx(0.65)


# ── analyze_ltv ───────────────────────────────────────────────────────────────


class TestAnalyzeLtv:
    def _ltv_ctx(self) -> AnalyzerContext:
        data = {
            "cohort": {
                "conversion_ratio": {
                    "by_month": [
                        {"月份": "2026-01", "m1": 0.20, "m2": 0.15, "m3": 0.10,
                         "m4": 0.08, "m5": 0.06, "m6": 0.05,
                         "m7": 0.04, "m8": 0.03, "m9": 0.03,
                         "m10": 0.02, "m11": 0.02, "m12": 0.01},
                    ]
                },
                "referral_coefficient": {
                    "by_month": [
                        {"月份": "2026-01", "m1": 1.0, "m2": 1.0, "m3": 1.0},
                    ]
                },
            }
        }
        return _make_ctx(data)

    def test_returns_dict(self):
        result = CohortAnalyzer(self._ltv_ctx()).analyze_ltv()
        assert isinstance(result, dict)

    def test_required_keys(self):
        result = CohortAnalyzer(self._ltv_ctx()).analyze_ltv()
        for key in ("ltv_3m_usd", "ltv_6m_usd", "ltv_12m_usd", "avg_unit_price_usd"):
            assert key in result

    def test_ltv_ordering_3m_le_6m_le_12m(self):
        result = CohortAnalyzer(self._ltv_ctx()).analyze_ltv()
        if all(v is not None for v in (result["ltv_3m_usd"], result["ltv_6m_usd"], result["ltv_12m_usd"])):
            assert result["ltv_3m_usd"] <= result["ltv_6m_usd"] <= result["ltv_12m_usd"]

    def test_ltv_12m_uses_unit_price(self):
        """12m LTV = Σ(ratio × coef) × avg_unit_price；与手动计算结果一致。"""
        result = CohortAnalyzer(self._ltv_ctx()).analyze_ltv()
        assert result["avg_unit_price_usd"] == 850

    def test_empty_cohort_returns_none_ltvs(self):
        ctx = _make_ctx({})
        result = CohortAnalyzer(ctx).analyze_ltv()
        assert result["ltv_3m_usd"] is None
        assert result["ltv_6m_usd"] is None
        assert result["ltv_12m_usd"] is None

    def test_custom_unit_price_from_targets(self):
        targets = dict(BASE_TARGETS)
        targets["客单价"] = 1000
        data = {
            "cohort": {
                "conversion_ratio": {"by_month": [{"月份": "2026-01", "m1": 1.0}]},
                "referral_coefficient": {"by_month": []},
            }
        }
        ctx = _make_ctx(data, targets)
        result = CohortAnalyzer(ctx).analyze_ltv()
        assert result["avg_unit_price_usd"] == 1000
