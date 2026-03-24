"""AttributionEngine — 渠道归因分析（多口径：CC窄/SS窄/LP窄/CC宽/LP宽/运营宽）

归因规则（消费 Settings 配置，禁止硬编码）：
  窄口：直接看绑定关系（D2 参与数列 CC/SS/LP 带新参与数）
  宽口：看推荐人围场时间段 → Settings enclosure_role_override.json wide 配置
"""

from __future__ import annotations

import logging
import math

import pandas as pd

from backend.models.channel import (
    ChannelMetrics,
    RevenueContribution,
    ThreeFactorComparison,
)

logger = logging.getLogger(__name__)

# D2/D3 围场字符串 → M 标签映射
_BAND_TO_M: dict[str, str] = {
    "0~30": "M0",
    "31~60": "M1",
    "61~90": "M2",
    "91~120": "M3",
    "121~150": "M4",
    "151~180": "M5",
    "M6+": "M6+",
    "181+": "M6+",
}

# 默认宽口归因配置（Settings 读取失败时 fallback）
_DEFAULT_WIDE_ROLE: dict[str, list[str]] = {
    "M0": ["CC"],
    "M1": ["CC"],
    "M2": ["CC"],
    "M3": ["LP"],
    "M4": ["LP"],
    "M5": ["LP"],
    "M6+": ["运营"],
}

# 窄口渠道 D2 列映射
_NARROW_PARTICIPATION_COLS: dict[str, str] = {
    "CC窄": "CC带新参与数",
    "SS窄": "SS带新参与数",
    "LP窄": "LP带新参与数",
}


