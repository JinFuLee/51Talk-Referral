"""打卡汇总 API — /checkin/summary"""

from __future__ import annotations

import json
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api._checkin_config import (
    _D3_CHECKIN_COL,
    _D3_ENCLOSURE_COL,
    _D3_STUDENT_COL,
    _OPS_CHANNELS,
    _calc_quality_score,
    _clean_names,
    _get_invalid_names,
    _get_role_cols,
    _get_wide_role,
    _parse_role_enclosures,
)
from backend.api._checkin_shared import (
    M_MAP as _M_MAP,
)
from backend.api._checkin_shared import (
    find_d4_id_col as _find_d4_id_col,
)
from backend.api._checkin_shared import (
    safe_str as _safe_str,
)
from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()


def _aggregate_role(
    df_d3: pd.DataFrame,
    role: str,
    enclosures_override: list[str] | None = None,
) -> dict[str, Any]:
    """
    从 D3 聚合单个角色的打卡数据。

    - subset：筛选该角色负责的围场段
    - by_team：按 group_col 分组
    - by_enclosure：按围场段分组（使用 M 标签）

    enclosures_override: 外部传入的围场列表（来自前端 Settings），优先于硬编码默认值。
    """
    role_cols = _get_role_cols()
    name_col, group_col = role_cols.get(role, ("last_cc_name", "last_cc_group_name"))
    wide_role = _get_wide_role()
    enclosures = enclosures_override if enclosures_override else wide_role.get(role, [])

    # 按围场筛选
    if _D3_ENCLOSURE_COL in df_d3.columns:
        subset = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(enclosures)].copy()
    else:
        subset = df_d3.copy()

    # 过滤无效人员行
    if name_col in subset.columns:
        gc = group_col if group_col in subset.columns else None
        subset = _clean_names(subset, name_col, gc)

    total = len(subset)
    checked = 0
    rate = 0.0

    if total > 0 and _D3_CHECKIN_COL in subset.columns:
        checked = int(
            pd.to_numeric(subset[_D3_CHECKIN_COL], errors="coerce").fillna(0).sum()
        )
        rate = checked / total

    # by_team
    by_team: list[dict] = []
    if total > 0 and group_col in subset.columns:
        for grp, g in subset.groupby(group_col, sort=False):
            grp_str = _safe_str(grp)
            if grp_str.lower() in _get_invalid_names():
                continue
            t = len(g)
            c = (
                int(pd.to_numeric(g[_D3_CHECKIN_COL], errors="coerce").fillna(0).sum())
                if _D3_CHECKIN_COL in g.columns
                else 0
            )
            by_team.append(
                {
                    "team": grp_str,
                    "students": t,
                    "checked_in": c,
                    "rate": round(c / t, 4) if t > 0 else 0.0,
                }
            )
        by_team.sort(key=lambda x: x["rate"], reverse=True)

    # by_enclosure
    by_enclosure: list[dict] = []
    for enc in enclosures:
        if _D3_ENCLOSURE_COL in subset.columns:
            e = subset[subset[_D3_ENCLOSURE_COL] == enc]
        else:
            e = subset.iloc[0:0]
        t = len(e)
        c = (
            int(pd.to_numeric(e[_D3_CHECKIN_COL], errors="coerce").fillna(0).sum())
            if t > 0 and _D3_CHECKIN_COL in e.columns
            else 0
        )
        by_enclosure.append(
            {
                "enclosure": _M_MAP.get(enc, enc),
                "students": t,
                "checked_in": c,
                "rate": round(c / t, 4) if t > 0 else 0.0,
            }
        )

    return {
        "total_students": total,
        "checked_in": checked,
        "checkin_rate": round(rate, 4),
        "by_team": by_team,
        "by_enclosure": by_enclosure,
    }


