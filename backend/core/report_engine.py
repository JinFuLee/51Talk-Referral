"""ReportEngine — 统一组装 11 区块日报

将 ChannelFunnelEngine / ComparisonEngine / DecompositionEngine /
ProjectionEngine / LeverageEngine / TargetRecommender 的产出
组装为符合 frontend/lib/types/report.ts DailyReport 契约的完整 JSON。

使用方式:
    from backend.core.report_engine import ReportEngine
    engine = ReportEngine(data_manager=dm, db_path=DB_PATH, targets=targets)
    report = engine.generate_daily_report()
"""

from __future__ import annotations

import logging
import math
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from backend.core.channel_funnel_engine import ChannelFunnelEngine
from backend.core.comparison_engine import VALID_CHANNELS, ComparisonEngine
from backend.core.daily_snapshot_service import DB_PATH, DailySnapshotService
from backend.core.decomposition_engine import DecompositionEngine
from backend.core.leverage_engine import (
    compute_leverage_matrix,
    query_historical_best,
    query_recent_trend,
)
from backend.core.projection_engine import ProjectionEngine
from backend.core.target_recommender import recommend_targets

logger = logging.getLogger(__name__)

_DELTA = 1e-15

# 标准漏斗口径顺序
_CHANNEL_ORDER = ["CC窄口", "SS窄口", "LP窄口", "宽口"]


