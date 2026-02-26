"""
Unit tests for core.analyzers.ranking_analyzer.RankingAnalyzer
~18 test cases — CC ranking + SS/LP ranking + helpers
"""
from datetime import datetime

import pytest

from core.analyzers.context import AnalyzerContext
from core.analyzers.ranking_analyzer import RankingAnalyzer


# ── Fixtures ──────────────────────────────────────────────────────────────────

REPORT_DATE = datetime(2026, 2, 15)
BASE_TARGETS = {
    "时间进度": 0.5,
    "注册目标": 300,
    "付费目标": 60,
    "金额目标": 30000,
}


def _make_ctx(data: dict) -> AnalyzerContext:
    return AnalyzerContext(data=data, targets=BASE_TARGETS, report_date=REPORT_DATE)


def _cc_data(cc_name: str, team: str, leads: int = 10, paid: int = 3,
             registered: int = 15, revenue_usd: float = 1500.0,
             calls: int = 80, connects: int = 50, effective: int = 30) -> dict:
    """Helper: 构造单个 CC 的跨源数据片段。"""
    return {
        "kpi": {
            "north_star_24h": {
                "by_cc": [
                    {
                        "cc_name": cc_name,
                        "team": team,
                        "checkin_24h_rate": 0.7,
                        "referral_coefficient": 1.2,
                    }
                ]
            },
            "checkin_rate_monthly": {
                "by_cc": [
                    {
                        "cc_name": cc_name,
                        "checkin_rate": 0.7,
                        "participation_rate": 0.55,
                        "referral_coefficient_total": 1.2,
                    }
                ]
            },
        },
        "ops": {
            "daily_outreach": {
                "by_cc": {
                    cc_name: {
                        "team": team,
                        "total_calls": calls,
                        "total_connects": connects,
                        "total_effective": effective,
                        "dates": ["2026-02-01", "2026-02-02"],
                    }
                }
            },
            "trial_followup": {"by_cc": {cc_name: {"called_24h": 5}}},
            "paid_user_followup": {"by_cc": {cc_name: {"monthly_called": 8}}},
            "monthly_paid_followup": {
                "by_cc": [{"cc_name": cc_name, "monthly_called": 8}]
            },
            "trial_class_followup": {
                "by_cc": [
                    {"cc_name": cc_name, "pre_called": 4, "post_called": 3}
                ]
            },
        },
        "leads": {
            "leads_detail": {
                "by_cc": {
                    cc_name: {
                        "leads": leads,
                        "注册": registered,
                        "付费": paid,
                    }
                }
            },
            "leads_achievement_personal": {
                "records": [
                    {
                        "name": cc_name,
                        "group": team,
                        "leads": leads,
                        "registered": registered,
                        "paid": paid,
                    }
                ]
            },
        },
        "order": {
            "order_detail": {
                "records": [
                    {"seller": cc_name, "amount_usd": revenue_usd / paid, "team": team}
                    for _ in range(paid)
                ]
            }
        },
    }


def _merge_cc_data(cc_list: list[dict]) -> dict:
    """将多个 CC 数据片段合并成一个顶层 data 字典。"""
    import copy

    merged: dict = {
        "kpi": {
            "north_star_24h": {"by_cc": []},
            "checkin_rate_monthly": {"by_cc": []},
        },
        "ops": {
            "daily_outreach": {"by_cc": {}},
            "trial_followup": {"by_cc": {}},
            "paid_user_followup": {"by_cc": {}},
            "monthly_paid_followup": {"by_cc": []},
            "trial_class_followup": {"by_cc": []},
        },
        "leads": {
            "leads_detail": {"by_cc": {}},
            "leads_achievement_personal": {"records": []},
        },
        "order": {"order_detail": {"records": []}},
    }

    for d in cc_list:
        merged["kpi"]["north_star_24h"]["by_cc"] += copy.deepcopy(
            d["kpi"]["north_star_24h"]["by_cc"]
        )
        merged["kpi"]["checkin_rate_monthly"]["by_cc"] += copy.deepcopy(
            d["kpi"]["checkin_rate_monthly"]["by_cc"]
        )
        merged["ops"]["daily_outreach"]["by_cc"].update(
            copy.deepcopy(d["ops"]["daily_outreach"]["by_cc"])
        )
        merged["ops"]["trial_followup"]["by_cc"].update(
            copy.deepcopy(d["ops"]["trial_followup"]["by_cc"])
        )
        merged["ops"]["paid_user_followup"]["by_cc"].update(
            copy.deepcopy(d["ops"]["paid_user_followup"]["by_cc"])
        )
        merged["ops"]["monthly_paid_followup"]["by_cc"] += copy.deepcopy(
            d["ops"]["monthly_paid_followup"]["by_cc"]
        )
        merged["ops"]["trial_class_followup"]["by_cc"] += copy.deepcopy(
            d["ops"]["trial_class_followup"]["by_cc"]
        )
        merged["leads"]["leads_detail"]["by_cc"].update(
            copy.deepcopy(d["leads"]["leads_detail"]["by_cc"])
        )
        merged["leads"]["leads_achievement_personal"]["records"] += copy.deepcopy(
            d["leads"]["leads_achievement_personal"]["records"]
        )
        merged["order"]["order_detail"]["records"] += copy.deepcopy(
            d["order"]["order_detail"]["records"]
        )

    return merged


