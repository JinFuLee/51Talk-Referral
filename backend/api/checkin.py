"""打卡面板 API — 全部基于 D3（detail）明细表

设计原则：
  打卡是学员自主行为（宽口径）。学员打卡了，负责该围场的 CC/SS/LP 都"得分"。
  区别是按谁的名字分组展示。

D3 列：stdt_id, 围场, 有效打卡(1/0),
        last_cc_name, last_cc_group_name,
        last_ss_name, last_ss_group_name,
        last_lp_name, last_lp_group_name

围场-角色映射（宽口）：
  CC:  0~30, 31~60, 61~90
  SS:  91~120
  LP:  121~150, 151~180, M6+

当前 D3 只有 0~30 的数据 → SS/LP 显示 0 是数据源限制，代码正确。
未来 D3 覆盖更多围场时自动生效。
"""

from __future__ import annotations

import json
import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()

# ── 常量 ─────────────────────────────────────────────────────────────────────

# D3 围场原始字符串 → M 标签
_M_MAP: dict[str, str] = {
    "0~30":    "M0",
    "31~60":   "M1",
    "61~90":   "M2",
    "91~120":  "M3",
    "121~150": "M4",
    "151~180": "M5",
    "M6+":     "M6+",
    "181+":    "M6+",  # 兼容写法
}

# 宽口径围场-岗位映射（D3 围场原始字符串）
_WIDE_ROLE: dict[str, list[str]] = {
    "CC": ["0~30", "31~60", "61~90"],
    "SS": ["91~120"],
    "LP": ["121~150", "151~180", "M6+"],
}

# 各岗位人员列（name_col, group_col）
_ROLE_COLS: dict[str, tuple[str, str]] = {
    "CC": ("last_cc_name", "last_cc_group_name"),
    "SS": ("last_ss_name", "last_ss_group_name"),
    "LP": ("last_lp_name", "last_lp_group_name"),
}

# D3 列名
_D3_CHECKIN_COL  = "有效打卡"
_D3_STUDENT_COL  = "stdt_id"
_D3_ENCLOSURE_COL = "围场"

# D4 学员 ID 候选列（按优先级）
_D4_STUDENT_ID_CANDIDATES = ["学员id", "stdt_id"]
_D4_LIFECYCLE_COL = "生命周期"

# 围场加权（质量评分用）
_ENCLOSURE_WEIGHT: dict[int, int] = {0: 10, 1: 8, 2: 6, 3: 4}

# 过滤掉聚合行的无效值
_INVALID_NAMES: frozenset[str] = frozenset({"nan", "小计", "合计", ""})


# ── 工具函数 ─────────────────────────────────────────────────────────────────

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


def _safe_str(val) -> str:
    if val is None:
        return ""
    try:
        if pd.isna(val):
            return ""
    except (TypeError, ValueError):
        pass
    return str(val).strip()


def _m_label_to_index(m_label: str) -> int:
    """M0→0, M1→1, ... M6+→6"""
    try:
        return int(m_label.lstrip("M").rstrip("+"))
    except ValueError:
        return 99


def _clean_names(
    df: pd.DataFrame,
    name_col: str,
    group_col: str | None = None,
) -> pd.DataFrame:
    """过滤 nan / 小计 / 合计 / 空值行"""
    df = df.copy()
    if name_col in df.columns:
        mask = ~df[name_col].astype(str).str.strip().isin(_INVALID_NAMES)
        mask &= df[name_col].notna()
        df = df[mask]
    if group_col and group_col in df.columns:
        mask = ~df[group_col].astype(str).str.strip().isin({"nan", ""})
        mask &= df[group_col].notna()
        df = df[mask]
    return df


def _find_d4_id_col(df: pd.DataFrame) -> str | None:
    for c in _D4_STUDENT_ID_CANDIDATES:
        if c in df.columns:
            return c
    return None


