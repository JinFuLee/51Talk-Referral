"""概览 API — GET /api/overview"""

from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.config import get_targets
from backend.core.data_manager import DataManager
from backend.core.time_period import compute_month_progress

# Excel target_field → targets_override.json 中文 key 映射
# 用于统一 kpi_8item 和 kpi_pace 的目标来源
_OVERRIDE_KEY_MAP: dict[str, str] = {
    "转介绍基础业绩单量标": "付费目标",
    "转介绍基础业绩标USD": "金额目标",
    "转介绍基础业绩客单价标USD": "客单价",
    "_override_注册目标": "注册目标",
}

router = APIRouter()

# 历史快照目录（SQLite 或 JSONL，暂未实现时返回空）
_SNAPSHOT_DIR = Path(__file__).resolve().parent.parent.parent / "output" / "snapshots"


def _load_sparkline_data(metric_key: str, days: int = 7) -> list[float | None]:
    """
    尝试从历史快照加载 sparkline 数据（最近 N 天）。
    # TODO: 需要 >=7 天快照数据（output/snapshots/ JSONL 格式）
    当前无历史数据时返回空列表，前端不显示 sparkline。
    """
    # TODO: 实现快照读取逻辑，当积累 >=7 天快照后启用
    # 快照格式：output/snapshots/YYYY-MM-DD.jsonl，每行 {"key": value}
    snapshots_dir = _SNAPSHOT_DIR
    if not snapshots_dir.exists():
        return []

    import json

    snapshot_files = sorted(snapshots_dir.glob("*.jsonl"))[-days:]
    if len(snapshot_files) < 2:
        return []

    points: list[float | None] = []
    for f in snapshot_files:
        try:
            with f.open() as fp:
                for line in fp:
                    line = line.strip()
                    if not line:
                        continue
                    obj = json.loads(line)
                    val = obj.get(metric_key)
                    if val is not None:
                        try:
                            points.append(float(val))
                        except (ValueError, TypeError):
                            points.append(None)
                    break
        except Exception:
            points.append(None)

    return points


def _compute_mom_change(current: float | None, previous: float | None) -> float | None:
    """计算 MoM 环比变化率（正=上涨，负=下跌）"""
    if current is None or previous is None or previous == 0:
        return None
    return round((current - previous) / abs(previous), 4)


def _compute_kpi_8item(
    actual: float | None,
    target: float | None,
    elapsed_days: float | None,
    remaining_days: float | None,
    time_progress: float | None,
) -> dict[str, Any]:
    """计算 KPI 8 项标准格式（CLAUDE.md 指标显示规范）"""
    daily_avg = (
        (actual / elapsed_days)
        if (actual is not None and elapsed_days and elapsed_days > 0)
        else None
    )
    absolute_gap = (
        (actual - target) if (actual is not None and target is not None) else None
    )
    pace_gap = (
        (actual / target - time_progress)
        if (
            actual is not None
            and target is not None
            and target > 0
            and time_progress is not None
        )
        else None
    )
    remaining_daily_avg = (
        (target - actual) / remaining_days
        if (
            remaining_days is not None
            and remaining_days > 0
            and target is not None
            and actual is not None
        )
        else None
    )
    pace_daily_needed = (
        max(0, target * time_progress - actual) / remaining_days
        if (
            remaining_days is not None
            and remaining_days > 0
            and target is not None
            and actual is not None
            and time_progress is not None
        )
        else None
    )
    efficiency_needed = (
        (remaining_daily_avg / daily_avg - 1)
        if (daily_avg is not None and daily_avg > 0 and remaining_daily_avg is not None)
        else None
    )
    return {
        "actual": actual,
        "target": target,
        "absolute_gap": round(absolute_gap, 2) if absolute_gap is not None else None,
        "pace_gap": round(pace_gap, 4) if pace_gap is not None else None,
        "remaining_daily_avg": round(remaining_daily_avg, 2)
        if remaining_daily_avg is not None
        else None,
        "pace_daily_needed": round(pace_daily_needed, 2)
        if pace_daily_needed is not None
        else None,
        "efficiency_needed": round(efficiency_needed, 4)
        if efficiency_needed is not None
        else None,
        "current_daily_avg": round(daily_avg, 2) if daily_avg is not None else None,
    }


