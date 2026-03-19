"""AttributionEngine — 渠道归因分析（CC/SS/LP/宽口）"""

from __future__ import annotations

import logging

import pandas as pd

from backend.models.channel import (
    ChannelMetrics,
    RevenueContribution,
    ThreeFactorComparison,
)

logger = logging.getLogger(__name__)

# 渠道列映射：D2 中的列名 → 渠道标签
CHANNEL_COL_MAP = {
    "CC窄": {
        "participation": "CC带新参与数",
        "registrations": "转介绍注册数",
        "payments": "转介绍付费数",
        "revenue": "总带新付费金额USD",
    },
    "SS窄": {
        "participation": "SS带新参与数",
    },
    "LP窄": {
        "participation": "LP带新参与数",
    },
    "宽口": {
        "participation": "宽口径带新参与数",
    },
}


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        import math

        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _safe_div(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return a / b


class AttributionEngine:
    """从 D2(enclosure_cc) + D3(detail) 计算渠道归因"""

    def __init__(
        self,
        enclosure_cc_df: pd.DataFrame,
        detail_df: pd.DataFrame,
    ) -> None:
        self._d2 = enclosure_cc_df
        self._d3 = detail_df

    def _sum_col(self, df: pd.DataFrame, col: str) -> float | None:
        if col not in df.columns:
            return None
        try:
            return float(pd.to_numeric(df[col], errors="coerce").sum())
        except Exception:
            return None

    def compute_channel_metrics(self) -> list[ChannelMetrics]:
        """D2 聚合：各渠道注册数/付费数/金额"""
        if self._d2.empty:
            return []

        results = []
        total_registrations = self._sum_col(self._d2, "转介绍注册数") or 0
        total_revenue = self._sum_col(self._d2, "总带新付费金额USD") or 0

        # CC窄：有完整漏斗
        cc_reg = self._sum_col(self._d2, "转介绍注册数")
        cc_pay = self._sum_col(self._d2, "转介绍付费数")
        cc_rev = self._sum_col(self._d2, "总带新付费金额USD")
        results.append(
            ChannelMetrics(
                channel="CC窄",
                registrations=cc_reg,
                payments=cc_pay,
                revenue_usd=cc_rev,
                share_pct=_safe_div(cc_reg, total_registrations),
            )
        )

        # SS窄/LP窄/宽口：仅带新参与数
        for channel, col in [
            ("SS窄", "SS带新参与数"),
            ("LP窄", "LP带新参与数"),
            ("宽口", "宽口径带新参与数"),
        ]:
            participation = self._sum_col(self._d2, col)
            results.append(
                ChannelMetrics(
                    channel=channel,
                    registrations=participation,
                    share_pct=_safe_div(participation, total_registrations)
                    if participation
                    else None,
                )
            )

        return results

    def compute_revenue_contribution(self) -> list[RevenueContribution]:
        """各渠道收入贡献（以 D2 CC 口径为主）"""
        if self._d2.empty:
            return []

        total_revenue = self._sum_col(self._d2, "总带新付费金额USD") or 0
        total_payments = self._sum_col(self._d2, "转介绍付费数") or 0

        cc_rev = total_revenue  # D2 中的付费金额全为 CC 口径

        return [
            RevenueContribution(
                channel="CC窄",
                revenue=cc_rev,
                share=1.0 if total_revenue > 0 else None,
                per_capita=_safe_div(cc_rev, total_payments),
            )
        ]

    def compute_three_factor(self) -> list[ThreeFactorComparison]:
        """三因素对标：各渠道 × 预约率/出席率/付费率"""
        if self._d2.empty:
            return []

        # 从 D2 聚合注册/预约/出席/付费
        reg = self._sum_col(self._d2, "转介绍注册数") or 0
        # D2 不含预约/出席明细，需从 D3 获取
        appt = self._sum_col(self._d3, "邀约数") if not self._d3.empty else None
        show = self._sum_col(self._d3, "出席数") if not self._d3.empty else None
        pay = self._sum_col(self._d2, "转介绍付费数") or 0

        appt_rate = _safe_div(appt, reg)
        show_rate = _safe_div(show, appt)
        pay_rate = _safe_div(pay, show)

        # 期望付费（以注册数为基）
        expected_pay = (
            reg * (appt_rate or 0) * (show_rate or 0) * (pay_rate or 0) if reg else None
        )

        return [
            ThreeFactorComparison(
                channel="CC窄",
                expected_volume=expected_pay,
                actual_volume=pay,
                gap=_safe_div(pay - expected_pay, expected_pay)
                if expected_pay
                else None,
                appt_factor=appt_rate,
                show_factor=show_rate,
                pay_factor=pay_rate,
            )
        ]
