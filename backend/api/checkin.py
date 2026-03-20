"""打卡面板 API — 基于 D2/D3/D4 数据源

聚合策略（2024 回退修正）：
  summary 端点：CC/SS/LP/运营 **全部从 D2（enclosure_cc）聚合**。
    - D2 覆盖全部围场段（0~30 到 M6+），有 `当月有效打卡率` 和 `学员数` 列。
    - D3 只有 M0 的数据，不再用于 summary 聚合。
    - CC 围场段：by_team 按 last_cc_group_name 分组展示。
    - SS/LP/运营围场段：by_team 为空（D2 无 SS/LP 人员列），只展示 by_enclosure。
  team-detail 端点：
    - CC 团队：D2 按 last_cc_group_name 筛选，展示每个销售成员。
    - SS/LP 团队：无 D2 人员级数据，返回空 members + 说明。
  followup 端点：保持 D3 + D4 JOIN 逻辑（学员级未打卡名单）。
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()

# ── 围场天数段 → M 月份映射 ──────────────────────────────────────────────────
_ENCLOSURE_BANDS: list[tuple[int, int | None, str]] = [
    (0, 30, "M0"),
    (31, 60, "M1"),
    (61, 90, "M2"),
    (91, 120, "M3"),
    (121, 150, "M4"),
    (151, 180, "M5"),
    (181, None, "M6+"),
]

# D2 围场列原始字符串 → M 标签映射（D2 的 '围场' 列值如 '0~30'、'31~60'、'M6+'）
_D2_BAND_TO_M: dict[str, str] = {
    "0~30": "M0",
    "31~60": "M1",
    "61~90": "M2",
    "91~120": "M3",
    "121~150": "M4",
    "151~180": "M5",
    "M6+": "M6+",
    "181+": "M6+",   # 兼容写法
}

# 宽口径默认围场-岗位映射（D2 围场原始字符串）
_WIDE_ROLE_ENCLOSURES: dict[str, list[str]] = {
    "CC":   ["0~30", "31~60", "61~90"],
    "SS":   ["91~120"],
    "LP":   ["121~150", "151~180", "M6+"],
    "运营": [],   # 运营 = 其他所有围场段（兜底）
}

# 围场加权（用于质量评分）
_ENCLOSURE_WEIGHT: dict[int, int] = {0: 10, 1: 8, 2: 6, 3: 4}


def _days_to_m(days_val) -> str:
    """天数段字符串（如 '0~30' 或数字）→ M 月份标签"""
    # D2 围场列可能是 '0~30' 字符串，也可能是数字 0-30
    if days_val is None:
        return "M0"
    s = str(days_val).strip()
    # 尝试解析区间中点（如 '0~30' → 取左端 0）
    if "~" in s:
        try:
            left = int(s.split("~")[0])
        except ValueError:
            return "M?"
        days = left
    else:
        try:
            days = int(float(s))
        except (ValueError, TypeError):
            return s  # 如果已经是 M0 格式直接返回
    for low, high, label in _ENCLOSURE_BANDS:
        if high is None:
            if days >= low:
                return label
        elif low <= days <= high:
            return label
    return "M?"


def _m_label_to_index(m_label: str) -> int:
    """M0 → 0, M1 → 1, ... M6+ → 6"""
    try:
        return int(m_label.lstrip("M").rstrip("+"))
    except ValueError:
        return 99


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


# ── 围场-岗位边界（默认值，宽口径：学员自主打卡）────────────────────────────
# 窄口（CC/SS/LP 主动联系）: M0-M2→CC, M2→CC+SS, M3+→LP
# 宽口（学员自主打卡，本打卡面板用）: M0-M2→CC, M3→SS, M4-M5→LP, M6+→运营
_DEFAULT_ROLE_ASSIGNMENT = {
    "CC": {"m_range": (0, 2)},   # M0-M2
    "SS": {"m_range": (3, 3)},   # M3
    "LP": {"m_range": (4, 5)},   # M4-M5
    "运营": {"m_range": (6, 99)}, # M6+
}


def _load_role_assignment(wide: bool = True) -> dict[str, dict]:
    """
    从 projects/referral/config.json 读取围场-岗位边界，转为 M 月份范围。
    wide=True 读取宽口径配置（打卡面板用）；False 读取窄口径配置。
    """
    try:
        import json
        from pathlib import Path

        cfg_path = (
            Path(__file__).resolve().parent.parent.parent
            / "projects"
            / "referral"
            / "config.json"
        )
        if not cfg_path.exists():
            return _DEFAULT_ROLE_ASSIGNMENT

        with cfg_path.open(encoding="utf-8") as f:
            cfg = json.load(f)

        # 宽口径优先；窄口径 fallback 到旧 key
        key = "enclosure_role_wide" if wide else "enclosure_role_narrow"
        era = cfg.get(key) or cfg.get("enclosure_role_assignment", {})
        if not era:
            return _DEFAULT_ROLE_ASSIGNMENT

        result: dict[str, dict] = {}
        for role, spec in era.items():
            min_days = spec.get("min_days", 0)
            max_days = spec.get("max_days")  # None = 无上限

            # 转为 M 月份下标范围
            min_m = _m_label_to_index(_days_to_m(min_days))
            max_m = (
                _m_label_to_index(_days_to_m(max_days)) if max_days is not None else 99
            )
            result[role] = {"m_range": (min_m, max_m)}

        return result if result else _DEFAULT_ROLE_ASSIGNMENT
    except Exception:
        return _DEFAULT_ROLE_ASSIGNMENT


def _enclosure_to_role(m_label: str, role_assignment: dict[str, dict]) -> str:
    """根据 M 月份标签判断归属角色"""
    idx = _m_label_to_index(m_label)
    for role, spec in role_assignment.items():
        lo, hi = spec["m_range"]
        if lo <= idx <= hi:
            return role
    return "运营"


# ── D2 列名常量 ─────────────────────────────────────────────────────────────
_D2_CHECKIN_COL = "当月有效打卡率"
_D2_STUDENTS_COL = "学员数"
_D2_ENCLOSURE_COL = "围场"
_D2_CC_NAME = "last_cc_name"
_D2_CC_GROUP = "last_cc_group_name"

# D3 打卡列
_D3_CHECKIN_COL = "有效打卡"
_D3_STUDENT_ID = "stdt_id"

# D3 各岗位人员列（name, group）
_D3_ROLE_COLS: dict[str, tuple[str, str]] = {
    "CC": ("last_cc_name", "last_cc_group_name"),
    "SS": ("last_ss_name", "last_ss_group_name"),
    "LP": ("last_lp_name", "last_lp_group_name"),
}

# D4 学员 ID 候选列（按优先级）
_D4_STUDENT_ID_CANDIDATES = ["学员id", "stdt_id"]
_D4_LIFECYCLE_COL = "生命周期"  # 格式 0M/1M/2M...


def _find_d4_id_col(df: pd.DataFrame) -> str | None:
    for c in _D4_STUDENT_ID_CANDIDATES:
        if c in df.columns:
            return c
    return None


# ── 内部聚合函数 ─────────────────────────────────────────────────────────────

def _clean_name_col(
    df: pd.DataFrame, name_col: str, group_col: str | None
) -> pd.DataFrame:
    """过滤无效行（nan / 小计 / 合计 / 空值）"""
    _INVALID = {"nan", "小计", "合计", ""}
    df = df.copy()
    if name_col in df.columns:
        s = df[name_col].astype(str).str.strip()
        df = df[~s.isin(_INVALID)]
        df = df[df[name_col].notna()]
    if group_col and group_col in df.columns:
        s = df[group_col].astype(str).str.strip()
        df = df[~s.isin({"nan", ""})]
        df = df[df[group_col].notna()]
    return df


def _aggregate_d3_for_role(
    df_d3: pd.DataFrame,
    role: str,
    role_assignment: dict[str, dict],
) -> dict[str, Any]:
    """
    用 D3 明细表聚合指定岗位（SS / LP / 运营）的打卡数据。
    D3 有 `有效打卡` 列（1=打卡，0=未打卡），按人员列 groupby 统计。
    返回与 _aggregate_d2_by_role_and_team 同结构的单角色 dict。
    """
    if df_d3.empty:
        return {}

    name_col, group_col = _D3_ROLE_COLS.get(role, (None, None))
    checkin_col = _D3_CHECKIN_COL if _D3_CHECKIN_COL in df_d3.columns else None

    # 围场列
    enc_col = _D2_ENCLOSURE_COL if _D2_ENCLOSURE_COL in df_d3.columns else None
    lifecycle_col = "生命周期" if "生命周期" in df_d3.columns else None

    df = df_d3.copy()

    # 过滤无效人员行
    if name_col and name_col in df.columns:
        gc = group_col if group_col and group_col in df.columns else None
        df = _clean_name_col(df, name_col, gc)

    if df.empty:
        return {}

    # 计算围场 M 标签，仅保留属于该 role 围场段的行
    def _get_enc(row: pd.Series) -> str:
        val = row.get(enc_col) if enc_col else None
        if val is None and lifecycle_col:
            val = row.get(lifecycle_col)
        return _days_to_m(val) if val is not None else "M?"

    df["_m_label"] = df.apply(_get_enc, axis=1)
    df["_role"] = df["_m_label"].apply(lambda m: _enclosure_to_role(m, role_assignment))

    # 仅保留属于当前 role 的行（运营岗不拆人员）
    role_df = df[df["_role"] == role].copy()
    if role_df.empty:
        return {}

    # 打卡字段
    if checkin_col:
        role_df["_checkin_val"] = (
            pd.to_numeric(role_df[checkin_col], errors="coerce").fillna(0)
        )
    else:
        role_df["_checkin_val"] = 0

    total_students = len(role_df)
    checked_in_int = int(role_df["_checkin_val"].sum())
    rate = checked_in_int / total_students if total_students > 0 else 0.0

    # by_team（非运营岗且有 group_col 时展示）
    by_team: list[dict] = []
    if role != "运营" and group_col and group_col in role_df.columns:
        for grp, grp_df in role_df.groupby(group_col, sort=False):
            grp_name = _safe_str(grp)
            if not grp_name or grp_name.lower() in {"nan", "小计", "合计"}:
                continue
            t_total = len(grp_df)
            t_checked = int(grp_df["_checkin_val"].sum())
            t_rate = t_checked / t_total if t_total > 0 else 0.0
            by_team.append({
                "team": grp_name,
                "students": t_total,
                "checked_in": t_checked,
                "rate": round(t_rate, 4),
            })
    by_team.sort(key=lambda x: x["rate"], reverse=True)

    # by_enclosure
    by_enclosure: list[dict] = []
    for enc, enc_df in role_df.groupby("_m_label", sort=False):
        e_total = len(enc_df)
        e_checked = int(enc_df["_checkin_val"].sum())
        e_rate = e_checked / e_total if e_total > 0 else 0.0
        by_enclosure.append({
            "enclosure": str(enc),
            "students": e_total,
            "checked_in": e_checked,
            "rate": round(e_rate, 4),
        })
    by_enclosure.sort(key=lambda x: _m_label_to_index(x["enclosure"]))

    return {
        "total_students": total_students,
        "checked_in": checked_in_int,
        "checkin_rate": round(rate, 4),
        "by_team": by_team,
        "by_enclosure": by_enclosure,
    }


def _build_d2_role_enclosure_map(
    role_assignment: dict[str, dict],
) -> dict[str, list[str]]:
    """
    将 role_assignment（M 下标范围）转换为 D2 围场原始字符串列表。
    优先使用 _WIDE_ROLE_ENCLOSURES 硬编码映射；若传入自定义配置则动态推导。
    """
    # 如果传入的就是默认配置，直接返回硬编码映射（最准确）
    default_m = {
        "CC": (0, 2), "SS": (3, 3), "LP": (4, 5), "运营": (6, 99)
    }
    is_default = all(
        role_assignment.get(r, {}).get("m_range") == v
        for r, v in default_m.items()
    )
    if is_default:
        return dict(_WIDE_ROLE_ENCLOSURES)

    # 动态推导：将每个 D2 围场字符串按 M 下标分配给对应 role
    all_bands = list(_D2_BAND_TO_M.keys())
    result: dict[str, list[str]] = {r: [] for r in role_assignment}
    assigned: set[str] = set()

    for band, m_label in _D2_BAND_TO_M.items():
        m_idx = _m_label_to_index(m_label)
        for role, spec in role_assignment.items():
            lo, hi = spec["m_range"]
            if lo <= m_idx <= hi:
                result.setdefault(role, []).append(band)
                assigned.add(band)
                break

    # 运营兜底：未分配的围场段归运营
    if "运营" in result:
        for band in all_bands:
            if band not in assigned:
                result["运营"].append(band)

    return result


def _aggregate_d2_for_role(
    df_d2: pd.DataFrame,
    role: str,
    enclosure_bands: list[str],
    role_assignment: dict[str, dict],
) -> dict[str, Any] | None:
    """
    从 D2 聚合单个角色的打卡数据（加权平均打卡率）。
    - 所有角色都从 D2 聚合，覆盖全围场段。
    - CC 角色：by_team 按 last_cc_group_name 分组。
    - SS/LP/运营：by_team 为空（D2 无对应人员列）。
    返回 None 表示该角色无数据。
    """
    if df_d2.empty:
        return None

    # 对 CC 角色先过滤无效人员行；其他角色不需要
    if role == "CC":
        df = _clean_name_col(df_d2, _D2_CC_NAME, _D2_CC_GROUP)
    else:
        df = df_d2.copy()

    if df.empty:
        return None

    # 过滤 `是否有效` 列（如存在）
    if "是否有效" in df.columns:
        df = df[df["是否有效"].astype(str).str.strip() == "是"]
    if df.empty:
        return None

    # 按 D2 围场字符串筛选该 role 负责的行
    if _D2_ENCLOSURE_COL not in df.columns:
        return None

    # 运营：取不在其他角色围场段内的所有行；其他角色：精确匹配
    if role == "运营" and not enclosure_bands:
        # enclosure_bands 为空时运营=兜底（取所有其他角色未覆盖的围场段）
        all_assigned: set[str] = set()
        for r, bands in _WIDE_ROLE_ENCLOSURES.items():
            if r != "运营":
                all_assigned.update(bands)
        subset = df[~df[_D2_ENCLOSURE_COL].astype(str).str.strip().isin(all_assigned)]
    else:
        enc_bands_stripped = {b.strip() for b in enclosure_bands}
        enc_series = df[_D2_ENCLOSURE_COL].astype(str).str.strip()
        subset = df[enc_series.isin(enc_bands_stripped)]

    if subset.empty:
        return None

    students_col = _D2_STUDENTS_COL if _D2_STUDENTS_COL in subset.columns else None
    rate_col = _D2_CHECKIN_COL if _D2_CHECKIN_COL in subset.columns else None

    if not students_col or not rate_col:
        return None

    subset = subset.copy()
    subset["_students"] = (
        pd.to_numeric(subset[students_col], errors="coerce").fillna(0)
    )
    subset["_checked_in"] = (
        pd.to_numeric(subset[rate_col], errors="coerce").fillna(0)
        * subset["_students"]
    )
    # M 标签（用于 by_enclosure 排序）
    subset["_m_label"] = (
        subset[_D2_ENCLOSURE_COL].astype(str).str.strip().map(
            lambda v: _D2_BAND_TO_M.get(v) or _days_to_m(v)
        )
    )

    total_students = int(subset["_students"].sum())
    checked_in_sum = subset["_checked_in"].sum()
    checkin_rate = checked_in_sum / total_students if total_students > 0 else 0.0
    checked_in_int = int(round(checked_in_sum))

    # by_team：只有 CC 才按 last_cc_group_name 分组
    by_team: list[dict] = []
    if role == "CC" and _D2_CC_GROUP in subset.columns:
        for team_val, team_df in subset.groupby(_D2_CC_GROUP, sort=False):
            team_name = _safe_str(team_val)
            if not team_name or team_name.lower() in {"nan", "小计", "合计", ""}:
                continue
            t_students = int(team_df["_students"].sum())
            t_checked = team_df["_checked_in"].sum()
            t_rate = t_checked / t_students if t_students > 0 else 0.0
            by_team.append({
                "team": team_name,
                "students": t_students,
                "checked_in": int(round(t_checked)),
                "rate": round(t_rate, 4),
            })
        by_team.sort(key=lambda x: x["rate"], reverse=True)

    # by_enclosure：所有角色都展示
    by_enclosure: list[dict] = []
    for enc_band, enc_df in subset.groupby(_D2_ENCLOSURE_COL, sort=False):
        e_band_str = _safe_str(enc_band)
        m_label = _D2_BAND_TO_M.get(e_band_str) or _days_to_m(e_band_str)
        e_students = int(enc_df["_students"].sum())
        e_checked = enc_df["_checked_in"].sum()
        e_rate = e_checked / e_students if e_students > 0 else 0.0
        by_enclosure.append({
            "enclosure": m_label,
            "students": e_students,
            "checked_in": int(round(e_checked)),
            "rate": round(e_rate, 4),
        })
    by_enclosure.sort(key=lambda x: _m_label_to_index(x["enclosure"]))

    return {
        "total_students": total_students,
        "checked_in": checked_in_int,
        "checkin_rate": round(checkin_rate, 4),
        "by_team": by_team,
        "by_enclosure": by_enclosure,
    }


def _aggregate_d2_by_role_and_team(
    df_d2: pd.DataFrame,
    role_assignment: dict[str, dict],
    df_d3: pd.DataFrame | None = None,  # 保留参数签名兼容性，不再使用
) -> dict[str, Any]:
    """
    所有角色（CC/SS/LP/运营）统一从 D2（enclosure_cc）聚合打卡数据。
    D2 覆盖全部围场段，有 `当月有效打卡率` 和 `学员数` 列，是唯一可靠数据源。
    D3 只有 M0（0~30 天）的数据，不适合做全围场聚合。

    返回结构：{role: {total_students, checked_in, checkin_rate, by_team, by_enclosure}}
    """
    by_role: dict[str, Any] = {}

    if df_d2.empty:
        return by_role

    role_enc_map = _build_d2_role_enclosure_map(role_assignment)

    for role in ("CC", "SS", "LP", "运营"):
        enc_bands = role_enc_map.get(role, [])
        result = _aggregate_d2_for_role(df_d2, role, enc_bands, role_assignment)
        if result is not None:
            by_role[role] = result

    return by_role


def _detect_role_from_team(team: str) -> str:
    """
    从团队名前缀推断岗位角色。
    THSS-* / SS* → SS；THLP-* / LP* → LP；其余 → CC
    """
    t = team.strip().upper()
    if t.startswith("SS") or "SS" in t.split("-")[:2]:
        return "SS"
    if t.startswith("LP") or "LP" in t.split("-")[:2]:
        return "LP"
    # 泰国 CC 前缀：THCC-*
    return "CC"


def _aggregate_team_members(
    df_d2: pd.DataFrame,
    team: str,
    role_assignment: dict[str, dict],
    df_d3: pd.DataFrame | None = None,
) -> list[dict]:
    """
    按团队筛选后聚合每个销售的打卡数据。
    CC 团队 → D2（enclosure_cc）；SS/LP 团队 → D3（detail）。
    """
    role = _detect_role_from_team(team)

    if role in ("SS", "LP") and df_d3 is not None and not df_d3.empty:
        return _aggregate_d3_team_members(df_d3, team, role)

    # CC：原有 D2 逻辑
    if df_d2.empty:
        return []

    team_col = _D2_CC_GROUP if _D2_CC_GROUP in df_d2.columns else None
    name_col = _D2_CC_NAME if _D2_CC_NAME in df_d2.columns else None

    if team_col is None or name_col is None:
        return []

    df_clean = _clean_name_col(df_d2, name_col, team_col)

    mask = df_clean[team_col].astype(str).str.strip() == team.strip()
    df = df_clean[mask].copy()

    if df.empty:
        return []

    if _D2_ENCLOSURE_COL in df.columns:
        df["_m_label"] = df[_D2_ENCLOSURE_COL].apply(_days_to_m)
    else:
        df["_m_label"] = "M?"

    students_col = _D2_STUDENTS_COL if _D2_STUDENTS_COL in df.columns else None
    rate_col = _D2_CHECKIN_COL if _D2_CHECKIN_COL in df.columns else None

    df["_students"] = df.apply(
        lambda r: _safe(r.get(students_col, 0)) or 0 if students_col else 0, axis=1
    )

    def _checked_in_val(r: pd.Series) -> float:
        if not (students_col and rate_col):
            return 0.0
        s = (_safe(r.get(students_col, 0)) or 0)
        rt = (_safe(r.get(rate_col, 0)) or 0)
        return s * rt

    df["_checked_in"] = df.apply(_checked_in_val, axis=1)

    members: list[dict] = []
    for name, person_df in df.groupby(name_col, sort=False):
        total_students = int(person_df["_students"].sum())
        checked_in = person_df["_checked_in"].sum()
        rate = checked_in / total_students if total_students > 0 else 0.0

        by_enclosure: list[dict] = []
        for enc, enc_df in person_df.groupby("_m_label", sort=False):
            e_students = int(enc_df["_students"].sum())
            e_checked = enc_df["_checked_in"].sum()
            e_rate = e_checked / e_students if e_students > 0 else 0.0
            by_enclosure.append({
                "enclosure": str(enc),
                "students": e_students,
                "checked_in": int(round(e_checked)),
                "rate": round(e_rate, 4),
            })
        by_enclosure.sort(key=lambda x: _m_label_to_index(x["enclosure"]))

        members.append({
            "name": _safe_str(name),
            "total_students": total_students,
            "checked_in": int(round(checked_in)),
            "rate": round(rate, 4),
            "by_enclosure": by_enclosure,
        })

    members.sort(key=lambda x: x["rate"], reverse=True)
    return members


def _aggregate_d3_team_members(
    df_d3: pd.DataFrame,
    team: str,
    role: str,
) -> list[dict]:
    """
    D3 按 SS/LP 团队筛选后聚合每个销售成员的打卡数据。
    role 决定使用哪对 (name_col, group_col)。
    """
    name_col, group_col = _D3_ROLE_COLS.get(role, (None, None))
    if name_col is None or group_col is None:
        return []
    if name_col not in df_d3.columns or group_col not in df_d3.columns:
        return []

    df = _clean_name_col(df_d3, name_col, group_col)

    # 按团队筛选
    mask = df[group_col].astype(str).str.strip() == team.strip()
    df = df[mask].copy()
    if df.empty:
        return []

    checkin_col = _D3_CHECKIN_COL if _D3_CHECKIN_COL in df.columns else None
    enc_col = _D2_ENCLOSURE_COL if _D2_ENCLOSURE_COL in df.columns else None
    lifecycle_col = "生命周期" if "生命周期" in df.columns else None

    def _get_enc(row: pd.Series) -> str:
        val = row.get(enc_col) if enc_col else None
        if val is None and lifecycle_col:
            val = row.get(lifecycle_col)
        return _days_to_m(val) if val is not None else "M?"

    df["_m_label"] = df.apply(_get_enc, axis=1)

    if checkin_col:
        df["_checkin_val"] = pd.to_numeric(df[checkin_col], errors="coerce").fillna(0)
    else:
        df["_checkin_val"] = 0

    members: list[dict] = []
    for name, person_df in df.groupby(name_col, sort=False):
        total_students = len(person_df)
        checked_in = int(person_df["_checkin_val"].sum())
        rate = checked_in / total_students if total_students > 0 else 0.0

        by_enclosure: list[dict] = []
        for enc, enc_df in person_df.groupby("_m_label", sort=False):
            e_total = len(enc_df)
            e_checked = int(enc_df["_checkin_val"].sum())
            e_rate = e_checked / e_total if e_total > 0 else 0.0
            by_enclosure.append({
                "enclosure": str(enc),
                "students": e_total,
                "checked_in": e_checked,
                "rate": round(e_rate, 4),
            })
        by_enclosure.sort(key=lambda x: _m_label_to_index(x["enclosure"]))

        members.append({
            "name": _safe_str(name),
            "total_students": total_students,
            "checked_in": checked_in,
            "rate": round(rate, 4),
            "by_enclosure": by_enclosure,
        })

    members.sort(key=lambda x: x["rate"], reverse=True)
    return members


def _calc_quality_score(row_d3: pd.Series, d4_row: pd.Series | None) -> float:
    """
    质量评分（满分 100）：
      lesson_score   = min(avg_3m_consumption / 15, 1.0) * 40
      referral_score = min(monthly_referral_registrations / 3, 1.0) * 30
      payment_score  = min(total_referral_payments / 2, 1.0) * 20
      enclosure_score = {M0:10, M1:8, M2:6, M3:4, M4+:2}
    """
    # 围场分
    enc_raw = None
    if d4_row is not None:
        enc_raw = d4_row.get(_D4_LIFECYCLE_COL) or d4_row.get("围场")

    enc_raw_d3 = row_d3.get("生命周期") or row_d3.get("围场")
    enc_raw = enc_raw if enc_raw is not None else enc_raw_d3
    m_idx = _m_label_to_index(_days_to_m(enc_raw)) if enc_raw is not None else 0
    enclosure_score = _ENCLOSURE_WEIGHT.get(m_idx, 2)

    if d4_row is None:
        return float(enclosure_score)

    # 课耗（3 月均值）：用 D4 本月课耗作为近似
    lesson_val = _safe(d4_row.get("本月课耗")) or _safe(d4_row.get("课耗")) or 0.0
    lesson_score = min(float(lesson_val) / 15.0, 1.0) * 40.0

    # 当月推荐注册
    reg_val = (
        _safe(d4_row.get("当月推荐注册人数"))
        or _safe(d4_row.get("总推荐注册人数"))
        or 0.0
    )
    referral_score = min(float(reg_val) / 3.0, 1.0) * 30.0

    # 推荐付费
    pay_val = (
        _safe(d4_row.get("本月推荐付费数")) or _safe(d4_row.get("推荐付费")) or 0.0
    )
    payment_score = min(float(pay_val) / 2.0, 1.0) * 20.0

    return round(lesson_score + referral_score + payment_score + enclosure_score, 1)


def _build_followup_students(
    df_d3: pd.DataFrame,
    df_d4: pd.DataFrame,
    role: str | None,
    team: str | None,
    sales: str | None,
    role_assignment: dict[str, dict],
) -> list[dict]:
    """
    D3 筛选 有效打卡=0，JOIN D4，返回未打卡学员列表 + 质量评分
    """
    if df_d3.empty:
        return []

    checkin_col = _D3_CHECKIN_COL if _D3_CHECKIN_COL in df_d3.columns else None
    if checkin_col is None:
        # 尝试其他可能的列名
        for c in df_d3.columns:
            if "打卡" in c:
                checkin_col = c
                break

    df = df_d3.copy()

    # 过滤未打卡（有效打卡=0 或空）
    if checkin_col:
        mask = (
            pd.to_numeric(df[checkin_col], errors="coerce").fillna(0) == 0
        )
        df = df[mask]

    # 围场标签
    enc_col = _D2_ENCLOSURE_COL if _D2_ENCLOSURE_COL in df.columns else None
    lifecycle_col = "生命周期" if "生命周期" in df.columns else None

    def _get_enc(row: pd.Series) -> str:
        val = None
        if enc_col:
            val = row.get(enc_col)
        if val is None and lifecycle_col:
            val = row.get(lifecycle_col)
        return _days_to_m(val) if val is not None else "M?"

    df["_m_label"] = df.apply(_get_enc, axis=1)
    df["_role"] = df["_m_label"].apply(lambda m: _enclosure_to_role(m, role_assignment))

    # 按 role 筛选
    if role and role != "全部":
        df = df[df["_role"] == role]

    # 按 role 决定人员列（team_col / sales_col）
    # 优先用 _D3_ROLE_COLS 映射；无 role 时按候选列顺序探测（兜底）
    _role_upper = (role or "").strip().upper()
    if _role_upper in _D3_ROLE_COLS:
        _name_col_candidate, _group_col_candidate = _D3_ROLE_COLS[_role_upper]
    else:
        # role 未指定或"全部"：按存在优先级探测（CC 列兜底）
        _name_candidates = ["last_cc_name", "last_ss_name", "last_lp_name"]
        _group_candidates = [
            "last_cc_group_name", "last_ss_group_name", "last_lp_group_name"
        ]
        _name_col_candidate = next(
            (c for c in _name_candidates if c in df.columns), None
        )
        _group_col_candidate = next(
            (c for c in _group_candidates if c in df.columns), None
        )

    team_col_d3 = (
        _group_col_candidate
        if _group_col_candidate and _group_col_candidate in df.columns
        else None
    )
    sales_col_d3 = (
        _name_col_candidate
        if _name_col_candidate and _name_col_candidate in df.columns
        else None
    )

    if team and team_col_d3:
        df = df[df[team_col_d3].astype(str).str.strip() == team.strip()]

    if sales and sales_col_d3:
        df = df[df[sales_col_d3].astype(str).str.strip() == sales.strip()]

    if df.empty:
        return []

    # 构建 D4 索引（按学员 ID）
    d4_id_col = _find_d4_id_col(df_d4) if not df_d4.empty else None
    d4_index: dict[str, pd.Series] = {}
    if d4_id_col and not df_d4.empty:
        for _, row in df_d4.iterrows():
            sid = _safe_str(row.get(d4_id_col, ""))
            if sid:
                d4_index[sid] = row

    # D3 学员 ID 列
    d3_id_col = _D3_STUDENT_ID if _D3_STUDENT_ID in df.columns else None
    if d3_id_col is None:
        for c in df.columns:
            if "id" in c.lower() or "学员" in c:
                d3_id_col = c
                break

    students: list[dict] = []
    for _, row in df.iterrows():
        sid = _safe_str(row.get(d3_id_col, "")) if d3_id_col else ""
        d4_row = d4_index.get(sid)

        enc = row.get("_m_label", "M?")
        role_val = row.get("_role", "")

        # 人员姓名 / 团队：优先从 D3 当前行对应角色列读取，回退到 D4
        cc_name = _safe_str(row.get(sales_col_d3 or "", ""))
        if not cc_name and d4_row is not None:
            # D4 列名按角色映射
            _d4_name_col = {
                "CC": "末次（当前）分配CC员工姓名",
                "SS": "末次（当前）分配SS员工姓名",
            }.get(_role_upper, "末次（当前）分配CC员工姓名")
            cc_name = _safe_str(d4_row.get(_d4_name_col, ""))

        team_val = _safe_str(row.get(team_col_d3 or "", ""))
        if not team_val and d4_row is not None:
            _d4_group_col = {
                "CC": "末次（当前）分配CC员工组名称",
                "SS": "末次（当前）分配SS员工组名称",
            }.get(_role_upper, "末次（当前）分配CC员工组名称")
            team_val = _safe_str(d4_row.get(_d4_group_col, ""))

        # CC 末次拨打日期
        cc_last_call = None
        if d4_row is not None:
            raw = d4_row.get("CC末次拨打日期(day)")
            if raw is not None:
                s = str(raw)
                cc_last_call = (
                    None if s.startswith("1970") else (s[:10] if len(s) >= 10 else s)
                )

        # 次卡剩余天数
        card_days = None
        if d4_row is not None:
            card_days = _safe(d4_row.get("次卡距到期天数"))

        quality_score = _calc_quality_score(row, d4_row)

        # extra 字段（D4 全量）
        extra: dict[str, Any] = {}
        if d4_row is not None:
            for col in d4_row.index:
                extra[col] = _safe(d4_row[col])

        entry: dict[str, Any] = {
            "student_id": sid,
            "enclosure": str(enc),
            "role": str(role_val),
            "cc_name": cc_name,
            "team": team_val,
            "quality_score": quality_score,
            "lesson_consumption_3m": (
                _safe(d4_row.get("本月课耗")) if d4_row is not None else None
            ),
            "referral_registrations": (
                _safe(d4_row.get("当月推荐注册人数") or d4_row.get("总推荐注册人数"))
                if d4_row is not None else None
            ),
            "referral_payments": (
                _safe(d4_row.get("本月推荐付费数")) if d4_row is not None else None
            ),
            "cc_last_call_date": cc_last_call,
            "card_days_remaining": card_days,
            "extra": extra,
        }
        students.append(entry)

    # 按质量评分降序排列（高价值学员优先跟进）
    students.sort(key=lambda s: s["quality_score"], reverse=True)
    return students


# ── API 端点 ─────────────────────────────────────────────────────────────────

def _parse_role_config_param(role_config: str | None) -> dict[str, dict] | None:
    """
    解析前端传来的 role_config JSON 字符串。
    格式：{"CC": {"min_days": 0, "max_days": 90}, "SS": {...}, ...}
    解析成功返回 role_assignment dict；失败返回 None（使用默认配置）。
    """
    if not role_config:
        return None
    try:
        import json

        cfg = json.loads(role_config)
        if not isinstance(cfg, dict):
            return None

        result: dict[str, dict] = {}
        for role, spec in cfg.items():
            if not isinstance(spec, dict):
                continue
            min_days = int(spec.get("min_days", 0))
            max_days = spec.get("max_days")  # None = 无上限

            min_m = _m_label_to_index(_days_to_m(min_days))
            max_m = (
                _m_label_to_index(_days_to_m(max_days)) if max_days is not None else 99
            )
            result[str(role)] = {"m_range": (min_m, max_m)}

        return result if result else None
    except Exception:
        return None


@router.get(
    "/checkin/summary",
    summary="打卡汇总（Tab1）— 按角色 / 团队 / 围场分组",
)
def get_checkin_summary(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
    role_config: str | None = Query(
        default=None,
        description=(
            "JSON 字符串，前端宽口径配置。"
            '格式：{"CC":{"min_days":0,"max_days":90},"SS":{...},...}。'
            "不传则使用服务端 config.json 中的 enclosure_role_wide 配置。"
        ),
    ),
) -> dict:
    data = dm.load_all()
    df_d2: pd.DataFrame = data.get("enclosure_cc", pd.DataFrame())
    df_d3: pd.DataFrame = data.get("detail", pd.DataFrame())

    # 优先使用前端传来的宽口径配置，回退到 config.json
    role_assignment = (
        _parse_role_config_param(role_config) or _load_role_assignment(wide=True)
    )

    if df_d2.empty and df_d3.empty:
        return {"by_role": {}}

    by_role = _aggregate_d2_by_role_and_team(df_d2, role_assignment, df_d3=df_d3)
    return {"by_role": by_role}


@router.get(
    "/checkin/team-detail",
    summary="团队打卡明细（Tab2）— 按团队查询每个销售的打卡情况",
)
def get_checkin_team_detail(
    request: Request,
    team: str = Query(..., description="团队名称，例如 CC01Team"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    data = dm.load_all()
    df_d2: pd.DataFrame = data.get("enclosure_cc", pd.DataFrame())
    df_d3: pd.DataFrame = data.get("detail", pd.DataFrame())
    role_assignment = _load_role_assignment(wide=True)

    role = _detect_role_from_team(team)

    # SS/LP 团队：D2 无人员级数据，返回空 members + 说明
    if role in ("SS", "LP"):
        return {
            "team": team,
            "members": [],
            "note": (
                f"{role} 团队打卡数据来自 D2（围场汇总表），"
                "该数据源无 SS/LP 人员级拆分列，无法展示人员明细。"
                "汇总打卡率请参考「打卡汇总」Tab。"
            ),
        }

    members = _aggregate_team_members(df_d2, team, role_assignment, df_d3=df_d3)
    return {"team": team, "members": members}


@router.get(
    "/checkin/followup",
    summary="未打卡跟进名单（Tab3）— D3 JOIN D4，按质量评分降序",
)
def get_checkin_followup(
    request: Request,
    role: str | None = Query(default=None, description="角色筛选：CC / SS / LP / 运营"),
    team: str | None = Query(default=None, description="团队筛选，例如 CC01Team"),
    sales: str | None = Query(default=None, description="销售姓名筛选，例如 thcc-Zen"),
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    data = dm.load_all()
    df_d3: pd.DataFrame = data.get("detail", pd.DataFrame())
    df_d4: pd.DataFrame = data.get("students", pd.DataFrame())
    role_assignment = _load_role_assignment(wide=True)

    students = _build_followup_students(
        df_d3, df_d4, role, team, sales, role_assignment
    )
    return {
        "students": students,
        "total": len(students),
        "score_formula": (
            "课耗(40%) + 推荐活跃(30%) + 付费贡献(20%) + 围场加权(10%)"
        ),
    }
