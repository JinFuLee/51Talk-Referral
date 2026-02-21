from __future__ import annotations
from typing import Any
from fastapi import APIRouter, HTTPException

router = APIRouter()
_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


@router.get("/enclosure-channel-matrix")
def get_enclosure_channel_matrix():
    """A2 围场×渠道热力矩阵"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    raw_data = getattr(_service, "_raw_data", None) or {}
    leads = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}
    by_enclosure = leads.get("by_enclosure", {})

    # by_enclosure 可能结构: dict keyed by enclosure segment
    # 或 list of dicts with enclosure field
    # 交叉围场×渠道维度

    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]
    channel_keys = ["CC窄口径", "SS窄口径", "LP窄口径", "宽口径"]
    channel_labels = ["CC窄", "SS窄", "LP窄", "宽口"]

    matrix = []
    if isinstance(by_enclosure, dict):
        for enc in enc_order:
            enc_data = by_enclosure.get(enc, {})
            if not isinstance(enc_data, dict):
                continue
            for i, ch_key in enumerate(channel_keys):
                ch_data = enc_data.get(ch_key, {})
                if not isinstance(ch_data, dict):
                    ch_data = {}
                reg = ch_data.get("注册") or ch_data.get("registrations") or 0
                paid = ch_data.get("付费") or ch_data.get("payments") or 0
                matrix.append({
                    "enclosure": enc,
                    "channel": channel_labels[i],
                    "registrations": reg,
                    "payments": paid,
                    "conversion_rate": round(paid / reg, 4) if reg else 0,
                })
    elif isinstance(by_enclosure, list):
        for item in by_enclosure:
            if not isinstance(item, dict):
                continue
            enc = item.get("enclosure") or item.get("围场", "")
            for i, ch_key in enumerate(channel_keys):
                ch_data = item.get(ch_key, {})
                if not isinstance(ch_data, dict):
                    continue
                reg = ch_data.get("注册") or ch_data.get("registrations") or 0
                paid = ch_data.get("付费") or ch_data.get("payments") or 0
                matrix.append({
                    "enclosure": str(enc),
                    "channel": channel_labels[i],
                    "registrations": reg,
                    "payments": paid,
                    "conversion_rate": round(paid / reg, 4) if reg else 0,
                })

    return {
        "matrix": matrix,
        "enclosures": enc_order,
        "channels": channel_labels,
    }


@router.get("/time-interval")
def get_time_interval():
    """A3 注册→付费时间间隔分布"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")
    raw_data = getattr(_service, "_raw_data", None) or {}
    leads = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}
    records = leads.get("records", [])

    # 从明细记录中计算注册→付费天数
    intervals = []
    if isinstance(records, list):
        for rec in records:
            if not isinstance(rec, dict):
                continue
            days = rec.get("days_to_payment") or rec.get("interval_days")
            if days is not None and isinstance(days, (int, float)):
                intervals.append(int(days))

    # 分桶统计
    buckets = [
        {"label": "0-3天", "min": 0, "max": 3},
        {"label": "4-7天", "min": 4, "max": 7},
        {"label": "8-14天", "min": 8, "max": 14},
        {"label": "15-30天", "min": 15, "max": 30},
        {"label": "31+天", "min": 31, "max": 999999},
    ]

    total = len(intervals) or 1
    histogram = []
    for b in buckets:
        count = sum(1 for d in intervals if b["min"] <= d <= b["max"])
        histogram.append({
            "bucket": b["label"],
            "count": count,
            "percentage": round(count / total * 100, 1),
        })

    sorted_intervals = sorted(intervals) if intervals else [0]
    avg_days = round(sum(intervals) / total, 1) if intervals else 0
    median_idx = len(sorted_intervals) // 2
    median_days = sorted_intervals[median_idx] if sorted_intervals else 0
    p90_idx = int(len(sorted_intervals) * 0.9)
    p90_days = sorted_intervals[min(p90_idx, len(sorted_intervals) - 1)] if sorted_intervals else 0

    return {
        "histogram": histogram,
        "avg_days": avg_days,
        "median_days": median_days,
        "p90_days": p90_days,
        "total_records": len(intervals),
    }
