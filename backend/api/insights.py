"""
Insights API 端点 — 5-Why根因分析、阶段评估、金字塔报告
独立路由文件，不修改 analysis.py。
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/root-cause", summary="5-Why 根因分析")
def get_root_cause():
    """对所有异常 KPI 执行5-Why因果链分析（规则引擎，不依赖LLM）"""
    from api.analysis import _require_full_cache
    cache = _require_full_cache()
    from core.root_cause import RootCauseEngine
    engine = RootCauseEngine(
        summary=cache.get("summary", {}),
        funnel=cache.get("funnel", {}),
        targets=cache.get("meta", {}).get("targets", {}) or {},
        outreach=cache.get("outreach_analysis", {}),
        trial=cache.get("trial_followup", {}),
    )
    return engine.analyze()


@router.get("/stage-evaluation", summary="转介绍阶段评估")
def get_stage_evaluation():
    """评估当前转介绍运营成熟度阶段（基础启动/科学运营/系统思维）"""
    from api.analysis import _require_full_cache
    cache = _require_full_cache()
    from core.stage_evaluator import StageEvaluator
    evaluator = StageEvaluator(cache)
    return evaluator.evaluate()


@router.get("/pyramid-report", summary="金字塔结构报告")
def get_pyramid_report():
    """生成结论先行的金字塔结构报告（SCQA + MECE拆解 + 六步法）"""
    from api.analysis import _require_full_cache
    cache = _require_full_cache()
    from core.report_generator_v2 import PyramidReportGenerator
    generator = PyramidReportGenerator(cache)
    return generator.generate()
