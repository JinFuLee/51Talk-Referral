"""打卡面板 API — 基于 D2/D3/D4 数据源"""

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

# D4 学员 ID 候选列（按优先级）
_D4_STUDENT_ID_CANDIDATES = ["学员id", "stdt_id"]
_D4_LIFECYCLE_COL = "生命周期"  # 格式 0M/1M/2M...


def _find_d4_id_col(df: pd.DataFrame) -> str | None:
    for c in _D4_STUDENT_ID_CANDIDATES:
        if c in df.columns:
            return c
    return None


# ── 内部聚合函数 ─────────────────────────────────────────────────────────────

def _aggregate_d2_by_role_and_team(
    df_d2: pd.DataFrame,
    role_assignment: dict[str, dict],
) -> dict[str, Any]:
    """
    基于 D2 按角色、团队、围场聚合打卡数据。
    返回结构：{role: {total_students, checked_in, checkin_rate, by_team, by_enclosure}}
    """
    if df_d2.empty:
        return {}

    # D2 围场列可能是天数段或已是 M 格式，统一转换
    df = df_d2.copy()

    # ── 过滤无效行（nan / 小计 / 合计）────────────────────────────────────────
    # 过滤 last_cc_name 为 NaN、空、"小计"、"合计"、"nan" 的行
    if _D2_CC_NAME in df.columns:
        name_series = df[_D2_CC_NAME].astype(str).str.strip()
        invalid_names = {"nan", "小计", "合计", ""}
        df = df[~name_series.isin(invalid_names)]
        # 还要过滤 pandas NaN（astype str 后为 "nan" 已处理，但双保险）
        df = df[df[_D2_CC_NAME].notna()]

    # 过滤 last_cc_group_name 为 NaN / 空 的行（不过滤"小计"，组名不会叫小计）
    if _D2_CC_GROUP in df.columns:
        group_series = df[_D2_CC_GROUP].astype(str).str.strip()
        df = df[~group_series.isin({"nan", ""})]
        df = df[df[_D2_CC_GROUP].notna()]

    if df.empty:
        return {}

    # 如果 D2 有围场列，转为 M 标签
    if _D2_ENCLOSURE_COL in df.columns:
        df["_m_label"] = df[_D2_ENCLOSURE_COL].apply(_days_to_m)
    else:
        df["_m_label"] = "M?"

    df["_role"] = df["_m_label"].apply(lambda m: _enclosure_to_role(m, role_assignment))

    # 从 D2 推算打卡人数：打卡率 × 学员数
    students_col = _D2_STUDENTS_COL if _D2_STUDENTS_COL in df.columns else None
    rate_col = _D2_CHECKIN_COL if _D2_CHECKIN_COL in df.columns else None

    def _calc_checked_in(row: pd.Series) -> float:
        if students_col and rate_col:
            s = _safe(row.get(students_col, 0)) or 0
            r = _safe(row.get(rate_col, 0)) or 0
            return s * r
        return 0.0

    df["_students"] = df.apply(
        lambda r: _safe(r.get(students_col, 0)) or 0 if students_col else 0, axis=1
    )
    df["_checked_in"] = df.apply(_calc_checked_in, axis=1)

    by_role: dict[str, Any] = {}

    # CC 角色集合：只有 CC 岗位才用 CC 组名做团队细分
    _CC_ROLES = {"CC"}

    for role, role_df in df.groupby("_role", sort=False):
        total_students = int(role_df["_students"].sum())
        checked_in = role_df["_checked_in"].sum()
        checked_in_int = int(round(checked_in))
        total_s = role_df["_students"].sum()
        rate = checked_in / total_s if total_s > 0 else 0.0

        # by_team：仅 CC 角色展示 CC 团队细分；SS/LP/运营 D2 无独立组名，不展示
        by_team: list[dict] = []
        if str(role) in _CC_ROLES:
            team_col = _D2_CC_GROUP if _D2_CC_GROUP in role_df.columns else None
            if team_col:
                for team, team_df in role_df.groupby(team_col, sort=False):
                    team_name = _safe_str(team)
                    # 再次过滤空/nan 组名（groupby 有时仍会分出这些 key）
                    if not team_name or team_name.lower() in {"nan", "小计", "合计"}:
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

        # by_enclosure
        by_enclosure: list[dict] = []
        for enc, enc_df in role_df.groupby("_m_label", sort=False):
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

        by_role[str(role)] = {
            "total_students": total_students,
            "checked_in": checked_in_int,
            "checkin_rate": round(rate, 4),
            "by_team": by_team,
            "by_enclosure": by_enclosure,
        }

    return by_role


def _aggregate_team_members(
    df_d2: pd.DataFrame,
    team: str,
    role_assignment: dict[str, dict],
) -> list[dict]:
    """D2 按团队筛选后聚合每个销售的打卡数据"""
    if df_d2.empty:
        return []

    team_col = _D2_CC_GROUP if _D2_CC_GROUP in df_d2.columns else None
    name_col = _D2_CC_NAME if _D2_CC_NAME in df_d2.columns else None

    if team_col is None or name_col is None:
        return []

    # 过滤无效行后再按 team 筛选
    df_clean = df_d2.copy()
    if name_col in df_clean.columns:
        name_s = df_clean[name_col].astype(str).str.strip()
        df_clean = df_clean[~name_s.isin({"nan", "小计", "合计", ""})]
        df_clean = df_clean[df_clean[name_col].notna()]
    if team_col in df_clean.columns:
        grp_s = df_clean[team_col].astype(str).str.strip()
        df_clean = df_clean[~grp_s.isin({"nan", ""})]
        df_clean = df_clean[df_clean[team_col].notna()]

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
    def _checked_in_val(r):
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

    # 按 team 筛选（D3 的团队列）
    team_col_d3 = None
    for c in ["last_cc_group_name", "CC员工组名称", "cc_group", "team"]:
        if c in df.columns:
            team_col_d3 = c
            break
    if team and team_col_d3:
        df = df[df[team_col_d3].astype(str).str.strip() == team.strip()]

    # 按 sales 筛选（D3 的销售姓名列）
    sales_col_d3 = None
    for c in ["last_cc_name", "CC员工姓名", "cc_name", "sales"]:
        if c in df.columns:
            sales_col_d3 = c
            break
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

        cc_name = _safe_str(row.get(sales_col_d3 or "", "")) or (
            _safe_str(d4_row.get("末次CC员工姓名", "")) if d4_row is not None else ""
        )

        team_val = _safe_str(row.get(team_col_d3 or "", "")) or (
            _safe_str(d4_row.get("末次CC员工组名称", "")) if d4_row is not None else ""
        )

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

    # 优先使用前端传来的宽口径配置，回退到 config.json
    role_assignment = (
        _parse_role_config_param(role_config) or _load_role_assignment(wide=True)
    )

    if df_d2.empty:
        return {"by_role": {}}

    by_role = _aggregate_d2_by_role_and_team(df_d2, role_assignment)
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
    role_assignment = _load_role_assignment(wide=True)

    members = _aggregate_team_members(df_d2, team, role_assignment)
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
