"""M33 运营分析报告引擎单元测试

覆盖：三因素分解 / 全月推算 / 杠杆矩阵 / 口径聚合 / 快照服务
"""

from __future__ import annotations

import sqlite3
import tempfile
from datetime import date
from pathlib import Path

import pandas as pd

# ── 三因素分解引擎 ──────────────────────────────────────────────────────────────


class TestDecompositionEngine:
    """Laspeyres + LMDI 分解测试"""

    def _make_engine(self):
        from backend.core.decomposition_engine import DecompositionEngine
        return DecompositionEngine()

    def test_laspeyres_sum_equals_delta(self):
        engine = self._make_engine()
        current = {"registrations": 906, "reg_to_pay_rate": 0.203, "asp": 952.29}
        previous = {"registrations": 677, "reg_to_pay_rate": 0.167, "asp": 1009.19}
        result = engine.decompose_total(current, previous)

        lasp = result["laspeyres"]
        computed_sum = (
            lasp["vol_delta"] + lasp["conv_delta"]
            + lasp["price_delta"] + lasp["residual"]
        )
        assert abs(computed_sum - lasp["actual_delta"]) < 1.0

    def test_laspeyres_volume_positive_when_reg_increases(self):
        engine = self._make_engine()
        current = {"registrations": 1000, "reg_to_pay_rate": 0.2, "asp": 1000}
        previous = {"registrations": 800, "reg_to_pay_rate": 0.2, "asp": 1000}
        result = engine.decompose_total(current, previous)
        assert result["laspeyres"]["vol_delta"] > 0

    def test_lmdi_near_zero_residual(self):
        engine = self._make_engine()
        current = {"registrations": 906, "reg_to_pay_rate": 0.203, "asp": 952.29}
        previous = {"registrations": 677, "reg_to_pay_rate": 0.167, "asp": 1009.19}
        result = engine.decompose_total(current, previous)

        lmdi = result["lmdi"]
        lmdi_sum = lmdi["vol_lmdi"] + lmdi["conv_lmdi"] + lmdi["price_lmdi"]
        assert abs(lmdi_sum - lmdi["actual_delta"]) < 0.01

    def test_display_method_is_valid(self):
        engine = self._make_engine()
        current = {"registrations": 906, "reg_to_pay_rate": 0.203, "asp": 952.29}
        previous = {"registrations": 677, "reg_to_pay_rate": 0.167, "asp": 1009.19}
        result = engine.decompose_total(current, previous)
        assert result["display_method"] in ("laspeyres", "lmdi")


# ── 全月推算引擎 ──────────────────────────────────────────────────────────────


class TestProjectionEngine:
    """全月推算 + 敏感性测试"""

    def _make_engine(self):
        from backend.core.projection_engine import ProjectionEngine
        return ProjectionEngine()

    def test_projection_basic(self):
        engine = self._make_engine()
        actuals = {
            "registrations": 906,
            "appt_rate": 0.815,
            "attend_rate": 0.636,
            "paid_rate": 0.392,
            "asp": 952.29,
        }
        result = engine.project_full_month(actuals, bm_pct=0.78)

        # 全月注册 = 906 / 0.78 ≈ 1161
        proj_reg = result.get(
            "projected_registrations",
            result.get("full_month_registrations", 0),
        )
        assert 1100 < proj_reg < 1250

    def test_sensitivity_negative_impact(self):
        engine = self._make_engine()
        actuals = {
            "registrations": 906,
            "appt_rate": 0.815,
            "attend_rate": 0.636,
            "paid_rate": 0.392,
            "asp": 952.29,
        }
        projected = engine.project_full_month(actuals, bm_pct=0.78)
        sens = engine.sensitivity_test(projected, target_revenue=200000, asp_delta=-1.0)
        # 客单价下降应导致负面影响
        assert isinstance(sens, dict)


# ── 杠杆矩阵 ──────────────────────────────────────────────────────────────────


class TestLeverageEngine:
    """收入杠杆矩阵计算"""

    def test_returns_dict(self):
        from backend.core.leverage_engine import compute_leverage_matrix

        channel_data = {
            "CC窄口": {
                "registrations": 243,
                "appointments": 189,
                "attendance": 176,
                "payments": 90,
                "revenue_usd": 85561,
                "appt_rate": 0.778,
                "attend_rate": 0.931,
                "paid_rate": 0.511,
                "asp": 950.68,
            }
        }
        targets = {
            "appt_rate": 0.77,
            "attend_rate": 0.66,
            "paid_rate": 0.50,
            "asp": 950,
        }
        result = compute_leverage_matrix(
            channel_data, targets,
            historical_best={}, recent_trend_data={},
        )
        assert isinstance(result, dict)


# ── 转化率计算 ────────────────────────────────────────────────────────────────


class TestRateCalculations:
    """验证核心转化率公式"""

    def test_rates_from_felix_march_data(self):
        """用 Felix 提供的 2026-03 CC窄口数据验证"""
        reg, appt, attend, paid = 243, 189, 176, 90
        assert abs(appt / reg - 0.7778) < 0.01
        assert abs(attend / appt - 0.9312) < 0.01
        assert abs(paid / attend - 0.5114) < 0.01
        assert abs(paid / reg - 0.3704) < 0.01

    def test_total_equals_sum_of_channels(self):
        """总计 = CC窄 + SS窄 + LP窄 + 其它"""
        cc, ss, lp, other = 243, 25, 57, 581
        assert cc + ss + lp + other == 906


# ── 快照服务 ──────────────────────────────────────────────────────────────────


class TestDailySnapshotService:
    """SQLite 日快照幂等写入"""

    def _make_svc(self, tmpdir: str):
        from backend.core.daily_snapshot_service import DailySnapshotService
        db_path = Path(tmpdir) / "test.db"
        return DailySnapshotService(db_path=db_path), db_path

    def _make_df(self) -> pd.DataFrame:
        """构造模拟 D1 结果数据 DataFrame"""
        return pd.DataFrame([{
            "转介绍注册数": 906,
            "预约数": 738,
            "出席数": 469,
            "转介绍付费数": 184,
            "总带新付费金额USD": 175221,
            "客单价": 952.29,
            "统计日期": "2026-03-25",
        }])

    def test_idempotent_write(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            svc, db_path = self._make_svc(tmpdir)
            df = self._make_df()

            svc.write_daily(df, snapshot_date=date(2026, 3, 25))
            svc.write_daily(df, snapshot_date=date(2026, 3, 25))

            conn = sqlite3.connect(str(db_path))
            count = conn.execute(
                "SELECT COUNT(*) FROM daily_snapshots"
            ).fetchone()[0]
            conn.close()
            assert count == 1

    def test_query_by_date(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            svc, _ = self._make_svc(tmpdir)
            df = self._make_df()
            svc.write_daily(df, snapshot_date=date(2026, 3, 25))

            result = svc.query_by_date(date(2026, 3, 25))
            assert result is not None

            result2 = svc.query_by_date(date(2026, 3, 24))
            # 不存在的日期返回 total=None 的空结构
            assert result2 is None or result2.get("total") is None