def _safe_float(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        f = float(val)
        return 0.0 if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return 0.0


def _safe_div(a: float, b: float) -> float:
    if abs(b) < _DELTA:
        return 0.0
    return a / b


def _judgment(delta: float | None) -> str:
    if delta is None:
        return "→"
    if delta > 0:
        return "↑"
    if delta < 0:
        return "↓"
    return "→"


class ReportEngine:
    """统一 11 区块日报组装器

    Args:
        data_manager: DataManager 实例（提供 D1/D3 数据）
        db_path:      SQLite 数据库路径（ComparisonEngine + SnapshotService 共用）
        targets:      月度目标字典，key 为中文或英文指标名
    """

    def __init__(
        self,
        data_manager: Any,
        db_path: Path | str = DB_PATH,
        targets: dict[str, Any] | None = None,
    ) -> None:
        self._dm = data_manager
        self._db_path = Path(db_path)
        self._targets = targets or {}
        self._snapshot_svc = DailySnapshotService(self._db_path)
        self._comparison_engine = ComparisonEngine(self._db_path)
        self._decomposition_engine = DecompositionEngine()
        self._projection_engine = ProjectionEngine()

    # ── 公共入口 ────────────────────────────────────────────────────────────────

    def generate_daily_report(
        self, reference_date: date | None = None
    ) -> dict[str, Any]:
        """生成完整 11 区块日报

        Args:
            reference_date: T-1 参考日期，默认取今天 - 1 天

        Returns:
            符合 frontend/lib/types/report.ts DailyReport 的 dict
        """
        if reference_date is None:
            reference_date = date.today() - timedelta(days=1)

        ref_str = reference_date.isoformat()
        month_key = reference_date.strftime("%Y%m")

        # ── 1. 从 DataManager 提取数据 ──────────────────────────────────────
        data = self._get_data()

        # ── 2. 构建漏斗指标（按口径分）──────────────────────────────────────
        channel_funnel = self._build_channel_funnel(data)
        total_metrics = self._build_total_metrics(channel_funnel)

        # ── 3. 归一化目标 ───────────────────────────────────────────────────
        targets = self._normalize_targets(month_key)

        # ── 4. bm_pct（工作日进度）────────────────────────────────────────
        bm_pct = self._get_bm_pct(data, reference_date)

        # ── 5. 8 维环比（总计口径，revenue_usd 为代表指标）──────────────────
        comparisons = self._build_comparisons(reference_date)

        # ── 6. 三档目标推荐 ────────────────────────────────────────────────
        target_recs = self._build_target_recommendations()

        # ── 7. 组装 11 区块 ────────────────────────────────────────────────
        blocks = {
            "monthly_overview": self._block_monthly_overview(
                total_metrics, targets, bm_pct
            ),
            "gap_dashboard": self._block_gap_dashboard(
                total_metrics, targets, channel_funnel
            ),
            "scenario_analysis": self._block_scenario_analysis(total_metrics, targets),
            "projection": self._block_projection(total_metrics, bm_pct, targets),
            "revenue_contribution": self._block_revenue_contribution(channel_funnel),
            "mom_attribution": self._block_mom_attribution(
                total_metrics, targets, reference_date
            ),
            "lead_attribution": self._block_lead_attribution(channel_funnel),
            "decomposition": self._block_decomposition(total_metrics, reference_date),
            "funnel_leverage": self._block_funnel_leverage(channel_funnel, targets),
            "channel_revenue": self._block_channel_revenue(
                channel_funnel, reference_date
            ),
            "channel_three_factor": self._block_channel_three_factor(
                channel_funnel, reference_date
            ),
        }

        return {
            "date": ref_str,
            "bm_pct": round(bm_pct, 4),
            "blocks": blocks,
            "target_recommendations": target_recs,
            "comparisons": comparisons,
        }

    def generate_summary(self, reference_date: date | None = None) -> dict[str, Any]:
        """生成摘要（钉钉推送 + 首屏快速渲染用）

        Returns:
            符合 ReportSummary 接口的 dict
        """
        if reference_date is None:
            reference_date = date.today() - timedelta(days=1)

        month_key = reference_date.strftime("%Y%m")
        data = self._get_data()
        channel_funnel = self._build_channel_funnel(data)
        total_metrics = self._build_total_metrics(channel_funnel)
        targets = self._normalize_targets(month_key)
        bm_pct = self._get_bm_pct(data, reference_date)

        reg_target = _safe_float(targets.get("registrations"))
        pay_target = _safe_float(targets.get("payments"))
        rev_target = _safe_float(targets.get("revenue_usd"))

        reg_actual = _safe_float(total_metrics.get("registrations"))
        pay_actual = _safe_float(total_metrics.get("payments"))
        rev_actual = _safe_float(total_metrics.get("revenue_usd"))

        reg_progress = _safe_div(reg_actual, reg_target) if reg_target > 0 else 0.0
        pay_progress = _safe_div(pay_actual, pay_target) if pay_target > 0 else 0.0
        rev_progress = _safe_div(rev_actual, rev_target) if rev_target > 0 else 0.0

        # 日维度环比（业绩）
        day_comp = self._comparison_engine.compute(
            "revenue_usd", "total", reference_date
        ).get("day", {})

        # 瓶颈文案
        leverage = compute_leverage_matrix(
            channel_funnel_data=channel_funnel,
            targets=targets,
        )
        top_bn = leverage.get("top_bottleneck", {})
        stage_map = {
            "appt_rate": "预约率",
            "attend_rate": "出席率",
            "paid_rate": "付费率",
        }
        bn_stage = stage_map.get(top_bn.get("stage", ""), top_bn.get("stage", ""))
        bn_channel = top_bn.get("channel", "")
        bn_impact = _safe_float(top_bn.get("revenue_impact"))
        bottleneck_text = (
            f"{bn_channel} {bn_stage} — 达标可增收 ${bn_impact:,.0f}"
            if bn_channel
            else "暂无数据"
        )

        return {
            "date": reference_date.isoformat(),
            "bm_pct": round(bm_pct, 4),
            "reg_progress": round(reg_progress, 4),
            "payment_progress": round(pay_progress, 4),
            "revenue_progress": round(rev_progress, 4),
            "revenue_usd": round(rev_actual, 2),
            "revenue_target": round(rev_target, 2),
            "top_bottleneck_text": bottleneck_text,
            "day_comparison": day_comp,
        }

    # ── 数据提取 ────────────────────────────────────────────────────────────────

    def _get_data(self) -> dict[str, Any]:
        """从 DataManager 取得最新数据，失败时返回空 dict"""
        try:
            return self._dm.load_all() or {}
        except Exception as exc:
            logger.warning("DataManager 取数失败: %s", exc)
            return {}

    def _build_channel_funnel(self, data: dict[str, Any]) -> dict[str, dict[str, Any]]:
        """构建按口径分的漏斗指标"""

        engine = ChannelFunnelEngine.from_data_dict(data)
        result = engine.compute()
        if not result:
            empty: dict[str, Any] = {
                "registrations": None, "appointments": None,
                "attendance": None, "payments": None,
                "revenue_usd": None, "asp": None,
                "appt_rate": None, "attend_rate": None,
                "paid_rate": None, "reg_to_pay_rate": None,
            }
            return {ch: dict(empty) for ch in _CHANNEL_ORDER}
        return result

    def _build_total_metrics(
        self, channel_funnel: dict[str, dict[str, Any]]
    ) -> dict[str, Any]:
        """从 D1 直接取总计指标（而非口径加总，避免 D2 覆盖不全）"""
        data = self._get_data()
        d1 = data.get("result")
        if d1 is not None and hasattr(d1, "columns"):
            df = d1
            if "区域" in df.columns:
                th = df[df["区域"].astype(str).str.contains("泰")]
                if len(th) > 0:
                    df = th
            from backend.core.channel_funnel_engine import _sum_col

            reg = _sum_col(df, "转介绍注册数")
            appt = _sum_col(df, "预约数")
            attend = _sum_col(df, "出席数")
            pay = _sum_col(df, "转介绍付费数")
            rev = _sum_col(df, "总带新付费金额USD")
        else:
            reg = appt = attend = pay = rev = 0.0

        return {
            "registrations": reg,
            "appointments": appt,
            "attendance": attend,
            "payments": pay,
            "revenue_usd": rev,
            "asp": _safe_div(rev, pay),
            "appt_rate": _safe_div(appt, reg),
            "attend_rate": _safe_div(attend, appt),
            "paid_rate": _safe_div(pay, attend),
            "reg_to_pay_rate": _safe_div(pay, reg),
        }

    def _normalize_targets(self, month_key: str) -> dict[str, Any]:
        """归一化目标：从中文 key 转英文，并合并 override"""
        from backend.core.config import MONTHLY_TARGETS
        from backend.core.config import get_targets as _get_targets

        base_targets: dict[str, Any] = {}

        # 从 MONTHLY_TARGETS 取当月基线
        if month_key in MONTHLY_TARGETS:
            raw = MONTHLY_TARGETS[month_key]
            base_targets["registrations"] = _safe_float(raw.get("注册目标", 0))
            base_targets["payments"] = _safe_float(raw.get("付费目标", 0))
            base_targets["revenue_usd"] = _safe_float(raw.get("金额目标", 0))
            base_targets["appt_rate"] = _safe_float(raw.get("约课率目标", 0.77))
            base_targets["attend_rate"] = _safe_float(raw.get("出席率目标", 0.66))
            base_targets["paid_rate"] = _safe_float(raw.get("转化率目标", 0.23))
            base_targets["asp"] = _safe_float(raw.get("客单价", 850))

        # 用 get_targets()（含 override）覆盖
        try:
            overrides = _get_targets()
            for k, v in overrides.items():
                if k in base_targets:
                    base_targets[k] = _safe_float(v)
        except Exception:
            pass

        # 合并实例初始化时传入的 targets
        for k, v in self._targets.items():
            base_targets[k] = _safe_float(v)

        return base_targets

    def _get_bm_pct(self, data: dict[str, Any], ref_date: date) -> float:
        """从数据或工作日计算获取月度进度"""
        # 优先从缓存取
        bm = _safe_float(data.get("bm_pct") or data.get("time_progress"))
        if bm > 0:
            return min(bm, 1.0)

        # 自行计算当月工作日进度（非周三视为工作日）
        y, m = ref_date.year, ref_date.month
        total_wd = 0
        elapsed_wd = 0
        import calendar

        days_in_month = calendar.monthrange(y, m)[1]
        for d in range(1, days_in_month + 1):
            wd = date(y, m, d).weekday()
            if wd != 2:  # 非周三
                total_wd += 1
                if d <= ref_date.day:
                    elapsed_wd += 1

        return round(_safe_div(elapsed_wd, total_wd), 4) if total_wd > 0 else 0.0

    def _build_comparisons(self, ref_date: date) -> dict[str, Any]:
        """构建 7 维环比（revenue_usd 总计口径）"""
        dim_keys = [
            "day",
            "week_td",
            "week_roll",
            "month_td",
            "month_roll",
            "year_td",
            "year_roll",
        ]
        try:
            result = self._comparison_engine.compute("revenue_usd", "total", ref_date)
            return {k: result.get(k, {}) for k in dim_keys}
        except Exception as exc:
            logger.warning("环比计算失败: %s", exc)
            empty = {
                "current": None,
                "previous": None,
                "delta": None,
                "delta_pct": None,
                "judgment": "→",
            }
            return {k: empty for k in dim_keys}

    def _build_target_recommendations(self) -> list[dict[str, Any]]:
        """调用 TargetRecommender 生成三档推荐"""
        try:
            result = recommend_targets(self._snapshot_svc)
            recs = result.get("recommendations")
            return recs if recs else []
        except Exception as exc:
            logger.warning("目标推荐生成失败: %s", exc)
            return []

    # ── 11 区块组装方法 ─────────────────────────────────────────────────────────

    def _block_monthly_overview(
        self,
        actuals: dict[str, Any],
        targets: dict[str, Any],
        bm_pct: float,
    ) -> dict[str, Any]:
        """区块 1: 月度总览"""
        metrics = [
            "registrations",
            "appointments",
            "attendance",
            "payments",
            "revenue_usd",
            "appt_rate",
            "attend_rate",
            "paid_rate",
        ]

        actuals_out: dict[str, float] = {}
        targets_out: dict[str, float] = {}
        bm_efficiency: dict[str, float] = {}
        gap: dict[str, float] = {}
        remaining_daily_avg: dict[str, float] = {}
        pace_daily_needed: dict[str, float] = {}

        for m in metrics:
            act = _safe_float(actuals.get(m))
            tgt = _safe_float(targets.get(m))
            actuals_out[m] = round(act, 4)
            targets_out[m] = round(tgt, 4)

            if tgt > 0 and bm_pct > 0:
                pace_target = tgt * bm_pct
                eff = _safe_div(act, pace_target)
            else:
                eff = 0.0
            bm_efficiency[m] = round(eff, 4)
            gap[m] = round(eff - 1.0, 4)

            remaining = 1.0 - bm_pct
            if remaining > 0 and tgt > 0:
                rdaily = _safe_div(max(tgt - act, 0), remaining)
                pdaily = _safe_div(max(tgt * bm_pct - act, 0), remaining)
            else:
                rdaily = 0.0
                pdaily = 0.0
            remaining_daily_avg[m] = round(rdaily, 4)
            pace_daily_needed[m] = round(pdaily, 4)

        return {
            "bm_pct": round(bm_pct, 4),
            "targets": targets_out,
            "actuals": actuals_out,
            "bm_efficiency": bm_efficiency,
            "gap": gap,
            "remaining_daily_avg": remaining_daily_avg,
            "pace_daily_needed": pace_daily_needed,
        }

    def _block_gap_dashboard(
        self,
        actuals: dict[str, Any],
        targets: dict[str, Any],
        channel_funnel: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """区块 2: 目标分解 + 各类缺口"""
        rev_act = _safe_float(actuals.get("revenue_usd"))
        rev_tgt = _safe_float(targets.get("revenue_usd"))
        asp = _safe_float(actuals.get("asp")) or 850.0
        paid_rate = _safe_float(actuals.get("paid_rate")) or 0.23
        attend_rate = _safe_float(actuals.get("attend_rate")) or 0.66
        appt_rate = _safe_float(actuals.get("appt_rate")) or 0.77

        revenue_gap = rev_act - rev_tgt
        asp_gap = asp - _safe_float(targets.get("asp"))

        # 逐级倒推缺口
        bill_gap = _safe_div(max(-revenue_gap, 0), asp)
        showup_gap = _safe_div(bill_gap, paid_rate)
        appt_gap = _safe_div(showup_gap, attend_rate)
        lead_gap = _safe_div(appt_gap, appt_rate)

        # 各渠道注册缺口 = 目标 - 实际（以总目标比例分配）
        reg_tgt = _safe_float(targets.get("registrations"))
        reg_act = _safe_float(actuals.get("registrations"))
        _ = max(reg_tgt - reg_act, 0)  # gap reserved for future use

        # 渠道注册目标（从 targets 读取或按历史比例）
        channel_targets: dict[str, float] = {}
        channel_lead_gaps: dict[str, float] = {}
        total_ch_reg = sum(
            _safe_float(channel_funnel.get(ch, {}).get("registrations"))
            for ch in _CHANNEL_ORDER
        )
        for ch in _CHANNEL_ORDER:
            ch_reg = _safe_float(channel_funnel.get(ch, {}).get("registrations"))
            ch_ratio = _safe_div(ch_reg, total_ch_reg) if total_ch_reg > 0 else 0.25
            ch_tgt = round(reg_tgt * ch_ratio, 1) if reg_tgt > 0 else 0.0
            channel_targets[ch] = ch_tgt
            channel_lead_gaps[ch] = round(max(ch_tgt - ch_reg, 0), 1)

        return {
            "channel_targets": channel_targets,
            "gaps": {
                "revenue_gap": round(revenue_gap, 2),
                "asp_gap": round(asp_gap, 2),
                "bill_gap": round(bill_gap, 1),
                "showup_gap": round(showup_gap, 1),
                "appt_gap": round(appt_gap, 1),
                "lead_gap": round(lead_gap, 1),
                "channel_lead_gaps": channel_lead_gaps,
            },
        }

    def _block_scenario_analysis(
        self,
        actuals: dict[str, Any],
        targets: dict[str, Any],
    ) -> dict[str, Any]:
        """区块 3: 效率提升推演"""
        return self._projection_engine.scenario_compare(actuals, targets)

    def _block_projection(
        self,
        actuals: dict[str, Any],
        bm_pct: float,
        targets: dict[str, Any],
    ) -> dict[str, Any]:
        """区块 4: 效率不变月底推算"""
        return self._projection_engine.project_full_month(actuals, bm_pct, targets)

    def _block_revenue_contribution(
        self,
        channel_funnel: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """区块 5: 当月业绩贡献"""
        channels_out: list[dict[str, Any]] = []
        narrow_agg = {
            k: 0.0
            for k in (
                "registrations",
                "appointments",
                "attendance",
                "payments",
                "revenue_usd",
            )
        }

        for ch in _CHANNEL_ORDER:
            m = channel_funnel.get(ch, {})
            row = {"channel": ch}
            for key in (
                "registrations",
                "appointments",
                "attendance",
                "payments",
                "revenue_usd",
                "asp",
                "appt_rate",
                "attend_rate",
                "paid_rate",
                "reg_to_pay_rate",
            ):
                row[key] = _safe_float(m.get(key))
            channels_out.append(row)
            if ch in ("CC窄口", "SS窄口", "LP窄口"):
                for k in narrow_agg:
                    narrow_agg[k] += _safe_float(m.get(k))

        # 窄口小计
        narrow_pay = narrow_agg["payments"]
        narrow_rev = narrow_agg["revenue_usd"]
        narrow_reg = narrow_agg["registrations"]
        narrow_appt = narrow_agg["appointments"]
        narrow_attend = narrow_agg["attendance"]
        narrow_subtotal: dict[str, Any] = {
            "channel": "narrow_subtotal",
            "registrations": narrow_reg,
            "appointments": narrow_appt,
            "attendance": narrow_attend,
            "payments": narrow_pay,
            "revenue_usd": narrow_rev,
            "asp": _safe_div(narrow_rev, narrow_pay),
            "appt_rate": _safe_div(narrow_appt, narrow_reg),
            "attend_rate": _safe_div(narrow_attend, narrow_appt),
            "paid_rate": _safe_div(narrow_pay, narrow_attend),
            "reg_to_pay_rate": _safe_div(narrow_pay, narrow_reg),
        }

        # 合计（含宽口）
        all_channels = list(channel_funnel.keys())
        total_agg = {
            k: 0.0
            for k in (
                "registrations",
                "appointments",
                "attendance",
                "payments",
                "revenue_usd",
            )
        }
        for ch in all_channels:
            if ch == "其它":
                continue
            m = channel_funnel.get(ch, {})
            for k in total_agg:
                total_agg[k] += _safe_float(m.get(k))

        t_pay = total_agg["payments"]
        t_rev = total_agg["revenue_usd"]
        t_reg = total_agg["registrations"]
        t_appt = total_agg["appointments"]
        t_attend = total_agg["attendance"]
        total: dict[str, Any] = {
            "channel": "total",
            "registrations": t_reg,
            "appointments": t_appt,
            "attendance": t_attend,
            "payments": t_pay,
            "revenue_usd": t_rev,
            "asp": _safe_div(t_rev, t_pay),
            "appt_rate": _safe_div(t_appt, t_reg),
            "attend_rate": _safe_div(t_attend, t_appt),
            "paid_rate": _safe_div(t_pay, t_attend),
            "reg_to_pay_rate": _safe_div(t_pay, t_reg),
        }

        return {
            "channels": channels_out,
            "narrow_subtotal": narrow_subtotal,
            "total": total,
        }

    def _block_mom_attribution(
        self,
        actuals: dict[str, Any],
        targets: dict[str, Any],
        ref_date: date,
    ) -> dict[str, Any]:
        """区块 6: MoM 增量归因（月累计维度）"""
        metrics_map = {
            "revenue_usd": "revenue_usd",
            "registrations": "registrations",
            "payments": "payments",
            "appt_rate": "appt_rate",
            "attend_rate": "attend_rate",
            "paid_rate": "paid_rate",
            "asp": "asp",
        }
        rows = []

        try:
            # 从数据库取上月同期累计
            comp_results = {
                m: self._comparison_engine.compute(m, "total", ref_date).get(
                    "month_td", {}
                )
                for m in metrics_map
            }
        except Exception:
            comp_results = {}

        for key in metrics_map:
            act = _safe_float(actuals.get(key))
            tgt = _safe_float(targets.get(key))
            comp = comp_results.get(key, {})
            last_month = _safe_float(comp.get("previous"))
            delta = act - last_month
            delta_pct = _safe_div(delta, last_month) if last_month != 0 else 0.0
            vs_target = act - tgt

            rows.append(
                {
                    "metric": key,
                    "last_month": round(last_month, 4),
                    "this_month": round(act, 4),
                    "target": round(tgt, 4),
                    "delta": round(delta, 4),
                    "delta_pct": round(delta_pct, 4),
                    "vs_target": round(vs_target, 4),
                    "judgment": _judgment(delta),
                }
            )

        return {"rows": rows}

    def _block_lead_attribution(
        self,
        channel_funnel: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """区块 7: Leads 贡献 + 过程指标归因"""
        total_reg = sum(
            _safe_float(channel_funnel.get(ch, {}).get("registrations"))
            for ch in _CHANNEL_ORDER
        )
        total_pay = sum(
            _safe_float(channel_funnel.get(ch, {}).get("payments"))
            for ch in _CHANNEL_ORDER
        )
        total_rev = sum(
            _safe_float(channel_funnel.get(ch, {}).get("revenue_usd"))
            for ch in _CHANNEL_ORDER
        )

        rows: list[dict[str, Any]] = []
        for ch in _CHANNEL_ORDER:
            m = channel_funnel.get(ch, {})
            reg = _safe_float(m.get("registrations"))
            pay = _safe_float(m.get("payments"))
            rev = _safe_float(m.get("revenue_usd"))
            rows.append(
                {
                    "channel": ch,
                    "registrations": reg,
                    "reg_share": round(_safe_div(reg, total_reg), 4)
                    if total_reg > 0
                    else 0.0,
                    "appt_rate": _safe_float(m.get("appt_rate")),
                    "attend_rate": _safe_float(m.get("attend_rate")),
                    "paid_rate": _safe_float(m.get("paid_rate")),
                    "reg_to_pay_rate": _safe_float(m.get("reg_to_pay_rate")),
                    "payments": pay,
                    "payment_share": round(_safe_div(pay, total_pay), 4)
                    if total_pay > 0
                    else 0.0,
                    "revenue_usd": rev,
                    "revenue_share": round(_safe_div(rev, total_rev), 4)
                    if total_rev > 0
                    else 0.0,
                }
            )

        total_row: dict[str, Any] = {
            "channel": "total",
            "registrations": total_reg,
            "reg_share": 1.0,
            "appt_rate": _safe_div(
                sum(
                    _safe_float(channel_funnel.get(ch, {}).get("appointments"))
                    for ch in _CHANNEL_ORDER
                ),
                total_reg,
            ),
            "attend_rate": _safe_div(
                sum(
                    _safe_float(channel_funnel.get(ch, {}).get("attendance"))
                    for ch in _CHANNEL_ORDER
                ),
                sum(
                    _safe_float(channel_funnel.get(ch, {}).get("appointments"))
                    for ch in _CHANNEL_ORDER
                ),
            ),
            "paid_rate": _safe_div(
                total_pay,
                sum(
                    _safe_float(channel_funnel.get(ch, {}).get("attendance"))
                    for ch in _CHANNEL_ORDER
                ),
            ),
            "reg_to_pay_rate": _safe_div(total_pay, total_reg),
            "payments": total_pay,
            "payment_share": 1.0,
            "revenue_usd": total_rev,
            "revenue_share": 1.0,
        }

        return {"rows": rows, "total": total_row}

    def _block_decomposition(
        self,
        actuals: dict[str, Any],
        ref_date: date,
    ) -> dict[str, Any]:
        """区块 8: 增量归因分解（Laspeyres + LMDI）"""
        # 取上月同期快照作基期
        try:
            comp = self._comparison_engine.compute("revenue_usd", "total", ref_date)
            month_td = comp.get("month_td", {})
            prev_rev = _safe_float(month_td.get("previous"))
        except Exception:
            prev_rev = 0.0

        # 取上月同期 registrations / reg_to_pay_rate / asp
        try:
            comp_reg = self._comparison_engine.compute(
                "registrations", "total", ref_date
            )
            prev_reg = _safe_float(comp_reg.get("month_td", {}).get("previous"))
            comp_conv = self._comparison_engine.compute(
                "reg_to_pay_rate", "total", ref_date
            )
            prev_conv = _safe_float(comp_conv.get("month_td", {}).get("previous"))
            comp_asp = self._comparison_engine.compute("asp", "total", ref_date)
            prev_asp = _safe_float(comp_asp.get("month_td", {}).get("previous"))
        except Exception:
            prev_reg = prev_conv = prev_asp = 0.0

        previous = {
            "registrations": prev_reg,
            "reg_to_pay_rate": prev_conv,
            "asp": prev_asp,
            "revenue_usd": prev_rev,
        }
        current = {
            "registrations": _safe_float(actuals.get("registrations")),
            "reg_to_pay_rate": _safe_float(actuals.get("reg_to_pay_rate")),
            "asp": _safe_float(actuals.get("asp")),
            "revenue_usd": _safe_float(actuals.get("revenue_usd")),
        }

        return self._decomposition_engine.decompose_total(current, previous)

    def _block_funnel_leverage(
        self,
        channel_funnel: dict[str, dict[str, Any]],
        targets: dict[str, Any],
    ) -> dict[str, Any]:
        """区块 9: 收入杠杆矩阵"""
        historical_best = query_historical_best(self._snapshot_svc)
        recent_trend = query_recent_trend(self._snapshot_svc)

        return compute_leverage_matrix(
            channel_funnel_data=channel_funnel,
            targets=targets,
            historical_best=historical_best,
            recent_trend_data=recent_trend,
        )

    def _block_channel_revenue(
        self,
        channel_funnel: dict[str, dict[str, Any]],
        ref_date: date,
    ) -> dict[str, Any]:
        """区块 10: 渠道级业绩增量归因"""
        rows: list[dict[str, Any]] = []

        for ch in _CHANNEL_ORDER:
            m = channel_funnel.get(ch, {})
            this_rev = _safe_float(m.get("revenue_usd"))

            try:
                if ch not in VALID_CHANNELS:
                    prev_rev = 0.0
                else:
                    comp = self._comparison_engine.compute("revenue_usd", ch, ref_date)
                    prev_rev = _safe_float(comp.get("month_td", {}).get("previous"))
            except Exception:
                prev_rev = 0.0

            delta = this_rev - prev_rev
            delta_pct = _safe_div(delta, prev_rev) if prev_rev != 0 else 0.0

            # 简单驱动因素文案
            reg = _safe_float(m.get("registrations"))
            appt = _safe_float(m.get("appt_rate"))
            if reg > 0:
                driver = f"注册 {reg:.0f}，预约率 {appt * 100:.1f}%"
            else:
                driver = "暂无数据"

            rows.append(
                {
                    "channel": ch,
                    "last_month_revenue": round(prev_rev, 2),
                    "this_month_revenue": round(this_rev, 2),
                    "delta_revenue": round(delta, 2),
                    "delta_pct": round(delta_pct, 4),
                    "driver_text": driver,
                    "judgment": _judgment(delta),
                }
            )

        return {"rows": rows}

    def _block_channel_three_factor(
        self,
        channel_funnel: dict[str, dict[str, Any]],
        ref_date: date,
    ) -> dict[str, Any]:
        """区块 11: 渠道三因素分解"""
        current_channels: list[dict[str, Any]] = []
        previous_channels: list[dict[str, Any]] = []

        for ch in _CHANNEL_ORDER:
            m = channel_funnel.get(ch, {})
            current_channels.append(
                {
                    "channel": ch,
                    "registrations": _safe_float(m.get("registrations")),
                    "reg_to_pay_rate": _safe_float(m.get("reg_to_pay_rate")),
                    "asp": _safe_float(m.get("asp")),
                    "revenue_usd": _safe_float(m.get("revenue_usd")),
                }
            )

            # 从快照数据库取上月基期
            try:
                if ch in VALID_CHANNELS:
                    prev_reg = _safe_float(
                        self._comparison_engine.compute("registrations", ch, ref_date)
                        .get("month_td", {})
                        .get("previous")
                    )
                    prev_conv = _safe_float(
                        self._comparison_engine.compute("reg_to_pay_rate", ch, ref_date)
                        .get("month_td", {})
                        .get("previous")
                    )
                    prev_asp = _safe_float(
                        self._comparison_engine.compute("asp", ch, ref_date)
                        .get("month_td", {})
                        .get("previous")
                    )
                    prev_rev = _safe_float(
                        self._comparison_engine.compute("revenue_usd", ch, ref_date)
                        .get("month_td", {})
                        .get("previous")
                    )
                else:
                    prev_reg = prev_conv = prev_asp = prev_rev = 0.0
            except Exception:
                prev_reg = prev_conv = prev_asp = prev_rev = 0.0

            previous_channels.append(
                {
                    "channel": ch,
                    "registrations": prev_reg,
                    "reg_to_pay_rate": prev_conv,
                    "asp": prev_asp,
                    "revenue_usd": prev_rev,
                }
            )

        return self._decomposition_engine.decompose_by_channel(
            current_channels, previous_channels
        )
