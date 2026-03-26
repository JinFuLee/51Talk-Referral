"""DecompositionEngine — 三因素增量归因分解引擎

实现 Laspeyres 加法分解（主方法）+ LMDI（校验/备用方法）。
当 Laspeyres 残差率 > 3% 时自动切换 LMDI 展示。

理论来源：
  Ang, B.W. (2004). Energy Policy 32(9), 1131-1139. (B级)
  Ang, B.W. (2005). Energy Policy 33(7), 867-871. (B级)
  DOI: 10.1016/S0301-4215(03)00313-6

输出契约：frontend/lib/types/report.ts
  - LaspeyrersDecomposition（注意前端拼写带两个 r）
  - LMDIDecomposition
  - Decomposition（区块 8）
  - ChannelThreeFactor（区块 11）
"""

from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

# 残差率超过此阈值时自动切换 LMDI
_RESIDUAL_THRESHOLD = 0.03

# 防除零/对数零值替换
_DELTA = 1e-15


def _safe_log_mean(a: float, b: float) -> float:
    """对数均值函数 L(a, b) = (a - b) / ln(a/b)

    极限情况（a == b）：L(a, a) = a
    零值保护：以 _DELTA 替代 0，保证对数运算合法
    来源：Ang (2005) DOI:10.1016/S0301-4215(03)00313-6
    """
    a = max(a, _DELTA)
    b = max(b, _DELTA)
    if abs(a - b) < 1e-12:
        return a
    return (a - b) / (math.log(a) - math.log(b))


def _laspeyres_decompose(
    reg_0: float,
    conv_0: float,
    asp_0: float,
    reg_1: float,
    conv_1: float,
    asp_1: float,
) -> dict[str, float]:
    """Laspeyres 三因素加法分解

    Revenue = registrations × reg_to_pay_rate × asp
              = N × C × P

    Laspeyres 一阶效应（固定其他两因素在基期）：
      vol_delta  = ΔN × C₀ × P₀  （规模效应）
      conv_delta = N₀ × ΔC × P₀  （转化率效应）——但 TL 规格用报告期注册数 N₁
      price_delta = N₁ × C₁ × ΔP  （价格效应）

    注：TL 规格采用"渐进 Laspeyres"变体（与 task 公式对齐）：
      vol_delta  = (reg_1 - reg_0) × conv_0 × asp_0
      conv_delta = reg_1 × (conv_1 - conv_0) × asp_0
      price_delta = reg_1 × conv_1 × (asp_1 - asp_0)
    这等同于顺序替换法（N→C→P），残差被分配到 price 中，
    actual_delta = vol + conv + price（无显式残差项，但 actual_delta 与
    简单 Laspeyres 之和可能不等，故仍计算真实残差作信息字段）。

    Returns dict with keys matching LaspeyrersDecomposition interface.
    """
    rev_0 = reg_0 * conv_0 * asp_0
    rev_1 = reg_1 * conv_1 * asp_1
    actual_delta = rev_1 - rev_0

    d_reg = reg_1 - reg_0
    d_conv = conv_1 - conv_0
    d_asp = asp_1 - asp_0

    # 任务规格公式（渐进 Laspeyres）
    vol_delta = d_reg * conv_0 * asp_0
    conv_delta = reg_1 * d_conv * asp_0
    price_delta = reg_1 * conv_1 * d_asp

    # 残差 = actual - 三因素之和（纯 Laspeyres 交互项）
    residual = actual_delta - (vol_delta + conv_delta + price_delta)

    residual_pct = (
        abs(residual) / abs(actual_delta) if abs(actual_delta) > _DELTA else 0.0
    )

    return {
        "vol_delta": vol_delta,
        "conv_delta": conv_delta,
        "price_delta": price_delta,
        "residual": residual,
        "actual_delta": actual_delta,
        "residual_pct": residual_pct,
    }


def _lmdi_decompose(
    reg_0: float,
    conv_0: float,
    asp_0: float,
    reg_1: float,
    conv_1: float,
    asp_1: float,
) -> dict[str, float]:
    """LMDI 三因素加法分解（零残差）

    Revenue = N × C × P，取对数后线性可加：
      Δ_N = L(V₁, V₀) × ln(N₁/N₀)
      Δ_C = L(V₁, V₀) × ln(C₁/C₀)
      Δ_P = L(V₁, V₀) × ln(P₁/P₀)
    由对数均值性质保证 Δ_N + Δ_C + Δ_P = V₁ - V₀（完美分解）

    来源：Ang (2004) Energy Policy 32(9) (B级)
    """
    rev_0 = max(reg_0 * conv_0 * asp_0, _DELTA)
    rev_1 = max(reg_1 * conv_1 * asp_1, _DELTA)
    actual_delta = rev_1 - rev_0

    w = _safe_log_mean(rev_1, rev_0)

    vol_lmdi = w * math.log(max(reg_1, _DELTA) / max(reg_0, _DELTA))
    conv_lmdi = w * math.log(max(conv_1, _DELTA) / max(conv_0, _DELTA))
    price_lmdi = w * math.log(max(asp_1, _DELTA) / max(asp_0, _DELTA))

    # 理论残差 ≈ 0，浮点精度 < 1e-10
    residual = actual_delta - (vol_lmdi + conv_lmdi + price_lmdi)

    return {
        "vol_lmdi": vol_lmdi,
        "conv_lmdi": conv_lmdi,
        "price_lmdi": price_lmdi,
        "residual": abs(residual),
        "actual_delta": actual_delta,
    }