@router.get("/overview", summary="转介绍核心指标概览")
def get_overview(
    request: Request,
    dm: DataManager = Depends(get_data_manager),  # noqa: B008
) -> dict[str, Any]:
    """返回 D1 结果行的所有核心指标 + 数据源状态 + 时间进度 + KPI 8 项格式"""
    data = dm.load_all()
    result_df = data.get("result")

    metrics: dict[str, Any] = {}
    if result_df is not None and not result_df.empty:
        row = result_df.iloc[0]
        for col in result_df.columns:
            val = row[col]
            if pd.isna(val) if not isinstance(val, (list, dict)) else False:
                metrics[col] = None
            else:
                try:
                    f = float(val)
                    metrics[col] = None if math.isnan(f) else f
                except (ValueError, TypeError):
                    metrics[col] = str(val) if val else None

    statuses = [s.model_dump() for s in dm.get_status()]

    # 时间进度（按 CLAUDE.md 工作日规则：周三权重 0，周六日 1.4）
    mp = compute_month_progress()
    time_progress_info: dict[str, Any] = {
        "today": mp.today.isoformat(),
        "month_start": mp.month_start.isoformat(),
        "month_end": mp.month_end.isoformat(),
        "elapsed_workdays": mp.elapsed_workdays,
        "remaining_workdays": mp.remaining_workdays,
        "total_workdays": mp.total_workdays,
        "time_progress": mp.time_progress,
        "elapsed_calendar_days": mp.elapsed_calendar_days,
        "total_calendar_days": mp.total_calendar_days,
    }

    elapsed = mp.elapsed_workdays or 1.0
    remaining = mp.remaining_workdays or 1.0
    time_progress = mp.time_progress

    # 统一目标源：优先读 targets_override.json，fallback Excel metrics
    # get_targets 接受 datetime 对象，用当月第 1 天定位月份
    override_tgts: dict[str, Any] = {}
    try:
        ref_dt = datetime(mp.today.year, mp.today.month, 1)
        override_tgts = get_targets(ref_dt)
        # V2 结构解析（与 report_engine._normalize_targets 对齐）
        _cfg_dir = Path(__file__).resolve().parent.parent.parent / "config"
        _ovr_file = _cfg_dir / "targets_override.json"
        if _ovr_file.exists():
            _ovr = json.loads(_ovr_file.read_text(encoding="utf-8"))
            _month_key = f"{mp.today.year:04d}{mp.today.month:02d}"
            _month_data = _ovr.get(_month_key, {})
            # V2 hard.referral_revenue → 金额目标
            _hard = _month_data.get("hard", {})
            if _hard.get("referral_revenue", 0) > 0:
                override_tgts["金额目标"] = float(_hard["referral_revenue"])
            # V2 channels → 注册目标（user_count 之和）
            _channels = _month_data.get("channels", {})
            if _channels:
                _total_users = sum(
                    (ch.get("user_count") or 0) for ch in _channels.values()
                )
                if _total_users > 0:
                    override_tgts["注册目标"] = float(_total_users)
                # 付费目标 = sum(user_count × conversion_rate)
                _total_paid = sum(
                    (ch.get("user_count") or 0) * (ch.get("conversion_rate") or 0)
                    for ch in _channels.values()
                )
                if _total_paid > 0:
                    override_tgts["付费目标"] = round(_total_paid, 1)
    except Exception as _e:
        import logging
        logging.getLogger(__name__).warning("V2 target parse error: %s", _e)


    def _get_target(target_field: str | None) -> float | None:
        """优先从 override 读取目标，fallback 到 Excel metrics"""
        if target_field is None:
            return None
        override_key = _OVERRIDE_KEY_MAP.get(target_field)
        if override_key:
            v = override_tgts.get(override_key)
            if v is not None and v != 0:
                try:
                    return float(v)
                except (ValueError, TypeError):
                    pass
        # fallback：从 Excel result 行读取
        return metrics.get(target_field)

    # 旧版 kpi_pace（向后兼容）
    kpi_pace: dict[str, Any] = {}
    kpi_keys = {
        "转介绍注册数": "register",
        "预约数": "appointment",
        "出席数": "showup",
        "转介绍付费数": "paid",
        "总带新付费金额USD": "revenue",
    }
    target_keys = {
        "转介绍付费数": "转介绍基础业绩单量标",
        "总带新付费金额USD": "转介绍基础业绩标USD",
    }

    for metric_key, pace_key in kpi_keys.items():
        actual = metrics.get(metric_key)
        target_field = target_keys.get(metric_key)
        target = _get_target(target_field)

        if actual is None:
            kpi_pace[pace_key] = None
            continue

        daily_avg = actual / elapsed if actual is not None else None
        pace_daily_needed: float | None = None
        if target is not None and remaining > 0:
            needed = target * mp.time_progress - actual
            pace_daily_needed = max(0.0, needed) / remaining

        kpi_pace[pace_key] = {
            "actual": actual,
            "target": target,
            "daily_avg": round(daily_avg, 2) if daily_avg is not None else None,
            "pace_daily_needed": (
                round(pace_daily_needed, 2) if pace_daily_needed is not None else None
            ),
        }

    # 新版 kpi_8item：8 项标准格式（CLAUDE.md 指标显示规范）
    kpi_8item_keys = {
        "转介绍注册数": ("register", "_override_注册目标"),
        "预约数": ("appointment", None),
        "出席数": ("showup", None),
        "转介绍付费数": ("paid", "转介绍基础业绩单量标"),
        "总带新付费金额USD": ("revenue", "转介绍基础业绩标USD"),
        "客单价": ("asp", "转介绍基础业绩客单价标USD"),
    }
    kpi_8item: dict[str, Any] = {}
    for metric_key, (pace_key, target_field) in kpi_8item_keys.items():
        actual = metrics.get(metric_key)
        target = _get_target(target_field)
        kpi_8item[pace_key] = _compute_kpi_8item(
            actual=actual,
            target=target,
            elapsed_days=elapsed,
            remaining_days=remaining,
            time_progress=time_progress,
        )

    # D2b 全站基准（1 行 7 列）
    d2b_df = data.get("d2b_summary")
    d2b_summary: dict[str, Any] | None = None
    if d2b_df is not None and not d2b_df.empty:
        row = d2b_df.iloc[0]
        # 兼容多种列名
        def _d2b_val(candidates: list[str]) -> float | None:
            for c in candidates:
                if c in row.index:
                    v = row[c]
                    try:
                        f = float(v)
                        return None if math.isnan(f) else f
                    except (ValueError, TypeError):
                        pass
            return None

        d2b_summary = {
            "total_students": _d2b_val(["学员数", "有效学员数", "总学员数"]),
            "new_coefficient": _d2b_val(["带新系数", "转介绍带新系数"]),
            "cargo_ratio": _d2b_val(["带货比", "带货比例"]),
            "participation_count": _d2b_val(["带新参与数", "参与带新学员数"]),
            "participation_rate": _d2b_val(["参与率", "转介绍参与率"]),
            "checkin_rate": _d2b_val(["当月有效打卡率", "打卡率"]),
            "cc_reach_rate": _d2b_val(["CC触达率", "有效触达率"]),
        }

    # sparkline + MoM 数据
    # KPI key → metrics dict key
    sparkline_metric_keys = {
        "register": "转介绍注册数",
        "appointment": "预约数",
        "showup": "出席数",
        "paid": "转介绍付费数",
        "revenue": "总带新付费金额USD",
    }
    kpi_sparklines: dict[str, list[float | None]] = {}
    kpi_mom: dict[str, float | None] = {}
    for pace_key, metric_key in sparkline_metric_keys.items():
        points = _load_sparkline_data(metric_key, days=7)
        kpi_sparklines[pace_key] = points
        # MoM：若有快照数据，取最近与最早点的比值；无快照时返回 None
        if len(points) >= 2:
            first = next((p for p in points if p is not None), None)
            last = next((p for p in reversed(points) if p is not None), None)
            kpi_mom[pace_key] = _compute_mom_change(last, first)
        else:
            kpi_mom[pace_key] = None

    return {
        "metrics": metrics,
        "data_sources": statuses,
        "time_progress": time_progress_info,
        "kpi_pace": kpi_pace,
        "kpi_8item": kpi_8item,
        "d2b_summary": d2b_summary,
        "kpi_sparklines": kpi_sparklines,
        "kpi_mom": kpi_mom,
    }
