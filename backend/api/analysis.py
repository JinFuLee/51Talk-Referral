"""
分析引擎 API 端点 (V2)
所有需要 AnalysisService 缓存的 GET 端点，以及触发分析的 POST 端点。
引擎已升级为 AnalysisEngineV2（35 源跨源联动）。
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

router = APIRouter()

# 模块级单例（由 main.py startup 注入）
_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


# ── Request Models ────────────────────────────────────────────────────────────

class RunAnalysisRequest(BaseModel):
    input_dir: Optional[str] = None
    report_date: Optional[str] = None   # ISO 格式 YYYY-MM-DD
    lang: str = "zh"
    targets: Optional[dict[str, Any]] = None
    force: bool = False                  # True 时忽略 TTL 强制重算


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_cache(key: str) -> Any:
    """从缓存中取指定 key，不存在则返回 404"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    value = result.get(key)
    if value is None:
        raise HTTPException(
            status_code=404,
            detail=f"no_data: 分析结果中不含 '{key}'，请先运行分析",
        )
    return value


def _require_full_cache() -> dict[str, Any]:
    """返回完整缓存，不存在则 404"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    return result


# ── Endpoints — 触发 & 全量结果 ────────────────────────────────────────────────

@router.post("/run")
def run_analysis(body: RunAnalysisRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    触发完整 35 源分析管线（AnalysisEngineV2）。
    若 5 分钟 TTL 内已有缓存则直接返回缓存摘要，除非 force=true。
    """
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    try:
        summary = _service.run(
            input_dir=body.input_dir,
            report_date=body.report_date,
            lang=body.lang,
            targets=body.targets,
            force=body.force,
        )
        return {"status": "ok", "summary": summary}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=422, detail={"error": "FileNotFoundError", "detail": str(exc)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": type(exc).__name__, "detail": str(exc)})


@router.get("/result")
def get_result() -> dict[str, Any]:
    """返回最新完整分析结果（缓存）"""
    return _require_full_cache()


# ── Endpoints — 核心指标（原有，URL 不变）────────────────────────────────────

@router.get("/summary")
def get_summary() -> dict[str, Any]:
    """返回进度看板 summary + meta + time_progress"""
    cache = _require_full_cache()
    return {
        "summary":       cache.get("summary"),
        "meta":          cache.get("meta"),
        "time_progress": cache.get("time_progress"),
    }


@router.get("/funnel")
def get_funnel() -> dict[str, Any]:
    """返回漏斗转化数据（各口径）"""
    return _require_cache("funnel")


@router.get("/channel-comparison")
def get_channel_comparison() -> Any:
    """返回渠道对比数据"""
    return _require_cache("channel_comparison")


@router.get("/cc-ranking")
def get_cc_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(default="composite"),
) -> Any:
    """返回 CC 综合绩效排名"""
    data = _require_cache("cc_ranking")
    if isinstance(data, list):
        return data[:top_n]
    return data


@router.get("/ss-ranking")
def get_ss_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
) -> Any:
    """返回 SS（EA）绩效排名"""
    data = _require_cache("ss_ranking")
    if isinstance(data, list):
        return data[:top_n]
    return data


@router.get("/lp-ranking")
def get_lp_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
) -> Any:
    """返回 LP（CM）绩效排名"""
    data = _require_cache("lp_ranking")
    if isinstance(data, list):
        return data[:top_n]
    return data


@router.get("/prediction")
def get_prediction() -> Any:
    """返回三模型预测输出（线性/WMA/EWM 三选优）"""
    return _require_cache("prediction")


@router.get("/roi")
def get_roi() -> Any:
    """返回 ROI 估算（Cohort × ROI 联动）"""
    return _require_cache("roi_estimate")


@router.get("/anomalies")
def get_anomalies() -> Any:
    """返回动态阈值异常检测结果（±2σ）"""
    return _require_cache("anomalies")


@router.get("/trend")
def get_trend(
    compare_type: str = Query(default="mom", description="mom=月环比, yoy=月同比"),
) -> Any:
    """返回趋势数据"""
    cache = _require_full_cache()
    if compare_type == "yoy":
        return cache.get("yoy_trend") or cache.get("trend")
    return cache.get("mom_trend") or cache.get("trend")