def _build_laspeyres_dict(d: dict[str, float]) -> dict[str, Any]:
    """映射到前端 LaspeyrersDecomposition interface（含双 r 拼写）"""
    return {
        "vol_delta": d["vol_delta"],
        "conv_delta": d["conv_delta"],
        "price_delta": d["price_delta"],
        "residual": d["residual"],
        "actual_delta": d["actual_delta"],
        "residual_pct": d["residual_pct"],
    }


def _build_lmdi_dict(d: dict[str, float]) -> dict[str, Any]:
    """映射到前端 LMDIDecomposition interface"""
    return {
        "vol_lmdi": d["vol_lmdi"],
        "conv_lmdi": d["conv_lmdi"],
        "price_lmdi": d["price_lmdi"],
        "residual": d["residual"],
        "actual_delta": d["actual_delta"],
    }


class DecompositionEngine:
    """三因素增量归因分解引擎

    提供两个主要入口：
      decompose_total()      — 总计三因素分解（区块 8）
      decompose_by_channel() — 每个口径独立分解（区块 11）
    """

    def decompose_total(
        self,
        current: dict[str, float],
        previous: dict[str, float],
    ) -> dict[str, Any]:
        """总计三因素分解

        Args:
            current: 当期指标，需包含 registrations / reg_to_pay_rate / asp /
                revenue_usd
            previous: 基期（上月同期）指标，同上结构

        Returns:
            对应 frontend Decomposition interface（区块 8）：
            {
              laspeyres: LaspeyrersDecomposition,
              lmdi: LMDIDecomposition,
              display_method: 'laspeyres' | 'lmdi',
              base_period: {...},
              current_period: {...},
            }
        """
        reg_0 = float(previous.get("registrations") or 0)
        conv_0 = float(previous.get("reg_to_pay_rate") or 0)
        asp_0 = float(previous.get("asp") or 0)
        reg_1 = float(current.get("registrations") or 0)
        conv_1 = float(current.get("reg_to_pay_rate") or 0)
        asp_1 = float(current.get("asp") or 0)

        las = _laspeyres_decompose(reg_0, conv_0, asp_0, reg_1, conv_1, asp_1)
        lmdi = _lmdi_decompose(reg_0, conv_0, asp_0, reg_1, conv_1, asp_1)

        # 残差率超阈值则前端切换展示 LMDI
        display_method = (
            "lmdi" if las["residual_pct"] > _RESIDUAL_THRESHOLD else "laspeyres"
        )

        if display_method == "lmdi":
            logger.info(
                "分解引擎：Laspeyres 残差率 %.1f%% > 3%% 阈值，前端将切换展示 LMDI",
                las["residual_pct"] * 100,
            )

        return {
            "laspeyres": _build_laspeyres_dict(las),
            "lmdi": _build_lmdi_dict(lmdi),
            "display_method": display_method,
            "base_period": {
                "registrations": reg_0,
                "reg_to_pay_rate": conv_0,
                "asp": asp_0,
                "revenue_usd": float(
                    previous.get("revenue_usd") or (reg_0 * conv_0 * asp_0)
                ),
            },
            "current_period": {
                "registrations": reg_1,
                "reg_to_pay_rate": conv_1,
                "asp": asp_1,
                "revenue_usd": float(
                    current.get("revenue_usd") or (reg_1 * conv_1 * asp_1)
                ),
            },
        }

    def decompose_by_channel(
        self,
        current_channels: list[dict[str, Any]],
        previous_channels: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """每个口径独立三因素分解

        Args:
            current_channels: 当期各渠道指标列表，每项含 channel / registrations /
                              reg_to_pay_rate / asp / revenue_usd
            previous_channels: 基期各渠道指标列表，同上结构

        Returns:
            对应 frontend ChannelThreeFactor interface（区块 11）：
            {
              channels: [ChannelThreeFactorRow, ...]
            }
        """
        # 建立基期 channel → metrics 查找表
        prev_map: dict[str, dict[str, Any]] = {
            str(ch.get("channel", "")): ch for ch in previous_channels
        }

        rows: list[dict[str, Any]] = []
        for ch in current_channels:
            channel_name = str(ch.get("channel", ""))
            prev = prev_map.get(channel_name, {})

            reg_0 = float(prev.get("registrations") or 0)
            conv_0 = float(prev.get("reg_to_pay_rate") or 0)
            asp_0 = float(prev.get("asp") or 0)
            reg_1 = float(ch.get("registrations") or 0)
            conv_1 = float(ch.get("reg_to_pay_rate") or 0)
            asp_1 = float(ch.get("asp") or 0)

            las = _laspeyres_decompose(reg_0, conv_0, asp_0, reg_1, conv_1, asp_1)
            lmdi = _lmdi_decompose(reg_0, conv_0, asp_0, reg_1, conv_1, asp_1)

            display_method = (
                "lmdi" if las["residual_pct"] > _RESIDUAL_THRESHOLD else "laspeyres"
            )

            rows.append(
                {
                    "channel": channel_name,
                    "laspeyres": _build_laspeyres_dict(las),
                    "lmdi": _build_lmdi_dict(lmdi),
                    "display_method": display_method,
                }
            )

        return {"channels": rows}
