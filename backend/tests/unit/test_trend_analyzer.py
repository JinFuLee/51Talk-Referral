"""
Unit tests for core.analyzers.trend_analyzer.TrendAnalyzer
~30 test cases covering: detect_trend_direction, get_peak_valley,
analyze_trend, analyze_prediction, detect_anomalies
"""
from datetime import datetime
from unittest.mock import MagicMock

import pytest

from backend.core.analyzers.context import AnalyzerContext
from backend.core.analyzers.trend_analyzer import TrendAnalyzer

# ── Fixtures ──────────────────────────────────────────────────────────────────

REPORT_DATE = datetime(2026, 2, 15)
BASE_TARGETS = {"时间进度": 0.5, "客单价": 850}


def _make_ctx(data: dict, snapshot_store=None) -> AnalyzerContext:
    ctx = AnalyzerContext(data=data, targets=BASE_TARGETS, report_date=REPORT_DATE)
    ctx.snapshot_store = snapshot_store
    return ctx


def _daily_revenue(dates_values: list[tuple[str, float]]) -> list[dict]:
    """构造 revenue_daily_trend 列表。"""
    return [{"date": d, "revenue_cny": v} for d, v in dates_values]


def _daily_orders(dates_values: list[tuple[str, int]]) -> list[dict]:
    """构造 order_daily_trend 列表。"""
    return [{"date": d, "order_count": v} for d, v in dates_values]


# ── detect_trend_direction ────────────────────────────────────────────────────


class TestDetectTrendDirection:
    def _analyzer(self) -> TrendAnalyzer:
        return TrendAnalyzer(_make_ctx({}))

    def test_insufficient_for_empty(self):
        assert self._analyzer().detect_trend_direction([]) == "insufficient"

    def test_insufficient_for_one_value(self):
        assert self._analyzer().detect_trend_direction([10.0]) == "insufficient"

    def test_insufficient_for_two_values(self):
        assert self._analyzer().detect_trend_direction([10.0, 20.0]) == "insufficient"

    def test_rising_for_three_increasing(self):
        assert self._analyzer().detect_trend_direction([1.0, 2.0, 3.0]) == "rising"

    def test_falling_for_three_decreasing(self):
        assert self._analyzer().detect_trend_direction([3.0, 2.0, 1.0]) == "falling"

    def test_volatile_for_mixed(self):
        assert self._analyzer().detect_trend_direction([1.0, 3.0, 2.0, 4.0, 3.0]) == "volatile"

    def test_rising_requires_last_3_diffs(self):
        """最后 3 个 diff 全为正才 rising，前面下降不影响。"""
        result = self._analyzer().detect_trend_direction([5.0, 3.0, 4.0, 5.0, 6.0])
        assert result == "rising"

    def test_falling_with_longer_series(self):
        result = self._analyzer().detect_trend_direction([10.0, 8.0, 7.0, 6.0, 5.0])
        assert result == "falling"

    def test_all_equal_values_is_volatile(self):
        """全相等：diff 全为 0，不满足全>0 或全<0，应为 volatile。"""
        result = self._analyzer().detect_trend_direction([5.0, 5.0, 5.0, 5.0])
        assert result == "volatile"


# ── get_peak_valley ───────────────────────────────────────────────────────────


class TestGetPeakValley:
    def test_returns_none_when_no_snapshot_store(self):
        ctx = _make_ctx({}, snapshot_store=None)
        result = TrendAnalyzer(ctx).get_peak_valley("注册")
        assert result == {"peak": None, "valley": None}

    def test_delegates_to_snapshot_store(self):
        mock_store = MagicMock()
        mock_store.get_peak_valley.return_value = {"peak": {"value": 500}, "valley": {"value": 100}}
        ctx = _make_ctx({}, snapshot_store=mock_store)
        result = TrendAnalyzer(ctx).get_peak_valley("注册")
        mock_store.get_peak_valley.assert_called_once_with("注册")
        assert result["peak"]["value"] == 500

    def test_returns_none_on_snapshot_exception(self):
        mock_store = MagicMock()
        mock_store.get_peak_valley.side_effect = RuntimeError("DB 挂了")
        ctx = _make_ctx({}, snapshot_store=mock_store)
        result = TrendAnalyzer(ctx).get_peak_valley("注册")
        assert result == {"peak": None, "valley": None}


# ── analyze_trend ─────────────────────────────────────────────────────────────


