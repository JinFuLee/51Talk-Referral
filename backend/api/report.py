"""报告引擎 API — 日报组装 / 摘要 / 对比 / 快照"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.config import get_targets
from backend.core.daily_snapshot_service import DB_PATH, DailySnapshotService
from backend.core.data_manager import DataManager
from backend.core.report_engine import ReportEngine
from backend.models.filters import UnifiedFilter, parse_filters

router = APIRouter(tags=["report"])
logger = logging.getLogger(__name__)


def _auto_snapshot(dm: DataManager, ref: date | None = None) -> None:
    """每次生成日报时自动写入当日快照（幂等）"""
    try:
        from backend.core.channel_funnel_engine import ChannelFunnelEngine

        svc = DailySnapshotService(db_path=DB_PATH)
        ref_date = ref or (date.today() - timedelta(days=1))

        # 检查是否已有当日快照
        existing = svc.query_by_date(ref_date.isoformat())
        if existing:
            return  # 已存在，跳过

        # 构建口径漏斗并写入
        data = dm.load_all()
        engine = ChannelFunnelEngine.from_data_dict(data)
        snapshot_data = engine.compute_as_snapshot_format(data)
        if snapshot_data:
            svc.write_daily(ref_date, snapshot_data)
            logger.info("✓ 自动写入日快照: %s", ref_date.isoformat())
    except Exception as exc:
        logger.warning("自动日快照失败（非致命）: %s", exc)


# 有效的环比 level / type
_VALID_LEVELS = {"day", "week", "month", "year"}
_VALID_TYPES = {"td", "rolling"}


def _get_engine(dm: DataManager) -> ReportEngine:
    """构造 ReportEngine，注入当前月度目标"""
    targets = get_targets()
    return ReportEngine(data_manager=dm, db_path=DB_PATH, targets=targets)


def _parse_date_param(date_str: str | None) -> date | None:
    if date_str is None:
        return None
    try:
        return date.fromisoformat(date_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"日期格式无效：{date_str}，应为 YYYY-MM-DD",
        ) from exc


# ── 端点 1：完整 11 区块日报 ──────────────────────────────────────────────────


@router.get("/report/daily", summary="完整日报（11 区块）")
def get_daily_report(
    request: Request,
    reference_date: str | None = Query(
        default=None,
        description="T-1 参考日期，格式 YYYY-MM-DD，不传则取今天 -1 天",
    ),
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """
    生成完整 11 区块日报，符合 frontend/lib/types/report.ts DailyReport 契约。

    包含：monthly_overview / gap_dashboard / scenario_analysis / projection /
    revenue_contribution / mom_attribution / lead_attribution / decomposition /
    funnel_leverage / channel_revenue / channel_three_factor
    """
    ref = _parse_date_param(reference_date)
    try:
        engine = _get_engine(dm)
        report = engine.generate_daily_report(reference_date=ref)
        # 自动写入当日快照（幂等，同日不重复）
        _auto_snapshot(dm, ref)
        return report
    except Exception as exc:
        logger.error("generate_daily_report 失败: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── 端点 2：核心摘要（钉钉推送用）────────────────────────────────────────────


@router.get("/report/summary", summary="日报核心摘要（钉钉消费）")
def get_report_summary(
    request: Request,
    reference_date: str | None = Query(
        default=None,
        description="T-1 参考日期，格式 YYYY-MM-DD，不传则取今天 -1 天",
    ),
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """
    返回精简摘要：BM进度 / 注册付费业绩进度 / 瓶颈TOP1 / 日维度环比。
    钉钉 dingtalk_report.py 消费此端点。
    """
    ref = _parse_date_param(reference_date)
    try:
        engine = _get_engine(dm)
        return engine.generate_summary(reference_date=ref)
    except Exception as exc:
        logger.error("generate_summary 失败: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── 端点 3：多维度环比对比 ────────────────────────────────────────────────────


@router.get("/report/comparison", summary="多维度环比对比（日/周/月/年）")
def get_report_comparison(
    request: Request,
    level: str = Query(
        default="month",
        description="对比维度：day / week / month / year",
    ),
    type: str = Query(
        default="td",
        description="对比类型：td（累计同期）/ rolling（滚动窗口）",
    ),
    channel: str | None = Query(
        default=None,
        description="口径过滤：CC窄口 / SS窄口 / LP窄口 / 宽口 / total（不传=total）",
    ),
    metric: str | None = Query(
        default=None,
        description=(
            "指标过滤：registrations / payments / revenue_usd 等（不传=revenue_usd）"
        ),
    ),
    reference_date: str | None = Query(
        default=None,
        description="T-1 参考日期，格式 YYYY-MM-DD",
    ),
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """
    调用 ComparisonEngine 计算指定维度的环比数据。

    - level: day / week / month / year
    - type: td（累计到今日）/ rolling（近 N 日滚动）
    - channel: 口径；不传则用 total 总计口径
    - metric: 指标；不传则用 revenue_usd
    """
    if level not in _VALID_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"level 无效：{level}，合法值：{sorted(_VALID_LEVELS)}",
        )
    if type not in _VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"type 无效：{type}，合法值：{sorted(_VALID_TYPES)}",
        )

    ref = _parse_date_param(reference_date) or (date.today() - timedelta(days=1))
    _metric = metric or "revenue_usd"
    _channel = channel or "total"

    try:
        from backend.core.comparison_engine import ComparisonEngine

        engine = ComparisonEngine(DB_PATH)
        result = engine.compute(_metric, _channel, ref)
        # 过滤出请求的 level+type 组合
        key_map = {
            ("day", "td"): "day",
            ("week", "td"): "week_td",
            ("week", "rolling"): "week_roll",
            ("month", "td"): "month_td",
            ("month", "rolling"): "month_roll",
            ("year", "td"): "year_td",
            ("year", "rolling"): "year_roll",
        }
        dim_key = key_map.get((level, type), f"{level}_{type}")
        dimension_data = result.get(dim_key, result)
        return {
            "metric": _metric,
            "channel": _channel,
            "level": level,
            "type": type,
            "reference_date": ref.isoformat(),
            "data": dimension_data,
        }
    except Exception as exc:
        logger.error("comparison 计算失败: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── 端点 4：手动触发快照 ──────────────────────────────────────────────────────


@router.post("/report/snapshot", summary="手动触发当日快照写入 SQLite")
def create_snapshot(
    request: Request,
    reference_date: str | None = Query(
        default=None,
        description="快照日期，格式 YYYY-MM-DD，不传则取今天 -1 天",
    ),
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """
    手动触发将当日 T-1 数据写入 SQLite snapshots.db。
    幂等操作——重复调用同一日期会更新已有快照。
    """
    ref = _parse_date_param(reference_date) or (date.today() - timedelta(days=1))
    try:
        data = dm.load_all()
        result_df = data.get("result")
        if result_df is None:
            raise HTTPException(status_code=503, detail="数据未就绪，请检查数据源")

        snapshot_svc = DailySnapshotService(DB_PATH)

        # 构建渠道漏斗快照（口径维度）
        from backend.core.report_engine import ReportEngine

        targets = get_targets()
        engine = ReportEngine(data_manager=dm, db_path=DB_PATH, targets=targets)
        channel_funnel = engine._build_channel_funnel(data)

        write_result = snapshot_svc.write_daily(
            result_df=result_df,
            channel_snapshots=channel_funnel,
            snapshot_date=ref,
        )
        return {
            "status": "ok",
            "snapshot_date": ref.isoformat(),
            **write_result,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("snapshot 写入失败: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
