"""ScenarioEngine — 漏斗各环节目标/实际/差距计算 + 场景推演"""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd

from backend.models.funnel import FunnelResult, FunnelStage, ScenarioResult

logger = logging.getLogger(__name__)

# 漏斗阶段名称
FUNNEL_STAGES = ["转介绍注册数", "预约数", "出席数", "转介绍付费数"]
CONVERSION_PAIRS = [
    ("注册预约率", "转介绍注册数", "预约数"),
    ("预约出席率", "预约数", "出席数"),
    ("出席付费率", "出席数", "转介绍付费数"),
]


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        import math

        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _safe_rate(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


class ScenarioEngine:
    """从 D1 result 行 + targets 计算漏斗分析"""

    def __init__(self, result_df: pd.DataFrame, targets: dict[str, Any]) -> None:
        self._result = result_df
        self._targets = targets
        self._row: dict[str, Any] = self._extract_row()

    def _extract_row(self) -> dict[str, Any]:
        """提取 D1 第一行（当期数据行）"""
        if self._result.empty:
            return {}
        # D1 只有 2 行（含标题），取第一个数据行
        row = self._result.iloc[0]
        return {str(k): v for k, v in row.items()}

    def _get_actual(self, col: str) -> float | None:
        return _safe_float(self._row.get(col))

    def _get_target(self, col: str) -> float | None:
        """从 targets dict 中查找目标值（支持模糊匹配）"""
        # 直接命中
        if col in self._targets:
            return _safe_float(self._targets[col])
        # 模糊匹配（targets key 可能带月份前缀）
        for k, v in self._targets.items():
            if col in str(k):
                return _safe_float(v)
        return None

    def compute_funnel(self) -> FunnelResult:
        """计算漏斗各环节的目标/实际/差距/达成率"""
        stages: list[FunnelStage] = []

        for stage_name in FUNNEL_STAGES:
            actual = self._get_actual(stage_name)
            target = self._get_target(stage_name)
            gap = (
                (actual - target)
                if (actual is not None and target is not None)
                else None
            )
            ach = _safe_rate(actual, target)

            stages.append(
                FunnelStage(
                    name=stage_name,
                    target=target,
                    actual=actual,
                    gap=gap,
                    achievement_rate=ach,
                )
            )

        # 转化率环节
        for rate_name, _num_col, _den_col in CONVERSION_PAIRS:
            actual_rate = self._get_actual(rate_name)
            target_rate = self._get_target(rate_name)
            gap = (
                (actual_rate - target_rate)
                if (actual_rate is not None and target_rate is not None)
                else None
            )
            stages.append(
                FunnelStage(
                    name=rate_name,
                    target=target_rate,
                    actual=actual_rate,
                    gap=gap,
                )
            )

        actual_rev = self._get_actual("总带新付费金额USD")
        target_rev = self._get_target("总带新付费金额USD") or self._get_target(
            "转介绍基础业绩标USD"
        )
        rev_gap = (
            (actual_rev - target_rev)
            if (actual_rev is not None and target_rev is not None)
            else None
        )
        rev_ach = _safe_rate(actual_rev, target_rev)

        date_val = self._row.get("统计日期")
        return FunnelResult(
            date=str(date_val) if date_val else None,
            stages=stages,
            target_revenue=target_rev,
            actual_revenue=actual_rev,
            revenue_gap=rev_gap,
            revenue_achievement=rev_ach,
        )

    def compute_scenario(self, scenario_stage: str) -> ScenarioResult:
        """场景推演：若 scenario_stage 转化率达到目标值，付费/业绩变化多少"""
        # 当前实际值
        actual_registrations = self._get_actual("转介绍注册数")
        actual_appt_rate = self._get_actual("注册预约率")
        actual_show_rate = self._get_actual("预约出席率")
        actual_pay_rate = self._get_actual("出席付费率")
        actual_asp = self._get_actual("客单价")

        target_appt_rate = self._get_target("注册预约率")
        target_show_rate = self._get_target("预约出席率")
        target_pay_rate = self._get_target("出席付费率")

        # 场景：将指定环节调到目标值
        sim_appt = actual_appt_rate
        sim_show = actual_show_rate
        sim_pay = actual_pay_rate

        if scenario_stage == "注册预约率":
            sim_appt = target_appt_rate or actual_appt_rate
        elif scenario_stage == "预约出席率":
            sim_show = target_show_rate or actual_show_rate
        elif scenario_stage == "出席付费率":
            sim_pay = target_pay_rate or actual_pay_rate

        # 推演漏斗
        sim_appts = (
            (actual_registrations * sim_appt)
            if (actual_registrations and sim_appt)
            else None
        )
        sim_shows = (sim_appts * sim_show) if (sim_appts and sim_show) else None
        sim_pays = (sim_shows * sim_pay) if (sim_shows and sim_pay) else None

        actual_pays = self._get_actual("转介绍付费数")

        incremental_payments = (
            (sim_pays - actual_pays)
            if (sim_pays is not None and actual_pays is not None)
            else None
        )
        incremental_revenue = (
            (incremental_payments * actual_asp)
            if (incremental_payments is not None and actual_asp)
            else None
        )

        stages = [
            FunnelStage(name="转介绍注册数", actual=actual_registrations),
            FunnelStage(name="预约数(场景)", actual=sim_appts),
            FunnelStage(name="出席数(场景)", actual=sim_shows),
            FunnelStage(name="付费数(场景)", actual=sim_pays),
        ]

        return ScenarioResult(
            scenario_stage=scenario_stage,
            scenario_rate_current=(
                actual_appt_rate
                if scenario_stage == "注册预约率"
                else actual_show_rate
                if scenario_stage == "预约出席率"
                else actual_pay_rate
            ),
            scenario_rate_target=(
                target_appt_rate
                if scenario_stage == "注册预约率"
                else target_show_rate
                if scenario_stage == "预约出席率"
                else target_pay_rate
            ),
            stages=stages,
            incremental_payments=incremental_payments,
            incremental_revenue=incremental_revenue,
        )
