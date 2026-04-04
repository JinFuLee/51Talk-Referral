"""打卡排行 API — /checkin/ranking, /checkin/team-detail, /checkin/ops-student-ranking"""

from __future__ import annotations

import json
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api._checkin_config import (
    _D3_CHECKIN_COL,
    _D3_ENCLOSURE_COL,
    _D3_STUDENT_COL,
    _D4_LIFECYCLE_COL,
    _calc_quality_score,
    _clean_names,
    _detect_role_from_team,
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
    m_label_to_index as _m_label_to_index,
)
from backend.api._checkin_shared import (
    safe as _safe,
)
from backend.api._checkin_shared import (
    safe_str as _safe_str,
)
from backend.api.checkin_summary import _aggregate_ops_channels
from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()

def _aggregate_team_members(df_d3: pd.DataFrame, team: str, role: str) -> list[dict]:
    """
    按团队筛选 D3，按 name_col 分组，返回每个销售的打卡情况。
    """
    role_cols = _get_role_cols()
    name_col, group_col = role_cols.get(role, ("last_cc_name", "last_cc_group_name"))

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
            by_enc.append(
                {
                    "enclosure": str(enc),
                    "students": et,
                    "checked_in": ec,
                    "rate": round(ec / et, 4) if et > 0 else 0.0,
                }
            )
        by_enc.sort(key=lambda x: _m_label_to_index(x["enclosure"]))

        members.append(
            {
                "name": _safe_str(name),
                "total_students": t,
                "checked_in": c,
                "rate": round(r, 4),
                "by_enclosure": by_enc,
            }
        )

    members.sort(key=lambda x: x["rate"], reverse=True)
    return members




# ── API 端点 ──

