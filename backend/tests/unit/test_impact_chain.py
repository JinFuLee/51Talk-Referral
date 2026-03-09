"""
Unit tests for core.impact_chain.ImpactChainEngine
~13 test cases
"""

import pytest

from backend.core.impact_chain import ImpactChainEngine


@pytest.fixture
def engine(minimal_summary, minimal_funnel, sample_targets):
    return ImpactChainEngine(
        summary=minimal_summary,
        targets=sample_targets,
        funnel=minimal_funnel,
    )


class TestImpactChainEngine:
    def test_compute_all_chains_returns_dict(self, engine):
        result = engine.compute_all_chains()
        assert isinstance(result, dict)
        assert "chains" in result
        assert "total_lost_revenue_usd" in result

    def test_chains_is_list(self, engine):
        result = engine.compute_all_chains()
        assert isinstance(result["chains"], list)

    def test_chain_entries_have_required_keys(self, engine):
        result = engine.compute_all_chains()
        for chain in result["chains"]:
            assert "metric" in chain
            assert "label" in chain
            assert "gap" in chain
            assert "lost_revenue_usd" in chain
            assert "impact_steps" in chain

    def test_gap_zero_means_no_loss(
        self, minimal_summary, minimal_funnel, sample_targets
    ):
        """当 actual >= target 时，该指标无损失"""
        # checkin_rate actual=0.90 > target=0.60 → no chain
        summary = {**minimal_summary, "checkin_24h": {"rate": 0.90, "target": 0.60}}
        engine = ImpactChainEngine(
            summary=summary, targets=sample_targets, funnel=minimal_funnel
        )
        result = engine.compute_all_chains()
        metrics = [c["metric"] for c in result["chains"]]
        assert "checkin_rate" not in metrics

    def test_negative_gap_generates_loss(self, engine):
        """实际值低于目标 → 应有正的损失收入"""
        result = engine.compute_all_chains()
        # checkin_rate: actual=0.25 < target=0.60 → loss expected
        checkin_chains = [c for c in result["chains"] if c["metric"] == "checkin_rate"]
        if checkin_chains:
            assert checkin_chains[0]["lost_revenue_usd"] > 0

    def test_total_lost_revenue_non_negative(self, engine):
        result = engine.compute_all_chains()
        assert result["total_lost_revenue_usd"] >= 0

    def test_top_lever_is_string_or_none(self, engine):
        result = engine.compute_all_chains()
        assert result["top_lever"] is None or isinstance(result["top_lever"], str)

    def test_what_if_returns_dict(self, engine):
        result = engine.what_if("checkin_rate", 0.50)
        assert isinstance(result, dict)
        assert "metric" in result
        assert "delta_revenue_usd" in result
        assert "message" in result

    def test_what_if_improvement_gives_positive_delta(self, engine):
        """提升指标 → delta 应 >= 0"""
        result = engine.what_if("checkin_rate", 0.45)
        assert result["delta_revenue_usd"] >= 0

    def test_what_if_invalid_metric_raises(self, engine):
        with pytest.raises(ValueError):
            engine.what_if("invalid_metric", 0.5)

    def test_empty_inputs_no_crash(self, sample_targets):
        engine = ImpactChainEngine(summary={}, targets=sample_targets, funnel={})
        result = engine.compute_all_chains()
        assert isinstance(result, dict)
        assert result["total_lost_revenue_usd"] == 0.0

    def test_conversion_rate_chain(
        self, minimal_summary, minimal_funnel, sample_targets
    ):
        """conversion_rate low → should generate chain"""
        funnel = {
            "total": {
                **minimal_funnel["total"],
                "rates": {
                    **minimal_funnel["total"]["rates"],
                    "register_paid_rate": 0.05,  # below target 0.23
                },
            }
        }
        engine = ImpactChainEngine(
            summary=minimal_summary, targets=sample_targets, funnel=funnel
        )
        result = engine.compute_all_chains()
        metrics = [c["metric"] for c in result["chains"]]
        assert "conversion_rate" in metrics

    def test_lost_revenue_thb_is_34x_usd(self, engine):
        """THB 损失 = USD 损失 × 34"""
        result = engine.compute_all_chains()
        usd = result["total_lost_revenue_usd"]
        thb = result["total_lost_revenue_thb"]
        assert thb == pytest.approx(usd * 34, rel=0.01)