def _detect_role_from_team(team: str) -> str:
    """从团队名推断岗位。THSS-* / SS* → SS；THLP-* / LP* → LP；其余 → CC"""
    t = team.strip().upper()
    parts = t.split("-")
    if t.startswith("SS") or (len(parts) >= 2 and "SS" in parts[:2]):
        return "SS"
    if t.startswith("LP") or (len(parts) >= 2 and "LP" in parts[:2]):
        return "LP"
    return "CC"


def _calc_quality_score(row_d3: pd.Series, d4_row: pd.Series | None) -> float:
    """
    质量评分（满分 100）：
      lesson_score   = min(本月课耗 / 15, 1.0) * 40
      referral_score = min(当月推荐注册人数 / 3, 1.0) * 30
      payment_score  = min(本月推荐付费数 / 2, 1.0) * 20
      enclosure_score = {M0:10, M1:8, M2:6, M3:4, M4+:2}
    """
    # 围场分
    enc_raw = None
    if d4_row is not None:
        enc_raw = d4_row.get(_D4_LIFECYCLE_COL) or d4_row.get("围场")
    enc_raw = enc_raw if enc_raw is not None else (
        row_d3.get("生命周期") or row_d3.get("围场")
    )
    m_label = _M_MAP.get(_safe_str(enc_raw), "M0") if enc_raw is not None else "M0"
    m_idx = _m_label_to_index(m_label)
    enclosure_score = _ENCLOSURE_WEIGHT.get(m_idx, 2)

    if d4_row is None:
        return float(enclosure_score)

    lesson_val = _safe(d4_row.get("本月课耗")) or _safe(d4_row.get("课耗")) or 0.0
    lesson_score = min(float(lesson_val) / 15.0, 1.0) * 40.0

    reg_val = (
        _safe(d4_row.get("当月推荐注册人数"))
        or _safe(d4_row.get("总推荐注册人数"))
        or 0.0
    )
    referral_score = min(float(reg_val) / 3.0, 1.0) * 30.0

    pay_val = (
        _safe(d4_row.get("本月推荐付费数")) or _safe(d4_row.get("推荐付费")) or 0.0
    )
    payment_score = min(float(pay_val) / 2.0, 1.0) * 20.0

    return round(lesson_score + referral_score + payment_score + enclosure_score, 1)


# ── 核心聚合 ──────────────────────────────────────────────────────────────────

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
    name_col, group_col = _ROLE_COLS.get(role, ("last_cc_name", "last_cc_group_name"))
    enclosures = enclosures_override if enclosures_override else _WIDE_ROLE.get(role, [])

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
            pd.to_numeric(subset[_D3_CHECKIN_COL], errors="coerce")
            .fillna(0)
            .sum()
        )
        rate = checked / total

    # by_team
    by_team: list[dict] = []
    if total > 0 and group_col in subset.columns:
        for grp, g in subset.groupby(group_col, sort=False):
            grp_str = _safe_str(grp)
            if grp_str.lower() in _INVALID_NAMES:
                continue
            t = len(g)
            c = (
                int(
                    pd.to_numeric(g[_D3_CHECKIN_COL], errors="coerce")
                    .fillna(0)
                    .sum()
                )
                if _D3_CHECKIN_COL in g.columns
                else 0
            )
            by_team.append({
                "team":       grp_str,
                "students":   t,
                "checked_in": c,
                "rate":       round(c / t, 4) if t > 0 else 0.0,
            })
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
            int(
                pd.to_numeric(e[_D3_CHECKIN_COL], errors="coerce")
                .fillna(0)
                .sum()
            )
            if t > 0 and _D3_CHECKIN_COL in e.columns
            else 0
        )
        by_enclosure.append({
            "enclosure":  _M_MAP.get(enc, enc),
            "students":   t,
            "checked_in": c,
            "rate":       round(c / t, 4) if t > 0 else 0.0,
        })

    return {
        "total_students": total,
        "checked_in":     checked,
        "checkin_rate":   round(rate, 4),
        "by_team":        by_team,
        "by_enclosure":   by_enclosure,
    }