@router.get(
    "/checkin/team-detail",
    summary="团队打卡明细（Tab2）— D3 明细表，按团队查询每个销售的打卡情况",
)
def get_checkin_team_detail(
    request: Request,
    team: str = Query(..., description="团队名称，例如 TH-CC01Team"),
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict:
    """
    根据 team 名前缀判断岗位：
      TH-CC* / CC* → CC，用 last_cc_group_name 匹配，按 last_cc_name 分组
      TH-SS* / SS* → SS，用 last_ss_group_name 匹配，按 last_ss_name 分组
      其他          → LP，用 last_lp_group_name 匹配，按 last_lp_name 分组

    每个人的打卡率 = 该人负责学员中有效打卡数 / 总学员数
    """
    d3: pd.DataFrame = apply_filters(
        dm.load_all().get("detail", pd.DataFrame()), filters
    )
    role = _detect_role_from_team(team)
    enclosures = _parse_role_enclosures(role_config, role)
    if enclosures and _D3_ENCLOSURE_COL in d3.columns:
        d3 = d3[d3[_D3_ENCLOSURE_COL].isin(enclosures)]
    members = _aggregate_team_members(d3, team, role)
    return {"team": team, "role": role, "members": members}


@router.get(
    "/checkin/ranking",
    summary="打卡排行（Tab2）— 按角色展示小组+个人排名",
)
def get_checkin_ranking(
    request: Request,
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    enclosure: str | None = Query(
        default=None, description="围场过滤（M 标签，如 M0），为空时不过滤"
    ),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict:
    """按角色返回打卡排行，小组+个人双维度，按打卡率降序→同率按已打卡人数降序。

    enclosure 参数：前端统一筛选栏传入的围场 M 标签（如 M0/M1/M2），
    用于在角色默认围场范围内进一步交叉过滤，不影响无参数时的行为。
    """
    d3: pd.DataFrame = apply_filters(
        dm.load_all().get("detail", pd.DataFrame()), filters
    )

    # 解析围场过滤：将 M 标签转回原始围场值列表
    enc_filter_raws: list[str] | None = None
    if enclosure and _D3_ENCLOSURE_COL in d3.columns:
        m_to_raw = {v: k for k, v in _M_MAP.items()}
        enc_labels = [e.strip() for e in enclosure.split(",") if e.strip()]
        enc_filter_raws = [m_to_raw[m] for m in enc_labels if m in m_to_raw]

    # 确定角色列表
    _wide_role_map = _get_wide_role()
    _role_cols_map = _get_role_cols()
    roles = list(_wide_role_map.keys())
    if role_config:
        try:
            parsed = json.loads(role_config)
            roles = list(parsed.keys()) or roles
        except (json.JSONDecodeError, AttributeError):
            pass

    by_role: dict[str, Any] = {}
    for role in roles:
        override = _parse_role_enclosures(role_config, role)

        # 运营角色：返回渠道推荐数据，不做 by_group/by_person 个人聚合。
        # 运营负责 M6+（181天+）围场，属于固定范围，不响应前端 enclosure 筛选栏
        # 的交叉过滤（enc_filter_raws）——运营视图看全局 M6+ 而非单个围场切片，
        # 围场徽章仅对 CC/SS/LP 有语义。如需单围场过滤，传 enclosures_override。
        if role == "运营":
            d4_ops: pd.DataFrame = apply_filters(
                dm.load_all().get("students", pd.DataFrame()), filters
            )
            by_role[role] = _aggregate_ops_channels(
                d3, d4_ops, enclosures_override=override
            )
            continue

        name_col, group_col = _role_cols_map.get(
            role, ("last_cc_name", "last_cc_group_name")
        )
        enclosures = override if override else _wide_role_map.get(role, [])

        # 按角色默认围场筛选
        if _D3_ENCLOSURE_COL in d3.columns:
            subset = d3[d3[_D3_ENCLOSURE_COL].isin(enclosures)].copy()
        else:
            subset = d3.copy()

        # 额外围场交叉过滤（来自前端统一筛选栏 enclosure 参数）
        if enc_filter_raws and _D3_ENCLOSURE_COL in subset.columns:
            subset = subset[subset[_D3_ENCLOSURE_COL].isin(enc_filter_raws)].copy()

        # 过滤无效行
        if name_col in subset.columns:
            gc = group_col if group_col in subset.columns else None
            subset = _clean_names(subset, name_col, gc)

        total = len(subset)
        checked = 0
        rate = 0.0
        if total > 0 and _D3_CHECKIN_COL in subset.columns:
            subset["_ck"] = pd.to_numeric(
                subset[_D3_CHECKIN_COL], errors="coerce"
            ).fillna(0)
            checked = int(subset["_ck"].sum())
            rate = checked / total
        else:
            subset["_ck"] = 0

        # by_group — 按 group_col 聚合
        by_group: list[dict] = []
        if total > 0 and group_col in subset.columns:
            for grp, g in subset.groupby(group_col, sort=False):
                grp_str = _safe_str(grp)
                if grp_str.lower() in _get_invalid_names():
                    continue
                t = len(g)
                c = int(g["_ck"].sum())
                by_group.append(
                    {
                        "group": grp_str,
                        "students": t,
                        "checked_in": c,
                        "rate": round(c / t, 4) if t > 0 else 0.0,
                    }
                )
            # 排序：① rate DESC ② checked_in DESC
            by_group.sort(key=lambda x: (-x["rate"], -x["checked_in"]))
            for i, g in enumerate(by_group):
                g["rank"] = i + 1

        # by_person — 按 name_col 聚合
        by_person: list[dict] = []
        if total > 0 and name_col in subset.columns:
            for name, pf in subset.groupby(name_col, sort=False):
                name_str = _safe_str(name)
                if name_str.lower() in _get_invalid_names():
                    continue
                t = len(pf)
                c = int(pf["_ck"].sum())
                grp_val = ""
                if group_col in pf.columns:
                    grp_val = _safe_str(pf[group_col].iloc[0])
                by_person.append(
                    {
                        "name": name_str,
                        "group": grp_val,
                        "students": t,
                        "checked_in": c,
                        "rate": round(c / t, 4) if t > 0 else 0.0,
                    }
                )
            by_person.sort(key=lambda x: (-x["rate"], -x["checked_in"]))
            for i, p in enumerate(by_person):
                p["rank"] = i + 1

        by_role[role] = {
            "total_students": total,
            "checked_in": checked,
            "checkin_rate": round(rate, 4),
            "by_group": by_group,
            "by_person": by_person,
        }

    return {"by_role": by_role}



# ── 运营学员排行 ──────────────────────────────────────────────────────────────

_OPS_ENCLOSURES = ["6M", "7M", "8M", "9M", "10M", "11M", "12M", "12M+", "M6+", "181+"]

# 14 维度定义：(排序字段, 是否需要计算)
_RANKING_DIMENSIONS: dict[str, str] = {
    "checkin_days": "days_this_month",
    "checkin_consistency": "engagement_stability",
    "quality_score": "quality_score",
    "referral_bindings": "referral_registrations",
    "referral_attendance": "referral_attendance",
    "referral_payments": "referral_payments",
    "conversion_rate": "conversion_rate",
    "secondary_referrals": "secondary_referrals",
    "improvement": "delta",
    "cc_dial_depth": "cc_dial_count",
    "role_split_new": "_role_split_new",
    "role_split_paid": "_role_split_paid",
    "d3_funnel": "d3_invitations",
    "historical_total": "_historical_total",
}


@router.get(
    "/checkin/ops-student-ranking",
    summary="运营学员排行（14 维度 + 二级裂变）— D4 + D3 数据源",
)
def get_ops_student_ranking(
    request: Request,
    role_config: str | None = Query(default=None, description="前端围场配置 JSON"),
    enclosure: str | None = Query(
        default=None, description="围场过滤（M 标签，如 M6）"
    ),
    dimension: str = Query(default="checkin_days", description="排行维度"),
    limit: int = Query(default=50, description="返回条数上限"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict:
    """
    从 D4（students）聚合运营围场学员的 14 维度排行数据。
    支持二级裂变计算：查找 D4 中推荐人学员 ID 指向当前学员的其他学员。
    """
    data = dm.load_all()
    df_d4: pd.DataFrame = apply_filters(data.get("students", pd.DataFrame()), filters)
    df_d3: pd.DataFrame = apply_filters(data.get("detail", pd.DataFrame()), filters)

    if df_d4.empty:
        return {
            "dimension": dimension,
            "total_students": 0,
            "students": [],
        }

    # 确定运营围场范围
    wide_role = _get_wide_role()
    ops_enclosures = wide_role.get("运营", _OPS_ENCLOSURES)
    # 解析前端 role_config 覆盖
    if role_config:
        override = _parse_role_enclosures(role_config, "运营")
        if override:
            ops_enclosures = override

    # 找 D4 学员 ID 列
    d4_id_col = _find_d4_id_col(df_d4)
    if d4_id_col is None:
        return {
            "dimension": dimension,
            "total_students": 0,
            "students": [],
        }

    # 找 D4 生命周期列（围场）
    lifecycle_col = None
    for c in (_D4_LIFECYCLE_COL, "围场", "生命周期"):
        if c in df_d4.columns:
            lifecycle_col = c
            break

    # 筛选运营围场学员（D4）
    if lifecycle_col:
        # D4 围场值可能是原始 band（6M）或 M 标签（M6），两者都支持
        # 同时支持两种格式
        all_ops_values: set[str] = set()
        for enc in ops_enclosures:
            all_ops_values.add(enc)
            # enc 可能本身是 M 标签（M6 → 6M）
            for raw_k, mapped_v in _M_MAP.items():
                if mapped_v == enc:
                    all_ops_values.add(raw_k)
        df_ops = df_d4[
            df_d4[lifecycle_col].astype(str).str.strip().isin(all_ops_values)
        ].copy()
    else:
        df_ops = df_d4.copy()

    # 围场标签过滤（前端参数 enclosure=M6,...）
    if enclosure and lifecycle_col:
        enc_labels = [e.strip() for e in enclosure.split(",") if e.strip()]
        # 展开每个 M 标签对应的原始 band 值
        enc_raws: set[str] = set()
        for el in enc_labels:
            enc_raws.add(el)
            for raw_k, mapped_v in _M_MAP.items():
                if mapped_v == el:
                    enc_raws.add(raw_k)
        df_ops = df_ops[
            df_ops[lifecycle_col].astype(str).str.strip().isin(enc_raws)
        ].copy()

    if df_ops.empty:
        return {
            "dimension": dimension,
            "total_students": 0,
            "students": [],
        }

    # ── 列名安全读取工具 ─────────────────────────────────────────────────────

    def _col(col_name: str, row: pd.Series) -> Any:
        """安全读取行中的列值，返回 None 如果不存在。"""
        return row.get(col_name)

    def _int_col(col_name: str, row: pd.Series) -> int:
        v = _safe(row.get(col_name))
        return int(v) if v is not None else 0

    def _float_col(col_name: str, row: pd.Series) -> float:
        v = _safe(row.get(col_name))
        return float(v) if v is not None else 0.0

    # ── D3 数据：建立 D3 打卡天数补充索引 ────────────────────────────────────
    # D4 col.12 = 本月打卡天数，col.11 = 上月打卡天数，优先从 D4 读
    # D3 按 stdt_id 聚合每周打卡次数（周活跃天数）
    d3_student_data: dict[str, dict[str, Any]] = {}
    if not df_d3.empty and _D3_STUDENT_COL in df_d3.columns:
        for _, d3row in df_d3.iterrows():
            sid = _safe_str(d3row.get(_D3_STUDENT_COL, ""))
            if not sid:
                continue
            # 聚合 D3 的打卡信息（仅用作补充，有效打卡列）
            ck = pd.to_numeric(d3row.get(_D3_CHECKIN_COL, 0), errors="coerce") or 0
            if sid not in d3_student_data:
                d3_student_data[sid] = {"d3_checkin": 0}
            d3_student_data[sid]["d3_checkin"] += int(ck)

    # ── D3 明细表：构建邀约/出席/付费索引（D3 有专用列）─────────────────────
    # D3 列名参考：邀约数(col.12), 出席数(col.13), 转介绍付费数(col.14), stdt_id(col.1)
    d3_funnel_index: dict[str, dict[str, int]] = {}
    # 通过 D3 列名探测
    _D3_INVITE_CANDIDATES = ["邀约数", "本月邀约数"]
    _D3_ATTEND_CANDIDATES = ["出席数", "本月出席数"]
    _D3_D3PAY_CANDIDATES = ["转介绍付费数", "本月转介绍付费数"]

    d3_invite_col = next((c for c in _D3_INVITE_CANDIDATES if c in df_d3.columns), None)
    d3_attend_col = next((c for c in _D3_ATTEND_CANDIDATES if c in df_d3.columns), None)
    d3_d3pay_col = next((c for c in _D3_D3PAY_CANDIDATES if c in df_d3.columns), None)

    if not df_d3.empty and _D3_STUDENT_COL in df_d3.columns:
        for _, d3row in df_d3.iterrows():
            sid = _safe_str(d3row.get(_D3_STUDENT_COL, ""))
            if not sid:
                continue
            inv = int(_safe(d3row.get(d3_invite_col, 0) if d3_invite_col else 0) or 0)
            att = int(_safe(d3row.get(d3_attend_col, 0) if d3_attend_col else 0) or 0)
            pay = int(_safe(d3row.get(d3_d3pay_col, 0) if d3_d3pay_col else 0) or 0)
            if sid not in d3_funnel_index:
                d3_funnel_index[sid] = {
                    "invitations": 0,
                    "attendance": 0,
                    "payments": 0,
                }
            d3_funnel_index[sid]["invitations"] += inv
            d3_funnel_index[sid]["attendance"] += att
            d3_funnel_index[sid]["payments"] += pay

    # ── 二级裂变索引：推荐人学员 ID → 被推荐学员行列表 ──────────────────────
    # D4 col.10 = 推荐人学员ID
    _D4_REFERRER_CANDIDATES = ["推荐人学员ID", "推荐人id", "推荐人学员id"]
    d4_referrer_col = next(
        (c for c in _D4_REFERRER_CANDIDATES if c in df_d4.columns), None
    )

    # D4 当月推荐注册人数列（判断二级裂变活跃）
    _D4_MONTHLY_REG_CANDIDATES = ["当月推荐注册人数", "本月推荐注册人数"]
    d4_monthly_reg_col = next(
        (c for c in _D4_MONTHLY_REG_CANDIDATES if c in df_d4.columns), None
    )

    # 构建：推荐人ID → [被推荐学员ID, ...]
    referrer_to_referred: dict[str, list[str]] = {}
    referred_monthly_regs: dict[str, int] = {}  # 被推荐学员 ID → 当月注册数
    referred_monthly_pays: dict[str, int] = {}  # 被推荐学员 ID → 当月付费数

    _D4_PAY_COL_CANDIDATES = ["本月推荐付费数", "当月推荐付费数"]
    d4_pay_col = next((c for c in _D4_PAY_COL_CANDIDATES if c in df_d4.columns), None)

    if d4_referrer_col:
        for _, row in df_d4.iterrows():
            sid = _safe_str(row.get(d4_id_col, ""))
            ref_id = _safe_str(row.get(d4_referrer_col, ""))
            if sid and ref_id:
                referrer_to_referred.setdefault(ref_id, []).append(sid)
            # 记录每个学员当月推荐注册数（用于二级裂变判断）
            if sid and d4_monthly_reg_col:
                monthly_reg = int(_safe(row.get(d4_monthly_reg_col)) or 0)
                referred_monthly_regs[sid] = monthly_reg
            # 记录每个学员当月推荐付费数（用于 B 付费判断）
            if sid and d4_pay_col:
                monthly_pay = int(_safe(row.get(d4_pay_col)) or 0)
                referred_monthly_pays[sid] = monthly_pay

    # ── 主循环：构建每个运营学员的排行数据 ──────────────────────────────────

    # D4 列名候选（按任务规范）
    _D4_CHECKIN_THIS = "本月打卡天数"
    _D4_CHECKIN_LAST = "上月打卡天数"
    _D4_CC_DIAL = "总CC拨打次数"
    _D4_MONTHLY_REG = d4_monthly_reg_col or "当月推荐注册人数"
    _D4_MONTHLY_ATT = "当月推荐出席人数"
    _D4_TOTAL_REG = "总推荐注册人数"
    _D4_TOTAL_PAY = "总推荐1v1付费人数"
    _D4_MONTHLY_PAY = "本月推荐付费数"
    _D4_CC_NEW = "CC带新人数"
    _D4_SS_NEW = "SS带新人数"
    _D4_LP_NEW = "LP带新人数"
    _D4_WIDE_NEW = "宽口径带新人数"
    _D4_CC_NEW_PAID = "CC带新付费数"
    _D4_SS_NEW_PAID = "SS带新付费数"
    _D4_LP_NEW_PAID = "LP带新付费数"
    _D4_WIDE_NEW_PAID = "宽口径带新付费数"
    _D4_CC_NAME = "末次（当前）分配CC员工姓名"
    _D4_CC_GROUP = "末次（当前）分配CC员工组名称"
    # 周打卡数列（用于 weeks_active 计算）
    _D4_WEEK_COLS = ["第1周转码", "第2周转码", "第3周转码", "第4周转码"]

    students_list: list[dict[str, Any]] = []

    for _, row in df_ops.iterrows():
        sid = _safe_str(row.get(d4_id_col, ""))
        if not sid:
            continue

        # 围场标签
        enc_raw = _safe_str(row.get(lifecycle_col, "")) if lifecycle_col else ""
        enc_label = _M_MAP.get(enc_raw, enc_raw) if enc_raw else "M?"

        # 基础打卡数据
        days_this = int(_safe(row.get(_D4_CHECKIN_THIS)) or 0)
        days_last = int(_safe(row.get(_D4_CHECKIN_LAST)) or 0)
        delta = days_this - days_last

        # 参与稳定性 = min(this, last) / max(this, last)，均 0 时为 0
        _max_days = max(days_this, days_last)
        engagement_stability = (
            round(min(days_this, days_last) / _max_days, 4) if _max_days > 0 else 0.0
        )

        # 周活跃数（几周有过打卡）
        weeks_active = 0
        for wc in _D4_WEEK_COLS:
            if wc in df_d4.columns:
                wv = int(_safe(row.get(wc)) or 0)
                if wv > 0:
                    weeks_active += 1

        # 推荐数据
        referral_registrations = int(_safe(row.get(_D4_MONTHLY_REG)) or 0)
        referral_attendance = int(_safe(row.get(_D4_MONTHLY_ATT)) or 0)
        referral_payments = int(_safe(row.get(_D4_MONTHLY_PAY)) or 0)
        total_hist_reg = int(_safe(row.get(_D4_TOTAL_REG)) or 0)
        total_hist_pay = int(_safe(row.get(_D4_TOTAL_PAY)) or 0)

        # 转化率（除零保护）
        conversion_rate = (
            round(referral_payments / referral_registrations, 4)
            if referral_registrations > 0
            else 0.0
        )

        # 二级裂变数 + B 付费数 + C 数量
        referred_ids = referrer_to_referred.get(sid, [])
        secondary_referrals = sum(
            1 for rid in referred_ids if referred_monthly_regs.get(rid, 0) > 0
        )
        # B 中付费了的数量
        secondary_b_paid = sum(
            1 for rid in referred_ids if referred_monthly_pays.get(rid, 0) > 0
        )
        # B 又推荐了 C 的总数量（B 的被推荐人数）
        secondary_c_count = sum(
            len(referrer_to_referred.get(rid, [])) for rid in referred_ids
        )

        # CC 拨打次数
        cc_dial_count = int(_safe(row.get(_D4_CC_DIAL)) or 0)

        # 角色分拆带新人数
        cc_new_count = int(_safe(row.get(_D4_CC_NEW)) or 0)
        ss_new_count = int(_safe(row.get(_D4_SS_NEW)) or 0)
        lp_new_count = int(_safe(row.get(_D4_LP_NEW)) or 0)
        wide_new_count = int(_safe(row.get(_D4_WIDE_NEW)) or 0)
        cc_new_paid = int(_safe(row.get(_D4_CC_NEW_PAID)) or 0)
        ss_new_paid = int(_safe(row.get(_D4_SS_NEW_PAID)) or 0)
        lp_new_paid = int(_safe(row.get(_D4_LP_NEW_PAID)) or 0)
        wide_new_paid = int(_safe(row.get(_D4_WIDE_NEW_PAID)) or 0)

        # D3 漏斗数据（邀约/出席/付费）
        d3f = d3_funnel_index.get(sid, {})
        d3_invitations = d3f.get("invitations", 0)
        d3_attendance = d3f.get("attendance", 0)
        d3_payments = d3f.get("payments", 0)

        # 负责人姓名 & 团队
        cc_name = _safe_str(row.get(_D4_CC_NAME, ""))
        team_val = _safe_str(row.get(_D4_CC_GROUP, ""))

        # 质量评分（复用已有函数，传 D4 行作为 d4_row）
        quality_score = _calc_quality_score(pd.Series(dtype=object), row)

        # 派生排序字段
        _role_split_new = cc_new_count + ss_new_count + lp_new_count
        _role_split_paid = cc_new_paid + ss_new_paid + lp_new_paid
        _historical_total = total_hist_reg + total_hist_pay

        students_list.append(
            {
                "student_id": sid,
                "enclosure": enc_label,
                "cc_name": cc_name,
                "team": team_val,
                "days_this_month": days_this,
                "days_last_month": days_last,
                "delta": delta,
                "quality_score": quality_score,
                "referral_registrations": referral_registrations,
                "referral_attendance": referral_attendance,
                "referral_payments": referral_payments,
                "conversion_rate": conversion_rate,
                "secondary_referrals": secondary_referrals,
                "secondary_b_paid": secondary_b_paid,
                "secondary_c_count": secondary_c_count,
                "cc_dial_count": cc_dial_count,
                "cc_new_count": cc_new_count,
                "ss_new_count": ss_new_count,
                "lp_new_count": lp_new_count,
                "wide_new_count": wide_new_count,
                "cc_new_paid": cc_new_paid,
                "ss_new_paid": ss_new_paid,
                "lp_new_paid": lp_new_paid,
                "wide_new_paid": wide_new_paid,
                "d3_invitations": d3_invitations,
                "d3_attendance": d3_attendance,
                "d3_payments": d3_payments,
                "total_historical_registrations": total_hist_reg,
                "total_historical_payments": total_hist_pay,
                "engagement_stability": engagement_stability,
                "weeks_active": weeks_active,
                # 派生字段（仅排序用，不暴露给前端）
                "_role_split_new": _role_split_new,
                "_role_split_paid": _role_split_paid,
                "_historical_total": _historical_total,
            }
        )

    # ── 排序 ────────────────────────────────────────────────────────────────
    sort_key = _RANKING_DIMENSIONS.get(dimension, "days_this_month")
    students_list.sort(key=lambda s: -(s.get(sort_key) or 0))

    # 加 rank 字段，移除内部派生字段
    result_students: list[dict[str, Any]] = []
    for i, s in enumerate(students_list[: max(1, limit)]):
        row_out = {k: v for k, v in s.items() if not k.startswith("_")}
        row_out["rank"] = i + 1
        result_students.append(row_out)

    return {
        "dimension": dimension,
        "total_students": len(students_list),
        "students": result_students,
    }

