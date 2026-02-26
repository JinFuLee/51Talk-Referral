"""
Unit tests for core.analysis_engine_v2.AnalysisEngineV2
~12 test cases — analyze() 基本语义 + 空数据安全 + enabled_modules 白名单
"""
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from core.analysis_engine_v2 import AnalysisEngineV2

# ── Fixtures ──────────────────────────────────────────────────────────────────

REPORT_DATE = datetime(2026, 2, 15)
BASE_TARGETS = {
    "注册目标": 300,
    "付费目标": 60,
    "金额目标": 30000,
    "客单价": 850.0,
    "目标转化率": 0.23,
    "约课率目标": 0.77,
    "出席率目标": 0.66,
    "时间进度": 0.5,
    "触达率目标": 0.80,
    "参与率目标": 0.50,
}

# 最小结构满足所有模块按 empty-safe 路径运行
MINIMAL_DATA: dict = {
    "leads": {
        "leads_achievement": {
            "by_channel": {
                "总计": {"注册": 200, "预约": 120, "出席": 90, "付费": 50},
                "CC窄口径": {"注册": 80, "预约": 48, "出席": 36, "付费": 20},
                "SS窄口径": {"注册": 60, "预约": 36, "出席": 27, "付费": 15},
                "LP窄口径": {"注册": 40, "预约": 24, "出席": 18, "付费": 10},
                "宽口径": {"注册": 20, "预约": 12, "出席": 9, "付费": 5},
            }
        },
        "leads_detail": {"records": [], "by_cc": {}},
        "leads_achievement_personal": {"records": []},
    },
    "order": {
        "order_detail": {
            "summary": {
                "total_orders": 50,
                "new_orders": 40,
                "renewal_orders": 10,
                "total_revenue_cny": 200000.0,
                "total_revenue_usd": 25000.0,
                "avg_order_value": 500.0,
            },
            "referral_cc_new": {
                "count": 40, "revenue_cny": 150000.0, "revenue_usd": 20000.0
            },
            "by_channel": {
                "转介绍": {"revenue_cny": 150000.0, "revenue_usd": 20000.0}
            },
            "by_team": {},
            "records": [],
        },
        "cc_attendance": [],
        "ss_attendance": [],
        "order_daily_trend": [],
        "revenue_daily_trend": [],
        "package_ratio": {},
        "team_package_ratio": {"by_team": []},
        "channel_revenue": {"by_channel_product": []},
    },
    "kpi": {
        "north_star_24h": {
            "summary": {"avg_checkin_24h_rate": 0.3, "target": 0.6},
            "by_cc": [],
        },
        "checkin_rate_monthly": {"by_cc": []},
        "enclosure_combined": {
            "total": {
                "active_students": 800,
                "participation_rate": 0.15,
                "conversion_rate": 0.30,
            }
        },
        "enclosure_referral": {"total": {}},
        "by_cc": [],
    },
    "ops": {
        "trial_followup": {"records": [], "by_cc": {}},
        "pre_class_outreach": {"records": []},
        "daily_outreach": {"by_cc": {}},
        "paid_user_followup": {"by_cc": {}},
        "monthly_paid_followup": {"by_cc": []},
        "trial_class_followup": {"by_cc": []},
    },
    "outreach": {"overall": {}, "by_cc": []},
    "cohort": {},
    "enclosure": {},
}


def _make_engine(data: dict = None, targets: dict = None,
                 project_config=None) -> AnalysisEngineV2:
    return AnalysisEngineV2(
        data=data if data is not None else MINIMAL_DATA,
        targets=targets if targets is not None else BASE_TARGETS,
        report_date=REPORT_DATE,
        project_config=project_config,
    )


# ── analyze() 基本语义 ────────────────────────────────────────────────────────


class TestAnalyzeReturnStructure:
    def test_returns_dict(self):
        result = _make_engine().analyze()
        assert isinstance(result, dict)

    def test_contains_meta_key(self):
        result = _make_engine().analyze()
        assert "meta" in result

    def test_contains_summary_key(self):
        result = _make_engine().analyze()
        assert "summary" in result

    def test_contains_funnel_key(self):
        result = _make_engine().analyze()
        assert "funnel" in result

    def test_contains_cc_ranking_alias(self):
        """向后兼容别名 cc_ranking 应存在。"""
        result = _make_engine().analyze()
        assert "cc_ranking" in result

    def test_contains_ss_ranking_alias(self):
        result = _make_engine().analyze()
        assert "ss_ranking" in result

    def test_contains_lp_ranking_alias(self):
        result = _make_engine().analyze()
        assert "lp_ranking" in result

    def test_result_is_json_serializable(self):
        import json
        result = _make_engine().analyze()
        # _clean_for_json 已处理 NaN/inf；这里验证 json.dumps 不抛出
        try:
            json.dumps(result)
        except (TypeError, ValueError) as exc:
            pytest.fail(f"analyze() 结果无法序列化为 JSON: {exc}")


# ── 空数据安全性 ──────────────────────────────────────────────────────────────


class TestAnalyzeEmptyData:
    def test_empty_data_no_exception(self):
        """完全空数据，analyze() 不应抛出异常。"""
        engine = _make_engine(data={})
        try:
            engine.analyze()
        except Exception as exc:
            pytest.fail(f"空数据下 analyze() 抛出异常: {exc}")

    def test_empty_data_returns_dict(self):
        result = _make_engine(data={}).analyze()
        assert isinstance(result, dict)

    def test_empty_data_cc_ranking_is_list(self):
        result = _make_engine(data={}).analyze()
        assert isinstance(result.get("cc_ranking"), list)

    def test_empty_data_summary_is_dict_or_empty(self):
        result = _make_engine(data={}).analyze()
        assert isinstance(result.get("summary", {}), dict)


# ── enabled_modules 白名单 ────────────────────────────────────────────────────


class TestEnabledModules:
    def _config_with_modules(self, modules: list):
        """构造最小 project_config stub，仅含 enabled_modules。"""
        cfg = MagicMock()
        cfg.enabled_modules = modules
        cfg.gap_thresholds = {"green": 0.0, "yellow": -0.05}
        cfg.channel_labels = ["CC窄口径", "SS窄口径", "LP窄口径", "宽口径"]
        cfg.work_schedule = SimpleNamespace(rest_weekdays={2})
        cfg.ranking_targets = {}
        cfg.role_aliases = {"EA": "SS", "CM": "LP"}
        cfg.default_team_name = "THCC"
        return cfg

    def test_only_meta_module_runs(self):
        cfg = self._config_with_modules(["meta"])
        result = _make_engine(project_config=cfg).analyze()
        assert "meta" in result
        # summary 不在白名单，但因为 risk_alerts/impact_chain 仍会调用 summary.get()
        # 结果字典中 summary 可能为 {} 或缺失
        assert result.get("summary", {}) == {} or "summary" not in result

    def test_summary_and_funnel_modules_run(self):
        cfg = self._config_with_modules(["summary", "funnel"])
        result = _make_engine(project_config=cfg).analyze()
        # 两个模块都应产出非 None 结果
        assert result.get("summary") is not None
        assert result.get("funnel") is not None

    def test_modules_not_in_whitelist_absent(self):
        """白名单只含 meta，其他注册模块的 key 不应出现。
        risk_alerts/impact_chain 除外，它们始终执行。
        """
        cfg = self._config_with_modules(["meta"])
        result = _make_engine(project_config=cfg).analyze()
        # 非白名单、非依赖后置模块的 key 不应出现
        for key in ("ranking_cc", "ranking_ss_lp", "trend"):
            assert key not in result, f"key={key} 不在白名单，不应出现在结果中"