def _aggregate_team_members(df_d3: pd.DataFrame, team: str, role: str) -> list[dict]:
    """
    按团队筛选 D3，按 name_col 分组，返回每个销售的打卡情况。
    """
    name_col, group_col = _ROLE_COLS[role]

    if name_col not in df_d3.columns or group_col not in df_d3.columns:
        return []

    df = _clean_names(df_d3, name_col, group_col)
    df = df[df[group_col].astype(str).str.strip() == team.strip()].copy()

    if df.empty:
        return []

    if _D3_CHECKIN_COL in df.columns:
        df["_checkin"] = pd.to_numeric(df[_D3_CHECKIN_COL], errors="coerce").fillna(0)
    else:
        df["_checkin"] = 0

    # 围场 M 标签（for by_enclosure）
    if _D3_ENCLOSURE_COL in df.columns:
        df["_m_label"] = df[_D3_ENCLOSURE_COL].map(
            lambda v: _M_MAP.get(_safe_str(v), _safe_str(v))
        )
    else:
        df["_m_label"] = "M?"

    members: list[dict] = []
    for name, person_df in df.groupby(name_col, sort=False):
        t = len(person_df)
        c = int(person_df["_checkin"].sum())
        r = c / t if t > 0 else 0.0

        by_enc: list[dict] = []
        for enc, enc_df in person_df.groupby("_m_label", sort=False):
            et = len(enc_df)
            ec = int(enc_df["_checkin"].sum())
            by_enc.append({
                "enclosure":  str(enc),
                "students":   et,
                "checked_in": ec,
                "rate":       round(ec / et, 4) if et > 0 else 0.0,
            })
        by_enc.sort(key=lambda x: _m_label_to_index(x["enclosure"]))

        members.append({
            "name":           _safe_str(name),
            "total_students": t,
            "checked_in":     c,
            "rate":           round(r, 4),
            "by_enclosure":   by_enc,
        })

    members.sort(key=lambda x: x["rate"], reverse=True)
    return members


