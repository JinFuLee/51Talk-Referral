"""
Trend, Prediction & Anomaly Analyzer — extracted from AnalysisEngineV2 (M30)

Covers:
  - get_peak_valley        (原 _get_peak_valley,       行 1764-1775)
  - detect_trend_direction (原 _detect_trend_direction, 行 1746-1762)
  - analyze_trend          (原 _analyze_trend,          行 1777-1873)
  - analyze_prediction     (原 _analyze_prediction,     行 1877-1956)
  - detect_anomalies       (原 _detect_anomalies,       行 1960-2009)
"""
from __future__ import annotations

import calendar
import logging
import statistics
from typing import List

from .context import AnalyzerContext

logger = logging.getLogger(__name__)


class TrendAnalyzer:
    def __init__(self, ctx: AnalyzerContext):
        self.ctx = ctx

    # ── 工具：趋势方向 ─────────────────────────────────────────────────────────

    def detect_trend_direction(self, values: List[float]) -> str:
        """
        趋势方向引擎：判断近期走向。
        连续 >=3 期上升 = "rising"
        连续 >=3 期下降 = "falling"
        数据不足        = "insufficient"
        否则            = "volatile"
        """
        if len(values) < 3:
            return "insufficient"
        diffs  = [values[i + 1] - values[i] for i in range(len(values) - 1)]
        last_3 = diffs[-3:]
        if all(d > 0 for d in last_3):
            return "rising"
        if all(d < 0 for d in last_3):
            return "falling"
        return "volatile"

    # ── 巅峰/谷底 ─────────────────────────────────────────────────────────────

    def get_peak_valley(self, metric: str) -> dict:
        """
        从历史快照查询指定指标的巅峰/谷底。
        若无 SnapshotStore 或无历史数据，返回 None。
        """
        if self.ctx.snapshot_store is None:
            return {"peak": None, "valley": None}
        try:
            return self.ctx.snapshot_store.get_peak_valley(metric)
        except Exception as e:
            logger.warning(f"[get_peak_valley] metric={metric} 查询失败: {e}")
            return {"peak": None, "valley": None}

    # ── 16. trend ─────────────────────────────────────────────────────────────

    def analyze_trend(self) -> dict:
        """
        趋势分析，返回三层结构：
          - mom: 月度环比（F3 数据源）
          - yoy: 年同比（从快照查去年同月，无数据返回 available=False）
          - wow: 周环比（从快照查近 4 周 daily_kpi 聚合）
        顶层保留 daily（日趋势序列）和 direction（趋势方向）。
        """
        e5 = self.ctx.data.get("order", {}).get("revenue_daily_trend", []) or []
        e4 = self.ctx.data.get("order", {}).get("order_daily_trend", []) or []
        f3 = self.ctx.data.get("ops", {}).get("section_mom", {}) or {}

        e5_sorted = sorted(e5, key=lambda x: x.get("date", ""))
        e4_sorted = sorted(e4, key=lambda x: x.get("date", ""))

        # 按日期聚合收入/订单
        e5_by_date: dict = {}
        for r in e5_sorted:
            d = r.get("date", "")
            e5_by_date[d] = (e5_by_date.get(d) or 0) + (r.get("revenue_cny") or 0)

        e4_by_date: dict = {}
        for r in e4_sorted:
            d = r.get("date", "")
            e4_by_date[d] = (e4_by_date.get(d) or 0) + (r.get("order_count") or 0)

        all_dates = sorted(set(e5_by_date) | set(e4_by_date))
        daily = [
            {
                "date":        d,
                "revenue_cny": e5_by_date.get(d),
                "order_count": e4_by_date.get(d),
            }
            for d in all_dates
        ]

        # 趋势方向（基于日收入序列）
        rev_values = [e5_by_date[d] for d in all_dates if e5_by_date.get(d) is not None]
        direction  = self.detect_trend_direction(rev_values)

        # ── MoM：F3 月度环比 ──────────────────────────────────────────────────
        f3_by_month = f3.get("by_month", {}) or {}
        mom_months  = sorted(f3_by_month.keys())
        mom = {
            "months":    mom_months,
            "data":      f3_by_month,
            "direction": direction,
        }

        # ── YoY：从快照查去年同月 ─────────────────────────────────────────────
        current_month = self.ctx.data_date.strftime("%Y%m")
        yoy: dict
        if self.ctx.snapshot_store is not None:
            try:
                last_year_row = self.ctx.snapshot_store.get_same_month_last_year("注册", current_month)
                if last_year_row:
                    yoy = {
                        "available":       True,
                        "last_year_month": last_year_row.get("month"),
                        "registrations": {
                            "last_year_avg": last_year_row.get("avg_value"),
                            "last_year_sum": last_year_row.get("sum_value"),
                        },
                        "direction": direction,
                    }
                else:
                    yoy = {"available": False, "reason": "无去年同月历史数据"}
            except Exception as e:
                logger.warning(f"[YoY] 快照查询失败: {e}")
                yoy = {"available": False, "reason": f"快照查询异常: {e}"}
        else:
            yoy = {"available": False, "reason": "快照存储未初始化"}

        # ── WoW：从快照查近 4 周聚合 ─────────────────────────────────────────
        wow: dict
        if self.ctx.snapshot_store is not None:
            try:
                weekly_rows = self.ctx.snapshot_store.get_weekly_kpi("注册", weeks_back=4)
                wow_values  = [r.get("avg_value") for r in weekly_rows if r.get("avg_value") is not None]
                wow = {
                    "available": len(weekly_rows) >= 2,
                    "weeks":     weekly_rows,
                    "direction": self.detect_trend_direction(wow_values) if len(wow_values) >= 3 else "insufficient",
                }
            except Exception as e:
                logger.warning(f"[WoW] 快照查询失败: {e}")
                wow = {"available": False, "reason": f"快照查询异常: {e}"}
        else:
            wow = {"available": False, "reason": "快照存储未初始化"}

        return {
            "daily":     daily[-60:],   # 最近 60 天日趋势
            "direction": direction,     # 顶层趋势方向
            "mom":       mom,
            "yoy":       yoy,
            "wow":       wow,
        }

    # ── 17. prediction ────────────────────────────────────────────────────────

    def analyze_prediction(self) -> dict:
        """三模型预测（线性/WMA/EWM 三选优）：E5 日趋势预测月底收入"""
        e5 = self.ctx.data.get("order", {}).get("revenue_daily_trend", []) or []

        # 聚合日收入
        by_date: dict = {}
        for r in e5:
            d = r.get("date", "")
            by_date[d] = (by_date.get(d) or 0) + (r.get("revenue_cny") or 0)

        sorted_dates = sorted(by_date.keys())
        values       = [by_date[d] for d in sorted_dates]

        if len(values) < 3:
            return {
                "revenue":      {"predicted": None, "model": None, "confidence": None},
                "registration": {"predicted": None, "model": None, "confidence": None},
                "payment":      {"predicted": None, "model": None, "confidence": None},
            }

        days_in_month = calendar.monthrange(self.ctx.data_date.year, self.ctx.data_date.month)[1]
        elapsed_days  = self.ctx.data_date.day
        remaining     = days_in_month - elapsed_days

        cumulative = sum(values)
        daily_avg  = cumulative / max(elapsed_days, 1)

        # Linear
        linear_pred = cumulative + daily_avg * remaining

        # WMA (权重越近越大)
        if len(values) >= 5:
            recent   = values[-5:]
            weights  = [1, 2, 3, 4, 5]
            wma_daily = sum(v * w for v, w in zip(recent, weights)) / sum(weights)
        else:
            wma_daily = daily_avg
        wma_pred = cumulative + wma_daily * remaining

        # EWM (指数平滑, alpha=0.3)
        alpha = 0.3
        ewm   = values[0]
        for v in values[1:]:
            ewm = alpha * v + (1 - alpha) * ewm
        ewm_pred = cumulative + ewm * remaining

        # 选最接近均值的模型
        preds      = {"linear": linear_pred, "wma": wma_pred, "ewm": ewm_pred}
        mean_pred  = statistics.mean(preds.values())
        best_model = min(preds, key=lambda k: abs(preds[k] - mean_pred))

        # ── 数据驱动置信度（收入）────────────────────────────────────────────────
        # MAPE：三模型对历史末 N 期的留一法误差均值
        n_periods = len(values)
        # 用已有数据的最后 min(5, n_periods-1) 天作为"伪验证集"
        # 对每个模型计算预测值 vs 实际值的百分误差，取最优模型误差
        _val_size = min(5, max(1, n_periods - 1))
        _train    = values[:-_val_size]
        _val      = values[-_val_size:]
        _mape_errors: list[float] = []
        for actual_v in _val:
            if actual_v and actual_v != 0:
                _train_avg = statistics.mean(_train) if _train else daily_avg
                _mape_errors.append(abs(actual_v - _train_avg) / abs(actual_v))
                _train = _train + [actual_v]
        mape = statistics.mean(_mape_errors) if _mape_errors else 0.3

        # base: 数据期数越多越可信（每期 +0.03，上限 0.85），penalty: MAPE 越大扣越多
        rev_confidence = min(0.95, max(0.30, 0.50 + 0.03 * n_periods - 1.5 * mape))
        rev_confidence = round(rev_confidence, 2)

        # leads 预测（从 A1 total）
        a1_total    = self.ctx.data.get("leads", {}).get("leads_achievement", {}).get("total", {}) or {}
        reg_actual  = a1_total.get("注册") or 0
        paid_actual = a1_total.get("付费") or 0
        time_prog   = self.ctx.targets.get("时间进度", 0.0)

        reg_pred  = round(reg_actual  / max(time_prog, 0.01)) if time_prog > 0 and reg_actual  else None
        paid_pred = round(paid_actual / max(time_prog, 0.01)) if time_prog > 0 and paid_actual else None

        # ── 数据驱动置信度（注册/付费）──────────────────────────────────────────
        # 注册/付费基于线性外推，数据量少时置信度更低
        # 额外惩罚：时间进度 < 20%（月初数据不足）
        prog_penalty = max(0.0, 0.20 - time_prog) * 1.5  # 月初惩罚最大 0.30
        reg_confidence = round(
            min(0.90, max(0.20, 0.45 + 0.03 * n_periods - prog_penalty)), 2
        )
        paid_confidence = round(
            min(0.85, max(0.20, 0.40 + 0.03 * n_periods - prog_penalty)), 2
        )

        return {
            "revenue": {
                "predicted":  round(preds[best_model], 2),
                "model":      best_model,
                "confidence": rev_confidence,
                "all_models": {k: round(v, 2) for k, v in preds.items()},
            },
            "registration": {
                "predicted":  reg_pred,
                "model":      "linear",
                "confidence": reg_confidence,
            },
            "payment": {
                "predicted":  paid_pred,
                "model":      "linear",
                "confidence": paid_confidence,
            },
        }

    # ── 18. anomalies ────────────────────────────────────────────────────────

    def detect_anomalies(self) -> list:
        """动态阈值异常检测 (±2σ)"""
        anomalies: list = []

        # 日收入异常
        e5 = self.ctx.data.get("order", {}).get("revenue_daily_trend", []) or []
        daily_rev: dict = {}
        for r in e5:
            d = r.get("date", "")
            daily_rev[d] = (daily_rev.get(d) or 0) + (r.get("revenue_cny") or 0)

        if len(daily_rev) >= 5:
            vals      = list(daily_rev.values())
            mean_rev  = statistics.mean(vals)
            std_rev   = statistics.stdev(vals) if len(vals) > 1 else 0
            threshold = 2.0 * std_rev

            for date, val in daily_rev.items():
                if abs(val - mean_rev) > threshold and threshold > 0:
                    direction  = "骤降" if val < mean_rev else "骤升"
                    pct_change = abs(val - mean_rev) / mean_rev
                    severity   = "high" if pct_change >= 0.5 else "medium"
                    anomalies.append({
                        "metric":      "daily_revenue_usd",
                        "date":        date,
                        "value":       round(val, 2),
                        "expected":    round(mean_rev, 2),
                        "severity":    severity,
                        "description": f"收入{direction}{pct_change:.0%}",
                    })

        # CC 打卡率异常
        d1_by_cc = self.ctx.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []
        rates = [r.get("checkin_24h_rate") for r in d1_by_cc if r.get("checkin_24h_rate") is not None]
        if len(rates) >= 5:
            mean_c = statistics.mean(rates)
            std_c  = statistics.stdev(rates) if len(rates) > 1 else 0
            for r in d1_by_cc:
                rate = r.get("checkin_24h_rate")
                if rate is not None and std_c > 0 and abs(rate - mean_c) > 2 * std_c:
                    anomalies.append({
                        "metric":      "cc_checkin_rate",
                        "cc_name":     r.get("cc_name"),
                        "value":       rate,
                        "expected":    round(mean_c, 4),
                        "severity":    "medium",
                        "description": f"打卡率异常 ({rate:.0%} vs 均值{mean_c:.0%})",
                    })

        return sorted(anomalies, key=lambda x: x.get("severity", ""), reverse=True)
