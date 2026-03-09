"""
Presentation API 端点 — 汇报演示数据
为 M18/M19 Slide 组件提供行动计划、会议纪要、资源需求三个端点。
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends

from backend.services.analysis_service import AnalysisService

from .dependencies import get_service

router = APIRouter()


def _get_cache(svc: AnalysisService) -> dict[str, Any] | None:
    return svc.get_cached_result()


# ─── 端点1: 行动计划 ──────────────────────────────────────────────────────────


@router.get("/action-plan", summary="行动计划列表")
def get_action_plan(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    从 root_cause + impact_chain + outreach 数据派生行动项列表。
    按 priority (immediate > this-week > ongoing) 排序。
    """
    try:
        cache = _get_cache(svc)
        if cache is None:
            return _fallback_action_plan()

        from backend.core.impact_chain import ImpactChainEngine
        from backend.core.root_cause import RootCauseEngine

        # 构建 root_cause 分析
        summary = dict(cache.get("summary", {}))
        if "registrations" in summary and "registration" not in summary:
            summary["registration"] = summary["registrations"]
        if "payments" in summary and "payment" not in summary:
            summary["payment"] = summary["payments"]

        rc_engine = RootCauseEngine(
            summary=summary,
            funnel=cache.get("funnel", {}),
            targets=cache.get("meta", {}).get("targets", {}) or {},
            outreach=cache.get("outreach_analysis", {}),
            trial=cache.get("trial_followup", {}),
            channel_comparison=cache.get("channel_comparison", {}),
            enclosure_cross=cache.get("enclosure_cross")
            or cache.get("cohort_analysis", {}),
            checkin_impact=cache.get("checkin_impact", {}),
            productivity=cache.get("productivity", {}),
        )
        rc_result = rc_engine.analyze()

        # 构建 impact_chain
        ic_engine = ImpactChainEngine(
            summary=summary,
            targets=cache.get("meta", {}).get("targets", {}) or {},
            funnel=cache.get("funnel", {}),
        )
        ic_result = ic_engine.compute_all_chains()
        chains = ic_result.get("chains", [])

        # 构建 metric → lost_revenue_usd 映射（用于量化行动价值）
        metric_impact: dict[str, float] = {}
        for chain in chains:
            metric_impact[chain.get("metric", "")] = chain.get("lost_revenue_usd", 0.0)

        items = []

        for analysis in rc_result.get("analyses", []):
            trigger_metric = analysis.get("trigger_metric", "")
            action_text = analysis.get("action", "")
            severity = analysis.get("severity", "yellow")
            expected_impact = float(analysis.get("expected_impact_usd", 0))
            category = analysis.get("category", "total")

            # 优先级映射
            if severity == "red":
                priority = "immediate"
            elif category in ("total", "channel"):
                priority = "this-week"
            else:
                priority = "ongoing"

            # 拆分行动文本为子项（按中文顿号/分号/；分割）
            import re

            sub_actions = [
                s.strip() for s in re.split(r"[；;]|；|；", action_text) if s.strip()
            ]
            if not sub_actions:
                sub_actions = [action_text]

            # deadline 映射（前端期望中文标签）
            deadline_map = {
                "immediate": "今日",
                "this-week": "本周五",
                "ongoing": "持续",
            }

            # owner 根据 root_cause 推断
            root_cause = analysis.get("root_cause", "")
            if "SS" in root_cause or "LP" in root_cause:
                owner = "SS/LP 组长"
            elif "系统" in root_cause or "工具" in root_cause:
                owner = "产品/技术"
            else:
                owner = "CC 组长"

            items.append(
                {
                    "id": len(items) + 1,
                    "priority": priority,
                    "action": action_text,
                    "owner": owner,
                    "deadline": deadline_map.get(priority, "本周五"),
                    "impact": f"预期增收 ${expected_impact:.0f}/月",
                    "category": category,
                    "trigger_label": analysis.get("trigger_label", ""),
                    "expected_impact_usd": expected_impact,
                    "expected_impact_thb": round(expected_impact * 34),
                    "severity": severity,
                    "root_cause": root_cause,
                }
            )

        # 按优先级排序
        priority_order = {"immediate": 0, "this-week": 1, "ongoing": 2}
        items.sort(
            key=lambda x: (
                priority_order.get(x["priority"], 3),
                -x["expected_impact_usd"],
            )
        )

        total_impact = sum(i["expected_impact_usd"] for i in items)

        return {
            "status": "ok",
            "data": {
                "items": items,
                "total_expected_impact_usd": round(total_impact, 2),
                "total_expected_impact_thb": round(total_impact * 34),
                "generated_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        return _fallback_action_plan(error=str(e))


def _fallback_action_plan(error: str = "") -> dict:
    return {
        "status": "fallback",
        "error": error or "no_data",
        "data": {
            "items": [
                {
                    "id": 1,
                    "priority": "immediate",
                    "action": "请先运行分析 POST /api/analysis/run 后再查看行动计划",
                    "owner": "CC 组长",
                    "deadline": "今日",
                    "impact": "预期增收 $0/月",
                    "category": "total",
                    "trigger_label": "系统提示",
                    "expected_impact_usd": 0,
                    "expected_impact_thb": 0,
                    "severity": "yellow",
                    "root_cause": "数据未加载",
                }
            ],
            "total_expected_impact_usd": 0,
            "total_expected_impact_thb": 0,
            "generated_at": datetime.now().isoformat(),
        },
    }


# ─── 端点2: 会议纪要 ──────────────────────────────────────────────────────────


@router.get("/meeting-summary", summary="会议讨论要点")
def get_meeting_summary(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    从 pyramid_report + root_cause 派生会议讨论要点。
    返回共识、分歧点、待跟进项及下次会议信息。
    """
    try:
        cache = _get_cache(svc)
        if cache is None:
            return _fallback_meeting_summary()

        from backend.core.report_generator_v2 import PyramidReportGenerator
        from backend.core.root_cause import RootCauseEngine

        # 金字塔报告
        pyramid_gen = PyramidReportGenerator(cache)
        pyramid = pyramid_gen.generate()

        # 根因分析
        summary = dict(cache.get("summary", {}))
        if "registrations" in summary and "registration" not in summary:
            summary["registration"] = summary["registrations"]
        if "payments" in summary and "payment" not in summary:
            summary["payment"] = summary["payments"]

        rc_engine = RootCauseEngine(
            summary=summary,
            funnel=cache.get("funnel", {}),
            targets=cache.get("meta", {}).get("targets", {}) or {},
            outreach=cache.get("outreach_analysis", {}),
            trial=cache.get("trial_followup", {}),
            channel_comparison=cache.get("channel_comparison", {}),
            enclosure_cross=cache.get("enclosure_cross")
            or cache.get("cohort_analysis", {}),
            checkin_impact=cache.get("checkin_impact", {}),
            productivity=cache.get("productivity", {}),
        )
        rc_result = rc_engine.analyze()

        # 从 pyramid_report 提取 key findings 作为共识
        consensus = []
        scqa_list = pyramid.get("scqa_list", []) or []
        for scqa in scqa_list[:3]:
            if isinstance(scqa, dict):
                answer = scqa.get("answer", "")
                situation = scqa.get("situation", "")
                if answer:
                    consensus.append(answer)
                elif situation:
                    consensus.append(situation)

        # 补充结论
        conclusion = pyramid.get("conclusion", "")
        if conclusion and conclusion not in consensus:
            consensus.insert(0, conclusion)

        consensus = [c for c in consensus if c][:5]

        # 从 root_cause 提取分歧点（红色/高影响异常），输出 {text} 格式
        disputes = []
        for analysis in rc_result.get("analyses", []):
            if analysis.get("severity") == "red":
                topic = analysis.get("trigger_label", "")
                description = analysis.get("trigger", "")
                disputes.append(
                    {
                        "text": f"{topic}: {description}" if topic else description,
                    }
                )

        disputes = disputes[:4]

        # 待跟进项（所有行动建议），输出 {text} 格式
        followups = []
        due_date = _next_workday_str(3)
        for analysis in rc_result.get("analyses", []):
            action = analysis.get("action", "")
            if action:
                followups.append(
                    {
                        "text": f"{action}（CC团队，{due_date}）",
                    }
                )

        followups = followups[:6]

        # 下次会议日期（下周同日）
        today = datetime.now()
        next_meeting = today + timedelta(days=7)
        next_meeting_date = next_meeting.strftime("%Y-%m-%d")

        # 下次会议主题（基于最大影响指标）
        analyses = rc_result.get("analyses", [])
        if analyses:
            top = max(analyses, key=lambda x: x.get("expected_impact_usd", 0))
            next_topic = (
                f"跟进{top.get('trigger_label', '核心指标')}改善进展及本周行动结果复盘"
            )
        else:
            next_topic = "本周运营数据复盘及下周行动计划制定"

        return {
            "status": "ok",
            "data": {
                "consensus": consensus,
                "disputes": disputes,
                "followups": followups,
                "next_meeting_date": next_meeting_date,
                "next_meeting_topic": next_topic,
                "generated_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        return _fallback_meeting_summary(error=str(e))


def _next_workday_str(days_offset: int) -> str:
    """计算 N 个工作日后的日期（跳过周三）"""
    d = datetime.now()
    count = 0
    while count < days_offset:
        d += timedelta(days=1)
        if d.weekday() != 2:  # 跳过周三
            count += 1
    return d.strftime("%Y-%m-%d")


def _fallback_meeting_summary(error: str = "") -> dict:
    today = datetime.now()
    next_meeting = (today + timedelta(days=7)).strftime("%Y-%m-%d")
    return {
        "status": "fallback",
        "error": error or "no_data",
        "data": {
            "consensus": ["数据暂未加载，请先运行分析"],
            "disputes": [],
            "followups": [],
            "next_meeting_date": next_meeting,
            "next_meeting_topic": "运营数据复盘及行动计划",
            "generated_at": datetime.now().isoformat(),
        },
    }


# ─── 端点3: 资源需求 ──────────────────────────────────────────────────────────


@router.get("/resource-request", summary="资源需求建议")
def get_resource_request(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    从 impact_chain 派生资源需求建议。
    按人力/预算/工具分类，计算总预期收益。
    """
    try:
        cache = _get_cache(svc)
        if cache is None:
            return _fallback_resource_request()

        from backend.core.impact_chain import ImpactChainEngine

        summary = dict(cache.get("summary", {}))
        if "registrations" in summary and "registration" not in summary:
            summary["registration"] = summary["registrations"]
        if "payments" in summary and "payment" not in summary:
            summary["payment"] = summary["payments"]

        ic_engine = ImpactChainEngine(
            summary=summary,
            targets=cache.get("meta", {}).get("targets", {}) or {},
            funnel=cache.get("funnel", {}),
        )
        ic_result = ic_engine.compute_all_chains()
        chains = ic_result.get("chains", [])

        # 按损失金额排序，取 top 链
        sorted_chains = sorted(
            chains, key=lambda c: c.get("lost_revenue_usd", 0), reverse=True
        )

        # 按指标类型映射到资源需求分类
        category_map = {
            "reach_rate": ("人力", "增加CC外呼人力配置", "外呼覆盖率提升"),
            "participation_rate": (
                "人力",
                "优化CC外呼话术培训，增加激活SOP执行",
                "参与率提升",
            ),
            "checkin_rate": ("预算", "打卡激励奖品及活动预算", "打卡率提升"),
            "reserve_rate": ("人力", "CC预约引导培训及SOP标准化", "约课率提升"),
            "attend_rate": ("工具", "课前提醒自动化工具（短信/LINE）", "出席率提升"),
            "conversion_rate": ("工具", "CRM跟进系统及促单话术工具", "转化率提升"),
        }

        # 按类别聚合
        cat_data: dict[str, dict] = {
            "人力": {"label": "人力", "cards": [], "estimated_gain_usd": 0.0},
            "预算": {"label": "预算", "cards": [], "estimated_gain_usd": 0.0},
            "工具": {"label": "工具", "cards": [], "estimated_gain_usd": 0.0},
        }

        # 优先级映射（按损失金额排名：第1→P0，第2→P1，其余→P2）
        _priority_rank: dict[str, int] = {}
        for _i, _c in enumerate(sorted_chains):
            _priority_rank[_c.get("metric", "")] = _i

        for chain in sorted_chains:
            metric = chain.get("metric", "")
            lost_usd = chain.get("lost_revenue_usd", 0.0)
            label = chain.get("label", metric)

            if metric in category_map:
                cat_key, resource_desc, gain_desc = category_map[metric]
                cat = cat_data.get(cat_key)
                if cat is not None:
                    rank = _priority_rank.get(metric, 99)
                    priority = "P0" if rank == 0 else ("P1" if rank == 1 else "P2")
                    cat["cards"].append(
                        {
                            "title": resource_desc,
                            "description": f"{gain_desc}，可回收收入 ${lost_usd:,.0f}/月",
                            "expectedRoi": f"${lost_usd:,.0f} ({gain_desc})",
                            "priority": priority,
                        }
                    )
                    cat["estimated_gain_usd"] += lost_usd

        # 构建输出类别列表（仅包含有数据的类别）
        categories = []
        for cat_key in ["人力", "预算", "工具"]:
            cat = cat_data[cat_key]
            if cat["cards"]:
                categories.append(
                    {
                        "category": cat_key,
                        "label": cat["label"],
                        "cards": cat["cards"],
                        "estimated_gain_usd": round(cat["estimated_gain_usd"], 2),
                        "estimated_gain_thb": round(cat["estimated_gain_usd"] * 34),
                    }
                )

        total_gain = sum(c["estimated_gain_usd"] for c in categories)
        top_lever = ic_result.get("top_lever_label", "")

        return {
            "status": "ok",
            "data": {
                "categories": categories,
                "total_estimated_gain_usd": round(total_gain, 2),
                "total_estimated_gain_thb": round(total_gain * 34),
                "top_lever": top_lever,
                "chains_count": len(chains),
                "generated_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        return _fallback_resource_request(error=str(e))


def _fallback_resource_request(error: str = "") -> dict:
    return {
        "status": "fallback",
        "error": error or "no_data",
        "data": {
            "categories": [
                {
                    "category": "人力",
                    "label": "人力",
                    "cards": [
                        {
                            "title": "增加CC外呼配置",
                            "description": "触达率提升，可回收收入 $0/月",
                            "expectedRoi": "$0 (触达率提升)",
                            "priority": "P1",
                        }
                    ],
                    "estimated_gain_usd": 0,
                    "estimated_gain_thb": 0,
                }
            ],
            "total_estimated_gain_usd": 0,
            "total_estimated_gain_thb": 0,
            "top_lever": "",
            "chains_count": 0,
            "generated_at": datetime.now().isoformat(),
        },
    }