def _build_followup_students(
    df_d3: pd.DataFrame,
    df_d4: pd.DataFrame,
    role:  str | None,
    team:  str | None,
    sales: str | None,
) -> list[dict]:
    """
    D3 筛选 有效打卡=0，JOIN D4，返回未打卡学员列表 + 质量评分。
    """
    if df_d3.empty:
        return []

    df = df_d3.copy()

    # 过滤未打卡
    if _D3_CHECKIN_COL in df.columns:
        df = df[pd.to_numeric(df[_D3_CHECKIN_COL], errors="coerce").fillna(0) == 0]

    # 围场 M 标签 + 角色判断
    def _row_enc(row: pd.Series) -> str:
        v = row.get(_D3_ENCLOSURE_COL) if _D3_ENCLOSURE_COL in row.index else None
        if v is None:
            v = row.get("生命周期")
        s = _safe_str(v)
        return _M_MAP.get(s, s) if s else "M?"

    def _enc_to_role(enc: str) -> str:
        for r, bands in _WIDE_ROLE.items():
            if enc in [_M_MAP.get(b, b) for b in bands]:
                return r
        # M 标签直接对比
        idx = _m_label_to_index(enc)
        if idx <= 2:
            return "CC"
        if idx == 3:
            return "SS"
        return "LP"

    df["_m_label"] = df.apply(_row_enc, axis=1)
    df["_role"]    = df["_m_label"].apply(_enc_to_role)

    # 按 role 筛选
    if role and role not in ("全部", ""):
        df = df[df["_role"] == role]

    # 根据 role 决定人员列
    _role_key = (role or "").strip().upper()
    if _role_key in _ROLE_COLS:
        name_col, group_col = _ROLE_COLS[_role_key]
    else:
        # 未指定 role：按存在性探测（CC 优先）
        _name_candidates = ["last_cc_name", "last_ss_name", "last_lp_name"]
        _group_candidates = [
            "last_cc_group_name",
            "last_ss_group_name",
            "last_lp_group_name",
        ]
        name_col  = next((c for c in _name_candidates  if c in df.columns), None)
        group_col = next((c for c in _group_candidates if c in df.columns), None)

    real_group = group_col if group_col and group_col in df.columns else None
    real_name  = name_col  if name_col  and name_col  in df.columns else None

    if team  and real_group:
        df = df[df[real_group].astype(str).str.strip() == team.strip()]
    if sales and real_name:
        df = df[df[real_name].astype(str).str.strip() == sales.strip()]

    if df.empty:
        return []

    # 构建 D4 索引
    d4_id_col = _find_d4_id_col(df_d4) if not df_d4.empty else None
    d4_index: dict[str, pd.Series] = {}
    if d4_id_col and not df_d4.empty:
        for _, row in df_d4.iterrows():
            sid = _safe_str(row.get(d4_id_col, ""))
            if sid:
                d4_index[sid] = row

    d3_id_col = _D3_STUDENT_COL if _D3_STUDENT_COL in df.columns else None

    students: list[dict] = []
    for _, row in df.iterrows():
        sid   = _safe_str(row.get(d3_id_col, "")) if d3_id_col else ""
        d4_row = d4_index.get(sid)

        enc       = row.get("_m_label", "M?")
        role_val  = row.get("_role", "")

        cc_name  = _safe_str(row.get(real_name  or "", ""))
        team_val = _safe_str(row.get(real_group or "", ""))

        # D4 fallback 姓名/团队
        if not cc_name and d4_row is not None:
            d4_name_col = {
                "CC": "末次（当前）分配CC员工姓名",
                "SS": "末次（当前）分配SS员工姓名",
            }.get(_role_key, "末次（当前）分配CC员工姓名")
            cc_name = _safe_str(d4_row.get(d4_name_col, ""))

        if not team_val and d4_row is not None:
            d4_group_col = {
                "CC": "末次（当前）分配CC员工组名称",
                "SS": "末次（当前）分配SS员工组名称",
            }.get(_role_key, "末次（当前）分配CC员工组名称")
            team_val = _safe_str(d4_row.get(d4_group_col, ""))

        # CC 末次拨打日期
        cc_last_call = None
        if d4_row is not None:
            raw = d4_row.get("CC末次拨打日期(day)")
            if raw is not None:
                s = str(raw)
                if s.startswith("1970"):
                    cc_last_call = None
                else:
                    cc_last_call = s[:10] if len(s) >= 10 else s

        card_days = _safe(d4_row.get("次卡距到期天数")) if d4_row is not None else None
        quality_score = _calc_quality_score(row, d4_row)

        extra: dict[str, Any] = {}
        if d4_row is not None:
            for col in d4_row.index:
                extra[col] = _safe(d4_row[col])

        students.append({
            "student_id":              sid,
            "enclosure":               str(enc),
            "role":                    str(role_val),
            "cc_name":                 cc_name,
            "team":                    team_val,
            "quality_score":          quality_score,
            "lesson_consumption_3m":  (
                _safe(d4_row.get("本月课耗")) if d4_row is not None else None
            ),
            "referral_registrations": (
                _safe(
                    d4_row.get("当月推荐注册人数")
                    or d4_row.get("总推荐注册人数")
                )
                if d4_row is not None
                else None
            ),
            "referral_payments": (
                _safe(d4_row.get("本月推荐付费数")) if d4_row is not None else None
            ),
            "cc_last_call_date":       cc_last_call,
            "card_days_remaining":     card_days,
            "extra":                   extra,
        })

    students.sort(key=lambda s: s["quality_score"], reverse=True)
    return students


# ── API 端点 ──────────────────────────────────────────────────────────────────

