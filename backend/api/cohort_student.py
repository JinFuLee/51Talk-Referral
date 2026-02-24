"""
C6 学员明细分析 API 端点
8800+ 学员记录 → CC带新排名 / 留存曲线 / 团队对比
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


@router.get("/cohort-students")
def get_cohort_students() -> dict[str, Any]:
    """C6 学员明细统计 — CC带新排名 / 月龄留存曲线 / 团队对比"""
    if _service is None:
        raise HTTPException(status_code=503, detail="服务未初始化")

    raw = getattr(_service, "_raw_data", None)

    # 尝试从原始数据中读取 C6 cohort_detail
    c6: dict = {}
    if raw:
        cohort = raw.get("cohort", {})
        c6 = cohort.get("cohort_detail", {})

    by_cc_raw: dict = c6.get("by_cc", {})
    by_team_raw: dict = c6.get("by_team", {})
    records: list = c6.get("records", [])
    total: int = c6.get("total_students", 0)

    data_source = "c6" if (by_cc_raw or records) else "demo"

    # ── 1. CC 带新排名 ────────────────────────────────────────────────────────
    if by_cc_raw:
        cc_ranking = []
        for name, info in by_cc_raw.items():
            valid = info.get("有效学员数", 0) or 0
            bring_new = info.get("带新注册总数", 0) or 0
            reached = info.get("触达学员数", 0) or 0
            cc_ranking.append({
                "cc_name": name,
                "team": info.get("团队", ""),
                "students": info.get("学员数", 0) or 0,
                "valid_students": valid,
                "reached_students": reached,
                "bring_new_total": bring_new,
                "bring_new_rate": round(bring_new / valid, 4) if valid > 0 else 0,
                "reach_rate": round(reached / valid, 4) if valid > 0 else 0,
            })
        cc_ranking.sort(key=lambda x: x["bring_new_rate"], reverse=True)
    else:
        # 演示数据
        cc_ranking = _demo_cc_ranking()

    # ── 2. 留存曲线（月龄 m1-m12 有效率）────────────────────────────────────
    if records:
        retention_curve = _build_retention_curve(records)
    else:
        retention_curve = _demo_retention_curve()

    # ── 3. 团队对比 ────────────────────────────────────────────────────────
    if by_team_raw:
        team_list = []
        for name, info in by_team_raw.items():
            valid = info.get("有效学员数", 0) or 0
            team_list.append({
                "team": name,
                "students": info.get("学员数", 0) or 0,
                "valid_students": valid,
                "reached_students": info.get("触达学员数", 0) or 0,
                "bring_new_total": info.get("带新注册总数", 0) or 0,
                "bring_new_rate": round((info.get("带新注册总数", 0) or 0) / valid, 4) if valid > 0 else 0,
            })
    else:
        team_list = _demo_team_list()

    return {
        "total_students": total or 8806,
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
        retention_curve.append({
            "month_age": m_idx,
            "valid_rate": round(valid_count / total_valid, 4) if total_valid > 0 else None,
            "valid_count": valid_count,
            "total": total_valid,
        })
    return retention_curve


# ── 演示数据 ──────────────────────────────────────────────────────────────────

def _demo_cc_ranking() -> list[dict]:
    return [
        {"cc_name": "สมใจ", "team": "CC-A", "students": 145, "valid_students": 127, "reached_students": 100, "bring_new_total": 41, "bring_new_rate": 0.323, "reach_rate": 0.787},
        {"cc_name": "มานี", "team": "CC-B", "students": 132, "valid_students": 112, "reached_students": 85,  "bring_new_total": 33, "bring_new_rate": 0.295, "reach_rate": 0.759},
        {"cc_name": "วิภา", "team": "CC-A", "students": 128, "valid_students": 106, "reached_students": 78,  "bring_new_total": 29, "bring_new_rate": 0.274, "reach_rate": 0.736},
        {"cc_name": "ประไพ", "team": "CC-C", "students": 119, "valid_students": 95,  "reached_students": 67,  "bring_new_total": 25, "bring_new_rate": 0.263, "reach_rate": 0.705},
        {"cc_name": "สุดา", "team": "CC-B", "students": 115, "valid_students": 90,  "reached_students": 61,  "bring_new_total": 22, "bring_new_rate": 0.244, "reach_rate": 0.678},
        {"cc_name": "พรรณี", "team": "CC-C", "students": 108, "valid_students": 82,  "reached_students": 53,  "bring_new_total": 18, "bring_new_rate": 0.220, "reach_rate": 0.646},
        {"cc_name": "นิภา", "team": "CC-A", "students": 102, "valid_students": 75,  "reached_students": 47,  "bring_new_total": 15, "bring_new_rate": 0.200, "reach_rate": 0.627},
        {"cc_name": "ลัดดา", "team": "CC-D", "students": 98,  "valid_students": 70,  "reached_students": 42,  "bring_new_total": 13, "bring_new_rate": 0.186, "reach_rate": 0.600},
    ]


def _demo_retention_curve() -> list[dict]:
    data = [
        (1, 0.92, 920, 1000),
        (2, 0.85, 850, 1000),
        (3, 0.78, 780, 1000),
        (4, 0.70, 700, 1000),
        (5, 0.63, 630, 1000),
        (6, 0.58, 580, 1000),
        (7, 0.53, 530, 1000),
        (8, 0.49, 490, 1000),
        (9, 0.46, 460, 1000),
        (10, 0.43, 430, 1000),
        (11, 0.41, 410, 1000),
        (12, 0.39, 390, 1000),
    ]
    return [
        {"month_age": m, "valid_rate": rate, "valid_count": vc, "total": t}
        for m, rate, vc, t in data
    ]


def _demo_team_list() -> list[dict]:
    return [
        {"team": "CC-A", "students": 375, "valid_students": 308, "reached_students": 225, "bring_new_total": 85, "bring_new_rate": 0.276},
        {"team": "CC-B", "students": 247, "valid_students": 202, "reached_students": 146, "bring_new_total": 55, "bring_new_rate": 0.272},
        {"team": "CC-C", "students": 227, "valid_students": 177, "reached_students": 120, "bring_new_total": 43, "bring_new_rate": 0.243},
        {"team": "CC-D", "students": 98,  "valid_students": 70,  "reached_students": 42,  "bring_new_total": 13, "bring_new_rate": 0.186},
    ]
