"""ProjectionEngine — 全月推算引擎 + 客单价敏感性 + 效率提升推演

基于当前工作日进度（bm_pct）推算月底达标情况，并提供
客单价敏感性测试和各环节效率提升推演。

输出契约：frontend/lib/types/report.ts
  - Projection（区块 4）
  - ScenarioAnalysis（区块 3）
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_DELTA = 1e-15


def _safe_div(numerator: float, denominator: float, fallback: float = 0.0) -> float:
    """安全除法，分母为零返回 fallback"""
    if abs(denominator) < _DELTA:
        return fallback
    return numerator / denominator


class ProjectionEngine:
    """全月推算引擎

    提供三个主要入口：
      project_full_month()  — 效率不变条件下的月底推算（区块 4）
      sensitivity_test()    — 客单价敏感性分析（内嵌于区块 4）
      scenario_compare()    — 效率提升推演（区块 3）
    """

    def project_full_month(
        self,
        actuals: dict[str, float],
        bm_pct: float,
        targets: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """全月推算：保持当前效率不变，推算月底各指标

        推算逻辑（效率不变假设）：
          全月注册   = 当前注册 / bm_pct
          全月预约   = 全月注册 × 当前预约率
          全月出席   = 全月预约 × 当前出席率
          全月付费   = 全月出席 × 当前付费率
          全月业绩   = 全月付费 × 当前客单价

        客单价敏感性（内嵌）：
          asp 每跌 $1 → 全月业绩变化多少

        Args:
            actuals: 当期累计实际值，需包含：
              registrations / appointments / attendance / payments / revenue_usd / asp
              以及派生率字段：appt_rate / attend_rate / paid_rate
            bm_pct:  当前工作日进度（0-1），如 0.45 = 已过 45% 工作日
            targets: 月度目标字典，包含 revenue_usd / payments 等（用于计算达标缺口）

        Returns:
            对应 frontend Projection interface（区块 4）
        """
        if bm_pct <= 0:
            logger.warning(
                "ProjectionEngine: bm_pct=%.4f 无效，默认置 0.01 防除零", bm_pct
            )
            bm_pct = 0.01

        # 读取当期累计指标
        reg_actual = float(actuals.get("registrations") or 0)
        appt_actual = float(actuals.get("appointments") or 0)
        attend_actual = float(actuals.get("attendance") or 0)
        pay_actual = float(actuals.get("payments") or 0)
        rev_actual = float(actuals.get("revenue_usd") or 0)
        asp_actual = float(actuals.get("asp") or 0)

        # 当期转化率（若 actuals 已含派生率则直接用，否则自行计算）
        appt_rate = float(
            actuals.get("appt_rate") or _safe_div(appt_actual, reg_actual)
        )
        attend_rate = float(
            actuals.get("attend_rate") or _safe_div(attend_actual, appt_actual)
        )
        paid_rate = float(
            actuals.get("paid_rate") or _safe_div(pay_actual, attend_actual)
        )

        # 全月推算（保持当前效率不变）
        proj_reg = _safe_div(reg_actual, bm_pct)
        proj_appt = proj_reg * appt_rate
        proj_attend = proj_appt * attend_rate
        proj_pay = proj_attend * paid_rate
        proj_rev = proj_pay * asp_actual

        # 客单价敏感性：asp 每跌 $1 的业绩影响
        asp_sensitivity = -proj_pay  # 全月付费数 × (-1)，即跌 $1 损失金额

        # 当前日均（基于已过工作日）
        elapsed_days = bm_pct  # 以进度比例代表已过"时间单位"
        current_daily_reg = _safe_div(reg_actual, elapsed_days)
        current_daily_pay = _safe_div(pay_actual, elapsed_days)
        current_daily_rev = _safe_div(rev_actual, elapsed_days)

        # 与月目标的缺口
        target_rev = float((targets or {}).get("revenue_usd") or 0)
        revenue_gap = proj_rev - target_rev if target_rev > 0 else None

        result: dict[str, Any] = {
            "projected_registrations": round(proj_reg, 2),
            "projected_appointments": round(proj_appt, 2),
            "projected_attendance": round(proj_attend, 2),
            "projected_payments": round(proj_pay, 2),
            "projected_revenue_usd": round(proj_rev, 2),
            "revenue_gap_to_target": (
                round(revenue_gap, 2) if revenue_gap is not None else None
            ),
            "asp_sensitivity_per_dollar": round(asp_sensitivity, 2),
            "current_daily_avg": {
                "registrations": round(current_daily_reg, 2),
                "payments": round(current_daily_pay, 2),
                "revenue_usd": round(current_daily_rev, 2),
            },
        }

        return result

    def sensitivity_test(
        self,
        projected: dict[str, Any],
        target_revenue: float,
        asp_delta: float = -1.0,
    ) -> dict[str, Any]:
        """客单价敏感性测试

        计算客单价变化 asp_delta（如 -1.0 = 跌 $1）对全月业绩的影响。

        Args:
            projected:        project_full_month() 的输出结果
            target_revenue:   月度业绩目标（USD）
            asp_delta:        客单价变化量（USD），默认 -1.0

        Returns:
            {
              asp_delta:        客单价变化量（USD）
              adjusted_revenue: 调整后预测业绩（USD）
              vs_target:        调整后业绩 vs 目标的达标率（0-1）
              revenue_change:   业绩变化量（USD，负=损失）
            }
        """
        proj_pay = float(projected.get("projected_payments") or 0)
        proj_rev = float(projected.get("projected_revenue_usd") or 0)

        # 全月付费数 × asp_delta = 业绩变化
        revenue_change = proj_pay * asp_delta
        adjusted_revenue = proj_rev + revenue_change

        vs_target = (
            _safe_div(adjusted_revenue, target_revenue) if target_revenue > 0 else None
        )

        return {
            "asp_delta": asp_delta,
            "adjusted_revenue": round(adjusted_revenue, 2),
            "vs_target": round(vs_target, 4) if vs_target is not None else None,
            "revenue_change": round(revenue_change, 2),
        }

    def scenario_compare(
        self,
        actuals: dict[str, float],
        targets: dict[str, float],
    ) -> dict[str, Any]:
        """效率提升推演：各环节率达到目标后的付费/业绩增量

        针对三个漏斗环节（appt_rate / attend_rate / paid_rate）分别推演：
        "如果该环节的转化率达到目标值，其他环节保持当前值，
         最终付费数和业绩会增加多少？"

        Args:
            actuals: 当期实际值，含 registrations / appt_rate / attend_rate /
                paid_rate / asp
            targets: 月度目标，含 appt_rate / attend_rate / paid_rate

        Returns:
            对应 frontend ScenarioAnalysis interface（区块 3）
        """
        reg = float(actuals.get("registrations") or 0)
        cur_appt_rate = float(actuals.get("appt_rate") or 0)
        cur_attend_rate = float(actuals.get("attend_rate") or 0)
        cur_paid_rate = float(actuals.get("paid_rate") or 0)
        asp = float(actuals.get("asp") or 0)

        tgt_appt_rate = float(targets.get("appt_rate") or cur_appt_rate)
        tgt_attend_rate = float(targets.get("attend_rate") or cur_attend_rate)
        tgt_paid_rate = float(targets.get("paid_rate") or cur_paid_rate)

        # 当前基线付费数
        baseline_appt = reg * cur_appt_rate
        baseline_attend = baseline_appt * cur_attend_rate
        baseline_pay = baseline_attend * cur_paid_rate

        def _build_scenario(
            name: str,
            stage: str,
            current_rate: float,
            target_rate: float,
            sim_appt_rate: float,
            sim_attend_rate: float,
            sim_paid_rate: float,
        ) -> dict[str, Any]:
            sim_appt = reg * sim_appt_rate
            sim_attend = sim_appt * sim_attend_rate
            sim_pay = sim_attend * sim_paid_rate

            delta_pay = sim_pay - baseline_pay
            delta_rev = delta_pay * asp

            # 注册变化（此环节上游为注册，故注册数影响来自 appt_rate 变化）
            delta_reg = 0.0  # 注册本身不受下游率变化影响

            return {
                "name": name,
                "stage": stage,
                "current_rate": round(current_rate, 4),
                "target_rate": round(target_rate, 4),
                "impact_registrations": round(delta_reg, 2),
                "impact_payments": round(delta_pay, 2),
                "impact_revenue": round(delta_rev, 2),
            }

        scenarios = [
            _build_scenario(
                name="预约率提升至目标",
                stage="appt_rate",
                current_rate=cur_appt_rate,
                target_rate=tgt_appt_rate,
                sim_appt_rate=tgt_appt_rate,
                sim_attend_rate=cur_attend_rate,
                sim_paid_rate=cur_paid_rate,
            ),
            _build_scenario(
                name="出席率提升至目标",
                stage="attend_rate",
                current_rate=cur_attend_rate,
                target_rate=tgt_attend_rate,
                sim_appt_rate=cur_appt_rate,
                sim_attend_rate=tgt_attend_rate,
                sim_paid_rate=cur_paid_rate,
            ),
            _build_scenario(
                name="付费率提升至目标",
                stage="paid_rate",
                current_rate=cur_paid_rate,
                target_rate=tgt_paid_rate,
                sim_appt_rate=cur_appt_rate,
                sim_attend_rate=cur_attend_rate,
                sim_paid_rate=tgt_paid_rate,
            ),
        ]

        return {"scenarios": scenarios}
