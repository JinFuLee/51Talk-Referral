"""筛选维度可选值 API — GET /api/filter/options

返回前端 UnifiedFilterBar 所需的所有维度可选值，
从真实数据动态生成（团队/CC 列表），其余硬编码枚举。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()

# 有效围场集合（业务定义）
_ACTIVE_ENCLOSURES = {"M0", "M1", "M2", "M3", "M4", "M5", "M6+"}

# 围场顺序与中文 label 映射
_ENCLOSURE_DEFS = [
    ("M0",   "M0 (0-30天)",    True),
    ("M1",   "M1 (31-60天)",   True),
    ("M2",   "M2 (61-90天)",   True),
    ("M3",   "M3 (91-120天)",  True),
    ("M4",   "M4 (121-150天)", True),
    ("M5",   "M5 (151-180天)", True),
    ("M6+",  "M6+ (181天+)",   True),
    ("M7",   "M7 (211-240天)", False),
    ("M8",   "M8 (241-270天)", False),
    ("M9",   "M9 (271-300天)", False),
    ("M10",  "M10 (301-330天)", False),
    ("M11",  "M11 (331-360天)", False),
    ("M12",  "M12 (361-390天)", False),
    ("M12+", "M12+ (391天+)",  False),
    ("已付费非有效", "已付费非有效", False),
    ("未付费非有效", "未付费非有效", False),
]

_CHANNELS = [
    {
        "value": "all",
        "label": "全部渠道",
        "available_sources": ["A1", "A2", "A3", "A5"],
    },
    {"value": "cc_narrow", "label": "CC窄口径",   "available_sources": ["A1", "A2"]},
    {"value": "ss_narrow", "label": "SS窄口径",   "available_sources": ["A1", "A2"]},
    {"value": "lp_narrow", "label": "LP窄口径",   "available_sources": ["A1", "A2"]},
    {"value": "cc_wide",   "label": "CC宽口径",   "available_sources": ["A1", "A2"]},
    {"value": "lp_wide",   "label": "LP宽口径",   "available_sources": ["A1", "A2"]},
    {"value": "ops_wide",  "label": "运营宽口径", "available_sources": ["A1", "A2"]},
]

_BEHAVIORS = [
    {"value": "gold",       "label": "黄金学员",   "color": "#FFD100", "count": 0},
    {"value": "effective",  "label": "高效学员",   "color": "#22C55E", "count": 0},
    {"value": "stuck_pay",  "label": "卡付费",     "color": "#F97316", "count": 0},
    {"value": "stuck_show", "label": "卡出席",     "color": "#EAB308", "count": 0},
    {"value": "potential",  "label": "高潜学员",   "color": "#3B82F6", "count": 0},
    {"value": "freeloader", "label": "白嫖学员",   "color": "#6B7280", "count": 0},
    {"value": "newcomer",   "label": "新学员",     "color": "#8B5CF6", "count": 0},
    {"value": "casual",     "label": "随缘学员",   "color": "#94A3B8", "count": 0},
]


@router.get("/options", summary="获取筛选维度可选值")
def get_filter_options(dm: DataManager = Depends(get_data_manager)) -> dict:
    """返回 UnifiedFilterBar 所需全部维度的可选值列表。

    团队列表和 CC 列表从真实数据动态生成；其余维度为业务枚举硬编码。
    """
    # 从 enclosure_cc 数据提取团队列表
    teams: list[dict] = []
    try:
        data = dm.load_all()
        enc_df = data.get("enclosure_cc")
        if enc_df is not None and not enc_df.empty:
            team_col = "last_cc_group_name"
            if team_col in enc_df.columns:
                raw_teams = (
                    enc_df[team_col]
                    .dropna()
                    .astype(str)
                    .str.strip()
                    .replace("", float("nan"))
                    .dropna()
                    .unique()
                    .tolist()
                )
                teams = [
                    {"value": t, "label": t}
                    for t in sorted(raw_teams)
                    if t and t.lower() not in ("nan", "none", "")
                ]
    except Exception:
        teams = []

    # 从 enclosure_cc 数据提取 CC 列表
    cc_list: list[str] = []
    try:
        data = dm.load_all()
        enc_df = data.get("enclosure_cc")
        if enc_df is not None and not enc_df.empty:
            cc_col = "last_cc_name"
            if cc_col in enc_df.columns:
                raw_ccs = (
                    enc_df[cc_col]
                    .dropna()
                    .astype(str)
                    .str.strip()
                    .replace("", float("nan"))
                    .dropna()
                    .unique()
                    .tolist()
                )
                cc_list = sorted(
                    [c for c in raw_ccs if c and c.lower() not in ("nan", "none", "")]
                )
    except Exception:
        cc_list = []

    return {
        "countries": [{"value": "TH", "label": "Thailand"}],
        "teams": teams,
        "enclosures": [
            {"value": val, "label": label, "is_active": is_active}
            for val, label, is_active in _ENCLOSURE_DEFS
        ],
        "channels": _CHANNELS,
        "behaviors": _BEHAVIORS,
        "cc_list": cc_list,
    }
