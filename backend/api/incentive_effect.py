"""激励效果分析 API — 领奖组 vs 未领奖组对比"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()


def _safe(val) -> Any:
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return str(val) if val else None


def _group_stats(group: pd.DataFrame) -> dict[str, Any]:
    """计算单组的统计指标"""
    count = len(group)

    def _mean(col: str) -> float | None:
        if col not in group.columns:
            return None
        s = pd.to_numeric(group[col], errors="coerce")
        v = s.mean()
        return (
            None
            if (v is None or (isinstance(v, float) and math.isnan(v)))
            else round(float(v), 4)
        )

    def _sum(col: str) -> float | None:
        if col not in group.columns:
            return None
        s = pd.to_numeric(group[col], errors="coerce")
        v = s.sum()
        return (
            None
            if (v is None or (isinstance(v, float) and math.isnan(v)))
            else round(float(v), 2)
        )

    reg_col = next(
        (
            c
            for c in ["当月推荐注册人数", "本月推荐注册数", "总推荐注册人数"]
            if c in group.columns
        ),
        None,
    )
    pay_col = next(
        (c for c in ["本月推荐付费数", "当月推荐付费数"] if c in group.columns), None
    )
    coeff_col = "带新系数" if "带新系数" in group.columns else None

    avg_reg = _mean(reg_col) if reg_col else None
    avg_pay = _mean(pay_col) if pay_col else None
    avg_coeff = _mean(coeff_col) if coeff_col else None

    # 带新系数从 avg_reg/avg_pay 推导（若字段缺失）
    if (
        avg_coeff is None
        and avg_reg is not None
        and avg_pay is not None
        and avg_pay > 0
    ):
        avg_coeff = round(avg_reg / avg_pay, 4)

    # 历史转码次数均值（参与深度指标）
    coding_col = next(
        (
            c
            for c in ["历史转码次数", "总转码次数", "历史总转码次数"]
            if c in group.columns
        ),
        None,
    )
    avg_historical_coding = _mean(coding_col) if coding_col else None

    return {
        "student_count": count,
        "avg_referral_registrations": avg_reg,
        "avg_referral_payments": avg_pay,
        "avg_new_coefficient": avg_coeff,
        "total_referral_registrations": _sum(reg_col) if reg_col else None,
        "total_referral_payments": _sum(pay_col) if pay_col else None,
        "avg_historical_coding": avg_historical_coding,
    }


@router.get(
    "/analysis/incentive-effect",
    summary="激励效果分析 — 领奖组 vs 未领奖组对比",
)
def get_incentive_effect(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    data = dm.load_all()
    df = data.get("students")
    if df is None or df.empty:
        return {"groups": [], "summary": "暂无数据"}

    reward_col = "推荐奖励领取状态"
    if reward_col not in df.columns:
        return {"groups": [], "summary": f"数据中未找到列: {reward_col}"}

    df = df.copy()
    df["_reward_status"] = df[reward_col].astype(str).str.strip()

    # 分组：已领取 vs 未领取 vs 其他
    groups_out = []
    for status, group in df.groupby("_reward_status", sort=False):
        stats = _group_stats(group)
        stats["reward_status"] = str(status)
        groups_out.append(stats)

    # 排序：已领取优先
    def _sort_key(g: dict) -> int:
        s = g.get("reward_status", "")
        if "已" in s or "领" in s:
            return 0
        elif "未" in s:
            return 1
        return 2

    groups_out.sort(key=_sort_key)

    # 对比摘要（领奖 vs 未领奖）
    rewarded = next(
        (
            g
            for g in groups_out
            if "已" in g.get("reward_status", "") or "领" in g.get("reward_status", "")
        ),
        None,
    )
    not_rewarded = next(
        (g for g in groups_out if "未" in g.get("reward_status", "")), None
    )

    comparison: dict[str, Any] = {}
    if rewarded and not_rewarded:

        def _lift(a: float | None, b: float | None) -> float | None:
            if a is None or b is None or b == 0:
                return None
            return round((a - b) / b, 4)

        comparison = {
            "registration_lift": _lift(
                rewarded.get("avg_referral_registrations"),
                not_rewarded.get("avg_referral_registrations"),
            ),
            "payment_lift": _lift(
                rewarded.get("avg_referral_payments"),
                not_rewarded.get("avg_referral_payments"),
            ),
            "coefficient_lift": _lift(
                rewarded.get("avg_new_coefficient"),
                not_rewarded.get("avg_new_coefficient"),
            ),
        }

    return {
        "groups": groups_out,
        "comparison": comparison,
        "total_students": len(df),
    }
