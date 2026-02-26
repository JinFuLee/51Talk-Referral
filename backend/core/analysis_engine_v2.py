"""
51Talk 转介绍运营分析引擎 V2
跨源联动分析：基于 MultiSourceLoader 输出的 35 源统一数据字典
"""
from __future__ import annotations

import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from core.analyzers import (
    AnalyzerContext,
    SummaryAnalyzer,
    OpsAnalyzer,
    OrderAnalyzer,
    CohortAnalyzer,
    RankingAnalyzer,
    TrendAnalyzer,
    _safe_div,
    _safe_pct,
    _norm_cc,
    _clean_for_json,
)

logger = logging.getLogger(__name__)


class AnalysisEngineV2:
    """
    精简骨架 — 委托到各 Analyzer 模块

    用法:
        data = MultiSourceLoader(input_dir).load_all()
        targets = get_targets(report_date)
        engine = AnalysisEngineV2(data, targets, report_date)
        result = engine.analyze()
    """

    # 类常量保留用于向后兼容，实例属性会在 __init__ 中按 config 覆盖
    GAP_GREEN = 0.0
    GAP_YELLOW = -0.05

    # 并行开关：PARALLEL_ANALYZERS=0 强制串行（调试/基准测试用），默认开启
    _PARALLEL_ENABLED: bool = os.environ.get("PARALLEL_ANALYZERS", "1") != "0"

    # 所有可用模块的完整注册表（key → 分析方法）
    _MODULE_REGISTRY: Dict[str, str] = {
        "meta":               "_build_meta",
        "summary":            "_analyze_summary",
        "funnel":             "_analyze_funnel",
        "channel_comparison": "_analyze_channel_comparison",
        "student_journey":    "_analyze_student_journey",
        "cc_360":             "_analyze_cc_360",
        "cohort_roi":         "_analyze_cohort_roi",
        "enclosure_cross":    "_analyze_enclosure_cross",
        "checkin_impact":     "_analyze_checkin_impact",
        "productivity":       "_analyze_productivity",
        "order_analysis":     "_analyze_orders",
        "outreach_analysis":  "_analyze_outreach",
        "trial_followup":     "_analyze_trial_followup",
        "ranking_cc":         "_analyze_cc_ranking",
        "ranking_ss_lp":      "_analyze_ss_lp_ranking",
        "trend":              "_analyze_trend",
        "prediction":         "_analyze_prediction",
        "anomalies":          "_detect_anomalies",
        "ltv":                "_analyze_ltv",
    }

    def __init__(
        self,
        data: dict,
        targets: dict,
        report_date: datetime,
        snapshot_store=None,
        project_config=None,
    ) -> None:
        # 创建共享 context
        self.ctx = AnalyzerContext(
            data=data,
            targets=targets,
            report_date=report_date,
            snapshot_store=snapshot_store,
            project_config=project_config,
        )

        # 向后兼容属性
        self.data = data
        self.targets = targets
        self.report_date = report_date
        self.data_date = self.ctx.data_date
        self._snapshot_store = snapshot_store
        self.project_config = project_config
        self.GAP_GREEN = self.ctx.GAP_GREEN
        self.GAP_YELLOW = self.ctx.GAP_YELLOW
        self._channel_labels = self.ctx._channel_labels
        self._result: Optional[dict] = None

        # 初始化各 Analyzer
        self._summary = SummaryAnalyzer(self.ctx)
        self._ops = OpsAnalyzer(self.ctx)
        self._order = OrderAnalyzer(self.ctx)
        self._cohort = CohortAnalyzer(self.ctx)
        self._ranking = RankingAnalyzer(self.ctx)
        self._trend = TrendAnalyzer(self.ctx)

    # ── 主入口 ────────────────────────────────────────────────────────────────

    # 有依赖的模块，必须在 Phase 1 全部完成后串行执行
    _DEPENDENT_MODULES = frozenset({"risk_alerts", "impact_chain"})

    def analyze(self) -> dict:
        """主分析入口，返回全部分析结果（全部可 JSON 序列化）

        执行分两阶段：
          Phase 1 — 并行执行所有互相独立的模块（ThreadPoolExecutor, max_workers=8）
                    PARALLEL_ANALYZERS=0 时降级为串行（调试/基准测试用）
          Phase 2 — 串行执行有跨模块依赖的模块（risk_alerts, impact_chain）
        """
        result: dict = {}

        # 有 project_config 且指定了 enabled_modules 时，按白名单筛选；
        # 否则沿用完整模块列表（向后兼容）
        if self.project_config is not None and self.project_config.enabled_modules:
            enabled = set(self.project_config.enabled_modules)
            modules = [
                (key, getattr(self, method))
                for key, method in self._MODULE_REGISTRY.items()
                if key in enabled and hasattr(self, method)
            ]
        else:
            modules = [
                (key, getattr(self, method))
                for key, method in self._MODULE_REGISTRY.items()
                if hasattr(self, method)
            ]

        # Phase 1: 执行所有独立模块（_DEPENDENT_MODULES 已排除在外）
        # PARALLEL_ANALYZERS=0 时强制串行，方便调试和基准测试
        independent = [(key, fn) for key, fn in modules if key not in self._DEPENDENT_MODULES]
        parallel_enabled = os.environ.get("PARALLEL_ANALYZERS", "1") != "0"

        if parallel_enabled and len(independent) > 1:
            with ThreadPoolExecutor(max_workers=min(len(independent), 8)) as executor:
                future_to_key = {executor.submit(fn): key for key, fn in independent}
                try:
                    for future in as_completed(future_to_key, timeout=30):
                        key = future_to_key[future]
                        try:
                            result[key] = future.result()
                        except Exception as e:
                            logger.error(f"[{key}] 分析失败: {e}", exc_info=True)
                            result[key] = {}
                except FuturesTimeout:
                    logger.error("Analyzer timeout: some modules did not complete within 30s")
                    for f in future_to_key:
                        if not f.done():
                            f.cancel()
                            result[future_to_key[f]] = {}
        else:
            # 串行模式：PARALLEL_ANALYZERS=0 或仅有 1 个模块时
            if not parallel_enabled:
                logger.debug("PARALLEL_ANALYZERS=0: running analyzers in serial mode")
            for key, fn in independent:
                try:
                    result[key] = fn()
                except Exception as e:
                    logger.error(f"[{key}] 分析失败: {e}", exc_info=True)
                    result[key] = {}

        # Phase 2: 串行执行依赖模块
        # risk_alerts 依赖 summary + anomalies
        try:
            result["risk_alerts"] = self._generate_risk_alerts(
                result.get("summary", {}),
                result.get("anomalies", []),
            )
        except Exception as e:
            logger.error(f"[risk_alerts] 生成失败: {e}", exc_info=True)
            result["risk_alerts"] = []

        # impact_chain 依赖 summary + funnel（必须在两者计算完成后执行）
        try:
            result["impact_chain"] = self._analyze_impact_chain(
                result.get("summary", {}),
                result.get("funnel", {}),
            )
        except Exception as e:
            logger.error(f"[impact_chain] 分析失败: {e}", exc_info=True)
            result["impact_chain"] = {}

        # 兼容旧 API key 名称
        result["cohort_analysis"]   = result.get("enclosure_cross", {})
        result["checkin_analysis"]  = result.get("checkin_impact", {})
        result["leads_achievement"] = result.get("funnel", {})
        result["followup_analysis"] = result.get("outreach_analysis", {})
        # mom_trend / yoy_trend / wow_trend 各自指向 trend 子结构，避免指向同一对象
        _trend_full = result.get("trend", {})
        result["mom_trend"]         = _trend_full.get("mom", _trend_full)
        result["yoy_trend"]         = _trend_full.get("yoy", {})
        result["wow_trend"]         = _trend_full.get("wow", {})
        result["cc_ranking"]        = result.get("ranking_cc", [])
        result["ss_ranking"]        = result.get("ranking_ss_lp", {}).get("ss", [])
        result["lp_ranking"]        = result.get("ranking_ss_lp", {}).get("lp", [])
        # ltv 已纳入 _MODULE_REGISTRY，Phase 1 并行执行；此处仅做 fallback 保底
        if "ltv" not in result:
            try:
                result["ltv"] = self._analyze_ltv()
            except Exception as e:
                logger.error(f"[ltv] 分析失败: {e}", exc_info=True)
                result["ltv"] = {}
        result["roi_estimate"]      = result.get("cohort_roi", {})
        result["time_progress"]     = self.targets.get("时间进度", 0.0)

        self._result = _clean_for_json(result)
        return self._result

    # ── 委托方法（一行）─────────────────────────────────────────────────────────

    def _build_meta(self) -> dict:
        return self.ctx.build_meta()

    def _analyze_summary(self) -> dict:
        return self._summary.analyze_summary()

    def _analyze_funnel(self) -> dict:
        return self._summary.analyze_funnel()

    def _analyze_channel_comparison(self) -> dict:
        return self._summary.analyze_channel_comparison()

    def _analyze_student_journey(self) -> dict:
        return self._summary.analyze_student_journey()

    def _analyze_outreach(self) -> dict:
        return self._ops.analyze_outreach()

    def _analyze_trial_followup(self) -> dict:
        return self._ops.analyze_trial_followup()

    def _analyze_orders(self) -> dict:
        return self._order.analyze_orders()

    def _analyze_productivity(self) -> dict:
        return self._order.analyze_productivity()

    def _analyze_cohort_roi(self) -> dict:
        return self._cohort.analyze_cohort_roi()

    def _analyze_enclosure_cross(self) -> dict:
        return self._cohort.analyze_enclosure_cross()

    def _analyze_checkin_impact(self) -> dict:
        return self._cohort.analyze_checkin_impact()

    def _analyze_cc_360(self) -> dict:
        return self._ranking.analyze_cc_360()

    def _analyze_cc_ranking(self) -> list:
        return self._ranking.analyze_cc_ranking()

    def _analyze_ss_lp_ranking(self) -> dict:
        return self._ranking.analyze_ss_lp_ranking()

    def _analyze_trend(self) -> dict:
        return self._trend.analyze_trend()

    def _analyze_prediction(self) -> dict:
        return self._trend.analyze_prediction()

    def _detect_anomalies(self) -> list:
        return self._trend.detect_anomalies()

    def _analyze_ltv(self) -> dict:
        return self._cohort.analyze_ltv()

    # ── 保留在 Engine（跨模块依赖）────────────────────────────────────────────

    def _generate_risk_alerts(self, summary: dict, anomalies: list) -> list:
        """风险预警：基于 summary 缺口 + anomalies 汇总"""
        alerts = []
        time_prog = self.targets.get("时间进度", 0.0)

        def _add(level, category, message, action="") -> None:
            alerts.append({
                "level":    level,
                "category": category,
                "message":  message,
                "action":   action,
            })

        # 付费进度
        payment = summary.get("payment", {})
        paid_progress = payment.get("progress")
        paid_gap = payment.get("gap")
        if paid_gap is not None:
            paid_actual = payment.get("actual", 0)
            paid_target = payment.get("target", 0)
            if paid_gap < -0.15:
                _add("red", "业绩",
                     f"付费达成率{paid_progress:.1%}，低于时间进度{time_prog:.1%}，缺口{paid_gap:.1%}",
                     "立即复盘高意向学员名单，加强外呼追踪")
            elif paid_gap < -0.05:
                _add("yellow", "业绩",
                     f"付费进度偏慢，缺口{paid_gap:.1%}",
                     "关注近期出席未付费学员，安排跟进")

        # 打卡率
        checkin = summary.get("checkin_24h", {})
        checkin_rate = checkin.get("rate")
        checkin_target = checkin.get("target") or 0.6
        if checkin_rate is not None and checkin_rate < checkin_target * 0.8:
            _add("yellow", "打卡",
                 f"24H打卡率{checkin_rate:.1%}，低于目标{checkin_target:.1%}",
                 "提醒 CC 加强打卡宣导")

        # 注册进度
        reg = summary.get("registration", {})
        reg_gap = reg.get("gap")
        if reg_gap is not None and reg_gap < -0.10:
            _add("red", "注册",
                 f"注册进度缺口{reg_gap:.1%}",
                 "检查 leads 分配情况")

        # 异常转化
        red_anomalies = [a for a in anomalies if a.get("severity") == "high"]
        for a in red_anomalies[:3]:
            _add("red", "异常",
                 a.get("description", ""),
                 "排查数据异常原因")

        return sorted(alerts, key=lambda x: {"red": 0, "yellow": 1, "green": 2}.get(x["level"], 3))

    def _analyze_impact_chain(self, summary: dict, funnel: dict) -> dict:
        """
        影响链计算：各效率指标 gap → 收入损失量化。
        依赖 summary（打卡率实际值/目标）和 funnel（漏斗转化率/有效学员数）。
        """
        from core.impact_chain import ImpactChainEngine
        engine = ImpactChainEngine(
            summary=summary,
            targets=self.targets,
            funnel=funnel,
        )
        return engine.compute_all_chains()

    # ── 向后兼容工具 ──────────────────────────────────────────────────────────

    def _calc_workdays(self) -> tuple:
        return self.ctx.calc_workdays()

    def _get_real_asp_and_conversion(self) -> tuple:
        return self.ctx.get_real_asp_and_conversion()

    def _calc_efficiency_impact(self, *args, **kwargs):
        return self.ctx.calc_efficiency_impact(*args, **kwargs)
