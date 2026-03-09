"""
AI 报告编排器
整合规则引擎分析结果 + Gemini AI 洞察，生成完整 Markdown 报告。

流程：
  1. 从 AnalysisService 获取缓存数据（summary/funnel/root_cause/impact_chain/stage）
  2. 构建中文 prompt，注入关键指标
  3. 调用 Gemini 生成 AI 洞察评论（~500字）
  4. 组装 Markdown 报告：标题 → 核心指标概览 → 5-Why根因 → AI洞察 → 行动建议
  5. 保存到 output/reports/YYYY-MM-DD.md
  6. 返回结构化结果 dict
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# 报告输出目录（project_root/output/reports/）
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_REPORTS_DIR = _PROJECT_ROOT / "output" / "reports"


def _safe_get(d: Any, *keys: str, default: Any = None) -> Any:
    """多级安全取值"""
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
        if cur is None:
            return default
    return cur


def _fmt_pct(value: Any) -> str:
    """格式化百分比显示"""
    if value is None:
        return "N/A"
    try:
        return f"{float(value) * 100:.1f}%"
    except (TypeError, ValueError):
        return str(value)


def _fmt_num(value: Any, decimal: int = 0) -> str:
    """格式化数值显示"""
    if value is None:
        return "N/A"
    try:
        v = float(value)
        if decimal == 0:
            return f"{v:,.0f}"
        return f"{v:,.{decimal}f}"
    except (TypeError, ValueError):
        return str(value)


def _fmt_usd(value: Any) -> str:
    """格式化 USD 显示"""
    if value is None:
        return "N/A"
    try:
        return f"${float(value):,.0f}"
    except (TypeError, ValueError):
        return str(value)


# ─────────────────────────────────────────────────────────────────────────────


class AIReportGenerator:
    """
    AI 报告生成器

    用法：
        gen = AIReportGenerator(analysis_service)
        result = gen.generate_report()
        print(result["report_path"])
    """

    def __init__(self, analysis_service: Any) -> None:
        """
        Args:
            analysis_service: AnalysisService 实例（已在 main.py 初始化的单例）
        """
        self._service = analysis_service

    def generate_report(self, force_run: bool = False) -> dict[str, Any]:
        """
        生成 AI 增强报告。

        Args:
            force_run: True 时强制重算分析数据（忽略缓存）

        Returns:
            {
                "report_path": str,         # 保存路径
                "markdown": str,            # 完整 Markdown 内容
                "generated_at": str,        # ISO 时间戳
                "ai_commentary": str,       # Gemini 生成段落（失败时为空）
                "model_used": str,          # 使用的模型名称
                "has_ai": bool,             # 是否包含 AI 评论
            }
        """
        # ── 步骤 1：获取分析数据 ──────────────────────────────────────────────
        result = self._service.get_cached_result()
        if result is None or force_run:
            logger.info("缓存为空或强制重算，触发 AnalysisService.run()")
            try:
                self._service.run(force=force_run)
                result = self._service.get_cached_result()
            except Exception as e:
                logger.warning(f"AnalysisService.run() 失败（非阻塞）: {e}")
                result = {}

        if result is None:
            result = {}

        # ── 步骤 2：提取关键指标 ──────────────────────────────────────────────
        summary = result.get("summary", {})
        funnel = result.get("funnel", {})
        kpi = result.get("kpi", {})
        meta = result.get("meta", {})
        time_progress = result.get("time_progress", None)

        report_date = datetime.now().strftime("%Y-%m-%d")
        data_date = str(meta.get("data_date", report_date))

        # 核心业绩指标
        revenue_actual = _safe_get(summary, "revenue", "actual")
        revenue_target = _safe_get(summary, "revenue", "target")
        revenue_gap = _safe_get(summary, "revenue", "absolute_gap")

        registrations_actual = _safe_get(summary, "registrations", "actual")
        registrations_target = _safe_get(summary, "registrations", "target")

        payments_actual = _safe_get(summary, "payments", "actual")
        payments_target = _safe_get(summary, "payments", "target")

        # 效率指标
        checkin_rate = _safe_get(kpi, "checkin_rate", "actual")
        participation_rate = _safe_get(kpi, "participation_rate", "actual")
        conversion_rate = _safe_get(kpi, "conversion_rate", "actual")
        reach_rate = _safe_get(kpi, "reach_rate", "actual")

        # 漏斗
        funnel_stages = funnel.get("stages", []) if isinstance(funnel, dict) else []

        # targets（月度目标，供根因引擎 / 影响链引擎使用）
        targets: dict[str, Any] = result.get("targets", {}) or {}

        # 5-Why 根因分析（调用规则引擎）
        # RootCauseEngine(summary, funnel, targets, outreach, trial, ...)
        root_cause_result: dict[str, Any] = {}
        try:
            from backend.core.root_cause import RootCauseEngine

            rce = RootCauseEngine(
                summary=summary,
                funnel=funnel,
                targets=targets,
                outreach=result.get("outreach_analysis", {}),
            )
            root_cause_result = rce.analyze()
        except Exception as e:
            logger.warning(f"RootCauseEngine 调用失败（非阻塞）: {e}")

        # 影响链（调用 impact_chain）
        # ImpactChainEngine(summary, targets, funnel)
        impact_result: dict[str, Any] = {}
        try:
            from backend.core.impact_chain import ImpactChainEngine

            ice = ImpactChainEngine(
                summary=summary,
                targets=targets,
                funnel=funnel,
            )
            impact_result = ice.compute_all_chains()
        except Exception as e:
            logger.warning(f"ImpactChainEngine 调用失败（非阻塞）: {e}")

        # 阶段评估
        # StageEvaluator(cache: dict) — 接收完整 analysis cache
        stage_result: dict[str, Any] = {}
        try:
            from backend.core.stage_evaluator import StageEvaluator

            se = StageEvaluator(result)
            stage_result = se.evaluate()
        except Exception as e:
            logger.warning(f"StageEvaluator 调用失败（非阻塞）: {e}")

        # ── 步骤 3：构建 Gemini prompt ────────────────────────────────────────
        prompt = self._build_prompt(
            report_date=report_date,
            data_date=data_date,
            time_progress=time_progress,
            revenue_actual=revenue_actual,
            revenue_target=revenue_target,
            revenue_gap=revenue_gap,
            registrations_actual=registrations_actual,
            registrations_target=registrations_target,
            payments_actual=payments_actual,
            payments_target=payments_target,
            checkin_rate=checkin_rate,
            participation_rate=participation_rate,
            conversion_rate=conversion_rate,
            reach_rate=reach_rate,
            root_cause_result=root_cause_result,
            stage_result=stage_result,
        )

        # ── 步骤 4：调用 Gemini 生成 AI 洞察 ─────────────────────────────────
        from backend.core.llm_adapter import get_adapter

        adapter = get_adapter()
        ai_commentary = ""
        model_used = adapter.model_name
        has_ai = False

        try:
            ai_commentary = adapter.generate(prompt, max_tokens=800)
            has_ai = bool(ai_commentary)
        except Exception as e:
            logger.warning(f"Gemini 生成失败（非阻塞，报告仍将生成）: {e}")

        # ── 步骤 5：组装 Markdown 报告 ────────────────────────────────────────
        markdown = self._build_markdown(
            report_date=report_date,
            data_date=data_date,
            time_progress=time_progress,
            summary=summary,
            kpi=kpi,
            funnel_stages=funnel_stages,
            root_cause_result=root_cause_result,
            impact_result=impact_result,
            stage_result=stage_result,
            ai_commentary=ai_commentary,
            has_ai=has_ai,
            model_used=model_used,
        )

        # ── 步骤 6：保存报告文件 ──────────────────────────────────────────────
        _REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        report_filename = f"{report_date}.md"
        report_path = _REPORTS_DIR / report_filename

        try:
            report_path.write_text(markdown, encoding="utf-8")
            logger.info(f"AI 报告已保存: {report_path}")
        except Exception as e:
            logger.error(f"报告保存失败: {e}")

        generated_at = datetime.now().isoformat()

        return {
            "report_path": str(report_path),
            "markdown": markdown,
            "generated_at": generated_at,
            "ai_commentary": ai_commentary,
            "model_used": model_used,
            "has_ai": has_ai,
        }

    # ── 私有方法 ───────────────────────────────────────────────────────────────

    def _build_prompt(
        self,
        report_date: str,
        data_date: str,
        time_progress: Optional[float],
        revenue_actual: Any,
        revenue_target: Any,
        revenue_gap: Any,
        registrations_actual: Any,
        registrations_target: Any,
        payments_actual: Any,
        payments_target: Any,
        checkin_rate: Any,
        participation_rate: Any,
        conversion_rate: Any,
        reach_rate: Any,
        root_cause_result: dict[str, Any],
        stage_result: dict[str, Any],
    ) -> str:
        """构建发给 Gemini 的中文 prompt"""
        progress_str = _fmt_pct(time_progress) if time_progress is not None else "N/A"

        # 根因摘要
        root_causes_str = "暂无规则引擎根因数据"
        if root_cause_result:
            summary_text = root_cause_result.get("summary_text", "")
            analyses = root_cause_result.get("analyses", [])
            if summary_text:
                root_causes_str = summary_text
            elif analyses:
                items = []
                for a in analyses[:3]:  # 最多3条
                    label = a.get("trigger_label", "")
                    severity = a.get("severity", "")
                    root_cause = a.get("root_cause", "")
                    if root_cause:
                        items.append(f"  - {label}（{severity}）：{root_cause}")
                root_causes_str = "\n".join(items) if items else "暂无显著根因"

        # 阶段摘要
        stage_str = "暂无阶段评估数据"
        if stage_result:
            stage_num = stage_result.get("stage", "")
            stage_name = stage_result.get("stage_name", "")
            upgrade_hint = stage_result.get("upgrade_hint", "")
            stage_str = f"当前阶段：阶段{stage_num} — {stage_name}"
            if upgrade_hint:
                stage_str += f"\n升级建议：{upgrade_hint}"

        prompt = f"""你是 51Talk 泰国转介绍运营分析专家。请根据以下当日运营数据，用中文生成一段 400-500 字的深度 AI 洞察评论。

