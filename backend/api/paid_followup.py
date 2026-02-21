"""
F7 零跟进付费学员预警 + F10 课前vs课后跟进对比
GET /api/analysis/paid-followup-alert
GET /api/analysis/trial-class-compare
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter()

_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


@router.get("/paid-followup-alert")
async def get_paid_followup_alert() -> dict[str, Any]:
    """
    F7 零跟进付费学员预警

    返回：
    - zero_followup_students: 零跟进学员明细列表（含围场段/付费天数）
    - total_zero: 零跟进学员总数
    - total_students: 全部付费学员总数
    - zero_rate: 零跟进占比
    - by_enclosure: 按围场段分组计数 {segment: count}
    - by_cc: 按 CC 分组 {cc_name: {team, count}}
    """
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    raw = getattr(_service, "_raw_data", None)
    if not raw:
        raise HTTPException(status_code=503, detail="数据未加载")

    ops = raw.get("ops", {})
    f7 = ops.get("paid_user_followup", {})
    records: list[dict] = f7.get("records", [])

    # 筛选零跟进学员 (monthly_called == 0)
    zero_followup: list[dict] = []
    for r in records:
        if (r.get("monthly_called") or 0) == 0:
            paid_date = r.get("first_paid_date")
            days_since = None
            enclosure = "未知"
            if paid_date:
                try:
                    pd = datetime.strptime(str(paid_date)[:10], "%Y-%m-%d")
                    days_since = (datetime.now() - pd).days
                    if days_since <= 30:
                        enclosure = "0-30"
                    elif days_since <= 60:
                        enclosure = "31-60"
                    elif days_since <= 90:
                        enclosure = "61-90"
                    elif days_since <= 180:
                        enclosure = "91-180"
                    else:
                        enclosure = "181+"
                except (ValueError, TypeError):
                    pass

            zero_followup.append(
                {
                    **r,
                    "days_since_paid": days_since,
                    "enclosure_segment": enclosure,
                }
            )

    # 按围场段分组统计
    by_enclosure: dict[str, int] = {}
    for s in zero_followup:
        enc = s["enclosure_segment"]
        by_enclosure[enc] = by_enclosure.get(enc, 0) + 1

    # 按 CC 分组
    by_cc: dict[str, dict] = {}
    for s in zero_followup:
        cc = s.get("cc_name") or "未知"
        if cc not in by_cc:
            by_cc[cc] = {"team": s.get("team"), "count": 0}
        by_cc[cc]["count"] += 1

    total = len(records)
    zero_count = len(zero_followup)

    return {
        "zero_followup_students": zero_followup,
        "total_zero": zero_count,
        "total_students": total,
        "zero_rate": round(zero_count / total, 4) if total else 0,
        "by_enclosure": by_enclosure,
        "by_cc": by_cc,
    }


@router.get("/trial-class-compare")
async def get_trial_class_compare() -> dict[str, Any]:
    """
    F10 课前vs课后跟进效果 A/B 对比

    返回：
    - by_cc: CC 粒度的课前/课后各项率
    - by_team: 团队粒度汇总
    - by_channel: 渠道维度（市场 vs 转介绍）
    - summary: 全局汇总
    """
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    raw = getattr(_service, "_raw_data", None)
    if not raw:
        raise HTTPException(status_code=503, detail="数据未加载")

    ops = raw.get("ops", {})
    f10 = ops.get("trial_class_followup", {})

    return {
        "by_cc": f10.get("by_cc", []),
        "by_team": f10.get("by_team", []),
        "by_channel": f10.get("by_channel", {}),
        "summary": f10.get("summary", {}),
    }
