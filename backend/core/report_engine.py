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
                total_metrics, targets, channel_funnel, bm_pct
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
            "appt_to_pay_rate": _safe_div(pay, appt),
            "reg_to_pay_rate": _safe_div(pay, reg),
        }

    def _normalize_targets(self, month_key: str) -> dict[str, Any]:
        """归一化目标：从中文 key 转英文，并合并 override。

        读取优先级（高→低）：
        1. 实例初始化时传入的 targets
        2. targets_override.json（含 V2 结构）中当月中文 key
        3. MONTHLY_TARGETS 静态配置中当月中文 key
        4. decompose_targets_from_last_month() 自动拆解（上月归档数据 fallback）
        """
        import json
        from pathlib import Path

        from backend.core.config import MONTHLY_TARGETS

        # 中文 key → 英文 key 映射
        _KEY_MAP = {
            "注册目标": "registrations",
            "付费目标": "payments",
            "金额目标": "revenue_usd",
            "约课率目标": "appt_rate",
            "出席率目标": "attend_rate",
            "转化率目标": "reg_to_pay_rate",  # 23% 是注册付费率，非出席付费率
            "客单价": "asp",
        }

        base_targets: dict[str, Any] = {}

        def _apply_chinese_dict(raw: dict) -> None:
            """将含中文 key 的目标 dict 合并到 base_targets。"""
            for zh_key, en_key in _KEY_MAP.items():
                if zh_key in raw:
                    v = _safe_float(raw[zh_key])
                    if v > 0:
                        base_targets[en_key] = v

        # ── 1. MONTHLY_TARGETS 基线 ────────────────────────────────────────
        if month_key in MONTHLY_TARGETS:
            _apply_chinese_dict(MONTHLY_TARGETS[month_key])

        # ── 2. targets_override.json（覆盖基线）─────────────────────────────
        _cfg_dir = Path(__file__).resolve().parent.parent.parent / "config"
        override_file = _cfg_dir / "targets_override.json"
        if override_file.exists():
            try:
                overrides = json.loads(override_file.read_text(encoding="utf-8"))
                month_data = overrides.get(month_key, {})
                if month_data:
                    _apply_chinese_dict(month_data)
                    # V2 结构：从 hard.referral_revenue 补 revenue_usd
                    hard = month_data.get("hard", {})
                    ref_rev = hard.get("referral_revenue", 0)
                    if ref_rev > 0:
                        # override 始终优先（含 V2 结构）
                        base_targets["revenue_usd"] = _safe_float(ref_rev)
                    # V2 channels 结构：提取注册目标（各口径 user_count 之和）
                    channels_v2 = month_data.get("channels", {})
                    if channels_v2 and "registrations" not in base_targets:
                        total_users = sum(
                            (ch.get("user_count") or 0) for ch in channels_v2.values()
                        )
                        if total_users > 0:
                            base_targets["registrations"] = float(total_users)
                    # V2 sop 结构：提取率目标
                    sop = month_data.get("sop", {})
                    if sop.get("reserve_rate", 0) > 0:
                        base_targets["appt_rate"] = _safe_float(sop["reserve_rate"])
                    if sop.get("attend_rate", 0) > 0:
                        base_targets["attend_rate"] = _safe_float(sop["attend_rate"])
                    # channels conversion_rate = 注册付费率（非出席付费率）
                    if channels_v2 and "reg_to_pay_rate" not in base_targets:
                        rates = [
                            ch.get("conversion_rate", 0)
                            for ch in channels_v2.values()
                            if ch.get("conversion_rate", 0) > 0
                        ]
                        if rates:
                            base_targets["reg_to_pay_rate"] = sum(rates) / len(rates)
                    # asp
                    if channels_v2 and "asp" not in base_targets:
                        asps = [
                            ch.get("asp", 0)
                            for ch in channels_v2.values()
                            if ch.get("asp", 0) > 0
                        ]
                        if asps:
                            base_targets["asp"] = sum(asps) / len(asps)
            except Exception as exc:
                logger.warning("读取 targets_override.json 失败: %s", exc)

        # ── 3. 实例传入的 targets 最高优先级 ────────────────────────────────
        for k, v in self._targets.items():
            base_targets[k] = _safe_float(v)

        # ── 4. Fallback：decompose_targets_from_last_month() ──────────────
        # 当 revenue_usd / registrations / payments 仍为 0 时，用上月归档数据自动拆解
        if base_targets.get("revenue_usd", 0) <= 0:
            try:
                from backend.core.target_recommender import (
                    decompose_targets_from_last_month,
                )

                decomposed = decompose_targets_from_last_month(
                    self._snapshot_svc,
                    total_revenue_target=200444.0,  # 默认目标值，数据不足时的保底
                )
                if not decomposed.get("message") and decomposed.get("total"):
                    t = decomposed["total"]
                    if t.get("revenue_usd", 0) > 0:
                        base_targets.setdefault("revenue_usd", t["revenue_usd"])
                    if t.get("registrations", 0) > 0:
                        base_targets.setdefault("registrations", t["registrations"])
                    if t.get("payments", 0) > 0:
                        base_targets.setdefault("payments", t["payments"])
                    if t.get("asp", 0) > 0:
                        base_targets.setdefault("asp", t["asp"])
                    if t.get("conversion_rate", 0) > 0:
                        base_targets.setdefault("paid_rate", t["conversion_rate"])
                    logger.info("使用上月归档数据自动拆解目标作为 fallback")
            except Exception as exc:
                logger.warning(
                    "decompose_targets_from_last_month fallback 失败: %s", exc
                )

        # 确保必要字段有默认值
        base_targets.setdefault("appt_rate", 0.77)
        base_targets.setdefault("attend_rate", 0.66)
        base_targets.setdefault("reg_to_pay_rate", 0.23)  # 注册付费率 23%
        base_targets.setdefault("asp", 850.0)
        # 出席付费率 = 注册付费率 / (预约率 × 出席率)
        rtp = base_targets.get("reg_to_pay_rate", 0.23)
        ar = base_targets.get("appt_rate", 0.77)
        atr = base_targets.get("attend_rate", 0.66)
        if ar > 0 and atr > 0:
            base_targets.setdefault("paid_rate", round(rtp / (ar * atr), 4))
        # 预约付费率 = 注册付费率 / 预约率
        if ar > 0:
            base_targets.setdefault("appt_to_pay_rate", round(rtp / ar, 4))

        # ── 5. 自动推导可算目标（预约/出席/客单价/注册付费率）──
        reg_tgt = base_targets.get("registrations", 0)
        pay_tgt = base_targets.get("payments", 0)
        rev_tgt = base_targets.get("revenue_usd", 0)
        appt_r = base_targets.get("appt_rate", 0)
        attend_r = base_targets.get("attend_rate", 0)

        # 预约目标 = 注册 × 预约率
        if reg_tgt > 0 and appt_r > 0:
            base_targets.setdefault(
                "appointments", round(reg_tgt * appt_r)
            )
        # 出席目标 = 预约 × 出席率
        appt_tgt = base_targets.get("appointments", 0)
        if appt_tgt > 0 and attend_r > 0:
            base_targets.setdefault(
                "attendance", round(appt_tgt * attend_r)
            )
        # 客单价目标 = 业绩 / 付费
        if rev_tgt > 0 and pay_tgt > 0:
            base_targets.setdefault("asp", round(rev_tgt / pay_tgt, 2))
        # 注册付费率 = 付费 / 注册
        if pay_tgt > 0 and reg_tgt > 0:
            base_targets.setdefault(
                "reg_to_pay_rate", round(pay_tgt / reg_tgt, 4)
            )

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

    def _get_last_month_archive(
        self, ref_date: date, channel: str = "total"
    ) -> dict[str, Any]:
        """直接从 monthly_archives 查上月终值（绕过 daily_snapshots 稀疏问题）。

        Args:
            ref_date: 参考日期
            channel:  口径名，如 "total"/"CC窄口"/"SS窄口"/"LP窄口"/"宽口"

        Returns:
            上月归档行 dict，字段前缀为 final_xxx；无数据返回空 dict
        """
        y, m = ref_date.year, ref_date.month - 1
        if m <= 0:
            m += 12
            y -= 1
        last_month_key = f"{y:04d}{m:02d}"

        # monthly_archives 中宽口存储为"其它"
        archive_channel = "其它" if channel == "宽口" else channel

        rows = self._snapshot_svc.query_monthly_archive(last_month_key, archive_channel)
        if rows:
            return rows[0]
        return {}

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
            "appt_to_pay_rate",
            "reg_to_pay_rate",
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
        bm_pct: float = 1.0,
    ) -> dict[str, Any]:
        """区块 2: 目标分解 + 各类缺口（含 BM 视角 + 月度达标视角）"""
        rev_act = _safe_float(actuals.get("revenue_usd"))
        rev_tgt = _safe_float(targets.get("revenue_usd"))
        asp_tgt = _safe_float(targets.get("asp"))
        asp_act = _safe_float(actuals.get("asp")) or 850.0
        paid_rate = _safe_float(actuals.get("paid_rate")) or 0.23
        attend_rate = _safe_float(actuals.get("attend_rate")) or 0.66
        appt_rate = _safe_float(actuals.get("appt_rate")) or 0.77
        reg_tgt = _safe_float(targets.get("registrations"))

        def _calc_gaps(
            multiplier: float,
        ) -> dict[str, Any]:
            """计算缺口，multiplier=bm_pct 为 BM 视角，=1.0 为月度达标"""
            adj_rev_tgt = rev_tgt * multiplier
            adj_reg_tgt = reg_tgt * multiplier

            rev_gap = rev_act - adj_rev_tgt
            asp_gap = asp_act - (asp_tgt or asp_act)

            bill_gap = _safe_div(max(-rev_gap, 0), asp_act)
            showup_gap = _safe_div(bill_gap, paid_rate)
            appt_gap = _safe_div(showup_gap, attend_rate)
            lead_gap = _safe_div(appt_gap, appt_rate)

            # 渠道缺口
            ch_targets: dict[str, float] = {}
            ch_gaps: dict[str, float] = {}
            total_ch = sum(
                _safe_float(channel_funnel.get(c, {}).get("registrations"))
                for c in _CHANNEL_ORDER
            )
            for ch in _CHANNEL_ORDER:
                ch_reg = _safe_float(
                    channel_funnel.get(ch, {}).get("registrations")
                )
                ratio = _safe_div(ch_reg, total_ch) if total_ch > 0 else 0.25
                ct = round(adj_reg_tgt * ratio, 1) if adj_reg_tgt > 0 else 0
                ch_targets[ch] = ct
                ch_gaps[ch] = round(ch_reg - ct, 1)

            return {
                "channel_targets": ch_targets,
                "gaps": {
                    "revenue_gap": round(rev_gap, 2),
                    "asp_gap": round(asp_gap, 2),
                    "bill_gap": round(bill_gap, 1),
                    "showup_gap": round(showup_gap, 1),
                    "appt_gap": round(appt_gap, 1),
                    "lead_gap": round(lead_gap, 1),
                    "channel_lead_gaps": ch_gaps,
                },
            }

        bm_gaps = _calc_gaps(bm_pct)
        monthly_gaps = _calc_gaps(1.0)

        # 默认返回 BM 视角（兼容旧前端），额外附加 monthly 视角
        result = bm_gaps
        result["monthly"] = monthly_gaps
        return result

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
        """区块 6: MoM 增量归因（月累计维度）

        上月数据优先从 monthly_archives 读取终值（精确），
        daily_snapshots 同期比较仅在归档数据缺失时作为降级方案。
        """
        # 上月 monthly_archives 终值（total 口径）
        last_archive = self._get_last_month_archive(ref_date, "total")

        # monthly_archives 字段映射（final_xxx → 英文 key）
        archive_field_map = {
            "revenue_usd": "final_revenue_usd",
            "registrations": "final_registrations",
            "payments": "final_payments",
            "appt_rate": "final_appt_rate",
            "attend_rate": "final_attend_rate",
            "paid_rate": "final_paid_rate",
            "asp": "final_asp",
        }

        rows = []
        for key, archive_field in archive_field_map.items():
            act = _safe_float(actuals.get(key))
            tgt = _safe_float(targets.get(key))

            # 优先用 monthly_archives 终值，否则降级到 ComparisonEngine
            last_month = 0.0
            field_val = last_archive.get(archive_field) if last_archive else None
            if field_val is not None:
                last_month = _safe_float(field_val)
            else:
                try:
                    comp = self._comparison_engine.compute(key, "total", ref_date)
                    last_month = _safe_float(comp.get("month_td", {}).get("previous"))
                except Exception:
                    last_month = 0.0

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
        """区块 8: 增量归因分解（Laspeyres + LMDI）

        上月基期优先从 monthly_archives 读取终值，更精确。
        """
        last_archive = self._get_last_month_archive(ref_date, "total")

        def _archive_val(field: str, fallback_metric: str) -> float:
            """从 monthly_archives 取值，失败时降级到 ComparisonEngine。"""
            if last_archive and last_archive.get(field) is not None:
                return _safe_float(last_archive[field])
            try:
                comp = self._comparison_engine.compute(
                    fallback_metric, "total", ref_date
                )
                return _safe_float(comp.get("month_td", {}).get("previous"))
            except Exception:
                return 0.0

        prev_rev = _archive_val("final_revenue_usd", "revenue_usd")
        prev_reg = _archive_val("final_registrations", "registrations")
        prev_asp = _archive_val("final_asp", "asp")
        # reg_to_pay_rate 需从 payments/registrations 推导
        prev_pay = (
            _safe_float(last_archive.get("final_payments")) if last_archive else 0.0
        )
        prev_conv = (
            _safe_div(prev_pay, prev_reg)
            if prev_reg > 0
            else _archive_val("final_reg_to_pay_rate", "reg_to_pay_rate")
        )

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
        """区块 10: 渠道级业绩增量归因

        上月数据优先从 monthly_archives 终值读取。
        """
        rows: list[dict[str, Any]] = []

        for ch in _CHANNEL_ORDER:
            m = channel_funnel.get(ch, {})
            this_rev = _safe_float(m.get("revenue_usd"))

            # 优先用 monthly_archives 终值
            last_archive = self._get_last_month_archive(ref_date, ch)
            if last_archive and last_archive.get("final_revenue_usd") is not None:
                prev_rev = _safe_float(last_archive["final_revenue_usd"])
            else:
                try:
                    if ch in VALID_CHANNELS:
                        comp = self._comparison_engine.compute(
                            "revenue_usd", ch, ref_date
                        )
                        prev_rev = _safe_float(comp.get("month_td", {}).get("previous"))
                    else:
                        prev_rev = 0.0
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
        """区块 11: 渠道三因素分解

        上月基期优先从 monthly_archives 读取终值，更精确。
        """
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

            # 优先用 monthly_archives 终值
            last_archive = self._get_last_month_archive(ref_date, ch)
            if last_archive and last_archive.get("final_revenue_usd") is not None:
                prev_reg = _safe_float(last_archive.get("final_registrations"))
                prev_pay = _safe_float(last_archive.get("final_payments"))
                prev_asp = _safe_float(last_archive.get("final_asp"))
                prev_rev = _safe_float(last_archive.get("final_revenue_usd"))
                # reg_to_pay_rate 从 payments / registrations 推导，更精确
                prev_conv = (
                    _safe_div(prev_pay, prev_reg) if prev_reg > 0
                    else _safe_float(last_archive.get("final_reg_to_pay_rate"))
                )
            else:
                # 降级到 ComparisonEngine（daily_snapshots 同期比较）
                try:
                    if ch in VALID_CHANNELS:
                        prev_reg = _safe_float(
                            self._comparison_engine.compute(
                                "registrations", ch, ref_date
                            ).get("month_td", {}).get("previous")
                        )
                        prev_conv = _safe_float(
                            self._comparison_engine.compute(
                                "reg_to_pay_rate", ch, ref_date
                            ).get("month_td", {}).get("previous")
                        )
                        prev_asp = _safe_float(
                            self._comparison_engine.compute("asp", ch, ref_date)
                            .get("month_td", {}).get("previous")
                        )
                        prev_rev = _safe_float(
                            self._comparison_engine.compute("revenue_usd", ch, ref_date)
                            .get("month_td", {}).get("previous")
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