【数据日期】{data_date}（报告日期：{report_date}）
【月度时间进度】{progress_str}

【核心业绩】
- 转介绍业绩：实际 {_fmt_usd(revenue_actual)}，目标 {_fmt_usd(revenue_target)}，差额 {_fmt_usd(revenue_gap)}
- 转介绍注册：实际 {_fmt_num(registrations_actual)}，目标 {_fmt_num(registrations_target)}
- 付费单量：实际 {_fmt_num(payments_actual)}，目标 {_fmt_num(payments_target)}

【效率指标】
- 触达率：{_fmt_pct(reach_rate)}
- 参与率：{_fmt_pct(participation_rate)}
- 打卡率：{_fmt_pct(checkin_rate)}
- 注册→付费转化率：{_fmt_pct(conversion_rate)}

【规则引擎5-Why根因】
{root_causes_str}

【运营阶段评估】
{stage_str}

请从以下几个维度给出洞察（不要重复原始数字，聚焦深度分析）：
1. 当前业绩趋势判断：是否跟上时间进度？关键风险点在哪里？
2. 效率瓶颈识别：哪个效率指标是最大短板？对最终业绩的影响有多大？
3. 运营杠杆建议：基于当前阶段，给出 2-3 个具体、可量化的行动建议
4. 预警信号：是否存在需要立即关注的异常指标？