@router.get(
    "/checkin/summary",
    summary="打卡汇总（Tab1）— D3 明细表，按角色 / 团队 / 围场分组",
)
def get_checkin_summary(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
) -> dict:
    """
    全部从 D3 明细表聚合。优先使用前端传来的 role_config（Settings 宽口径配置），
    否则 fallback 到 _WIDE_ROLE 硬编码默认值。
    """
    d3: pd.DataFrame = dm.load_all().get("detail", pd.DataFrame())

    # 解析前端传来的宽口配置 → {role: [围场段列表]}
    # 前端格式：{"CC": {"min_days":0,"max_days":90}, "LP": {"min_days":91,...}}
    # 需要转为：{"CC": ["0~30","31~60","61~90"], ...}
    _M_TO_DAYS = {
        "0~30": (0, 30), "31~60": (31, 60), "61~90": (61, 90),
        "91~120": (91, 120), "121~150": (121, 150), "151~180": (151, 180),
        "M6+": (181, 9999),
    }
    role_enclosures: dict[str, list[str]] | None = None
    if role_config:
        try:
            parsed = json.loads(role_config)
            role_enclosures = {}
            for role_name, cfg in parsed.items():
                min_d = cfg.get("min_days", 0)
                max_d = cfg.get("max_days") or 9999
                bands = []
                for band, (lo, hi) in _M_TO_DAYS.items():
                    if lo >= min_d and hi <= max_d:
                        bands.append(band)
                if bands:
                    role_enclosures[role_name] = bands
        except (json.JSONDecodeError, AttributeError, TypeError):
            role_enclosures = None

    by_role: dict[str, Any] = {}
    roles = list((role_enclosures or _WIDE_ROLE).keys())
    for role in roles:
        override = role_enclosures.get(role) if role_enclosures else None
        by_role[role] = _aggregate_role(d3, role, enclosures_override=override)

    return {"by_role": by_role}


@router.get(
    "/checkin/team-detail",
    summary="团队打卡明细（Tab2）— D3 明细表，按团队查询每个销售的打卡情况",
)
def get_checkin_team_detail(
    request: Request,
    team: str = Query(..., description="团队名称，例如 TH-CC01Team"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    根据 team 名前缀判断岗位：
      TH-CC* / CC* → CC，用 last_cc_group_name 匹配，按 last_cc_name 分组
      TH-SS* / SS* → SS，用 last_ss_group_name 匹配，按 last_ss_name 分组
      其他          → LP，用 last_lp_group_name 匹配，按 last_lp_name 分组

    每个人的打卡率 = 该人负责学员中有效打卡数 / 总学员数
    """
    d3: pd.DataFrame = dm.load_all().get("detail", pd.DataFrame())
    role = _detect_role_from_team(team)
    members = _aggregate_team_members(d3, team, role)
    return {"team": team, "role": role, "members": members}


@router.get(
    "/checkin/followup",
    summary="未打卡跟进名单（Tab3）— D3 JOIN D4，按质量评分降序",
)
def get_checkin_followup(
    request: Request,
    role:  str | None = Query(default=None, description="角色筛选：CC / SS / LP"),
    team:  str | None = Query(default=None, description="团队筛选，例如 TH-CC01Team"),
    sales: str | None = Query(default=None, description="销售姓名筛选，例如 thcc-Zen"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    筛选 D3 中 有效打卡==0 的行，按 role/team/sales 过滤，
    JOIN D4 获取质量评分字段，降序返回。
    """
    data  = dm.load_all()
    df_d3: pd.DataFrame = data.get("detail",   pd.DataFrame())
    df_d4: pd.DataFrame = data.get("students", pd.DataFrame())

    students = _build_followup_students(df_d3, df_d4, role, team, sales)
    return {
        "students":     students,
        "total":        len(students),
        "score_formula": "课耗(40%) + 推荐活跃(30%) + 付费贡献(20%) + 围场加权(10%)",
    }
