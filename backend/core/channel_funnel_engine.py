"""ChannelFunnelEngine — D3 明细数据按口径聚合漏斗指标

口径说明（D3 `转介绍类型_新` 列值）:
  - CC窄口 / CC窄  → CC 窄口（推荐人绑定 CC）
  - SS窄口 / SS窄  → SS 窄口（推荐人绑定 SS/EA）
  - LP窄口 / LP窄  → LP 窄口（推荐人绑定 LP/CM）
  - 宽口           → 宽口（UserA 链接绑定，非直接服务绑定）

"其它" = 总计(D1) - CC窄 - SS窄 - LP窄（宽口 + 无法分类行）

输出格式:
    {
      "CC窄口": {
          "registrations": N,   # 转介绍注册数
          "appointments":  N,   # 邀约数
          "attendance":    N,   # 出席数
          "payments":      N,   # 转介绍付费数
          "revenue_usd":   N,   # 总带新付费金额USD
          "appt_rate":     N,   # 预约率 = appointments / registrations
          "attend_rate":   N,   # 预约出席率 = attendance / appointments
          "paid_rate":     N,   # 出席付费率 = payments / attendance
          "reg_to_pay_rate": N, # 注册付费率 = payments / registrations
          "asp":           N,   # 客单价 = revenue_usd / payments
      },
      "SS窄口": {...},
      "LP窄口": {...},
      "宽口":   {...},
      "其它":   {...},   # 有 D1 总计时才有此项
    }
"""

from __future__ import annotations

import logging
import math
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# D3 `转介绍类型_新` 列 → 规范化口径名映射
# 兼容多种写法（有无"口"后缀、宽/窄大小写等）
_CHANNEL_NORMALIZE: dict[str, str] = {
    "CC窄口": "CC窄口",
    "CC窄":   "CC窄口",
    "CC 窄口": "CC窄口",
    "SS窄口": "SS窄口",
    "SS窄":   "SS窄口",
    "SS 窄口": "SS窄口",
    "EA窄口": "SS窄口",   # SS 历史别名
    "EA窄":   "SS窄口",
    "LP窄口": "LP窄口",
    "LP窄":   "LP窄口",
    "LP 窄口": "LP窄口",
    "CM窄口": "LP窄口",   # LP 历史别名
    "CM窄":   "LP窄口",
    "宽口":   "宽口",
    "CC宽口": "宽口",
    "CC宽":   "宽口",
    "LP宽口": "宽口",
    "LP宽":   "宽口",
    "运营宽": "宽口",
}

# 漏斗标准列的候选名称（每个指标按优先级排列）
_COL_REGISTRATIONS = ("转介绍注册数", "注册数", "registrations")
_COL_APPOINTMENTS  = ("邀约数", "预约数", "appointments")
_COL_ATTENDANCE    = ("出席数", "到场数", "attendance")
_COL_PAYMENTS      = ("转介绍付费数", "付费数", "payments")
_COL_REVENUE       = ("总带新付费金额USD", "带新付费金额USD", "revenue_usd")


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return None


def _safe_div(a: float | None, b: float | None, precision: int = 6) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return round(a / b, precision)


def _col_sum(df: pd.DataFrame, *candidates: str) -> float | None:
    """在 df 中找第一个存在的候选列并求和，均不存在则返回 None。"""
    for col in candidates:
        if col in df.columns:
            try:
                val = pd.to_numeric(df[col], errors="coerce").sum()
                return _safe_float(val)
            except Exception:
                return None
    return None


def _find_col(df: pd.DataFrame, *candidates: str) -> str | None:
    """找到 df 中第一个存在的候选列名。"""
    for col in candidates:
        if col in df.columns:
            return col
    return None


def _build_metrics(
    registrations: float | None,
    appointments: float | None,
    attendance: float | None,
    payments: float | None,
    revenue_usd: float | None,
) -> dict[str, float | None]:
    """计算漏斗指标字典（含 4 个转化率 + asp）。"""
    asp = _safe_div(revenue_usd, payments, 2)
    appt_rate = _safe_div(appointments, registrations)
    attend_rate = _safe_div(attendance, appointments)
    paid_rate = _safe_div(payments, attendance)
    reg_to_pay_rate = _safe_div(payments, registrations)

    return {
        "registrations": registrations,
        "appointments": appointments,
        "attendance": attendance,
        "payments": payments,
        "revenue_usd": revenue_usd,
        "asp": asp,
        "appt_rate": appt_rate,
        "attend_rate": attend_rate,
        "paid_rate": paid_rate,
        "reg_to_pay_rate": reg_to_pay_rate,
    }


