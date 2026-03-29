"""推荐者贡献分析 API — D4 学员带新/付费渠道明细"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, parse_filters

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


def _int_col(df: pd.DataFrame, candidates: list[str]) -> pd.Series:
    """从候选列名中取第一个存在的列，转为 int，缺失填 0"""
    for col in candidates:
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
    return pd.Series(0, index=df.index)


@router.get(
    "/analysis/referral-contributor",
    summary="推荐者贡献分析 — 各渠道带新 / 付费 / 转化率排名",
)
def get_referral_contributor(
    request: Request,
    top: int = Query(default=50, ge=1, le=500, description="返回 Top N 推荐者"),
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    data = dm.load_all()
    df = data.get("students")
    if df is None or df.empty:
        return {
            "total_contributors": 0,
            "top_contributors": [],
            "channel_summary": {},
            "message": "暂无数据",
        }

    df = df.copy()

    # ── 带新人数（各渠道）────────────────────────────────────────────────────
    cc_new = _int_col(df, ["CC带新人数", "cc_new_count"])
    ss_new = _int_col(df, ["SS带新人数", "ss_new_count"])
    lp_new = _int_col(df, ["LP带新人数", "lp_new_count"])
    wide_new = _int_col(df, ["宽口径带新人数", "wide_new_count", "宽口带新人数"])

    # ── 带新付费数（各渠道）──────────────────────────────────────────────────
    cc_paid = _int_col(df, ["CC带新付费数", "cc_paid_count"])
    ss_paid = _int_col(df, ["SS带新付费数", "ss_paid_count"])
    lp_paid = _int_col(df, ["LP带新付费数", "lp_paid_count"])
    wide_paid = _int_col(df, ["宽口径带新付费数", "wide_paid_count", "宽口带新付费数"])

    # ── 辅助列 ───────────────────────────────────────────────────────────────
    # 学员 ID
    stdt_id_col = next(
        (c for c in ["stdt_id", "学员id", "学员ID"] if c in df.columns), None
    )
    # 围场/生命周期
    enclosure_col = next(
        (c for c in ["围场", "生命周期", "lifecycle"] if c in df.columns), None
    )
    # 历史转码次数（参与深度）
    coding_col = next(
        (
            c
            for c in ["历史转码次数", "总转码次数", "历史总转码次数"]
            if c in df.columns
        ),
        None,
    )

    # ── 汇总计算 ─────────────────────────────────────────────────────────────
    total_new_series = cc_new + ss_new + lp_new + wide_new
    total_paid_series = cc_paid + ss_paid + lp_paid + wide_paid

    # 有带新的学员才算贡献者
    contributor_mask = total_new_series > 0
    total_contributors = int(contributor_mask.sum())

    # ── 个人明细（按 total_new 降序，取 top N）────────────────────────────────
    contrib_df = df[contributor_mask].copy()
    contrib_df["_cc_new"] = cc_new[contributor_mask]
    contrib_df["_ss_new"] = ss_new[contributor_mask]
    contrib_df["_lp_new"] = lp_new[contributor_mask]
    contrib_df["_wide_new"] = wide_new[contributor_mask]
    contrib_df["_cc_paid"] = cc_paid[contributor_mask]
    contrib_df["_ss_paid"] = ss_paid[contributor_mask]
    contrib_df["_lp_paid"] = lp_paid[contributor_mask]
    contrib_df["_wide_paid"] = wide_paid[contributor_mask]
    contrib_df["_total_new"] = total_new_series[contributor_mask]
    contrib_df["_total_paid"] = total_paid_series[contributor_mask]

    contrib_df = contrib_df.sort_values("_total_new", ascending=False).head(top)

    top_contributors: list[dict[str, Any]] = []
    for _, row in contrib_df.iterrows():
        t_new = int(row["_total_new"])
        t_paid = int(row["_total_paid"])
        conv_rate = round(t_paid / t_new, 4) if t_new > 0 else 0.0

        stdt_id = ""
        if stdt_id_col:
            stdt_id = str(row.get(stdt_id_col, "") or "")

        enclosure = ""
        if enclosure_col:
            enclosure = str(row.get(enclosure_col, "") or "")

        historical_coding = 0
        if coding_col:
            v = _safe(row.get(coding_col))
            historical_coding = int(v) if v is not None else 0

        top_contributors.append(
            {
                "stdt_id": stdt_id,
                "enclosure": enclosure,
                "cc_new_count": int(row["_cc_new"]),
                "ss_new_count": int(row["_ss_new"]),
                "lp_new_count": int(row["_lp_new"]),
                "wide_new_count": int(row["_wide_new"]),
                "cc_paid_count": int(row["_cc_paid"]),
                "ss_paid_count": int(row["_ss_paid"]),
                "lp_paid_count": int(row["_lp_paid"]),
                "wide_paid_count": int(row["_wide_paid"]),
                "total_new": t_new,
                "total_paid": t_paid,
                "conversion_rate": conv_rate,
                "historical_coding_count": historical_coding,
            }
        )

    # ── 渠道汇总 ─────────────────────────────────────────────────────────────
    channel_summary: dict[str, Any] = {
        "cc": {
            "new_total": int(cc_new.sum()),
            "paid_total": int(cc_paid.sum()),
        },
        "ss": {
            "new_total": int(ss_new.sum()),
            "paid_total": int(ss_paid.sum()),
        },
        "lp": {
            "new_total": int(lp_new.sum()),
            "paid_total": int(lp_paid.sum()),
        },
        "wide": {
            "new_total": int(wide_new.sum()),
            "paid_total": int(wide_paid.sum()),
        },
    }

    return {
        "total_contributors": total_contributors,
        "top_contributors": top_contributors,
        "channel_summary": channel_summary,
    }
