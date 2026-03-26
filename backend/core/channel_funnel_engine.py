"""ChannelFunnelEngine — 用 D2 参与数比例分配 D1 总计漏斗指标到各口径

归因方法（对齐 AttributionEngine）：
  D2 每个围场有 CC/SS/LP/宽口 带新参与数
  → 按比例将该围场的 注册/预约/出席/付费/金额 分配到各口径
  → 汇总所有围场得到各口径的漏斗数据
  → 转化率从绝对值计算

输出格式:
    {
      "CC窄口": {"registrations": N, "appointments": N, "attendance": N,
                  "payments": N, "revenue_usd": N,
                  "appt_rate": N, "attend_rate": N, "paid_rate": N,
                  "reg_to_pay_rate": N, "asp": N},
      "SS窄口": {...},
      "LP窄口": {...},
      "宽口":   {...},
      "其它":   {...},   # D1总计 - 三窄口 - 宽口（兜底差值）
    }
"""

from __future__ import annotations

import logging
import math
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# D2 窄口参与数列名
_NARROW_COLS = {
    "CC窄口": "CC带新参与数",
    "SS窄口": "SS带新参与数",
    "LP窄口": "LP带新参与数",
}
_WIDE_COL = "宽口径带新参与数"
_TOTAL_COL = "带新参与数"

# D2 漏斗指标列名
_D2_REG_COL = "转介绍注册数"
_D2_PAY_COL = "转介绍付费数"
_D2_REV_COL = "总带新付费金额USD"

# D1 漏斗指标列名
_D1_REG_COL = "转介绍注册数"
_D1_APPT_COL = "预约数"
_D1_ATTEND_COL = "出席数"
_D1_PAY_COL = "转介绍付费数"
_D1_REV_COL = "总带新付费金额USD"


def _safe_div(a: float, b: float) -> float | None:
    if b == 0 or math.isnan(b):
        return None
    result = a / b
    return None if math.isnan(result) else round(result, 6)


def _sum_col(df: pd.DataFrame, col: str) -> float:
    if col not in df.columns:
        return 0.0
    return float(pd.to_numeric(df[col], errors="coerce").fillna(0).sum())


def _add_rates(m: dict[str, Any]) -> dict[str, Any]:
    """从绝对值计算 4 个转化率 + 客单价"""
    reg = m.get("registrations", 0) or 0
    appt = m.get("appointments", 0) or 0
    attend = m.get("attendance", 0) or 0
    pay = m.get("payments", 0) or 0
    rev = m.get("revenue_usd", 0) or 0

    m["appt_rate"] = _safe_div(appt, reg)
    m["attend_rate"] = _safe_div(attend, appt)
    m["paid_rate"] = _safe_div(pay, attend)
    m["reg_to_pay_rate"] = _safe_div(pay, reg)
    m["asp"] = _safe_div(rev, pay)
    return m


