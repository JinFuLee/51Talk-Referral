"""数据口径守卫 Dashboard API

路由：GET /api/caliber-guard/status
返回最近 50 条校验记录及整体健康状态
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from backend.core.caliber_guard import derive_overall_status, read_recent_alerts

router = APIRouter()


class CaliberGuardAlert(BaseModel):
    ts: str
    session_id: str | None = None
    source: str
    level: Literal["P0", "P1", "advisory"]
    type: str
    detail: str
    metric: str | None = None
    d1: float | None = None
    d2: float | None = None
    diff_pct: float | None = None
    coverage: float | None = None
    entropy: float | None = None
    hhi: float | None = None
    excluded_revenue: float | None = None


class D1D2DiffSummary(BaseModel):
    revenue_d1: float | None = None
    revenue_d2: float | None = None
    revenue_diff_pct: float | None = None
    leads_d1: float | None = None
    leads_d2: float | None = None
    leads_diff_pct: float | None = None


class CaliperGuardStatus(BaseModel):
    overall_status: Literal["healthy", "warning", "critical"]
    layer1_alerts: list[CaliberGuardAlert]
    layer2_alerts: list[CaliberGuardAlert]
    layer3_alerts: list[CaliberGuardAlert]
    last_check_ts: str | None
    d1_d2_diff_pct: dict


@router.get(
    "/caliber-guard/status",
    response_model=CaliperGuardStatus,
    summary="数据口径守卫健康状态",
)
def get_caliber_guard_status() -> CaliperGuardStatus:
    """返回最近 50 条口径审计记录及整体健康状态

    - overall_status: healthy（无告警）/ warning（有 P1）/ critical（有 P0）
    - layer1_alerts: Schema 契约校验告警（列存在性/类型/新鲜度）
    - layer2_alerts: D1 vs D2 交叉校验告警
    - layer3_alerts: 过滤覆盖率 + 分布集中度告警
    - d1_d2_diff_pct: D1/D2 最新一次 revenue/leads 偏差百分比
    """
    records = read_recent_alerts(limit=50)

    layer1: list[CaliberGuardAlert] = []
    layer2: list[CaliberGuardAlert] = []
    layer3: list[CaliberGuardAlert] = []

    for r in records:
        source = r.get("source", "")
        try:
            alert = CaliberGuardAlert(**{k: v for k, v in r.items() if k != "source"},
                                      source=source)
        except Exception:
            continue
        if "layer1" in source:
            layer1.append(alert)
        elif "layer2" in source:
            layer2.append(alert)
        elif "layer3" in source:
            layer3.append(alert)

    # 推导 d1_d2_diff_pct
    d1_d2: dict = {}
    for r in records:
        if r.get("source") == "layer2_business" and r.get("diff_pct") is not None:
            metric = r.get("metric", "unknown")
            if metric not in d1_d2:
                d1_d2[metric] = r.get("diff_pct")

    overall_status = derive_overall_status(records)

    last_ts = records[0]["ts"] if records else None

    return CaliperGuardStatus(
        overall_status=overall_status,  # type: ignore[arg-type]
        layer1_alerts=layer1,
        layer2_alerts=layer2,
        layer3_alerts=layer3,
        last_check_ts=last_ts,
        d1_d2_diff_pct=d1_d2,
    )