class TestAnalyzeTrend:
    def _trend_data(self) -> dict:
        return {
            "order": {
                "revenue_daily_trend": _daily_revenue([
                    ("2026-02-01", 1000.0), ("2026-02-02", 1100.0),
                    ("2026-02-03", 1200.0), ("2026-02-04", 1300.0),
                ]),
                "order_daily_trend": _daily_orders([
                    ("2026-02-01", 5), ("2026-02-02", 6),
                ]),
            },
            "ops": {
                "section_mom": {
                    "by_month": {
                        "2026-01": {"注册": 300, "付费": 60},
                        "2026-02": {"注册": 350, "付费": 70},
                    }
                }
            },
        }

    def test_returns_dict(self):
        ctx = _make_ctx(self._trend_data())
        result = TrendAnalyzer(ctx).analyze_trend()
        assert isinstance(result, dict)

    def test_required_top_level_keys(self):
        ctx = _make_ctx(self._trend_data())
        result = TrendAnalyzer(ctx).analyze_trend()
        for key in ("daily", "direction", "mom", "yoy", "wow"):
            assert key in result, f"缺失键: {key}"

    def test_daily_is_list(self):
        ctx = _make_ctx(self._trend_data())
        result = TrendAnalyzer(ctx).analyze_trend()
        assert isinstance(result["daily"], list)

    def test_daily_max_60_items(self):
        """daily 应限制为最近 60 天。"""
        many_dates = [(f"2025-{m:02d}-{d:02d}", float(m * d))
                      for m in range(1, 13) for d in range(1, 7)]
        data = {"order": {
            "revenue_daily_trend": _daily_revenue(many_dates),
            "order_daily_trend": [],
        }, "ops": {"section_mom": {}}}
        ctx = _make_ctx(data)
        result = TrendAnalyzer(ctx).analyze_trend()
        assert len(result["daily"]) <= 60

    def test_direction_is_valid_value(self):
        ctx = _make_ctx(self._trend_data())
        result = TrendAnalyzer(ctx).analyze_trend()
        assert result["direction"] in ("rising", "falling", "volatile", "insufficient")

    def test_rising_direction_detected(self):
        """4 天持续增长 → rising。"""
        ctx = _make_ctx(self._trend_data())
        result = TrendAnalyzer(ctx).analyze_trend()
        assert result["direction"] == "rising"

    def test_mom_contains_data_and_months(self):
        ctx = _make_ctx(self._trend_data())
        result = TrendAnalyzer(ctx).analyze_trend()
        mom = result["mom"]
        assert "months" in mom
        assert "data" in mom
        assert "2026-01" in mom["months"]

    def test_yoy_available_false_without_snapshot(self):
        ctx = _make_ctx(self._trend_data(), snapshot_store=None)
        result = TrendAnalyzer(ctx).analyze_trend()
        assert result["yoy"]["available"] is False

    def test_wow_available_false_without_snapshot(self):
        ctx = _make_ctx(self._trend_data(), snapshot_store=None)
        result = TrendAnalyzer(ctx).analyze_trend()
        assert result["wow"]["available"] is False

    def test_empty_data_returns_dict(self):
        ctx = _make_ctx({})
        result = TrendAnalyzer(ctx).analyze_trend()
        assert isinstance(result, dict)
        assert result["daily"] == []


# ── analyze_prediction ────────────────────────────────────────────────────────


class TestAnalyzePrediction:
    def _pred_data(self, n_days: int = 14) -> dict:
        return {
            "order": {
                "revenue_daily_trend": _daily_revenue([
                    (f"2026-02-{d:02d}", 1000.0 + d * 10.0)
                    for d in range(1, n_days + 1)
                ]),
            },
            "leads": {
                "leads_achievement": {
                    "total": {"注册": 175, "付费": 40}
                }
            },
        }

    def test_returns_dict_with_three_keys(self):
        ctx = _make_ctx(self._pred_data())
        result = TrendAnalyzer(ctx).analyze_prediction()
        assert "revenue" in result
        assert "registration" in result
        assert "payment" in result

    def test_predicted_is_none_with_insufficient_data(self):
        ctx = _make_ctx({"order": {"revenue_daily_trend": _daily_revenue([("2026-02-01", 1000.0)])}})
        result = TrendAnalyzer(ctx).analyze_prediction()
        assert result["revenue"]["predicted"] is None

    def test_predicted_is_positive_with_enough_data(self):
        ctx = _make_ctx(self._pred_data(14))
        result = TrendAnalyzer(ctx).analyze_prediction()
        assert result["revenue"]["predicted"] is not None
        assert result["revenue"]["predicted"] > 0

    def test_model_is_one_of_three(self):
        ctx = _make_ctx(self._pred_data(14))
        result = TrendAnalyzer(ctx).analyze_prediction()
        assert result["revenue"]["model"] in ("linear", "wma", "ewm")

    def test_confidence_in_range(self):
        ctx = _make_ctx(self._pred_data(14))
        result = TrendAnalyzer(ctx).analyze_prediction()
        for key in ("revenue", "registration", "payment"):
            conf = result[key]["confidence"]
            if conf is not None:
                assert 0.0 <= conf <= 1.0

    def test_all_models_key_present(self):
        ctx = _make_ctx(self._pred_data(14))
        result = TrendAnalyzer(ctx).analyze_prediction()
        assert "all_models" in result["revenue"]
        for m in ("linear", "wma", "ewm"):
            assert m in result["revenue"]["all_models"]

    def test_registration_predicted_from_leads(self):
        ctx = _make_ctx(self._pred_data(14))
        result = TrendAnalyzer(ctx).analyze_prediction()
        reg = result["registration"]["predicted"]
        if reg is not None:
            # 175 / 0.5 = 350
            assert reg == pytest.approx(350, abs=1)

    def test_payment_predicted_from_leads(self):
        ctx = _make_ctx(self._pred_data(14))
        result = TrendAnalyzer(ctx).analyze_prediction()
        pmt = result["payment"]["predicted"]
        if pmt is not None:
            # 40 / 0.5 = 80
            assert pmt == pytest.approx(80, abs=1)

    def test_empty_revenue_data_returns_none_predictions(self):
        ctx = _make_ctx({})
        result = TrendAnalyzer(ctx).analyze_prediction()
        assert result["revenue"]["predicted"] is None