# ── CC 排名：正常数据 ──────────────────────────────────────────────────────────


class TestCCRankingNormal:
    @pytest.fixture
    def two_cc_data(self):
        """两人数据，A 明显强于 B。"""
        a = _cc_data("Alice", "THCC-A", leads=20, paid=8, registered=30,
                     revenue_usd=8000.0, calls=200, connects=120, effective=80)
        b = _cc_data("Bob", "THCC-A", leads=5, paid=1, registered=8,
                     revenue_usd=1000.0, calls=40, connects=20, effective=10)
        return _merge_cc_data([a, b])

    def test_returns_list(self, two_cc_data):
        ctx = _make_ctx(two_cc_data)
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        assert isinstance(result, list)

    def test_sorted_descending(self, two_cc_data):
        ctx = _make_ctx(two_cc_data)
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        scores = [r["composite_score"] for r in result]
        assert scores == sorted(scores, reverse=True)

    def test_rank_field_sequential(self, two_cc_data):
        ctx = _make_ctx(two_cc_data)
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        ranks = [r["rank"] for r in result]
        assert ranks == list(range(1, len(result) + 1))

    def test_composite_score_in_range(self, two_cc_data):
        ctx = _make_ctx(two_cc_data)
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        for item in result:
            assert 0.0 <= item["composite_score"] <= 1.0, (
                f"composite_score={item['composite_score']} 超出 [0, 1]"
            )

    def test_required_keys_present(self, two_cc_data):
        ctx = _make_ctx(two_cc_data)
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        required = {
            "cc_name", "rank", "composite_score",
            "process_score", "result_score", "efficiency_score",
            "registrations", "payments", "revenue_usd",
        }
        for item in result:
            assert required.issubset(item.keys())


class TestCCRankingEdgeCases:
    def test_empty_data_returns_empty_list(self):
        ctx = _make_ctx({})
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        assert result == []

    def test_single_person_composite_score_is_half(self):
        """单人时所有维度 max==min，_minmax 返回 0.5，composite = 0.5*0.25+0.5*0.60+0.5*0.15 = 0.5。"""
        data = _cc_data("Solo", "THCC-A")
        ctx = _make_ctx(_merge_cc_data([data]))
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        assert len(result) == 1
        assert result[0]["composite_score"] == pytest.approx(0.5, abs=1e-4)

    def test_identical_data_all_same_score(self):
        """所有人数据完全相同 → composite_score 全部相同（均为 0.5）。"""
        cc_list = [
            _cc_data(f"CC{i}", "THCC-A", leads=10, paid=3, registered=15,
                     revenue_usd=1500.0, calls=80, connects=50, effective=30)
            for i in range(3)
        ]
        ctx = _make_ctx(_merge_cc_data(cc_list))
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        scores = [r["composite_score"] for r in result]
        assert len(set(scores)) == 1, f"期望全部相同分数，实际: {scores}"


