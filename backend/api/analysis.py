"""
分析引擎 API 端点 (V2)
所有需要 AnalysisService 缓存的 GET 端点，以及触发分析的 POST 端点。
引擎已升级为 AnalysisEngineV2（35 源跨源联动）。
所有 GET 端点支持 period 查询参数（默认 "this_month"），缓存按 period 分槽。

adapt 函数已拆分至 backend/api/adapters/ 目录，本文件只保留路由薄层。
工具函数 safe_div 统一来自 backend/api/utils.py。
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from services.analysis_service import AnalysisService

# ── Adapt 函数（从同包子模块导入，相对导入不依赖 sys.path）──────────────────────
from .adapters.outreach_adapt import _adapt_orders, _adapt_outreach, _adapt_trial
from .adapters.ranking_adapt import (
    _adapt_attribution,
    _adapt_channel_revenue,
    _adapt_package_mix,
    _adapt_ranking,
    _adapt_team_package_mix,
)
from .adapters.summary_adapt import (
    _adapt_channel_comparison,
    _adapt_funnel,
    _adapt_prediction,
    _adapt_productivity,
    _adapt_roi,
    _adapt_summary,
)
from .adapters.trend_adapt import _adapt_trend
from .dependencies import get_service

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

router = APIRouter()

# ── 二级适配缓存 ────────────────────────────────────────────────────────────────
# key → (version: float, result: Any)
# version = _service._last_run_ats[period].timestamp()，引擎重算时自动失效旧条目。
# GIL 保证 dict 赋值原子性，无需额外锁。
_adapt_cache: dict[str, tuple[float, Any]] = {}


def _cache_version(svc: AnalysisService, period: str) -> float:
    """返回指定 period 的引擎缓存版本号（上次 run 的 Unix 时间戳）。
    若 svc 未就绪或尚无该 period 的运行记录，返回 0.0（表示"无版本"）。
    """
    try:
        ts = svc._last_run_ats.get(period)  # type: ignore[union-attr]
        return ts.timestamp() if ts is not None else 0.0
    except Exception:
        return 0.0


def _get_adapted(key: str, version: float, adapt_fn: Any, *args: Any) -> Any:
    """返回缓存的 adapt 结果；version 变化时重算并写入缓存。

    当某个 period 产生新 version 时，批量驱逐**同 period** 下版本号不同的旧条目
    （key 格式为 "{name}:{period}" 或 "{name}:{period}:{extra}"，period 在第二段）。
    不同 period 可能有各自的 version，不互相驱逐。
    """
    cached = _adapt_cache.get(key)
    if cached is not None and cached[0] == version:
        return cached[1]
    result = adapt_fn(*args)
    # 提取 key 中的 period（第二个冒号分隔段）
    parts = key.split(":", 2)
    period_seg = parts[1] if len(parts) >= 2 else ""
    if period_seg:
        # 仅清理同 period 下 version 已过期的条目
        stale_keys = [
            k for k, (v, _) in _adapt_cache.items()
            if v != version and k.split(":", 2)[1:2] == [period_seg]
        ]
        for k in stale_keys:
            _adapt_cache.pop(k, None)
    _adapt_cache[key] = (version, result)
    return result


# ── 白名单常量 ─────────────────────────────────────────────────────────────────

_VALID_PERIODS = {"this_week", "this_month", "last_month", "last_week", "custom"}


def _validate_period(period: str) -> str:
    if period not in _VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"period 必须是: {', '.join(sorted(_VALID_PERIODS))}",
        )
    return period


# ── Request Models ────────────────────────────────────────────────────────────

class RunAnalysisRequest(BaseModel):
    input_dir: str | None = None
    report_date: str | None = None   # ISO 格式 YYYY-MM-DD
    lang: str = "zh"
    targets: dict[str, Any] | None = None
    force: bool = False                  # True 时忽略 TTL 强制重算
    period: str = "this_month"           # 时间维度
    custom_start: str | None = None  # YYYY-MM-DD（period="custom" 时使用）
    custom_end: str | None = None    # YYYY-MM-DD（period="custom" 时使用）


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_cache(svc: AnalysisService, key: str, period: str = "this_month") -> Any:
    """从缓存中取指定 key，缓存不存在则 404，提示先 POST /api/analysis/run"""
    result = svc.get_cached_result(period)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 尚无分析缓存，请先 POST /api/analysis/run 触发分析",
        )
    value = result.get(key)
    if value is None:
        raise HTTPException(
            status_code=404,
            detail=f"no_data: 分析结果中不含 '{key}'，请先运行分析",
        )
    return value


def _require_full_cache(svc: AnalysisService, period: str = "this_month") -> dict[str, Any]:
    """返回完整缓存，缓存不存在则 404，提示先 POST /api/analysis/run"""
    result = svc.get_cached_result(period)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 尚无分析缓存，请先 POST /api/analysis/run 触发分析",
        )
    return result




# ── Endpoints — 触发 & 全量结果 ────────────────────────────────────────────────

@router.post("/run")
def run_analysis(
    body: RunAnalysisRequest,
    background_tasks: BackgroundTasks,
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    触发完整 35 源分析管线（AnalysisEngineV2）。
    使用 BackgroundTasks 以后台运行的方式避免阻塞 API 响应。
    """
    background_tasks.add_task(
        svc.run,
        input_dir=body.input_dir,
        report_date=body.report_date,
        lang=body.lang,
        targets=body.targets,
        force=body.force,
        period=body.period,
        custom_start=body.custom_start,
        custom_end=body.custom_end,
    )
    return {"status": "processing", "summary": {}, "message": "分析任务已提交后台运行"}


