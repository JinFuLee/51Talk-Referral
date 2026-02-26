"""
F9 CC 留存贡献排名 API 端点
GET /api/analysis/retention-contribution — 按留存收入降序的 CC 排名
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from .dependencies import get_service
from services.analysis_service import AnalysisService

router = APIRouter()


@router.get("/retention-contribution", summary="F9 CC 留存贡献排名（按留存收入降序）")
def get_retention_contribution(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """
    F9 CC 留存贡献排名

    从 ops.monthly_paid_followup.by_cc 中提取留存贡献数据。
    返回:
    - rankings: 按 retained_revenue_usd 降序排列的 CC 列表
      每项包含: cc_name, followup_count, retention_rate,
                retained_revenue_usd, contribution_pct
    - total_retained: 所有 CC 的跟进总量（用于贡献占比基准）
    """
    raw_data: Any = getattr(svc, "_raw_data", None)
    if not raw_data:
        # 降级：尝试从缓存结果取
        result = svc.get_cached_result()
        if result:
            raw_data = result.get("ops_raw") or {}
        else:
            return {"rankings": [], "total_retained": 0}

    ops: dict = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    paid_fu: Any = ops.get("monthly_paid_followup", {})

    by_cc: list = paid_fu.get("by_cc", []) if isinstance(paid_fu, dict) else []

    rankings: list[dict] = []
    total_retained = 0

    if isinstance(by_cc, list):
        for cc in by_cc:
            if not isinstance(cc, dict):
                continue
            retained = (
                cc.get("retained_count")
                or cc.get("followup_count")
                or 0
            )
            total_retained += int(retained)
            rankings.append(
                {
                    "cc_name": cc.get("cc_name") or cc.get("name") or "",
                    "followup_count": int(cc.get("followup_count") or 0),
                    "retention_rate": float(cc.get("retention_rate") or 0),
                    "retained_revenue_usd": float(
                        cc.get("retained_revenue_usd") or cc.get("revenue_usd") or 0
                    ),
                }
            )

    # 计算贡献占比（基于 followup_count）
    total_denom = total_retained if total_retained > 0 else 1
    for r in rankings:
        r["contribution_pct"] = round(
            r["followup_count"] / total_denom * 100, 1
        )

    rankings.sort(key=lambda x: x.get("retained_revenue_usd", 0), reverse=True)

    return {"rankings": rankings, "total_retained": total_retained}
