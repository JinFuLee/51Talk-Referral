"""
Insights API 端点 — 5-Why根因分析、阶段评估、金字塔报告
独立路由文件，不修改 analysis.py。
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from .dependencies import get_service
from backend.services.analysis_service import AnalysisService

router = APIRouter()


def _require_cache(svc: AnalysisService) -> dict[str, Any]:
    """返回完整缓存，不存在则 404"""
    result = svc.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    return result


@router.get("/root-cause", summary="5-Why 根因分析")
def get_root_cause(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """对所有异常 KPI 执行5-Why因果链分析（规则引擎，不依赖LLM）"""
    cache = _require_cache(svc)
    from backend.core.root_cause import RootCauseEngine
    summary = dict(cache.get("summary", {}))
    # 兼容 V2 缓存 key 名（registrations → registration, payments → payment）
    if "registrations" in summary and "registration" not in summary:
        summary["registration"] = summary["registrations"]
    if "payments" in summary and "payment" not in summary:
        summary["payment"] = summary["payments"]
    engine = RootCauseEngine(
        summary=summary,
        funnel=cache.get("funnel", {}),
        targets=cache.get("meta", {}).get("targets", {}) or {},
        outreach=cache.get("outreach_analysis", {}),
        trial=cache.get("trial_followup", {}),
        channel_comparison=cache.get("channel_comparison", {}),
        enclosure_cross=cache.get("enclosure_cross") or cache.get("cohort_analysis", {}),
        checkin_impact=cache.get("checkin_impact", {}),
        productivity=cache.get("productivity", {}),
    )
    return engine.analyze()


@router.get("/stage-evaluation", summary="转介绍阶段评估")
def get_stage_evaluation(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """评估当前转介绍运营成熟度阶段（基础启动/科学运营/系统思维）"""
    cache = _require_cache(svc)
    from backend.core.stage_evaluator import StageEvaluator
    evaluator = StageEvaluator(cache)
    return evaluator.evaluate()


@router.get("/pyramid-report", summary="金字塔结构报告")
def get_pyramid_report(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """生成结论先行的金字塔结构报告（SCQA + MECE拆解 + 六步法）"""
    cache = _require_cache(svc)
    from backend.core.report_generator_v2 import PyramidReportGenerator
    generator = PyramidReportGenerator(cache)
    return generator.generate()