class ChannelFunnelEngine:
    """D3 明细数据按口径聚合漏斗指标引擎。

    Usage:
        engine = ChannelFunnelEngine(detail_df)
        result = engine.compute()
        # result["CC窄口"]["registrations"] → CC窄口注册数
    """

    # 固定输出口径顺序（无数据的口径仍包含在输出中，值为 None）
    CHANNEL_ORDER = ["CC窄口", "SS窄口", "LP窄口", "宽口"]

    def __init__(
        self,
        detail_df: pd.DataFrame,
        total_d1: dict[str, float | None] | None = None,
    ) -> None:
        """
        Args:
            detail_df : D3 明细数据 DataFrame（从 DataManager 的 "detail" key 取）
            total_d1  : D1 总计指标字典（有则计算"其它"，None 则跳过）
                        格式 {"registrations": N, "appointments": N, ...}
        """
        self._df = detail_df if detail_df is not None else pd.DataFrame()
        self._total = total_d1

    def compute(self) -> dict[str, dict[str, float | None]]:
        """按口径聚合 D3 明细，返回各口径漏斗指标 dict。

        Returns:
            {
              "CC窄口": {"registrations": N, ...},
              "SS窄口": {...},
              "LP窄口": {...},
              "宽口":   {...},
              "其它":   {...},   # 仅当 total_d1 不为 None 时才有
            }
        """
        if self._df.empty:
            logger.warning("ChannelFunnelEngine: D3 明细数据为空，返回空结果")
            empty = _build_metrics(None, None, None, None, None)
            return {ch: empty for ch in self.CHANNEL_ORDER}

        # 检查 `转介绍类型_新` 列是否存在
        type_col = _find_col(self._df, "转介绍类型_新", "三级渠道", "转介绍类型")

        df_with_ch = self._df.copy()

        if type_col is not None:
            # 方案 A：直接用口径列 groupby
            normalized = df_with_ch[type_col].astype(str).str.strip().map(
                lambda x: _CHANNEL_NORMALIZE.get(x, x)
            )
            df_with_ch["_channel_norm"] = normalized
        else:
            # 方案 B：从 last_cc/ss/lp_name 推导口径归属
            # 优先级：CC > SS > LP > 宽口（基于围场负责边界）
            logger.info(
                "ChannelFunnelEngine: 转介绍类型_新 列不存在，"
                "从 last_cc/ss/lp_name 推导口径"
            )
            cc_col = _find_col(df_with_ch, "last_cc_name")
            ss_col = _find_col(df_with_ch, "last_ss_name")
            lp_col = _find_col(df_with_ch, "last_lp_name")
            encl_col = _find_col(df_with_ch, "围场")

            def _infer_channel(row: pd.Series) -> str:
                encl = str(row.get(encl_col, "")) if encl_col else ""
                # 围场→角色映射：M0-M2(0-90天)=CC, M3-M4(91-120天)=SS, M5+(121+天)=LP
                cc_range = encl in ("M0", "M1", "M2", "0~30", "31~60", "61~90")
                ss_range = encl in ("M3", "M4", "91~120", "91~180")
                lp_range = encl in (
                    "M5", "M6", "M6+", "M7", "M8", "M9", "M10", "M11", "M12", "M12+",
                    "6M", "7M", "8M", "9M", "10M", "11M", "12M", "12M+",
                    "121~180", "181+", "181~365", "365+",
                )

                cc_name = str(row.get(cc_col, "")) if cc_col else ""
                ss_name = str(row.get(ss_col, "")) if ss_col else ""
                lp_name = str(row.get(lp_col, "")) if lp_col else ""

                has_cc = cc_name and cc_name not in ("", "nan", "None", "-")
                has_ss = ss_name and ss_name not in ("", "nan", "None", "-")
                has_lp = lp_name and lp_name not in ("", "nan", "None", "-")

                # 窄口判定：有绑定人 + 围场在对应负责范围
                if has_cc and cc_range:
                    return "CC窄口"
                if has_ss and ss_range:
                    return "SS窄口"
                if has_lp and lp_range:
                    return "LP窄口"
                # fallback：有绑定人但围场不在标准范围 → 按绑定人判定
                if has_cc:
                    return "CC窄口"
                if has_ss:
                    return "SS窄口"
                if has_lp:
                    return "LP窄口"
                return "宽口"

            df_with_ch["_channel_norm"] = df_with_ch.apply(
                _infer_channel, axis=1
            )

        result: dict[str, dict[str, float | None]] = {}
        narrow_totals: dict[str, dict[str, float]] = {}

        # ── 按规范化口径 groupby 聚合 ──────────────────────────────────────────
        for ch_name, group in df_with_ch.groupby("_channel_norm"):
            ch_str = str(ch_name)
            metrics = _build_metrics(
                registrations=_col_sum(group, *_COL_REGISTRATIONS),
                appointments=_col_sum(group, *_COL_APPOINTMENTS),
                attendance=_col_sum(group, *_COL_ATTENDANCE),
                payments=_col_sum(group, *_COL_PAYMENTS),
                revenue_usd=_col_sum(group, *_COL_REVENUE),
            )
            # 合并同名口径（如 CC窄口 从两列来）
            if ch_str in result:
                result[ch_str] = self._merge_metrics(result[ch_str], metrics)
            else:
                result[ch_str] = metrics

            # 记录窄口数据，用于计算"其它"
            if ch_str in ("CC窄口", "SS窄口", "LP窄口"):
                _count_keys = {
                    "registrations", "appointments", "attendance",
                    "payments", "revenue_usd",
                }
                narrow_totals[ch_str] = {
                    k: v for k, v in metrics.items()
                    if v is not None and k in _count_keys
                }

        # ── 确保所有标准口径都在结果中（无数据则 None）─────────────────────────
        for ch in self.CHANNEL_ORDER:
            if ch not in result:
                result[ch] = _build_metrics(None, None, None, None, None)

        # ── 计算"其它" = 总计 - CC窄 - SS窄 - LP窄 ────────────────────────────
        if self._total is not None:
            result["其它"] = self._compute_others(narrow_totals)

        # 按标准顺序返回
        ordered: dict[str, dict[str, float | None]] = {}
        for ch in self.CHANNEL_ORDER:
            ordered[ch] = result[ch]
        if "其它" in result:
            ordered["其它"] = result["其它"]
        # 追加其他非标准口径（宽口的细分等）
        for ch in result:
            if ch not in ordered:
                ordered[ch] = result[ch]

        return ordered

    def _compute_total_only(self) -> dict[str, dict[str, float | None]]:
        """无口径列时，仅聚合总计（放到"宽口"下，标注来源）。"""
        metrics = _build_metrics(
            registrations=_col_sum(self._df, *_COL_REGISTRATIONS),
            appointments=_col_sum(self._df, *_COL_APPOINTMENTS),
            attendance=_col_sum(self._df, *_COL_ATTENDANCE),
            payments=_col_sum(self._df, *_COL_PAYMENTS),
            revenue_usd=_col_sum(self._df, *_COL_REVENUE),
        )
        empty = _build_metrics(None, None, None, None, None)
        return {
            ch: (metrics if ch == "宽口" else empty)
            for ch in self.CHANNEL_ORDER
        }

    def _compute_others(
        self,
        narrow_totals: dict[str, dict[str, float]],
    ) -> dict[str, float | None]:
        """计算"其它" = D1 总计 - (CC窄 + SS窄 + LP窄) 各指标之和。"""
        metrics_keys = (
            "registrations", "appointments", "attendance", "payments", "revenue_usd"
        )

        narrow_sum: dict[str, float] = {k: 0.0 for k in metrics_keys}
        for ch_metrics in narrow_totals.values():
            for k in metrics_keys:
                narrow_sum[k] += ch_metrics.get(k, 0.0)

        others: dict[str, float | None] = {}
        for k in metrics_keys:
            total_val = self._total.get(k)  # type: ignore[union-attr]
            if total_val is None:
                others[k] = None
            else:
                others[k] = round(float(total_val) - narrow_sum[k], 4)

        return _build_metrics(
            registrations=others.get("registrations"),
            appointments=others.get("appointments"),
            attendance=others.get("attendance"),
            payments=others.get("payments"),
            revenue_usd=others.get("revenue_usd"),
        )

    @staticmethod
    def _merge_metrics(
        a: dict[str, float | None],
        b: dict[str, float | None],
    ) -> dict[str, float | None]:
        """合并两个同口径的 metrics dict（数值类相加，率类重新计算）。"""
        count_keys = (
            "registrations", "appointments", "attendance", "payments", "revenue_usd"
        )
        merged_counts: dict[str, float | None] = {}
        for k in count_keys:
            va = a.get(k)
            vb = b.get(k)
            if va is None and vb is None:
                merged_counts[k] = None
            else:
                merged_counts[k] = (va or 0.0) + (vb or 0.0)

        return _build_metrics(
            registrations=merged_counts.get("registrations"),
            appointments=merged_counts.get("appointments"),
            attendance=merged_counts.get("attendance"),
            payments=merged_counts.get("payments"),
            revenue_usd=merged_counts.get("revenue_usd"),
        )

    def compute_as_snapshot_format(self) -> dict[str, dict[str, float | None]]:
        """返回与 DailySnapshotService.write_daily() 兼容的格式。

        键值与 daily_channel_snapshots 表字段对应：
          registrations, appointments, attendance, payments,
          revenue_usd, asp, appt_rate, attend_rate, paid_rate, reg_to_pay_rate
        """
        return self.compute()