@router.get("/result")
def get_result(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """返回最新完整分析结果（缓存）"""
    period = _validate_period(period)
    return _require_full_cache(svc, period)


# ── Endpoints — 核心指标（原有，URL 不变）────────────────────────────────────

@router.get("/summary")
def get_summary(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    返回进度看板 summary + meta + time_progress。
    summary 字段已适配为前端 SummaryMetric 格式（registrations/payments/revenue/...），
    同时在顶层展开同名 key，兼容 ops/dashboard（直接读顶层）和 biz/overview（读 .summary.*）。
    每个 metric 内嵌 MoM 数据（mom_prev / mom_change / mom_change_pct），来自 trend.mom 缓存。
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    adapt_key = f"summary:{period}"
    cached_resp = _adapt_cache.get(adapt_key)
    if cached_resp is not None and cached_resp[0] == version:
        return cached_resp[1]

    from datetime import date as _date

    cache = _require_full_cache(svc, period)
    raw_summary: dict[str, Any] = cache.get("summary") or {}
    # 注入 time_progress 供 _adapt_summary 计算 _calc_status 使用
    raw_summary_with_tp = {**raw_summary, "time_progress": cache.get("time_progress", 0.0)}
    adapted = _adapt_summary(raw_summary_with_tp)

    # ── 内嵌 MoM 环比数据（不修改 _adapt_summary，在端点层注入）──────────────
    # 数据来源：trend.mom.data（F3 loader 预聚合的多月数据）
    # 结构：{ "202501": [{channel_type, paid, amount_usd, allocations, ...}], "202502": [...] }
    try:
        trend_data: dict[str, Any] = cache.get("trend") or {}
        mom_data: dict[str, Any] = trend_data.get("mom", {}).get("data", {}) or {}

        if mom_data:
            # 确定当前月和上月 key
            curr_month_key = _date.today().strftime("%Y%m")
            sorted_months = sorted(mom_data.keys())
            prev_month_key: str | None = None

            if curr_month_key in sorted_months:
                idx = sorted_months.index(curr_month_key)
                if idx > 0:
                    prev_month_key = sorted_months[idx - 1]
            elif len(sorted_months) >= 2:
                # 当前月尚无数据时，取最后两个月中更早的那个
                prev_month_key = sorted_months[-2]

            if prev_month_key and prev_month_key in mom_data:
                prev_entries = mom_data[prev_month_key]
                if not isinstance(prev_entries, list):
                    prev_entries = [prev_entries]

                # 聚合上月所有渠道的总量
                prev_paid = sum((e.get("paid") or 0) for e in prev_entries)
                prev_revenue_usd = sum((e.get("amount_usd") or 0) for e in prev_entries)
                # allocations 字段近似注册分配数（F3 loader 预聚合字段）
                prev_allocations = sum((e.get("allocations") or 0) for e in prev_entries)

                def _inject_mom(metric_dict: dict[str, Any], curr_actual: float, prev_value: float) -> None:
                    """将上月值和变化量注入到 metric 字典（原地修改）"""
                    metric_dict["mom_prev"] = prev_value
                    change = (curr_actual or 0) - prev_value
                    metric_dict["mom_change"] = round(change, 4)
                    metric_dict["mom_change_pct"] = (
                        round(change / prev_value * 100, 1) if prev_value else None
                    )

                if "registrations" in adapted and isinstance(adapted["registrations"], dict):
                    _inject_mom(
                        adapted["registrations"],
                        adapted["registrations"].get("actual", 0),
                        prev_allocations,
                    )
                if "payments" in adapted and isinstance(adapted["payments"], dict):
                    _inject_mom(
                        adapted["payments"],
                        adapted["payments"].get("actual", 0),
                        prev_paid,
                    )
                if "revenue" in adapted and isinstance(adapted["revenue"], dict):
                    _inject_mom(
                        adapted["revenue"],
                        adapted["revenue"].get("actual", 0),
                        prev_revenue_usd,
                    )
                if "leads" in adapted and isinstance(adapted["leads"], dict):
                    _inject_mom(
                        adapted["leads"],
                        adapted["leads"].get("actual", 0),
                        prev_allocations,
                    )
    except Exception as _mom_err:
        import logging as _log
        _log.getLogger(__name__).warning(f"get_summary: MoM 注入失败（不影响主响应）: {_mom_err}")
    # ─────────────────────────────────────────────────────────────────────────

    response = {
        # biz/overview 用: summaryResp?.summary?.registrations?.actual
        "summary": adapted,
        # ops/dashboard 用: summaryData["registrations"]（把整个响应当 Record<string,SummaryMetric>）
        **adapted,
        "meta": cache.get("meta"),
        "time_progress": cache.get("time_progress"),
    }
    # 写入 adapt 缓存（直接赋值，跳过 adapt_fn 调用；驱逐同 period 旧条目）
    parts = adapt_key.split(":", 2)
    period_seg = parts[1] if len(parts) >= 2 else ""
    if period_seg:
        stale_keys = [
            k for k, (v, _) in _adapt_cache.items()
            if v != version and k.split(":", 2)[1:2] == [period_seg]
        ]
        for k in stale_keys:
            _adapt_cache.pop(k, None)
    _adapt_cache[adapt_key] = (version, response)
    return response


@router.get("/funnel")
def get_funnel(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    返回漏斗转化数据（各口径）。
    输出已适配为前端 FunnelData 格式：narrow（cc+ss+lp 合并）/ total / wide。
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "funnel", period)
    if isinstance(raw, dict):
        return _get_adapted(f"funnel:{period}", version, _adapt_funnel, raw)
    return raw


@router.get("/channel-comparison")
def get_channel_comparison(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    返回渠道对比数据。
    输出已适配为前端 ChannelComparisonData 格式：{ channels: ChannelStat[] }。
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "channel_comparison", period)
    if isinstance(raw, dict):
        return _get_adapted(f"channel_comparison:{period}", version, _adapt_channel_comparison, raw)
    return {"channels": []}


@router.get("/team-data")
def get_team_data(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> list[Any]:
    """
    返回团队成员数据列表（TeamMemberData[]）。
    从 cc_ranking / ss_ranking / lp_ranking 聚合，兼容前端 analysisAPI.getTeamData()。
    """
    period = _validate_period(period)
    cache = _require_full_cache(svc, period)
    members: list[Any] = []
    for key in ("cc_ranking", "ss_ranking", "lp_ranking"):
        data = cache.get(key)
        if isinstance(data, list):
            members.extend(data)
        elif isinstance(data, dict) and "profiles" in data:
            members.extend(data["profiles"])
    return members


@router.get("/cc-ranking")
def get_cc_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(default="composite"),
    period: str = Query(default="this_month", description="时间维度"),
    cc_name: str | None = Query(default=None, description="筛选指定 CC（精确匹配）"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回 CC 综合绩效排名，若传 cc_name 则只返回该 CC 的数据"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    data = _require_cache(svc, "cc_ranking", period)
    items: list[Any] = data if isinstance(data, list) else data.get("items", [])
    if cc_name:
        items = [item for item in items if (item.get("cc_name") or item.get("name")) == cc_name]
        adapt_key = f"cc_ranking:{period}:name:{cc_name}"
    else:
        items = items[:top_n]
        adapt_key = f"cc_ranking:{period}:top:{top_n}"
    return _get_adapted(adapt_key, version, _adapt_ranking, items)


@router.get("/ss-ranking")
def get_ss_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
    period: str = Query(default="this_month", description="时间维度"),
    cc_name: str | None = Query(default=None, description="筛选指定 SS（精确匹配）"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回 SS（EA）绩效排名，若传 cc_name 则只返回该 SS 的数据"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    data = _require_cache(svc, "ss_ranking", period)
    items: list[Any] = data if isinstance(data, list) else data.get("items", [])
    if cc_name:
        items = [item for item in items if (item.get("cc_name") or item.get("name")) == cc_name]
        adapt_key = f"ss_ranking:{period}:name:{cc_name}"
    else:
        items = items[:top_n]
        adapt_key = f"ss_ranking:{period}:top:{top_n}"
    return _get_adapted(adapt_key, version, _adapt_ranking, items)


@router.get("/lp-ranking")
def get_lp_ranking(
    top_n: int = Query(default=10, ge=1, le=100),
    period: str = Query(default="this_month", description="时间维度"),
    cc_name: str | None = Query(default=None, description="筛选指定 LP（精确匹配）"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回 LP（CM）绩效排名，若传 cc_name 则只返回该 LP 的数据"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    data = _require_cache(svc, "lp_ranking", period)
    items: list[Any] = data if isinstance(data, list) else data.get("items", [])
    if cc_name:
        items = [item for item in items if (item.get("cc_name") or item.get("name")) == cc_name]
        adapt_key = f"lp_ranking:{period}:name:{cc_name}"
    else:
        items = items[:top_n]
        adapt_key = f"lp_ranking:{period}:top:{top_n}"
    return _get_adapted(adapt_key, version, _adapt_ranking, items)


@router.get("/prediction")
def get_prediction(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回三模型预测输出（线性/WMA/EWM 三选优），已适配为前端 PredictionData 格式"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "prediction", period)
    if isinstance(raw, dict):
        return _get_adapted(f"prediction:{period}", version, _adapt_prediction, raw)
    return raw


@router.get("/roi")
def get_roi(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回 ROI 估算（Cohort × ROI 联动），已适配为前端 ROIData 格式"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "roi_estimate", period)
    if isinstance(raw, dict):
        return _get_adapted(f"roi:{period}", version, _adapt_roi, raw)
    return raw


@router.get("/anomalies")
def get_anomalies(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回动态阈值异常检测结果（±2σ）"""
    period = _validate_period(period)
    return _require_cache(svc, "anomalies", period)


@router.get("/trend")
def get_trend(
    compare_type: str = Query(default="mom", description="mom=月环比, yoy=年同比, wow=周环比"),
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """
    返回趋势数据，已适配为前端 TrendData 格式。
    compare_type: mom（默认）| yoy | wow

    始终使用完整 trend 对象（含 daily/mom/yoy/wow 三层）作为输入，
    由 _adapt_trend 按 compare_type 从正确子结构构建 series。
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    cache = _require_full_cache(svc, period)
    # 始终取完整 trend 对象，让适配器按 compare_type 选取正确子结构
    trend_full = cache.get("trend") or {}
    if not trend_full:
        raise HTTPException(
            status_code=404,
            detail="no_data: 分析结果中不含趋势数据，请先运行分析",
        )
    if isinstance(trend_full, dict):
        return _get_adapted(f"trend:{period}:{compare_type}", version, _adapt_trend, trend_full, compare_type)
    return trend_full


# ── Endpoints — 向后兼容别名（老端点保留）────────────────────────────────────

@router.get("/cohort")
def get_cohort(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回围场（cohort）分析 [alias → enclosure_cross]"""
    period = _validate_period(period)
    return _require_cache(svc, "cohort_analysis", period)


@router.get("/checkin")
def get_checkin(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回打卡率分析 [alias → checkin_analysis]"""
    period = _validate_period(period)
    return _require_cache(svc, "checkin_analysis", period)


@router.get("/leads")
def get_leads(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回 Leads 达成分析 [alias → funnel]"""
    period = _validate_period(period)
    return _require_cache(svc, "leads_achievement", period)


@router.get("/followup")
def get_followup(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回外呼监控数据（outreach_analysis），已适配为前端平铺字段格式"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "followup_analysis", period)
    if isinstance(raw, dict):
        return _get_adapted(f"followup:{period}", version, _adapt_outreach, raw)
    return raw


@router.get("/orders")
def get_orders(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回订单分析，已适配为前端 OrderData 格式（summary 子层已拍平）"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "order_analysis", period)
    if isinstance(raw, dict):
        return _get_adapted(f"orders:{period}", version, _adapt_orders, raw)
    return raw


@router.get("/ltv")
def get_ltv(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回 LTV 分析"""
    period = _validate_period(period)
    return _require_cache(svc, "ltv", period)


@router.get("/risk-alerts")
def get_risk_alerts(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """返回风险预警列表"""
    period = _validate_period(period)
    return _require_cache(svc, "risk_alerts", period)


# ── Endpoints — 新增跨源联动端点 ──────────────────────────────────────────────

@router.get("/student-journey")
def get_student_journey(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """
    学员全旅程跨源联动
    A3 leads明细 × E3 订单 × F6 体验跟进 × F11 课前外呼
    """
    period = _validate_period(period)
    return _require_cache(svc, "student_journey", period)


@router.get("/cc-360")
def get_cc_360(
    top_n: int = Query(default=20, ge=1, le=200),
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """
    CC 360° 画像跨源联动
    D1 打卡率 × F5 外呼 × A4 个人 leads × E3 订单 × F9 付费用户跟进
    """
    period = _validate_period(period)
    data = _require_cache(svc, "cc_360", period)
    if isinstance(data, dict):
        profiles = data.get("profiles", [])
        return {
            **data,
            "profiles": profiles[:top_n],
            "top_performers": data.get("top_performers", []),
            "needs_attention": data.get("needs_attention", []),
            "team_averages": data.get("team_averages", {}),
        }
    return data


@router.get("/cohort-roi")
def get_cohort_roi(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """
    Cohort × ROI 跨源联动
    C1-C5 衰减曲线 × B1 成本模型
    """
    period = _validate_period(period)
    return _require_cache(svc, "cohort_roi", period)


@router.get("/enclosure")
def get_enclosure(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """
    围场交叉分析
    D2-D4 围场 KPI × F8 围场跟进 × A2 围场效率
    """
    period = _validate_period(period)
    return _require_cache(svc, "enclosure_cross", period)


@router.get("/checkin-impact")
def get_checkin_impact(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """
    打卡因果分析
    D1 × D5 已打卡/未打卡参与率、带新系数对比
    """
    period = _validate_period(period)
    return _require_cache(svc, "checkin_impact", period)


@router.get("/productivity")
def get_productivity(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> Any:
    """
    人效分析
    E1/E2 上班人数 × E3 订单 × E5 业绩趋势
    已适配为前端 ProductivityData 格式（per_capita / total_revenue 无 _usd 后缀）
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "productivity", period)
    if isinstance(raw, dict):
        return _get_adapted(f"productivity:{period}", version, _adapt_productivity, raw)
    return raw


@router.get("/outreach")
def get_outreach(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    外呼分析（已适配为前端平铺字段格式）
    F5 每日外呼 + F6 体验跟进 + F7 付费用户跟进
    前端期望：total_calls / total_connects / total_effective / contact_rate /
              effective_rate / avg_duration_min / daily_trend / cc_breakdown
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "outreach_analysis", period)
    if isinstance(raw, dict):
        return _get_adapted(f"outreach:{period}", version, _adapt_outreach, raw)
    return raw


@router.get("/trial-followup")
def get_trial_followup(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    体验课跟进（F10 课前课后 + F11 课前外呼覆盖），已适配为前端平铺字段格式
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    raw = _require_cache(svc, "trial_followup", period)
    if isinstance(raw, dict):
        return _get_adapted(f"trial_followup:{period}", version, _adapt_trial, raw)
    return raw


@router.get("/risk-alerts-v2")
def get_risk_alerts_v2(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    风险预警（V2 完整格式）
    基于 summary 缺口 + anomalies 汇总生成
    """
    period = _validate_period(period)
    return {"status": "ok", "data": _require_cache(svc, "risk_alerts", period)}


# ── ROI 成本明细（B1 真实数据）────────────────────────────────────────────────

@router.get("/roi/cost-breakdown")
def get_roi_cost_breakdown(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    返回 B1 真实成本明细数据，替代前端硬编码 COST_BREAKDOWN。
    格式：{ items: ROICostItem[], total_cost_usd: float, by_product: dict }
    ROICostItem: { 奖励类型, 内外场激励, 激励详情, 推荐动作, 赠送数, 成本单价USD, 成本USD }
    """
    period = _validate_period(period)
    raw = _require_cache(svc, "roi_estimate", period)
    cost_list: list[Any] = raw.get("cost_list") or []
    by_product: dict[str, Any] = raw.get("by_product") or {}
    total_cost: float = raw.get("total_cost_usd") or 0.0

    # 若 cost_list 为空（B1 文件未找到），返回空列表而非 404
    return {
        "items": cost_list,
        "total_cost_usd": total_cost,
        "by_product": by_product,
    }


# ── M13: 影响链 ────────────────────────────────────────────────────────────────

@router.get("/impact-chain")
def get_impact_chain(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """返回全效率指标影响链"""
    period = _validate_period(period)
    cache = _require_full_cache(svc, period)
    from core.impact_chain import ImpactChainEngine
    engine = ImpactChainEngine(
        summary=cache.get("summary", {}),
        targets=cache.get("meta", {}).get("targets", {}),
        funnel=cache.get("funnel", {}),
    )
    return engine.compute_all_chains()


class WhatIfRequest(BaseModel):
    metric: str
    new_value: float
    period: str = "this_month"


@router.post("/what-if")
def post_what_if(
    req: WhatIfRequest,
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """模拟某效率指标提升后的全链收益变化"""
    cache = _require_full_cache(svc, req.period)
    from core.impact_chain import ImpactChainEngine
    engine = ImpactChainEngine(
        summary=cache.get("summary", {}),
        targets=cache.get("meta", {}).get("targets", {}),
        funnel=cache.get("funnel", {}),
    )
    try:
        return engine.what_if(req.metric, req.new_value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# ── M16: 归因分析 ────────────────────────────────────────────────────────────

@router.get("/attribution")
def get_attribution(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    多维归因分析：渠道归因 + 漏斗阶段归因 + 口径（窄口/宽口）归因。

    返回格式：
    - factors: 兼容旧前端（渠道贡献列表）
    - channel_attribution: 各渠道的注册/付费贡献占比
    - funnel_attribution: 注册→约课→出席→付费 各阶段转化率与损耗
    - aperture_attribution: 窄口径 vs 宽口径 付费贡献对比

    数据来源：channel_comparison + funnel（AnalysisEngineV2 缓存）
    """
    period = _validate_period(period)
    version = _cache_version(svc, period)
    cache = _require_full_cache(svc, period)
    return _get_adapted(f"attribution:{period}", version, _adapt_attribution, cache)


# ── E6/E7/E8: 套餐结构 + 渠道收入 ─────────────────────────────────────────────

@router.get("/package-mix")
def get_package_mix(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """E6: 套餐类型占比（饼图数据）"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    cache = _require_full_cache(svc, period)
    return _get_adapted(f"package_mix:{period}", version, _adapt_package_mix, cache)


@router.get("/team-package-mix")
def get_team_package_mix(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """E7: 小组套餐结构"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    cache = _require_full_cache(svc, period)
    return _get_adapted(f"team_package_mix:{period}", version, _adapt_team_package_mix, cache)


@router.get("/channel-revenue")
def get_channel_revenue(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """E8: 渠道收入 Waterfall 数据"""
    period = _validate_period(period)
    version = _cache_version(svc, period)
    cache = _require_full_cache(svc, period)
    return _get_adapted(f"channel_revenue:{period}", version, _adapt_channel_revenue, cache)


# ── D2×D3 围场对比 + D4 合并围场总览 ──────────────────────────────────────────

def _safe_div_local(numerator: Any, denominator: Any) -> float | None:
    """围场端点专用安全除法，分母为 0 或 None 时返回 None（区别于 safe_div 的 0.0 返回值）。"""
    try:
        n = float(numerator)
        d = float(denominator)
        return round(n / d, 4) if d != 0 else None
    except (TypeError, ValueError):
        return None


@router.get("/enclosure-compare")
def get_enclosure_compare(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    D2×D3 围场对比：市场围场 vs 转介绍围场
    返回每个围场段的双渠道核心指标，用于 EnclosureCompareChart 双 Bar 图。
    """
    period = _validate_period(period)
    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]

    # 使用按 period 过滤后的原始数据
    raw_data = svc.get_raw_data(period)
    kpi_data = raw_data.get("kpi", {}) if isinstance(raw_data, dict) else {}

    d2 = kpi_data.get("enclosure_market", {})
    d3 = kpi_data.get("enclosure_referral", {})

    d2_map = {r["enclosure"]: r for r in (d2.get("by_enclosure", []) or [])}
    d3_map = {r["enclosure"]: r for r in (d3.get("by_enclosure", []) or [])}

    comparison = []
    for enc in enc_order:
        m = d2_map.get(enc, {})
        r = d3_map.get(enc, {})
        comparison.append({
            "enclosure": enc,
            "market_conv": m.get("conversion_rate"),
            "referral_conv": r.get("conversion_rate"),
            "market_participation": m.get("participation_rate"),
            "referral_participation": r.get("participation_rate"),
            "market_students": m.get("active_students"),
            "referral_students": r.get("active_students"),
            "market_mobilization": _safe_div_local(
                m.get("monthly_active_referrers"), m.get("active_students")
            ),
            "referral_mobilization": _safe_div_local(
                r.get("monthly_active_referrers"), r.get("active_students")
            ),
            "market_monthly_paid": m.get("monthly_b_paid"),
            "referral_monthly_paid": r.get("monthly_b_paid"),
            "conv_gap": round(
                (r.get("conversion_rate") or 0) - (m.get("conversion_rate") or 0), 4
            ) if (r.get("conversion_rate") is not None and m.get("conversion_rate") is not None) else None,
        })

    return {"comparison": comparison, "segments": enc_order}


@router.get("/enclosure-combined")
def get_enclosure_combined(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    D4 合并围场总览：市场+转介绍合并视图
    返回各围场段合并后的核心指标卡片数据，用于 EnclosureCombinedOverview。
    """
    period = _validate_period(period)
    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]

    # 使用按 period 过滤后的原始数据
    raw_data = svc.get_raw_data(period)
    kpi_data = raw_data.get("kpi", {}) if isinstance(raw_data, dict) else {}

    d4 = kpi_data.get("enclosure_combined", {})
    by_enc = d4.get("by_enclosure", []) or []
    total = d4.get("total", {}) or {}

    enc_map = {r["enclosure"]: r for r in by_enc}

    segments = []
    for enc in enc_order:
        row = enc_map.get(enc, {})
        students = row.get("active_students") or 0
        referrers = row.get("monthly_active_referrers") or 0
        segments.append({
            "enclosure": enc,
            "active_students": students,
            "monthly_b_registrations": row.get("monthly_b_registrations"),
            "monthly_b_paid": row.get("monthly_b_paid"),
            "monthly_active_referrers": referrers,
            "conversion_rate": row.get("conversion_rate"),
            "participation_rate": row.get("participation_rate"),
            "mobilization_rate": _safe_div_local(referrers, students),
            "ratio": row.get("ratio"),
        })

    return {
        "segments": segments,
        "total": {
            "active_students": total.get("active_students"),
            "monthly_b_paid": total.get("monthly_b_paid"),
            "monthly_b_registrations": total.get("monthly_b_registrations"),
            "conversion_rate": total.get("conversion_rate"),
            "participation_rate": total.get("participation_rate"),
        },
    }


# ── A1: 按团队分组的漏斗对比 ──────────────────────────────────────────────────

@router.get("/funnel/team")
def get_funnel_team(
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    A1 按团队分组的漏斗数据（注册/预约/出席/付费），供 TeamFunnelComparison 图表使用。
    数据来源：A1 leads_achievement.by_team（每行含 CC窄口径/SS窄口径/LP窄口径/总计 各口径漏斗值）
    输出：{ teams: [{ team, group, 注册, 预约, 出席, 付费, conversion_rate }] }
    """
    period = _validate_period(period)
    # 使用按 period 过滤后的原始数据
    raw_data = svc.get_raw_data(period)
    leads_raw = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}
    achievement = leads_raw.get("leads_achievement", {}) if isinstance(leads_raw, dict) else {}
    by_team_raw: list[Any] = achievement.get("by_team", []) or []

    teams: list[dict[str, Any]] = []
    for row in by_team_raw:
        if not isinstance(row, dict):
            continue
        team = row.get("团队")
        group = row.get("小组")
        if not team and not group:
            continue
        # 跳过小计/总计行
        team_str = str(team or "").strip()
        group_str = str(group or "").strip()
        if team_str in ("小计", "总计") or group_str in ("小计", "总计"):
            continue

        # 从"总计"口径取漏斗数值（含 CC+SS+LP+宽 全量）
        total = row.get("总计", {}) or {}
        reg = total.get("注册") or 0
        rsv = total.get("预约") or 0
        att = total.get("出席") or 0
        paid = total.get("付费") or 0

        # 同时提取 CC 窄口径供对比
        cc = row.get("CC窄口径", {}) or {}
        ss = row.get("SS窄口径", {}) or {}
        lp = row.get("LP窄口径", {}) or {}
        wide = row.get("宽口径", {}) or {}

        teams.append({
            "team": team_str or group_str,
            "group": group_str,
            "注册": reg,
            "预约": rsv,
            "出席": att,
            "付费": paid,
            "conversion_rate": round(paid / reg, 4) if reg else 0,
            "funnel_source": "总计",  # 顶层漏斗为 CC+SS+LP+宽口混合口径
            "cc_narrow": {
                "注册": cc.get("注册") or 0,
                "预约": cc.get("预约") or 0,
                "出席": cc.get("出席") or 0,
                "付费": cc.get("付费") or 0,
            },
            "ss_narrow": {
                "注册": ss.get("注册") or 0,
                "CC转化付费": ss.get("付费") or 0,   # SS 带来的 leads 被 CC 转化为付费数（跨岗效率）
            },
            "lp_narrow": {
                "注册": lp.get("注册") or 0,
                "CC转化付费": lp.get("付费") or 0,   # LP 带来的 leads 被 CC 转化为付费数（跨岗效率）
            },
            "wide": {
                "注册": wide.get("注册") or 0,
            },
        })

    # 按团队名去重（同团队多行小组取合并）
    merged: dict[str, dict[str, Any]] = {}
    for t in teams:
        key = t["team"]
        if key not in merged:
            merged[key] = dict(t)
        else:
            for metric in ("注册", "预约", "出席", "付费"):
                merged[key][metric] = (merged[key].get(metric) or 0) + (t.get(metric) or 0)
            reg_total = merged[key].get("注册") or 0
            paid_total = merged[key].get("付费") or 0
            merged[key]["conversion_rate"] = round(paid_total / reg_total, 4) if reg_total else 0

    result_teams = list(merged.values())
    return {"teams": result_teams, "total_teams": len(result_teams)}


# ── M28: 对比分析端点 ────────────────────────────────────────────────────────

def _extract_metric_actual(summary: dict[str, Any], metric_key: str) -> float | None:
    """
    从 summary dict 中提取指定指标的 actual 值。
    - metric_key 为引擎层英文 key（registration/payment/revenue/leads）
    - revenue 特殊处理：取 usd 字段
    - leads 在引擎层无独立 key，退回 registration
    """
    data = summary.get(metric_key)
    # leads 在引擎层与 registration 等价
    if data is None and metric_key == "leads":
        data = summary.get("registration")
    if not isinstance(data, dict):
        return None
    if metric_key == "revenue":
        return data.get("usd") or data.get("actual")
    return data.get("actual")


def _build_metric_compare(
    current_actual: float | None,
    compare_actual: float | None,
    compare_date: str | None = None,
) -> dict[str, Any]:
    """
    构建单个指标的对比结果 dict。
    若 compare_actual 为 None，则 change/change_pct 也为 None。
    """
    if current_actual is None or compare_actual is None:
        return {
            "current": current_actual,
            "compare": compare_actual,
            "compare_date": compare_date,
            "change": None,
            "change_pct": None,
        }
    change = round(current_actual - compare_actual, 4)
    if compare_actual != 0:
        change_pct = round(change / compare_actual * 100, 2)
    else:
        # 对比期为 0 时：若当前也为 0 → 0%，否则无穷大用 None 表示
        change_pct = None if current_actual != 0 else 0.0
    return {
        "current": current_actual,
        "compare": compare_actual,
        "compare_date": compare_date,
        "change": change,
        "change_pct": change_pct,
    }


@router.get("/compare-summary")
def compare_summary(
    period: str = Query(default="this_month", description="当前选中的时间维度"),
    mode: str = Query(..., description="对比模式: pop=环比, yoy=同比, peak=巅峰, valley=低谷"),
    custom_start: str = Query(default=None, description="自定义起始日期 YYYY-MM-DD"),
    custom_end: str = Query(default=None, description="自定义结束日期 YYYY-MM-DD"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    对比分析端点，支持四种对比模式：
      - pop（环比）: 与上一个等长周期对比
      - yoy（同比）: 与去年同期对比
      - peak（巅峰）: 与历史快照中各指标最高值对比
      - valley（低谷）: 与历史快照中各指标最低值对比

    响应格式：
    {
        "available": bool,
        "mode": "pop"|"yoy"|"peak"|"valley",
        "label": "环比上月",
        "compare_period": "custom",
        "metrics": {
            "registrations": { "current", "compare", "compare_date", "change", "change_pct" },
            "payments": { ... },
            "revenue": { ... },
            "leads": { ... }
        },
        "unavailable_reason": null | "说明文字"
    }
    """
    period = _validate_period(period)
    # 确保当前期间已分析完毕
    current_cache = _require_full_cache(svc, period)
    current_summary = current_cache.get("summary", {})

    # 4 个核心 KPI（引擎层英文 key → 响应层前端 key）
    metric_map: list[tuple[str, str]] = [
        ("registration", "registrations"),
        ("payment",      "payments"),
        ("revenue",      "revenue"),
        ("leads",        "leads"),
    ]

    # ── 模式 1/2: pop（环比）或 yoy（同比）────────────────────────────────────
    if mode in ("pop", "yoy"):
        from core.period_compare import resolve_pop_period, resolve_yoy_period

        if mode == "pop":
            comp = resolve_pop_period(period, custom_start, custom_end)
        else:
            comp = resolve_yoy_period(period, custom_start, custom_end)

        # 检查对比期缓存是否已存在（不触发同步计算，保持 GET 幂等性）
        comp_cache = svc.get_cached_result(
            comp.period, comp.custom_start, comp.custom_end
        )
        if not comp_cache:
            period_hint = comp.period
            if comp.custom_start and comp.custom_end:
                period_hint = f"custom&custom_start={comp.custom_start}&custom_end={comp.custom_end}"
            return {
                "available": False,
                "mode": mode,
                "label": comp.label,
                "compare_period": comp.period,
                "compare_start": comp.custom_start,
                "compare_end": comp.custom_end,
                "metrics": {},
                "unavailable_reason": f"对比期尚未分析，请先 POST /api/analysis/run?period={period_hint}",
            }
        comp_summary = comp_cache.get("summary", {})

        # 若对比期所有指标均为 0，标注不可用
        comp_values = [
            _extract_metric_actual(comp_summary, eng_key)
            for eng_key, _ in metric_map
        ]
        all_zero = all((v or 0) == 0 for v in comp_values)
        if not comp_summary or all_zero:
            return {
                "available": False,
                "mode": mode,
                "label": comp.label,
                "compare_period": comp.period,
                "compare_start": comp.custom_start,
                "compare_end": comp.custom_end,
                "metrics": {},
                "unavailable_reason": "对比期数据全部为零，可能超出当前数据源覆盖范围",
            }

        # 构建各指标对比
        metrics: dict[str, Any] = {}
        for eng_key, fe_key in metric_map:
            curr_val = _extract_metric_actual(current_summary, eng_key)
            cmp_val = _extract_metric_actual(comp_summary, eng_key)
            metrics[fe_key] = _build_metric_compare(curr_val, cmp_val)

        return {
            "available": True,
            "mode": mode,
            "label": comp.label,
            "compare_period": comp.period,
            "compare_start": comp.custom_start,
            "compare_end": comp.custom_end,
            "metrics": metrics,
            "unavailable_reason": None,
        }

    # ── 模式 3/4: peak（巅峰）或 valley（低谷）──────────────────────────────
    if mode in ("peak", "valley"):
        # 获取快照存储单例
        try:
            from core.snapshot_store import SnapshotStore
            store = SnapshotStore.get_instance()
        except Exception as e:
            return {
                "available": False,
                "mode": mode,
                "label": "历史巅峰" if mode == "peak" else "历史低谷",
                "compare_period": None,
                "compare_start": None,
                "compare_end": None,
                "metrics": {},
                "unavailable_reason": f"快照数据库初始化失败: {e}",
            }

        # 注意：snapshot_store 存储英文 key（registration/payment/revenue），
        # 而 analysis_engine_v2._get_peak_valley() 传入的是中文 key（注册/付费/金额）——已知 bug。
        # 本端点直接使用正确的英文 key。
        pv_metric_map: list[tuple[str, str]] = [
            ("registration", "registrations"),
            ("payment",      "payments"),
            ("revenue",      "revenue"),
            # leads 无快照数据，单独处理
        ]

        metrics = {}
        any_available = False

        for eng_key, fe_key in pv_metric_map:
            curr_val = _extract_metric_actual(current_summary, eng_key)
            try:
                pv = store.get_peak_valley(eng_key)
                pv_entry = pv.get(mode)  # peak 或 valley
            except Exception as e:
                import logging as _log
                _log.getLogger(__name__).warning(f"compare-summary peak/valley: metric={eng_key} 查询失败: {e}")
                pv_entry = None

            if pv_entry is not None:
                any_available = True
                compare_val = pv_entry.get("value")
                compare_date = pv_entry.get("date")
            else:
                compare_val = None
                compare_date = None

            metrics[fe_key] = _build_metric_compare(curr_val, compare_val, compare_date)

        # leads 无快照数据，直接用 None 标记 compare
        curr_leads = _extract_metric_actual(current_summary, "leads")
        metrics["leads"] = {
            "current": curr_leads,
            "compare": None,
            "compare_date": None,
            "change": None,
            "change_pct": None,
        }

        if not any_available:
            return {
                "available": False,
                "mode": mode,
                "label": "历史巅峰" if mode == "peak" else "历史低谷",
                "compare_period": None,
                "compare_start": None,
                "compare_end": None,
                "metrics": metrics,
                "unavailable_reason": "历史快照数据不足，需要系统积累每日快照数据后才能确定巅峰/低谷值",
            }

        return {
            "available": True,
            "mode": mode,
            "label": "历史巅峰" if mode == "peak" else "历史低谷",
            "compare_period": None,
            "compare_start": None,
            "compare_end": None,
            "metrics": metrics,
            "unavailable_reason": None,
        }

    # ── 未知 mode ────────────────────────────────────────────────────────────
    raise HTTPException(
        status_code=422,
        detail=f"不支持的对比模式 mode='{mode}'，有效值: pop, yoy, peak, valley",
    )


# ── CC 人员详情抽屉 ──────────────────────────────────────────────────────────

@router.get("/cc-detail/{cc_name}")
def get_cc_detail(
    cc_name: str,
    period: str = Query(default="this_month", description="时间维度"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    CC 人员详情抽屉数据：排名、综合得分、跟进历史、月度趋势、雷达图得分。

    数据来源：
    - cc_ranking（三类18维加权排名）→ rank / composite_score / radar_scores / 关键业务指标
    - ops.daily_outreach.by_cc → followup_history（外呼日级数据，graceful degradation）
    - trend.mom.data → monthly_trend（月度注册/付费/收入趋势）

    graceful degradation：
    - followup_history：如无日级数据则返回空数组
    - monthly_trend：如无历史 MoM 数据则返回空数组
    """
    period = _validate_period(period)
    from core.analyzers.utils import _norm_cc

    cache = _require_full_cache(svc, period)

    # ── 1. 从 cc_ranking 找目标 CC ─────────────────────────────────────────
    cc_ranking: list[dict[str, Any]] = cache.get("cc_ranking") or []
    norm_target = _norm_cc(cc_name)

    matched: dict[str, Any] | None = None
    for item in cc_ranking:
        if _norm_cc(item.get("cc_name", "")) == norm_target:
            matched = item
            break

    if matched is None:
        raise HTTPException(
            status_code=404,
            detail=f"未找到 CC 人员: {cc_name}，请先运行分析或确认姓名拼写",
        )

    # ── 2. 雷达图得分 ────────────────────────────────────────────────────────
    radar_scores = {
        "process":    matched.get("process_score") or 0.0,
        "result":     matched.get("result_score") or 0.0,
        "efficiency": matched.get("efficiency_score") or 0.0,
    }

    # ── 3. 跟进历史（日级别外呼数据，graceful degradation）───────────────────
    followup_history: list[dict[str, Any]] = []
    raw_data: dict[str, Any] = {}
    try:
        raw_data = svc.get_raw_data(period) or {}
    except Exception:
        pass

    if raw_data:
        ops_data = raw_data.get("ops", {}) or {}
        daily_outreach = ops_data.get("daily_outreach", {}) or {}
        by_cc_raw: dict[str, Any] = daily_outreach.get("by_cc", {}) or {}

        # by_cc 结构：{ "CC姓名": { dates: [...], calls: [...], connects: [...] } }
        cc_outreach: dict[str, Any] = {}
        for name, val in by_cc_raw.items():
            if _norm_cc(name) == norm_target:
                cc_outreach = val if isinstance(val, dict) else {}
                break

        if cc_outreach:
            dates: list[str] = cc_outreach.get("dates", []) or []
            calls_list: list[int] = cc_outreach.get("calls", []) or []
            connects_list: list[int] = cc_outreach.get("connects", []) or []
            effective_list: list[int] = cc_outreach.get("effective", []) or []

            for i, date_str in enumerate(dates):
                followup_history.append({
                    "date": date_str,
                    "type": "outreach",
                    "count": calls_list[i] if i < len(calls_list) else 0,
                    "effective": effective_list[i] if i < len(effective_list) else (
                        connects_list[i] if i < len(connects_list) else 0
                    ),
                })

    # ── 4. 月度趋势（MoM 数据，graceful degradation）────────────────────────
    monthly_trend: list[dict[str, Any]] = []
    try:
        trend_data: dict[str, Any] = cache.get("trend") or {}
        mom_data: dict[str, Any] = trend_data.get("mom", {}).get("data", {}) or {}

        for month_key in sorted(mom_data.keys()):
            entries = mom_data[month_key]
            if not isinstance(entries, list):
                entries = [entries] if isinstance(entries, dict) else []

            # 聚合该月所有渠道的 CC 相关数据
            total_paid = 0
            total_revenue = 0.0
            total_reg = 0
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                total_reg += entry.get("registrations") or entry.get("register") or 0
                total_paid += entry.get("payments") or entry.get("paid") or 0
                total_revenue += entry.get("revenue_usd") or entry.get("amount_usd") or 0.0

            # month_key 格式为 "202501"，转换为 "2025-01"
            month_display = f"{month_key[:4]}-{month_key[4:6]}" if len(month_key) >= 6 else month_key

            monthly_trend.append({
                "month": month_display,
                "registrations": total_reg,
                "payments": total_paid,
                "revenue_usd": round(total_revenue, 2),
            })
    except Exception:
        pass

    total_cc = len(cc_ranking) if cc_ranking else None

    return {
        "cc_name": matched.get("cc_name", cc_name),
        "rank": matched.get("rank"),
        "total_cc": total_cc,
        "composite_score": matched.get("composite_score"),
        "process_score": matched.get("process_score"),
        "result_score": matched.get("result_score"),
        "efficiency_score": matched.get("efficiency_score"),
        "team": matched.get("team"),
        "detail": matched.get("detail") or {},
        "metrics": {
            "registrations": matched.get("registrations"),
            "payments": matched.get("payments"),
            "revenue_usd": matched.get("revenue_usd"),
            "conversion_rate": matched.get("conversion_rate"),
            "checkin_rate": matched.get("checkin_rate"),
            "participation_rate": matched.get("participation_rate"),
            "outreach_count": matched.get("outreach_count"),
            "connected_count": matched.get("connected_count"),
        },
        # top-level aliases kept for backward compatibility
        "registrations": matched.get("registrations"),
        "payments": matched.get("payments"),
        "revenue_usd": matched.get("revenue_usd"),
        "checkin_rate": matched.get("checkin_rate"),
        "conversion_rate": matched.get("conversion_rate"),
        "followup_history": followup_history,
        "monthly_trend": monthly_trend,
        "radar_scores": radar_scores,
    }


# ── KPI Sparkline 端点 ────────────────────────────────────────────────────────

@router.get("/kpi-sparkline")
def get_kpi_sparkline(
    days: int = Query(default=14, ge=7, le=90, description="回看天数（7-90）"),
) -> dict[str, Any]:
    """
    返回核心 KPI 的近 N 天每日数据 + 历史巅峰/低谷，用于前端 Sparkline 小图渲染。

    轻量端点：仅读取 snapshot_store，不触发任何分析计算。
    若快照数据不足，返回 available=false 和原因说明。

    响应结构：
    {
      "available": bool,
      "days": int,
      "metrics": {
        "registration": {
          "daily": [{"date": "2026-02-01", "value": 120}, ...],
          "peak":   {"date": "...", "value": ...} | None,
          "valley": {"date": "...", "value": ...} | None
        },
        "payment": { ... },
        "revenue": { ... }
      },
      "unavailable_reason": str | None
    }
    """
    from datetime import date as _date
    from datetime import timedelta as _timedelta

    # 获取快照存储单例，失败则返回 available=false（不抛 500）
    try:
        from core.snapshot_store import SnapshotStore
        store = SnapshotStore.get_instance()
    except Exception as _init_err:
        return {
            "available": False,
            "days": days,
            "metrics": {},
            "unavailable_reason": f"快照数据库初始化失败: {_init_err}",
        }

    # T-1 数据：查询范围为今天-days 到昨天
    end_date = (_date.today() - _timedelta(days=1)).isoformat()
    start_date = (_date.today() - _timedelta(days=days)).isoformat()

    result: dict[str, Any] = {}
    for metric in ("registration", "payment", "revenue"):
        try:
            daily_rows = store.get_daily_kpi(start_date, end_date, metric) or []
            pv = store.get_peak_valley(metric)
        except Exception as _q_err:
            import logging as _log
            _log.getLogger(__name__).warning(f"kpi-sparkline: metric={metric} 查询失败: {_q_err}")
            daily_rows = []
            pv = {"peak": None, "valley": None}

        result[metric] = {
            "daily": [
                {"date": r["snapshot_date"], "value": r["value"]}
                for r in daily_rows
            ],
            "peak": pv.get("peak") if pv else None,
            "valley": pv.get("valley") if pv else None,
        }

    # 判断是否有任何可用数据
    has_data = any(len(v["daily"]) > 0 for v in result.values())

    return {
        "available": has_data,
        "days": days,
        "metrics": result,
        "unavailable_reason": (
            "快照数据不足，系统需运行数天后积累每日快照" if not has_data else None
        ),
    }