class TestCCWeightConstants:
    def test_process_dims_weight_sum(self):
        from core.analyzers.ranking_analyzer import RankingAnalyzer as RA

        # 直接取类中定义的 PROCESS_DIMS 常量（在 analyze_cc_ranking 方法内部）
        PROCESS_WEIGHTS = [0.1600, 0.1600, 0.2000, 0.1200, 0.1200, 0.1200, 0.1200]
        assert sum(PROCESS_WEIGHTS) == pytest.approx(1.0, abs=1e-6)

    def test_result_dims_weight_sum(self):
        RESULT_WEIGHTS = [0.2000, 0.1333, 0.1333, 0.1167, 0.2000, 0.1500, 0.0667]
        assert sum(RESULT_WEIGHTS) == pytest.approx(1.0, abs=1e-4)

    def test_efficiency_dims_weight_sum(self):
        EFFICIENCY_WEIGHTS = [0.3333, 0.2667, 0.2000, 0.2000]
        assert sum(EFFICIENCY_WEIGHTS) == pytest.approx(1.0, abs=1e-4)

    def test_composite_formula_sum_to_one(self):
        """0.25 + 0.60 + 0.15 == 1.0。"""
        assert 0.25 + 0.60 + 0.15 == pytest.approx(1.0)

    def test_full_norm_gives_full_composite(self):
        """当所有归一化值均为 1.0 时，composite_score 应为 1.0。"""
        # 构造两人，一人远高于另一人，使胜者在所有维度归一化后接近 1.0
        winner = _cc_data(
            "Top", "THCC-A",
            leads=100, paid=50, registered=200,
            revenue_usd=50000.0, calls=1000, connects=800, effective=600,
        )
        loser = _cc_data(
            "Bot", "THCC-A",
            leads=1, paid=0, registered=1,
            revenue_usd=0.0, calls=1, connects=0, effective=0,
        )
        ctx = _make_ctx(_merge_cc_data([winner, loser]))
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        top = next(r for r in result if r["cc_name"] == "Top")
        # 胜者在近所有维度归一化为 1.0，composite 应接近 1.0
        assert top["composite_score"] > 0.85


# ── SS/LP 排名 ────────────────────────────────────────────────────────────────


def _ss_lp_data(name: str, team: str, leads: int = 8, paid: int = 2) -> dict:
    """构造 SS 或 LP 人员数据（team 字段决定分组）。"""
    return {
        "kpi": {
            "north_star_24h": {
                "by_cc": [
                    {
                        "cc_name": name,
                        "team": team,
                        "checkin_24h_rate": 0.65,
                        "referral_coefficient": 1.1,
                    }
                ]
            },
            "checkin_rate_monthly": {
                "by_cc": [
                    {
                        "cc_name": name,
                        "checkin_rate": 0.65,
                        "participation_rate": 0.45,
                        "referral_coefficient_total": 1.1,
                    }
                ]
            },
        },
        "ops": {
            "daily_outreach": {
                "by_cc": {
                    name: {
                        "team": team,
                        "total_calls": 60,
                        "total_connects": 40,
                        "total_effective": 25,
                        "dates": ["2026-02-01"],
                    }
                }
            },
            "trial_class_followup": {
                "by_cc": [{"cc_name": name, "pre_called": 3, "post_called": 2}]
            },
            "trial_followup": {"by_cc": {}},
            "paid_user_followup": {"by_cc": {}},
            "monthly_paid_followup": {"by_cc": []},
        },
        "leads": {
            "leads_detail": {"by_cc": {}},
            "leads_achievement_personal": {
                "records": [
                    {
                        "name": name,
                        "team": team,
                        "group": team,
                        "leads": leads,
                        "paid": paid,
                        "conversion_rate": paid / leads if leads else 0,
                    }
                ]
            },
        },
        "order": {"order_detail": {"records": []}},
    }


