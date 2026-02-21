"""
F5+F1 CC 外呼热力图 API 端点
GET /api/analysis/outreach-heatmap — CC × 日期 二维热力图数据
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

router = APIRouter()

_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


def _get_result() -> dict:
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    result = _service.get_cached_result()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="no_data: 请先运行分析 POST /api/analysis/run",
        )
    return result


def _safe_float(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        f = float(val)
        return 0.0 if (f != f) else f  # NaN guard
    except (TypeError, ValueError):
        return 0.0


def _build_heatmap_data(records: list[dict]) -> dict:
    """
    将 F5 records（date + cc_name + total_calls + total_connects + total_effective）
    转为热力图友好结构。
    """
    # 收集所有日期和 CC 名（保序）
    dates_set: dict[str, None] = {}
    cc_set: dict[str, None] = {}
    # 以 (cc, date) 为 key 聚合
    cell: dict[tuple[str, str], dict] = {}

    for r in records:
        date = r.get("date", "") or ""
        cc = r.get("cc_name", "") or ""
        if not date or not cc:
            continue
        dates_set[date] = None
        cc_set[cc] = None
        key = (cc, date)
        if key not in cell:
            cell[key] = {
                "cc_name": cc,
                "date": date,
                "calls": 0.0,
                "connects": 0.0,
                "effective": 0.0,
            }
        cell[key]["calls"] += _safe_float(r.get("total_calls"))
        cell[key]["connects"] += _safe_float(r.get("total_connects"))
        cell[key]["effective"] += _safe_float(r.get("total_effective"))

    dates = sorted(dates_set.keys())

    # CC 排序：按月总拨打量降序
    cc_totals: dict[str, float] = {}
    for (cc, _d), v in cell.items():
        cc_totals[cc] = cc_totals.get(cc, 0.0) + v["calls"]
    cc_names = sorted(cc_set.keys(), key=lambda c: -cc_totals.get(c, 0.0))

    data = [
        {
            **v,
            "calls": round(v["calls"]),
            "connects": round(v["connects"]),
            "effective": round(v["effective"]),
            "effective_rate": round(v["effective"] / v["calls"], 4) if v["calls"] > 0 else 0.0,
        }
        for v in cell.values()
    ]

    # 汇总
    total_calls = sum(round(v["calls"]) for v in cell.values())
    elapsed_days = len(dates) or 1
    avg_daily = round(total_calls / elapsed_days, 1)
    top_cc = max(cc_totals, key=lambda c: cc_totals[c]) if cc_totals else ""

    return {
        "dates": dates,
        "cc_names": cc_names,
        "data": data,
        "summary": {
            "total_calls": total_calls,
            "avg_daily": avg_daily,
            "top_cc": top_cc,
        },
    }


@router.get("/outreach-heatmap")
async def get_outreach_heatmap():
    """
    F5 CC 外呼热力图（CC × 日期二维矩阵）。

    返回:
    - dates: 本月所有有数据的日期列表（升序）
    - cc_names: CC 姓名列表（按月总拨打量降序）
    - data: 每个 (cc, date) 格子的拨打/接通/有效接通 数值
    - summary: { total_calls, avg_daily, top_cc }
    """
    try:
        result = _get_result()
    except HTTPException:
        return {
            "dates": [],
            "cc_names": [],
            "data": [],
            "summary": {"total_calls": 0, "avg_daily": 0, "top_cc": ""},
        }

    # F5 data is stored in outreach_analysis.daily_outreach.by_date (list of {date, cc_name, ...})
    # Also try the raw service _raw_data for per-cc-per-date records
    outreach_analysis = result.get("outreach_analysis") or {}
    daily_outreach = outreach_analysis.get("daily_outreach") or {}
    by_date_list: list[dict] = daily_outreach.get("by_date") or []
    by_cc_dict: dict = daily_outreach.get("by_cc") or {}

    # Build records: flatten by_cc dict into (cc_name, date) records
    records: list[dict] = []
    if by_cc_dict:
        for cc_name, cc_data in by_cc_dict.items():
            if not isinstance(cc_data, dict):
                continue
            dates_data = cc_data.get("by_date", {}) or {}
            if isinstance(dates_data, dict):
                for date, day_data in dates_data.items():
                    if isinstance(day_data, dict):
                        records.append({
                            "cc_name": cc_name,
                            "date": date,
                            "total_calls": day_data.get("calls", 0) or day_data.get("total_calls", 0),
                            "total_connects": day_data.get("connects", 0) or day_data.get("connected", 0),
                            "total_effective": day_data.get("effective", 0) or day_data.get("effective_calls", 0),
                        })

    # Fallback: try raw_data directly from service
    if not records:
        raw_data = getattr(_service, "_raw_data", None) or {}
        ops = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
        f5_raw = ops.get("daily_outreach", {}) if isinstance(ops, dict) else {}
        f5_by_cc = f5_raw.get("by_cc", {}) if isinstance(f5_raw, dict) else {}
        if isinstance(f5_by_cc, dict):
            for cc_name, cc_data in f5_by_cc.items():
                if not isinstance(cc_data, dict):
                    continue
                for date in (cc_data.get("dates") or []):
                    records.append({
                        "cc_name": cc_name,
                        "date": date,
                        "total_calls": cc_data.get("total_calls", 0),
                        "total_connects": cc_data.get("total_connects", 0),
                        "total_effective": cc_data.get("total_effective", 0),
                    })

    if not records:
        return {
            "dates": [],
            "cc_names": [],
            "data": [],
            "summary": {"total_calls": 0, "avg_daily": 0, "top_cc": ""},
        }

    return _build_heatmap_data(records)
