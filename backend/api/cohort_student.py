"""
C6 学员明细分析 API 端点
8800+ 学员记录 → CC带新排名 / 留存曲线 / 团队对比
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends

from backend.services.analysis_service import AnalysisService

from .dependencies import get_service

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

router = APIRouter()


@router.get(
    "/cohort-students", summary="C6 学员明细 — CC 带新排名 + 月龄留存曲线 + 团队对比"
)
def get_cohort_students(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """C6 学员明细统计 — CC带新排名 / 月龄留存曲线 / 团队对比"""
    raw = getattr(svc, "_raw_data", None)

    # 尝试从原始数据中读取 C6 cohort_detail
    c6: dict = {}
    if raw:
        cohort = raw.get("cohort", {})
        c6 = cohort.get("cohort_detail", {})

    by_cc_raw: dict = c6.get("by_cc", {})
    by_team_raw: dict = c6.get("by_team", {})
    records: list = c6.get("records", [])
    total: int = c6.get("total_students", 0)

    data_source = "c6" if (by_cc_raw or records) else "no_data"

    # 无数据源时返回标准空态
    if data_source == "no_data":
        return {
            "available": False,
            "data_source": "no_data",
            "empty_reason": "无学员数据源可用",
            "data": {
                "total_students": 0,
                "cc_ranking": [],
                "retention_curve": [],
                "by_team": [],
            },
        }

    # ── 1. CC 带新排名 ────────────────────────────────────────────────────────
    if by_cc_raw:
        cc_ranking = []
        for name, info in by_cc_raw.items():
            valid = info.get("有效学员数", 0) or 0
            bring_new = info.get("带新注册总数", 0) or 0
            reached = info.get("触达学员数", 0) or 0
            cc_ranking.append(
                {
                    "cc_name": name,
                    "team": info.get("团队", ""),
                    "students": info.get("学员数", 0) or 0,
                    "valid_students": valid,
                    "reached_students": reached,
                    "bring_new_total": bring_new,
                    "bring_new_rate": round(bring_new / valid, 4) if valid > 0 else 0,
                    "reach_rate": round(reached / valid, 4) if valid > 0 else 0,
                }
            )
        cc_ranking.sort(key=lambda x: x["bring_new_rate"], reverse=True)
    else:
        cc_ranking = []

    # ── 2. 留存曲线（月龄 m1-m12 有效率）────────────────────────────────────
    if records:
        retention_curve = _build_retention_curve(records)
    else:
        retention_curve = []

    # ── 3. 团队对比 ────────────────────────────────────────────────────────
    if by_team_raw:
        team_list = []
        for name, info in by_team_raw.items():
            valid = info.get("有效学员数", 0) or 0
            team_list.append(
                {
                    "team": name,
                    "students": info.get("学员数", 0) or 0,
                    "valid_students": valid,
                    "reached_students": info.get("触达学员数", 0) or 0,
                    "bring_new_total": info.get("带新注册总数", 0) or 0,
                    "bring_new_rate": round(
                        (info.get("带新注册总数", 0) or 0) / valid, 4
                    )
                    if valid > 0
                    else 0,
                }
            )
    else:
        team_list = []

    return {
        "total_students": total,
        "cc_ranking": cc_ranking,
        "retention_curve": retention_curve,
        "by_team": team_list,
        "data_source": data_source,
    }


# ── 内部计算 ──────────────────────────────────────────────────────────────────


def _build_retention_curve(records: list) -> list[dict]:
    """按月龄 m1-m12 计算有效率"""
    retention_curve = []
    for m_idx in range(1, 13):
        key = f"m{m_idx}"
        total_valid = 0
        valid_count = 0
        for r in records:
            v = r.get("是否有效", {})
            if isinstance(v, dict):
                val = v.get(key)
            else:
                val = None
            if val is not None:
                total_valid += 1
                if val == 1:
                    valid_count += 1
        retention_curve.append(
            {
                "month_age": m_idx,
                "valid_rate": round(valid_count / total_valid, 4)
                if total_valid > 0
                else None,
                "valid_count": valid_count,
                "total": total_valid,
            }
        )
    return retention_curve