风格要求：
- 结论先行，数据支撑，实操性强
- 避免模板化套话，聚焦本日最关键问题
- 语气专业但易懂，适合运营团队和管理层阅读
"""
        return prompt

    def _build_markdown(
        self,
        report_date: str,
        data_date: str,
        time_progress: Optional[float],
        summary: dict[str, Any],
        kpi: dict[str, Any],
        funnel_stages: list[Any],
        root_cause_result: dict[str, Any],
        impact_result: dict[str, Any],
        stage_result: dict[str, Any],
        ai_commentary: str,
        has_ai: bool,
        model_used: str,
    ) -> str:
        """组装完整 Markdown 报告"""
        lines: list[str] = []
        generated_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # ── 标题 + 元信息 ─────────────────────────────────────────────────────
        lines.append(f"# 51Talk 泰国转介绍运营日报 — {report_date}")
        lines.append("")
        lines.append(
            f"> **数据日期**：{data_date}　**生成时间**：{generated_time}　**AI模型**：{model_used if has_ai else '未启用'}"
        )
        lines.append("")

        # ── 核心指标概览表格 ──────────────────────────────────────────────────
        lines.append("## 一、核心指标概览")
        lines.append("")

        progress_str = _fmt_pct(time_progress) if time_progress is not None else "N/A"
        lines.append(f"**月度时间进度**：{progress_str}")
        lines.append("")

        # 数值 KPI 表格
        lines.append("| 指标 | 实际值 | 月目标 | 绝对差 | 时间进度差 |")
        lines.append("|------|--------|--------|--------|-----------|")

        kpi_metrics = [
            ("revenue", "转介绍业绩($)", True),
            ("registrations", "转介绍注册", False),
            ("payments", "付费单量", False),
        ]
        for key, label, is_money in kpi_metrics:
            block = summary.get(key, {}) if isinstance(summary, dict) else {}
            actual = block.get("actual")
            target = block.get("target")
            abs_gap = block.get("absolute_gap")
            progress_gap = block.get("gap")

            fmt = _fmt_usd if is_money else _fmt_num

            actual_s = fmt(actual)
            target_s = fmt(target)

            if abs_gap is not None:
                gap_val = float(abs_gap)
                abs_gap_s = ("+" if gap_val >= 0 else "") + fmt(abs_gap)
            else:
                abs_gap_s = "N/A"

            progress_gap_s = (
                _fmt_pct(progress_gap) if progress_gap is not None else "N/A"
            )

            lines.append(
                f"| {label} | {actual_s} | {target_s} | {abs_gap_s} | {progress_gap_s} |"
            )

        lines.append("")

        # 效率 KPI 表格
        lines.append("| 效率指标 | 实际值 | 目标 | 差值 |")
        lines.append("|----------|--------|------|------|")

        eff_metrics = [
            ("reach_rate", "触达率"),
            ("participation_rate", "参与率"),
            ("checkin_rate", "打卡率"),
            ("conversion_rate", "注册→付费转化率"),
        ]
        for key, label in eff_metrics:
            block = kpi.get(key, {}) if isinstance(kpi, dict) else {}
            if not isinstance(block, dict):
                block = {}
            actual = block.get("actual")
            target = block.get("target")
            gap = block.get("gap")
            actual_s = _fmt_pct(actual)
            target_s = _fmt_pct(target)
            gap_val_s = _fmt_pct(gap) if gap is not None else "N/A"
            lines.append(f"| {label} | {actual_s} | {target_s} | {gap_val_s} |")

        lines.append("")

        # ── 5-Why 根因分析（规则引擎）──────────────────────────────────────────
        lines.append("## 二、5-Why 根因分析（规则引擎）")
        lines.append("")

        if root_cause_result:
            analyses = root_cause_result.get("analyses", [])
            summary_text = root_cause_result.get("summary_text", "")
            if summary_text:
                lines.append(f"> {summary_text}")
                lines.append("")
            if analyses:
                for analysis_item in analyses[:5]:  # 最多显示5条
                    label = analysis_item.get("trigger_label", "")
                    severity = analysis_item.get("severity", "")
                    why_chain = analysis_item.get("why_chain", [])
                    root_cause = analysis_item.get("root_cause", "")
                    action = analysis_item.get("action", "")
                    impact_usd = analysis_item.get("expected_impact_usd", 0)

                    status_icon = (
                        "🔴"
                        if severity == "red"
                        else ("🟡" if severity == "yellow" else "🟢")
                    )
                    lines.append(f"### {status_icon} {label}")
                    lines.append("")

                    if why_chain:
                        for i, why_item in enumerate(why_chain, 1):
                            if isinstance(why_item, dict):
                                question = why_item.get("question", "")
                                answer = why_item.get("answer", "")
                                lines.append(f"**Why {i}**：{question}")
                                if answer:
                                    lines.append(f"*→ {answer}*")
                            else:
                                lines.append(f"**Why {i}**：{why_item}")
                    if root_cause:
                        lines.append(f"\n**根因结论**：{root_cause}")
                    if action:
                        lines.append(f"\n**建议行动**：{action}")
                    if impact_usd:
                        lines.append(f"\n**预估影响**：${impact_usd:,.0f}")
                    lines.append("")
            else:
                lines.append("*当前数据无显著根因触发*")
                lines.append("")
        else:
            lines.append("*规则引擎数据暂不可用*")
            lines.append("")

        # ── AI 洞察 ───────────────────────────────────────────────────────────
        lines.append("## 三、AI 深度洞察")
        lines.append("")

        if has_ai and ai_commentary:
            lines.append(f"> *由 {model_used} 生成*")
            lines.append("")
            lines.append(ai_commentary)
        else:
            lines.append("> *AI 洞察不可用（Gemini API 未响应，规则引擎结果仍有效）*")

        lines.append("")

        # ── 影响链概览 ────────────────────────────────────────────────────────
        if impact_result:
            lines.append("## 四、效率→收入影响链")
            lines.append("")
            lines.append("| 效率指标 | 差值 | 损失付费 | 损失收入($) |")
            lines.append("|----------|------|----------|------------|")

            chains_list = (
                impact_result.get("chains", [])
                if isinstance(impact_result, dict)
                else []
            )
            for chain_data in chains_list:
                if not isinstance(chain_data, dict):
                    continue
                label = chain_data.get("label", chain_data.get("metric", ""))
                gap = chain_data.get("gap")
                lost_payments = chain_data.get("lost_payments")
                lost_revenue_usd = chain_data.get("lost_revenue_usd")

                gap_s = _fmt_pct(gap) if gap is not None else "N/A"
                lost_payments_s = (
                    _fmt_num(lost_payments) if lost_payments is not None else "N/A"
                )
                lost_rev_s = (
                    _fmt_usd(lost_revenue_usd)
                    if lost_revenue_usd is not None
                    else "N/A"
                )
                lines.append(
                    f"| {label} | {gap_s} | {lost_payments_s} | {lost_rev_s} |"
                )

            lines.append("")

        # ── 阶段评估 + 行动建议 ───────────────────────────────────────────────
        lines.append("## 五、运营阶段评估与行动建议")
        lines.append("")

        if stage_result:
            stage_num = stage_result.get("stage", "")
            stage_name = stage_result.get("stage_name", "")
            stage_desc = stage_result.get("stage_description", "")
            recommendations = stage_result.get("recommendations", [])
            upgrade_requirements = stage_result.get("upgrade_requirements", [])

            lines.append(f"**当前阶段**：阶段 {stage_num} — {stage_name}")
            if stage_desc:
                lines.append(f"\n{stage_desc}")
            lines.append("")

            if recommendations:
                lines.append("### 本阶段核心行动建议")
                lines.append("")
                for rec in recommendations:
                    lines.append(f"- {rec}")
                lines.append("")

            if upgrade_requirements:
                lines.append("### 升级至下一阶段的关键要求")
                lines.append("")
                for req in upgrade_requirements:
                    lines.append(f"- {req}")
                lines.append("")
        else:
            lines.append("*阶段评估数据暂不可用*")
            lines.append("")

        # ── 页脚 ──────────────────────────────────────────────────────────────
        lines.append("---")
        lines.append("")
        lines.append(f"*报告由 ref-ops-engine AI 报告引擎自动生成 | {generated_time}*")

        return "\n".join(lines)