# ── Endpoints — 向后兼容别名（老端点保留）────────────────────────────────────

@router.get("/cohort")
def get_cohort() -> Any:
    """返回围场（cohort）分析 [alias → enclosure_cross]"""
    return _require_cache("cohort_analysis")


@router.get("/checkin")
def get_checkin() -> Any:
    """返回打卡率分析 [alias → checkin_analysis]"""
    return _require_cache("checkin_analysis")


@router.get("/leads")
def get_leads() -> Any:
    """返回 Leads 达成分析 [alias → funnel]"""
    return _require_cache("leads_achievement")


@router.get("/followup")
def get_followup() -> Any:
    """返回跟进效率分析 [alias → outreach_analysis]"""
    return _require_cache("followup_analysis")


@router.get("/orders")
def get_orders() -> Any:
    """返回订单分析"""
    return _require_cache("order_analysis")


@router.get("/ltv")
def get_ltv() -> Any:
    """返回 LTV 分析"""
    return _require_cache("ltv")


@router.get("/risk-alerts")
def get_risk_alerts() -> Any:
    """返回风险预警列表"""
    return _require_cache("risk_alerts")


# ── Endpoints — 新增跨源联动端点 ──────────────────────────────────────────────

@router.get("/student-journey")
def get_student_journey() -> dict[str, Any]:
    """
    学员全旅程跨源联动
    A3 leads明细 × E3 订单 × F6 体验跟进 × F11 课前外呼
    """
    return {"status": "ok", "data": _require_cache("student_journey")}


@router.get("/cc-360")
def get_cc_360(
    top_n: int = Query(default=20, ge=1, le=200),
) -> dict[str, Any]:
    """
    CC 360° 画像跨源联动
    D1 打卡率 × F5 外呼 × A4 个人 leads × E3 订单 × F9 付费用户跟进
    """
    data = _require_cache("cc_360")
    if isinstance(data, dict):
        profiles = data.get("profiles", [])
        return {
            "status": "ok",
            "data": {
                **data,
                "profiles": profiles[:top_n],
                "top_performers": data.get("top_performers", []),
                "needs_attention": data.get("needs_attention", []),
                "team_averages": data.get("team_averages", {}),
            },
        }
    return {"status": "ok", "data": data}


@router.get("/cohort-roi")
def get_cohort_roi() -> dict[str, Any]:
    """
    Cohort × ROI 跨源联动
    C1-C5 衰减曲线 × B1 成本模型
    """
    return {"status": "ok", "data": _require_cache("cohort_roi")}


@router.get("/enclosure")
def get_enclosure() -> dict[str, Any]:
    """
    围场交叉分析
    D2-D4 围场 KPI × F8 围场跟进 × A2 围场效率
    """
    return {"status": "ok", "data": _require_cache("enclosure_cross")}


@router.get("/checkin-impact")
def get_checkin_impact() -> dict[str, Any]:
    """
    打卡因果分析
    D1 × D5 已打卡/未打卡参与率、带新系数对比
    """
    return {"status": "ok", "data": _require_cache("checkin_impact")}


@router.get("/productivity")
def get_productivity() -> dict[str, Any]:
    """
    人效分析
    E1/E2 上班人数 × E3 订单 × E5 业绩趋势
    """
    return {"status": "ok", "data": _require_cache("productivity")}


@router.get("/outreach")
def get_outreach() -> dict[str, Any]:
    """
    外呼分析
    F5 每日外呼 + F6 体验跟进 + F7 付费用户跟进
    """
    return {"status": "ok", "data": _require_cache("outreach_analysis")}


@router.get("/trial-followup")
def get_trial_followup() -> dict[str, Any]:
    """
    体验课跟进
    F10 课前课后 + F11 课前外呼覆盖
    """
    return {"status": "ok", "data": _require_cache("trial_followup")}


@router.get("/risk-alerts-v2")
def get_risk_alerts_v2() -> dict[str, Any]:
    """
    风险预警（V2 完整格式）
    基于 summary 缺口 + anomalies 汇总生成
    """
    return {"status": "ok", "data": _require_cache("risk_alerts")}
