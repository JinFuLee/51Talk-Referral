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

    # ── 按围场分组归因核心方法 ──────────────────────────────────────────────

    def _attribute_by_enclosure(
        self,
    ) -> dict[str, dict[str, float]]:
        """按围场分组，将 D2 每组的 reg/pay/rev 按参与数占比分摊到各渠道。

        返回: {channel: {"part": N, "reg": N, "pay": N, "rev": N}}
        不同围场 revenue 密度不同 → 各渠道 per_capita 自然分化。
        """
        accum: dict[str, dict[str, float]] = {}
        has_enclosure = "围场" in self._d2.columns

        for enc_val, group in (
            self._d2.groupby("围场") if has_enclosure else [("ALL", self._d2)]
        ):
            enc_str = str(enc_val).strip()
            if enc_str in ("未付费非有效", "已付费非有效"):
                continue

            g_total = self._sum_col(group, "带新参与数") or 0
            g_reg = self._sum_col(group, "转介绍注册数") or 0
            g_pay = self._sum_col(group, "转介绍付费数") or 0
            g_rev = self._sum_col(group, "总带新付费金额USD") or 0

            if g_total == 0:
                continue

            # 窄口
            for ch, col in _NARROW_PARTICIPATION_COLS.items():
                p = self._sum_col(group, col) or 0
                if p <= 0:
                    continue
                ratio = p / g_total
                d = accum.setdefault(ch, {"part": 0, "reg": 0, "pay": 0, "rev": 0})
                d["part"] += p
                d["reg"] += g_reg * ratio
                d["pay"] += g_pay * ratio
                d["rev"] += g_rev * ratio

            # 宽口 → 围场→角色
            wp = self._sum_col(group, "宽口径带新参与数") or 0
            if wp > 0:
                ratio = wp / g_total
                wide_ch = (
                    self._enclosure_to_wide_channel(enc_str)
                    if has_enclosure
                    else "宽口"
                )
                d = accum.setdefault(wide_ch, {"part": 0, "reg": 0, "pay": 0, "rev": 0})
                d["part"] += wp
                d["reg"] += g_reg * ratio
                d["pay"] += g_pay * ratio
                d["rev"] += g_rev * ratio

        return accum

    # ── compute_channel_metrics ──────────────────────────────────────────────

    def compute_channel_metrics(self) -> list[ChannelMetrics]:
        """D2 聚合：各渠道注册数/付费数/金额（按围场分组归因 + 宽口拆分）"""
        if self._d2.empty:
            return []

        accum = self._attribute_by_enclosure()
        total_part = sum(d["part"] for d in accum.values())

        results: list[ChannelMetrics] = []
        # 固定渠道顺序：窄口在前，宽口在后
        order = ["CC窄", "SS窄", "LP窄"]
        wide_keys = sorted(k for k in accum if k not in order)
        for ch in order + wide_keys:
            d = accum.get(ch)
            if not d or d["part"] == 0:
                continue
            results.append(
                ChannelMetrics(
                    channel=ch,
                    registrations=round(d["reg"], 1),
                    payments=round(d["pay"], 1),
                    revenue_usd=round(d["rev"], 2),
                    share_pct=_safe_div(d["part"], total_part),
                )
            )
        return results

    # ── compute_revenue_contribution ─────────────────────────────────────────

    def compute_revenue_contribution(self) -> list[RevenueContribution]:
        """各渠道收入贡献 — 按围场分组归因，per_capita 按实际围场 revenue 密度分化"""
        if self._d2.empty:
            return []

        accum = self._attribute_by_enclosure()
        total_rev = sum(d["rev"] for d in accum.values())
        if total_rev == 0:
            return []

        results: list[RevenueContribution] = []
        order = ["CC窄", "SS窄", "LP窄"]
        wide_keys = sorted(k for k in accum if k not in order)
        for ch in order + wide_keys:
            d = accum.get(ch)
            if not d or d["rev"] <= 0:
                continue
            results.append(
                RevenueContribution(
                    channel=ch,
                    revenue=round(d["rev"], 2),
                    share=_safe_div(d["rev"], total_rev),
                    per_capita=_safe_div(d["rev"], d["part"]),
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