class ChannelFunnelEngine:
    """用 D2 参与数比例将 D1 总计分配到 CC窄/SS窄/LP窄/宽口/其它"""

    def __init__(
        self,
        d2_df: pd.DataFrame | None = None,
        d1_df: pd.DataFrame | None = None,
        d3_df: pd.DataFrame | None = None,
    ) -> None:
        self._d2 = d2_df
        self._d1 = d1_df
        self._d3 = d3_df

    @classmethod
    def from_data_dict(cls, data: dict[str, Any]) -> ChannelFunnelEngine:
        """从 DataManager.load_all() 返回的 dict 构建"""
        return cls(
            d2_df=data.get("enclosure_cc"),
            d1_df=data.get("result"),
            d3_df=data.get("detail"),
        )

    def compute(self) -> dict[str, dict[str, Any]]:
        """计算各口径的完整漏斗指标"""
        if self._d2 is None or not hasattr(self._d2, "columns"):
            logger.warning("ChannelFunnelEngine: D2 数据不存在")
            return {}

        # ── Step 1: D1 总计（泰国行，如有区域列则过滤）──
        d1_total = self._get_d1_total()

        # ── Step 2: D2 按围场分组，用参与数比例分配 ──
        channel_data = self._attribute_by_d2(d1_total)

        # ── Step 3: 计算"其它" = D1总计 - CC窄 - SS窄 - LP窄 - 宽口 ──
        if d1_total:
            known_sum = {}
            for key in ("registrations", "appointments", "attendance",
                        "payments", "revenue_usd"):
                known_sum[key] = sum(
                    ch.get(key, 0) or 0
                    for ch_name, ch in channel_data.items()
                )
            other = {}
            for key in ("registrations", "appointments", "attendance",
                        "payments", "revenue_usd"):
                d1_val = d1_total.get(key, 0) or 0
                other[key] = d1_val - known_sum[key]
            # 修正负值为 0
            for k in other:
                if other[k] < 0:
                    other[k] = 0
            channel_data["其它"] = _add_rates(other)

        # ── Step 4: 给每个口径补转化率 ──
        for ch_name in channel_data:
            _add_rates(channel_data[ch_name])

        return channel_data

    def _get_d1_total(self) -> dict[str, float]:
        """从 D1 获取泰国总计漏斗数据"""
        if self._d1 is None or not hasattr(self._d1, "columns"):
            return {}

        df = self._d1
        # 如果有区域列，过滤泰国
        if "区域" in df.columns:
            th_rows = df[df["区域"].astype(str).str.contains("泰")]
            if len(th_rows) > 0:
                df = th_rows

        return {
            "registrations": _sum_col(df, _D1_REG_COL),
            "appointments": _sum_col(df, _D1_APPT_COL),
            "attendance": _sum_col(df, _D1_ATTEND_COL),
            "payments": _sum_col(df, _D1_PAY_COL),
            "revenue_usd": _sum_col(df, _D1_REV_COL),
        }

    def _attribute_by_d2(
        self, d1_total: dict[str, float],
    ) -> dict[str, dict[str, Any]]:
        """用 D2 参与数比例分配注册/付费/金额，预约/出席用同比例估算"""
        accum: dict[str, dict[str, float]] = {}
        d2 = self._d2

        # D1 总计用于计算预约/出席的比例分配
        total_reg = d1_total.get("registrations", 0) or 1
        total_appt = d1_total.get("appointments", 0) or 0
        total_attend = d1_total.get("attendance", 0) or 0

        has_enclosure = "围场" in d2.columns
        groups = d2.groupby("围场") if has_enclosure else [("ALL", d2)]

        for enc_val, group in groups:
            enc_str = str(enc_val).strip()
            if enc_str in ("未付费非有效", "已付费非有效"):
                continue

            g_total_part = _sum_col(group, _TOTAL_COL)
            g_reg = _sum_col(group, _D2_REG_COL)
            g_pay = _sum_col(group, _D2_PAY_COL)
            g_rev = _sum_col(group, _D2_REV_COL)

            if g_total_part == 0:
                continue

            # 该围场的 reg 占 D1 总 reg 的比例 → 用于分配预约/出席
            enc_reg_ratio = g_reg / total_reg if total_reg > 0 else 0
            enc_appt = total_appt * enc_reg_ratio
            enc_attend = total_attend * enc_reg_ratio

            # 窄口
            for ch, col in _NARROW_COLS.items():
                p = _sum_col(group, col)
                if p <= 0:
                    continue
                ratio = p / g_total_part
                d = accum.setdefault(ch, {
                    "registrations": 0, "appointments": 0, "attendance": 0,
                    "payments": 0, "revenue_usd": 0,
                })
                d["registrations"] += g_reg * ratio
                d["payments"] += g_pay * ratio
                d["revenue_usd"] += g_rev * ratio
                d["appointments"] += enc_appt * ratio
                d["attendance"] += enc_attend * ratio

            # 宽口
            wp = _sum_col(group, _WIDE_COL)
            if wp > 0:
                ratio = wp / g_total_part
                d = accum.setdefault("宽口", {
                    "registrations": 0, "appointments": 0, "attendance": 0,
                    "payments": 0, "revenue_usd": 0,
                })
                d["registrations"] += g_reg * ratio
                d["payments"] += g_pay * ratio
                d["revenue_usd"] += g_rev * ratio
                d["appointments"] += enc_appt * ratio
                d["attendance"] += enc_attend * ratio

        # 四舍五入
        for ch in accum:
            for k in ("registrations", "appointments", "attendance", "payments"):
                accum[ch][k] = round(accum[ch].get(k, 0))
            accum[ch]["revenue_usd"] = round(accum[ch].get("revenue_usd", 0), 2)

        return accum

    def compute_as_snapshot_format(self, data: dict[str, Any]) -> dict[str, Any]:
        """生成适合 DailySnapshotService.write_daily() 消费的格式"""
        engine = ChannelFunnelEngine.from_data_dict(data)
        channel_data = engine.compute()

        # 提取总计
        d1_total = engine._get_d1_total()
        _add_rates(d1_total)

        return {
            "total": d1_total,
            "channels": {
                ch: metrics
                for ch, metrics in channel_data.items()
                if ch != "其它"
            },
        }
