"""打卡跟进 API — /checkin/followup, /checkin/followup/tsv"""

from __future__ import annotations

import json
import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request, Response

from backend.api._checkin_shared import (
    M_MAP as _M_MAP,
    M_TO_DAYS as _M_TO_DAYS,
    find_d4_id_col as _find_d4_id_col,
    m_label_to_index as _m_label_to_index,
    safe as _safe,
    safe_str as _safe_str,
)
from backend.api._checkin_config import (
    _get_config,
    _get_wide_role,
    _get_role_cols,
    _get_invalid_names,
    _get_quality_score_config,
    _get_priority_rules,
    _parse_role_enclosures,
    _clean_names,
    _detect_role_from_team,
    _calc_quality_score,
    _D3_CHECKIN_COL,
    _D3_STUDENT_COL,
    _D3_ENCLOSURE_COL,
    _D4_LIFECYCLE_COL,
    _OPS_CHANNELS,
)
from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.core.date_override import get_today
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()

def _build_followup_students(
    df_d3: pd.DataFrame,
    df_d4: pd.DataFrame,
    role: str | None,
    team: str | None,
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

    _wide_role_map = _get_wide_role()

    def _enc_to_role(enc: str) -> str:
        for r, bands in _wide_role_map.items():
            if enc in [_M_MAP.get(b, b) for b in bands]:
                return r
        # M 标签直接对比（fallback）
        idx = _m_label_to_index(enc)
        if idx <= 2:
            return "CC"
        if idx == 3:
            return "SS"
        return "LP"

    df["_m_label"] = df.apply(_row_enc, axis=1)
    df["_role"] = df["_m_label"].apply(_enc_to_role)

    # 按 role 筛选
    if role and role not in ("全部", ""):
        df = df[df["_role"] == role]

    # 根据 role 决定人员列
    _role_key = (role or "").strip().upper()
    _current_role_cols = _get_role_cols()
    if _role_key in _current_role_cols:
        name_col, group_col = _current_role_cols[_role_key]
    else:
        # 未指定 role：按存在性探测（CC 优先）
        _name_candidates = ["last_cc_name", "last_ss_name", "last_lp_name"]
        _group_candidates = [
            "last_cc_group_name",
            "last_ss_group_name",
            "last_lp_group_name",
        ]
        name_col = next((c for c in _name_candidates if c in df.columns), None)
        group_col = next((c for c in _group_candidates if c in df.columns), None)

    real_group = group_col if group_col and group_col in df.columns else None
    real_name = name_col if name_col and name_col in df.columns else None

    if team and real_group:
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
        sid = _safe_str(row.get(d3_id_col, "")) if d3_id_col else ""
        d4_row = d4_index.get(sid)

        enc = row.get("_m_label", "M?")
        role_val = row.get("_role", "")

        cc_name = _safe_str(row.get(real_name or "", ""))
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

        # ── 新增字段：SS/LP 负责人 ────────────────────────────────────────────
        ss_name = (
            _safe_str(d4_row.get("末次（当前）分配SS员工姓名", ""))
            if d4_row is not None
            else ""
        )
        ss_group = (
            _safe_str(d4_row.get("末次（当前）分配SS员工组名称", ""))
            if d4_row is not None
            else ""
        )
        lp_name = _safe_str(row.get("last_lp_name", ""))
        lp_group = _safe_str(row.get("last_lp_group_name", ""))

        # ── 本月/上月打卡天数（extra 中已有，同步到顶层字段）─────────────────
        days_this_month = int(_safe(extra.get("本月打卡天数")) or 0)

        # ── 本周打卡天数 ──────────────────────────────────────────────────────
        _today = get_today()
        _week_of_month = min(4, (_today.day - 1) // 7 + 1)
        _week_col = f"第{_week_of_month}周转码"
        days_this_week = (
            int(_safe(extra.get(_week_col)) or 0) if d4_row is not None else 0
        )

        # ── 活跃周数 0-4 ──────────────────────────────────────────────────────
        weeks_active = (
            sum(
                1 for w in range(1, 5) if int(_safe(extra.get(f"第{w}周转码")) or 0) > 0
            )
            if d4_row is not None
            else 0
        )

        # ── CC/SS/LP 接通状态（D3 行级字段）─────────────────────────────────
        cc_connected = int(_safe(row.get("CC接通")) or 0)
        ss_connected = int(_safe(row.get("SS接通")) or 0)
        lp_connected = int(_safe(row.get("LP接通")) or 0)

        # ── CC 末次备注 ───────────────────────────────────────────────────────
        cc_last_note_date = (
            _safe_str(d4_row.get("CC末次备注日期(day)", ""))
            if d4_row is not None
            else ""
        )
        cc_last_note_content = (
            _safe_str(d4_row.get("CC末次备注内容", "")) if d4_row is not None else ""
        )

        # ── 续费距今天数 ─────────────────────────────────────────────────────
        renewal_days_ago = (
            _safe(d4_row.get("末次续费日期距今天数")) if d4_row is not None else None
        )

        # ── 激励状态 ─────────────────────────────────────────────────────────
        incentive_raw = d4_row.get("推荐奖励领取状态") if d4_row is not None else None
        incentive_status = (
            _safe_str(incentive_raw)
            if incentive_raw is not None
            and str(incentive_raw).strip().lower() not in ("nan", "")
            else None
        )

        # ── 行动优先级评分（0-100）───────────────────────────────────────────
        if d4_row is not None:
            _reg_raw = (
                d4_row.get("当月推荐注册人数") or d4_row.get("总推荐注册人数") or 0
            )
            referral_reg_val = int(_safe(_reg_raw) or 0)
            referral_pay_val = int(_safe(d4_row.get("本月推荐付费数") or 0) or 0)
            referral_att_val = int(_safe(d4_row.get("本月推荐出席数") or 0) or 0)
            cc_dial_count = int(_safe(d4_row.get("总CC拨打次数") or 0) or 0)
        else:
            referral_reg_val = referral_pay_val = referral_att_val = cc_dial_count = 0

        _pr = _get_priority_rules()
        _prio = 0
        if card_days is not None and card_days <= 15:
            _prio += _pr.get("card_expiry_urgent", 30)
        elif card_days is not None and card_days <= 30:
            _prio += _pr.get("card_expiry_soon", 20)
        if days_this_month > 0 and days_this_week == 0:
            _prio += _pr.get("lapsed_this_week", 20)
        if days_this_month >= 4 and referral_reg_val == 0:
            _prio += _pr.get("active_no_referral", 15)
        if referral_reg_val > 0 and referral_pay_val == 0:
            _prio += _pr.get("lead_no_payment", 20)
        if cc_dial_count >= 5 and cc_connected == 0:
            _prio += _pr.get("unreachable", 15)
        action_priority_score = min(_prio, 100)

        # ── 推荐联系渠道 ─────────────────────────────────────────────────────
        cc_last_call_days_ago: int | None = None
        if cc_last_call:
            try:
                from datetime import datetime as _dt

                _last = _dt.strptime(cc_last_call[:10], "%Y-%m-%d").date()
                cc_last_call_days_ago = (get_today() - _last).days
            except Exception:
                cc_last_call_days_ago = None

        cc_last_call_duration = (
            _safe(d4_row.get("CC末次接通时长")) if d4_row is not None else None
        )

        _long_no_contact = (
            cc_connected == 1
            and cc_last_call_days_ago is not None
            and cc_last_call_days_ago > 14
        )
        if cc_dial_count >= 3 and cc_connected == 0:
            recommended_channel = "line"
        elif cc_last_call_duration is not None and cc_last_call_duration <= 30:
            recommended_channel = "sms"
        elif _long_no_contact:
            recommended_channel = "phone"
        else:
            recommended_channel = "app"

        # ── 黄金窗口标签 ─────────────────────────────────────────────────────
        golden_window: list[str] = []
        if days_this_month == 1:
            golden_window.append("first_checkin")
        if referral_reg_val > 0 and referral_att_val == 0:
            golden_window.append("lead_no_show")
        if card_days is not None and 15 <= card_days <= 45:
            golden_window.append("renewal_window")

        students.append(
            {
                "student_id": sid,
                "enclosure": str(enc),
                "role": str(role_val),
                "cc_name": cc_name,
                "team": team_val,
                "quality_score": quality_score,
                "lesson_consumption_3m": (
                    _safe(d4_row.get("本月课耗")) if d4_row is not None else None
                ),
                "referral_registrations": referral_reg_val
                if referral_reg_val
                else None,
                "referral_payments": (
                    _safe(d4_row.get("本月推荐付费数")) if d4_row is not None else None
                ),
                "cc_last_call_date": cc_last_call,
                "card_days_remaining": card_days,
                "extra": extra,
                # ── 新增字段 ──────────────────────────────────────────────────────
                "ss_name": ss_name or None,
                "ss_group": ss_group or None,
                "lp_name": lp_name or None,
                "lp_group": lp_group or None,
                "weeks_active": weeks_active,
                "days_this_week": days_this_week,
                "days_this_month": days_this_month,
                "cc_connected": cc_connected,
                "ss_connected": ss_connected,
                "lp_connected": lp_connected,
                "cc_last_note_date": cc_last_note_date or None,
                "cc_last_note_content": cc_last_note_content or None,
                "renewal_days_ago": renewal_days_ago,
                "incentive_status": incentive_status or None,
                "action_priority_score": action_priority_score,
                "recommended_channel": recommended_channel,
                "golden_window": golden_window,
            }
        )

    # 默认按 action_priority_score 降序（同分时 quality_score 次排）
    students.sort(
        key=lambda s: (s["action_priority_score"], s["quality_score"]),
        reverse=True,
    )
    return students


# ── API 端点 ──────────────────────────────────────────────────────────────────


# ── API 端点 ──

@router.get(
    "/checkin/followup",
    summary="未打卡跟进名单（Tab3）— D3 JOIN D4，按质量评分降序",
)
def get_checkin_followup(
    request: Request,
    role: str | None = Query(default=None, description="角色筛选：CC / SS / LP"),
    team: str | None = Query(default=None, description="团队筛选，例如 TH-CC01Team"),
    sales: str | None = Query(default=None, description="销售姓名筛选，例如 thcc-Zen"),
    enclosure: str | None = Query(
        default=None, description="围场筛选，逗号分隔，例如 M0,M1"
    ),
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict:
    """
    筛选 D3 中 有效打卡==0 的行，按 role/team/sales/enclosure 过滤，
    JOIN D4 获取质量评分字段，降序返回。
    """
    data = dm.load_all()
    df_d3: pd.DataFrame = apply_filters(data.get("detail", pd.DataFrame()), filters)
    df_d4: pd.DataFrame = apply_filters(data.get("students", pd.DataFrame()), filters)

    # 围场筛选：前端传 M 标签（M0,M3），转为 D3 原始值（0~30,91~120）
    if enclosure and _D3_ENCLOSURE_COL in df_d3.columns:
        m_to_raw = {v: k for k, v in _M_MAP.items()}
        enc_list = [e.strip() for e in enclosure.split(",") if e.strip()]
        raw_encs = [m_to_raw.get(e, e) for e in enc_list]
        df_d3 = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(raw_encs)]

    # role_config 围场过滤：按 role 指定的宽口径范围进一步筛选
    if role_config and role and role not in ("全部", ""):
        enc_override = _parse_role_enclosures(role_config, role)
        if enc_override and _D3_ENCLOSURE_COL in df_d3.columns:
            df_d3 = df_d3[df_d3[_D3_ENCLOSURE_COL].isin(enc_override)]

    students = _build_followup_students(df_d3, df_d4, role, team, sales)
    return {
        "students": students,
        "total": len(students),
        "score_formula": "课耗(40%) + 推荐活跃(30%) + 付费贡献(20%) + 围场加权(10%)",
    }


@router.get(
    "/checkin/followup/tsv",
    summary="未打卡学员 TSV — 纯文本 tab 分隔，供复制粘贴到表格",
)

def get_checkin_followup_tsv(
    request: Request,
    cc_name: str | None = Query(default=None, description="CC 姓名筛选"),
    team: str | None = Query(default=None, description="团队筛选"),
    role: str = Query(default="CC", description="角色"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> Response:
    """返回纯文本 TSV 格式的未打卡学员列表，浏览器可直接复制粘贴到 Excel。"""
    data = dm.load_all()
    df_d3: pd.DataFrame = apply_filters(data.get("detail", pd.DataFrame()), filters)
    df_d4: pd.DataFrame = apply_filters(data.get("students", pd.DataFrame()), filters)

    students = _build_followup_students(df_d3, df_d4, role, team, cc_name)

    # 构建 TSV：学员ID\t围场\t评分\t末次拨打\t课耗
    lines = ["学员ID\t围场\t评分\t末次拨打\t课耗"]
    for s in students:
        sid = s.get("student_id", "")
        enc = s.get("enclosure", "")
        score = int(s.get("quality_score", 0) or 0)
        last_call = (s.get("cc_last_call_date") or "—")[:10]
        lesson = s.get("lesson_consumption_3m")
        lesson_str = str(int(lesson)) if lesson is not None else "—"
        lines.append(f"{sid}\t{enc}\t{score}\t{last_call}\t{lesson_str}")

    tsv_text = "\n".join(lines)
    return Response(
        content=tsv_text,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "inline"},
    )