def _aggregate_ops_channels(
    df_d3: pd.DataFrame,
    df_d4: pd.DataFrame,
    enclosures_override: list[str] | None = None,
) -> dict[str, Any]:
    """运营角色聚合：按渠道推荐 + 围场子段，不使用 CC/SS/LP 人员列。"""
    enclosures = enclosures_override or [
        "6M",
        "7M",
        "8M",
        "9M",
        "10M",
        "11M",
        "12M",
        "12M+",
        "M6+",
        "181+",
    ]

    # 筛选 M6+ 围场学员
    if _D3_ENCLOSURE_COL in df_d3.columns:
        subset = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(enclosures)].copy()
    else:
        subset = df_d3.copy()

    total = len(subset)
    checked = 0
    if total > 0 and _D3_CHECKIN_COL in subset.columns:
        checked = int(
            pd.to_numeric(subset[_D3_CHECKIN_COL], errors="coerce").fillna(0).sum()
        )
    rate = checked / total if total > 0 else 0.0
    unchecked = total - checked

    # 构建 D4 索引，计算未打卡学员质量评分
    d3_id_col = _D3_STUDENT_COL if _D3_STUDENT_COL in subset.columns else None
    d4_id_col = _find_d4_id_col(df_d4) if not df_d4.empty else None
    d4_index: dict[str, pd.Series] = {}
    if d4_id_col and not df_d4.empty:
        for _, row in df_d4.iterrows():
            sid = _safe_str(row.get(d4_id_col, ""))
            if sid:
                d4_index[sid] = row

    quality_scores: list[float] = []
    for _, row in subset.iterrows():
        is_checked = pd.to_numeric(row.get(_D3_CHECKIN_COL, 0), errors="coerce") or 0
        if is_checked > 0:
            continue  # 只统计未打卡学员
        sid = _safe_str(row.get(d3_id_col, "")) if d3_id_col else ""
        d4_row = d4_index.get(sid)
        score = _calc_quality_score(row, d4_row)
        quality_scores.append(score)

    phone_count = sum(1 for s in quality_scores if s >= 70)
    line_count = sum(1 for s in quality_scores if s >= 40)

    channels: list[dict[str, Any]] = []
    for ch_def in _OPS_CHANNELS:
        ch = dict(ch_def)
        if ch["channel_id"] == "phone":
            ch["recommended_count"] = phone_count
        elif ch["channel_id"] == "line_oa":
            ch["recommended_count"] = line_count
        else:
            ch["recommended_count"] = unchecked
        channels.append(ch)

    # 围场子段
    by_enclosure_segment: list[dict[str, Any]] = []
    if _D3_ENCLOSURE_COL in subset.columns:
        for enc_val in sorted(subset[_D3_ENCLOSURE_COL].dropna().unique()):
            seg = subset[subset[_D3_ENCLOSURE_COL] == enc_val]
            t = len(seg)
            c = (
                int(
                    pd.to_numeric(seg[_D3_CHECKIN_COL], errors="coerce").fillna(0).sum()
                )
                if _D3_CHECKIN_COL in seg.columns
                else 0
            )
            label = _M_MAP.get(_safe_str(enc_val), _safe_str(enc_val))
            by_enclosure_segment.append(
                {
                    "segment": label,
                    "label": f"{label}围场",
                    "students": t,
                    "checked_in": c,
                    "rate": round(c / t, 4) if t > 0 else 0.0,
                }
            )

    if not by_enclosure_segment:
        by_enclosure_segment = [
            {
                "segment": "M6~M12+",
                "label": "181天+围场",
                "students": total,
                "checked_in": checked,
                "rate": round(rate, 4),
            }
        ]

    return {
        "total_students": total,
        "checked_in": checked,
        "checkin_rate": round(rate, 4),
        "channels": channels,
        "by_enclosure_segment": by_enclosure_segment,
        "by_team": [],  # 兼容 SummaryTab ChannelColumn（运营无团队拆分）
        "by_enclosure": [],  # 兼容 SummaryTab ChannelColumn（运营无围场拆分）
        "by_group": [],
        "by_person": [],
    }




# ── API 端点 ──

# ── API 端点 ──────────────────────────────────────────────────────────────────


@router.get(
    "/checkin/summary",
    summary="打卡汇总（Tab1）— D3 明细表，按角色 / 团队 / 围场分组",
)
def get_checkin_summary(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    enclosure: str | None = Query(
        default=None, description="围场过滤（M 标签，如 M0），为空时不过滤"
    ),
) -> dict:
    """
    全部从 D3 明细表聚合。优先使用前端传来的 role_config（Settings 宽口径配置），
    否则 fallback 到 config.json enclosure_role_wide（动态加载）。

    enclosure 参数：前端统一筛选栏传入的围场 M 标签（如 M0/M1/M2），
    用于在角色默认围场范围内进一步交叉过滤，不影响无参数时的行为。
    """
    d3: pd.DataFrame = apply_filters(
        dm.load_all().get("detail", pd.DataFrame()), filters
    )

    # 解析围场过滤：将 M 标签转回 D3 原始围场值（0~30/31~60 格式），
    # 排除生命周期列格式（0M/1M/2M...）避免反查被覆盖
    if enclosure and _D3_ENCLOSURE_COL in d3.columns:
        _lifecycle_keys = {"0M", "1M", "2M", "3M", "4M", "5M"}
        m_to_raw = {v: k for k, v in _M_MAP.items() if k not in _lifecycle_keys}
        enc_labels = [e.strip() for e in enclosure.split(",") if e.strip()]
        enc_filter_raws = [m_to_raw[m] for m in enc_labels if m in m_to_raw]
        if enc_filter_raws:
            d3 = d3[d3[_D3_ENCLOSURE_COL].isin(enc_filter_raws)].copy()

    roles = list(_get_wide_role().keys())
    if role_config:
        try:
            parsed = json.loads(role_config)
            roles = list(parsed.keys()) or roles
        except (json.JSONDecodeError, AttributeError):
            pass

    by_role: dict[str, Any] = {}
    for role in roles:
        override = _parse_role_enclosures(role_config, role)
        if role == "运营":
            d4: pd.DataFrame = apply_filters(
                dm.load_all().get("students", pd.DataFrame()), filters
            )
            by_role[role] = _aggregate_ops_channels(
                d3, d4, enclosures_override=override
            )
        else:
            by_role[role] = _aggregate_role(d3, role, enclosures_override=override)

    return {"by_role": by_role}