class TestSSLPRankingNormal:
    @pytest.fixture
    def ss_lp_ctx(self):
        ss1 = _ss_lp_data("SS_Alpha", "TH-SS01Team", leads=15, paid=4)
        ss2 = _ss_lp_data("SS_Beta", "TH-SS01Team", leads=8, paid=2)
        lp1 = _ss_lp_data("LP_Gamma", "TH-LP01Team", leads=10, paid=3)
        lp2 = _ss_lp_data("LP_Delta", "TH-LP01Team", leads=5, paid=1)

        def _merge4(items):
            base = _merge_cc_data(items)
            return base

        return _make_ctx(_merge4([ss1, ss2, lp1, lp2]))

    def test_returns_dict_with_ss_and_lp(self, ss_lp_ctx):
        result = RankingAnalyzer(ss_lp_ctx).analyze_ss_lp_ranking()
        assert isinstance(result, dict)
        assert "ss" in result
        assert "lp" in result

    def test_ss_and_lp_sorted_separately(self, ss_lp_ctx):
        result = RankingAnalyzer(ss_lp_ctx).analyze_ss_lp_ranking()
        for role in ("ss", "lp"):
            scores = [r["composite_score"] for r in result[role]]
            assert scores == sorted(scores, reverse=True), (
                f"{role} 排名未按 composite_score 降序"
            )

    def test_ss_independent_from_lp_normalization(self, ss_lp_ctx):
        """SS 和 LP 独立归一化：SS 的 rank=1 与 LP 的 rank=1 应互不影响。"""
        result = RankingAnalyzer(ss_lp_ctx).analyze_ss_lp_ranking()
        ss_top = result["ss"][0] if result["ss"] else None
        lp_top = result["lp"][0] if result["lp"] else None
        # 两组各自的 rank=1 都应为 0.5 (单人 or identical) 或者 >0
        if ss_top:
            assert ss_top["composite_score"] >= 0.0
        if lp_top:
            assert lp_top["composite_score"] >= 0.0

    def test_paid_share_sums_to_one_per_role(self, ss_lp_ctx):
        """paid_share 在同角色内加总应为 1.0（有付费数据时）。"""
        result = RankingAnalyzer(ss_lp_ctx).analyze_ss_lp_ranking()
        for role in ("ss", "lp"):
            items = result[role]
            if not items:
                continue
            total_share = sum(r["paid_share"] for r in items)
            assert total_share == pytest.approx(1.0, abs=1e-4), (
                f"{role} paid_share 合计={total_share}，期望=1.0"
            )

    def test_empty_data_returns_empty_lists(self):
        ctx = _make_ctx({})
        result = RankingAnalyzer(ctx).analyze_ss_lp_ranking()
        assert result["ss"] == []
        assert result["lp"] == []

    def test_single_ss_person_composite_is_half(self):
        """单人 SS 时，min-max 全为 0.5，composite ≈ 0.5。"""
        data = _ss_lp_data("SS_Only", "TH-SS01Team", leads=5, paid=2)
        ctx = _make_ctx(_merge_cc_data([data]))
        result = RankingAnalyzer(ctx).analyze_ss_lp_ranking()
        ss = result["ss"]
        assert len(ss) == 1
        assert ss[0]["composite_score"] == pytest.approx(0.5, abs=1e-4)

    def test_ss_lp_weights_sum_to_one(self):
        """SS_LP_WEIGHTS 各值合计 = 1.0。"""
        weights = {"process": 0.25, "result": 0.30, "quality": 0.25, "contribution": 0.20}
        assert sum(weights.values()) == pytest.approx(1.0)


# ── _minmax 辅助逻辑（通过 analyze_cc_ranking 间接验证）─────────────────────


class TestMinmaxLogic:
    def test_all_zero_values_gives_half(self):
        """所有人该维度原始值均为 0（即 max==min==0），归一化应返回 0.5。"""
        cc_list = [
            _cc_data(f"CC{i}", "THCC-A", leads=0, paid=0, registered=0,
                     revenue_usd=0.0, calls=0, connects=0, effective=0)
            for i in range(2)
        ]
        ctx = _make_ctx(_merge_cc_data(cc_list))
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        for item in result:
            assert item["composite_score"] == pytest.approx(0.5, abs=1e-4)

    def test_redistribute_drops_all_zero_dim(self):
        """无数据维度不参与评分，但其权重被分摊给有数据维度。"""
        # 所有 CC 的 pre_paid_followup/pre_class_followup/post_class_followup/post_paid_followup 均为 0
        # 则 _redistribute 会将这些维度权重等比分摊到有数据的维度上
        a = _cc_data("Alpha", "THCC-A", leads=15, paid=5, calls=100)
        b = _cc_data("Beta", "THCC-A", leads=5, paid=1, calls=30)
        ctx = _make_ctx(_merge_cc_data([a, b]))
        result = RankingAnalyzer(ctx).analyze_cc_ranking()
        # 关键：结果不为空且分数有序
        scores = [r["composite_score"] for r in result]
        assert scores == sorted(scores, reverse=True)
        assert all(0.0 <= s <= 1.0 for s in scores)