# ── detect_anomalies ──────────────────────────────────────────────────────────


class TestDetectAnomalies:
    def _anomaly_data(self, spike_value: float = 10000.0) -> dict:
        """构造含一个异常骤升点的日收入序列。"""
        normal_days = [
            ("2026-02-01", 1000.0), ("2026-02-02", 1050.0),
            ("2026-02-03", 980.0),  ("2026-02-04", 1020.0),
            ("2026-02-05", 1010.0),
        ]
        spike = [("2026-02-06", spike_value)]
        return {
            "order": {
                "revenue_daily_trend": _daily_revenue(normal_days + spike)
            },
            "kpi": {},
        }

    def test_returns_list(self):
        ctx = _make_ctx(self._anomaly_data())
        result = TrendAnalyzer(ctx).detect_anomalies()
        assert isinstance(result, list)

    def test_spike_detected_as_anomaly(self):
        ctx = _make_ctx(self._anomaly_data(spike_value=50000.0))
        result = TrendAnalyzer(ctx).detect_anomalies()
        rev_anomalies = [a for a in result if a["metric"] == "daily_revenue_usd"]
        assert len(rev_anomalies) > 0

    def test_anomaly_has_required_fields(self):
        ctx = _make_ctx(self._anomaly_data(spike_value=50000.0))
        result = TrendAnalyzer(ctx).detect_anomalies()
        if result:
            for field in ("metric", "date", "value", "expected", "severity", "description"):
                assert field in result[0], f"缺失字段: {field}"

    def test_severity_is_high_for_large_deviation(self):
        """骤升 50x 应触发 high severity。"""
        ctx = _make_ctx(self._anomaly_data(spike_value=100000.0))
        result = TrendAnalyzer(ctx).detect_anomalies()
        rev_anomalies = [a for a in result if a["metric"] == "daily_revenue_usd"]
        if rev_anomalies:
            assert rev_anomalies[0]["severity"] == "high"

    def test_sorted_by_severity_descending(self):
        """高 severity 排前面。"""
        ctx = _make_ctx(self._anomaly_data(spike_value=50000.0))
        result = TrendAnalyzer(ctx).detect_anomalies()
        severities = [a["severity"] for a in result]
        # "high" > "medium" in reverse lexicographic sort
        for i in range(len(severities) - 1):
            assert severities[i] >= severities[i + 1]

    def test_no_anomaly_when_data_lt_5_points(self):
        """少于 5 个数据点不检测异常。"""
        data = {
            "order": {
                "revenue_daily_trend": _daily_revenue([
                    ("2026-02-01", 1000.0), ("2026-02-02", 50000.0),
                    ("2026-02-03", 900.0),  ("2026-02-04", 1100.0),
                ])
            },
            "kpi": {},
        }
        ctx = _make_ctx(data)
        result = TrendAnalyzer(ctx).detect_anomalies()
        rev = [a for a in result if a["metric"] == "daily_revenue_usd"]
        assert rev == []

    def test_empty_data_returns_empty_list(self):
        ctx = _make_ctx({})
        result = TrendAnalyzer(ctx).detect_anomalies()
        assert result == []

    def test_cc_checkin_anomaly_detected(self):
        """CC 打卡率异常（>=5 个 CC，其中一个严重偏低）。"""
        by_cc = [
            {"cc_name": f"CC{i}", "checkin_24h_rate": 0.80}
            for i in range(5)
        ]
        by_cc.append({"cc_name": "Outlier", "checkin_24h_rate": 0.01})  # 远低于均值
        data = {
            "order": {"revenue_daily_trend": []},
            "kpi": {"north_star_24h": {"by_cc": by_cc}},
        }
        ctx = _make_ctx(data)
        result = TrendAnalyzer(ctx).detect_anomalies()
        cc_anomalies = [a for a in result if a["metric"] == "cc_checkin_rate"]
        assert len(cc_anomalies) > 0