def _safe_float(val: object) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _safe_div(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return a / b


class AttributionEngine:
    """从 D2(enclosure_cc) + D3(detail) + Settings 围场配置 计算渠道归因"""

    def __init__(
        self,
        enclosure_cc_df: pd.DataFrame,
        detail_df: pd.DataFrame,
        wide_role_config: dict[str, list[str]] | None = None,
    ) -> None:
        self._d2 = enclosure_cc_df
        self._d3 = detail_df
        # wide_role_config 格式: {"M0": ["CC"], "M3": ["LP"], "M6+": ["运营"], ...}
        self._wide_cfg = wide_role_config or _DEFAULT_WIDE_ROLE

    def _sum_col(self, df: pd.DataFrame, col: str) -> float | None:
        if col not in df.columns:
            return None
        try:
            return float(pd.to_numeric(df[col], errors="coerce").sum())
        except Exception:
            return None

    def _enclosure_to_wide_channel(self, enclosure: str) -> str:
        """围场字符串 → 宽口归因渠道名（CC宽/LP宽/运营宽）"""
        m_label = _BAND_TO_M.get(str(enclosure).strip())
        if not m_label:
            return "运营宽"
        roles = self._wide_cfg.get(m_label, [])
        if not roles:
            return "运营宽"
        return f"{roles[0]}宽"

    # ── compute_channel_metrics ──────────────────────────────────────────────

    def compute_channel_metrics(self) -> list[ChannelMetrics]:
        """D2 聚合：各渠道注册数/付费数/金额（含宽口按围场拆分）"""
        if self._d2.empty:
            return []

        results: list[ChannelMetrics] = []
        has_enclosure = "围场" in self._d2.columns

        # ── 窄口渠道（CC窄/SS窄/LP窄）──────────────────────────────────────
        # 注册/付费/金额按参与数占比分摊（D2 仅有总量列，无窄口拆分列）
        total_participation = self._sum_col(self._d2, "带新参与数") or 0
        total_reg = self._sum_col(self._d2, "转介绍注册数") or 0
        total_pay = self._sum_col(self._d2, "转介绍付费数") or 0
        total_rev = self._sum_col(self._d2, "总带新付费金额USD") or 0

        for channel, part_col in _NARROW_PARTICIPATION_COLS.items():
            part = self._sum_col(self._d2, part_col) or 0
            share = _safe_div(part, total_participation)
            results.append(
                ChannelMetrics(
                    channel=channel,
                    registrations=round(total_reg * share, 1) if share else None,
                    payments=round(total_pay * share, 1) if share else None,
                    revenue_usd=round(total_rev * share, 2) if share else None,
                    share_pct=share,
                )
            )

        # ── 宽口渠道（按围场→角色拆分）──────────────────────────────────────
        wide_total_part = self._sum_col(self._d2, "宽口径带新参与数") or 0
        wide_share = _safe_div(wide_total_part, total_participation)

        if has_enclosure and wide_total_part > 0:
            # 按围场分组计算宽口参与数
            wide_by_role: dict[str, float] = {}
            for enc_val, group in self._d2.groupby("围场"):
                enc_str = str(enc_val).strip()
                if enc_str in ("未付费非有效", "已付费非有效"):
                    continue
                wide_ch = self._enclosure_to_wide_channel(enc_str)
                part = self._sum_col(group, "宽口径带新参与数") or 0
                wide_by_role[wide_ch] = wide_by_role.get(wide_ch, 0) + part

            # 宽口总金额按参与占比分摊
            wide_rev = total_rev * (wide_share or 0)
            wide_reg = total_reg * (wide_share or 0)
            wide_pay = total_pay * (wide_share or 0)

            for wide_ch, part in sorted(wide_by_role.items()):
                ch_share = _safe_div(part, wide_total_part)
                results.append(
                    ChannelMetrics(
                        channel=wide_ch,
                        registrations=round(wide_reg * ch_share, 1)
                        if ch_share
                        else None,
                        payments=round(wide_pay * ch_share, 1) if ch_share else None,
                        revenue_usd=round(wide_rev * ch_share, 2) if ch_share else None,
                        share_pct=_safe_div(part, total_participation),
                    )
                )
        else:
            # 无围场列或宽口为 0 → 输出合并宽口
            results.append(
                ChannelMetrics(
                    channel="宽口",
                    registrations=round(total_reg * wide_share, 1)
                    if wide_share
                    else None,
                    payments=round(total_pay * wide_share, 1) if wide_share else None,
                    revenue_usd=round(total_rev * wide_share, 2)
                    if wide_share
                    else None,
                    share_pct=wide_share,
                )
            )

        return results

    # ── compute_revenue_contribution ─────────────────────────────────────────

    def compute_revenue_contribution(self) -> list[RevenueContribution]:
        """各渠道收入贡献 — 按参与数占比归因（CC窄/SS窄/LP窄 + 宽口拆分）

        D2 金额列为全口径总量，按参与数占比分摊到各渠道。
        宽口进一步按围场→角色配置拆分。
        """
        if self._d2.empty:
            return []

        total_rev = self._sum_col(self._d2, "总带新付费金额USD") or 0
        if total_rev == 0:
            return []

        total_participation = self._sum_col(self._d2, "带新参与数") or 0
        if total_participation == 0:
            return []

        results: list[RevenueContribution] = []
        has_enclosure = "围场" in self._d2.columns

        # ── 窄口渠道收入归因 ───────────────────────────────────────────────
        for channel, part_col in _NARROW_PARTICIPATION_COLS.items():
            part = self._sum_col(self._d2, part_col) or 0
            rev = total_rev * _safe_div(part, total_participation) if part > 0 else 0
            if rev and rev > 0:
                results.append(
                    RevenueContribution(
                        channel=channel,
                        revenue=round(rev, 2),
                        share=_safe_div(rev, total_rev),
                        per_capita=_safe_div(rev, part),
                    )
                )

        # ── 宽口渠道收入归因（按围场拆分）──────────────────────────────────
        wide_total_part = self._sum_col(self._d2, "宽口径带新参与数") or 0
        wide_rev = total_rev * (_safe_div(wide_total_part, total_participation) or 0)

        if has_enclosure and wide_total_part > 0 and wide_rev > 0:
            wide_by_role: dict[str, dict[str, float]] = {}
            for enc_val, group in self._d2.groupby("围场"):
                enc_str = str(enc_val).strip()
                if enc_str in ("未付费非有效", "已付费非有效"):
                    continue
                wide_ch = self._enclosure_to_wide_channel(enc_str)
                part = self._sum_col(group, "宽口径带新参与数") or 0
                if wide_ch not in wide_by_role:
                    wide_by_role[wide_ch] = {"participation": 0}
                wide_by_role[wide_ch]["participation"] += part

            for wide_ch, info in sorted(wide_by_role.items()):
                part = info["participation"]
                ch_share = _safe_div(part, wide_total_part)
                ch_rev = wide_rev * (ch_share or 0)
                if ch_rev > 0:
                    results.append(
                        RevenueContribution(
                            channel=wide_ch,
                            revenue=round(ch_rev, 2),
                            share=_safe_div(ch_rev, total_rev),
                            per_capita=_safe_div(ch_rev, part),
                        )
                    )
        elif wide_rev > 0:
            results.append(
                RevenueContribution(
                    channel="宽口",
                    revenue=round(wide_rev, 2),
                    share=_safe_div(wide_rev, total_rev),
                    per_capita=_safe_div(wide_rev, wide_total_part)
                    if wide_total_part
                    else None,
                )
            )

        return results

    # ── compute_three_factor ─────────────────────────────────────────────────

    def compute_three_factor(self) -> list[ThreeFactorComparison]:
        """三因素对标：各渠道/围场 × 预约率/出席率/付费率"""
        if self._d2.empty:
            return []

        results: list[ThreeFactorComparison] = []

        # ── 总计（所有渠道合并）────────────────────────────────────────────
        reg = self._sum_col(self._d2, "转介绍注册数") or 0
        appt = self._sum_col(self._d3, "邀约数") if not self._d3.empty else None
        show = self._sum_col(self._d3, "出席数") if not self._d3.empty else None
        pay = self._sum_col(self._d2, "转介绍付费数") or 0

        appt_rate = _safe_div(appt, reg)
        show_rate = _safe_div(show, appt)
        pay_rate = _safe_div(pay, show)

        expected_pay = (
            reg * (appt_rate or 0) * (show_rate or 0) * (pay_rate or 0) if reg else None
        )

        results.append(
            ThreeFactorComparison(
                channel="总计",
                expected_volume=expected_pay,
                actual_volume=pay,
                gap=_safe_div(pay - expected_pay, expected_pay)
                if expected_pay
                else None,
                appt_factor=appt_rate,
                show_factor=show_rate,
                pay_factor=pay_rate,
            )
        )

        # ── 按围场→角色拆分（使用 D3 明细）──────────────────────────────────
        if not self._d3.empty and "围场" in self._d3.columns:
            role_data: dict[str, dict[str, float]] = {}

            for enc_val, group in self._d3.groupby("围场"):
                enc_str = str(enc_val).strip()
                if enc_str in ("未付费非有效", "已付费非有效"):
                    continue

                wide_ch = self._enclosure_to_wide_channel(enc_str)
                if wide_ch not in role_data:
                    role_data[wide_ch] = {"reg": 0, "appt": 0, "show": 0, "pay": 0}

                role_data[wide_ch]["reg"] += self._sum_col(group, "转介绍注册数") or 0
                role_data[wide_ch]["appt"] += self._sum_col(group, "邀约数") or 0
                role_data[wide_ch]["show"] += self._sum_col(group, "出席数") or 0
                role_data[wide_ch]["pay"] += self._sum_col(group, "转介绍付费数") or 0

            for ch_name, d in sorted(role_data.items()):
                r = d["reg"]
                a = d["appt"]
                s = d["show"]
                p = d["pay"]
                ar = _safe_div(a, r)
                sr = _safe_div(s, a)
                pr = _safe_div(p, s)
                expected = r * (ar or 0) * (sr or 0) * (pr or 0) if r else None

                results.append(
                    ThreeFactorComparison(
                        channel=ch_name,
                        expected_volume=expected,
                        actual_volume=p,
                        gap=_safe_div(p - expected, expected) if expected else None,
                        appt_factor=ar,
                        show_factor=sr,
                        pay_factor=pr,
                    )
                )

        return results
