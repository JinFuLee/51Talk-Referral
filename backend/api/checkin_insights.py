"""打卡学员分析 API — /checkin/student-analysis, /checkin/enclosure-thresholds"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, Query, Request

from backend.api._checkin_config import (
    _D3_CHECKIN_COL,
    _D3_STUDENT_COL,
    _D4_LIFECYCLE_COL,
    _get_config,
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
from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.core.date_override import get_today
from backend.models.filters import UnifiedFilter, apply_filters, parse_filters

router = APIRouter()

# ── 学员维度分析 ───────────────────────────────────────────────────────────────

_CHECKIN_STUDENT_TAGS_FALLBACK: dict = {
    "superfan_min": 6,
    "active_min": 4,
    "improver_delta": 2,
    "declining_delta": -2,
    "sleeping_hp_days_max": 0,
    "sleeping_hp_lesson_min": 10,
    "super_converter_days_min": 4,
    "super_converter_referrals_min": 2,
}


def _get_student_tags_config() -> dict:
    """从 config.json checkin_student_tags 读取标签阈值，fallback 到硬编码。"""
    return _get_config().get("checkin_student_tags", _CHECKIN_STUDENT_TAGS_FALLBACK)


def _compute_student_tags(
    days_this: int,
    days_last: int,
    lesson: float,
    registrations: int,
    cfg: dict,
) -> list[str]:
    """根据打卡数据计算学员标签列表。"""
    tags: list[str] = []
    delta = days_this - days_last

    superfan_min = int(cfg.get("superfan_min", 6))
    active_min = int(cfg.get("active_min", 4))
    improver_delta = int(cfg.get("improver_delta", 2))
    declining_delta = int(cfg.get("declining_delta", -2))
    sleeping_hp_days_max = int(cfg.get("sleeping_hp_days_max", 0))
    sleeping_hp_lesson_min = float(cfg.get("sleeping_hp_lesson_min", 10))
    super_converter_days_min = int(cfg.get("super_converter_days_min", 4))
    super_converter_referrals_min = int(cfg.get("super_converter_referrals_min", 2))

    if days_this >= superfan_min:
        tags.append("满勤")
    elif days_this >= active_min:
        tags.append("活跃")

    if delta >= improver_delta and days_last > 0:
        tags.append("进步明显")

    if delta <= declining_delta:
        tags.append("在退步")

    if days_this <= sleeping_hp_days_max and lesson >= sleeping_hp_lesson_min:
        tags.append("沉睡高潜")

    if (
        days_this >= super_converter_days_min
        and registrations >= super_converter_referrals_min
    ):
        tags.append("超级转化")

    return tags


def _band_for_days(days: int) -> str:
    """将打卡天数映射到 4 段分组标签。"""
    if days == 0:
        return "0次"
    if days <= 2:
        return "1-2次"
    if days <= 4:
        return "3-4次"
    return "5-6次"


_BAND_ORDER = ["0次", "1-2次", "3-4次", "5-6次"]


@router.get(
    "/checkin/student-analysis",
    summary="学员维度打卡分析 — D4 学员打卡分布/标签/转化相关性",
)
async def student_analysis(
    request: Request,
    role_config: str | None = Query(default=None, description="前端宽口径配置 JSON"),
    cc: str | None = Query(default=None, description="按 CC 姓名筛选"),
    team: str | None = Query(default=None, description="按团队名称筛选"),
    enclosure: str | None = Query(
        default=None, description="按围场 M 标签筛选，逗号分隔"
    ),
    limit: int = Query(default=200, description="top_students 返回条数上限"),
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict:
    """
    基于 D4（已付费学员明细）提供学员维度打卡分析：
    - 本月/上月打卡频次分布（0-6 次精确 + 4 段分组）
    - 月度对比（满勤/活跃/参与率）
    - 打卡×转化漏斗交叉
    - 围场打卡分布
    - 学员标签汇总（满勤/活跃/进步明显/在退步/沉睡高潜/超级转化）
    - 课耗×打卡交叉（学习行为 vs 打卡行为）
    - 联系频次×打卡响应
    - 续费×打卡相关性
    - Top 学员列表（按本月打卡降序）
    - 进步榜（按 delta 降序，仅 delta>0）
    """
    data = dm.load_all()
    df_d4: pd.DataFrame = apply_filters(data.get("students", pd.DataFrame()), filters)
    df_d3: pd.DataFrame = apply_filters(data.get("detail", pd.DataFrame()), filters)

    _empty_band_list = [{"band": b, "students": 0, "pct": 0.0} for b in _BAND_ORDER]
    _empty_result: dict = {
        "frequency_distribution": [
            {"count": i, "students": 0, "pct": 0.0} for i in range(7)
        ],
        "frequency_bands": _empty_band_list,
        "month_comparison": {
            "avg_days_this": 0.0,
            "avg_days_last": 0.0,
            "zero_this": 0,
            "zero_last": 0,
            "superfan_this": 0,
            "superfan_last": 0,
            "active_this": 0,
            "active_last": 0,
            "total_students": 0,
            "participation_rate_this": 0.0,
            "participation_rate_last": 0.0,
        },
        "conversion_funnel": [],
        "by_enclosure": [],
        "tags_summary": {
            "满勤": 0,
            "活跃": 0,
            "进步明显": 0,
            "在退步": 0,
            "沉睡高潜": 0,
            "超级转化": 0,
        },
        "lesson_checkin_cross": {
            "has_lesson_no_checkin": 0,
            "has_lesson_has_checkin": 0,
            "no_lesson_has_checkin": 0,
            "no_lesson_no_checkin": 0,
            "by_band": [],
        },
        "contact_checkin_response": {
            "contacted_7d": {"students": 0, "avg_days": 0.0, "participation_rate": 0.0},
            "contacted_14d": {
                "students": 0,
                "avg_days": 0.0,
                "participation_rate": 0.0,
            },
            "contacted_14d_plus": {
                "students": 0,
                "avg_days": 0.0,
                "participation_rate": 0.0,
            },
            "never_contacted": {
                "students": 0,
                "avg_days": 0.0,
                "participation_rate": 0.0,
            },
        },
        "renewal_checkin_correlation": {"by_band": []},
        "top_students": [],
        "improvement_ranking": [],
    }

    if df_d4.empty:
        return _empty_result

    # ── D4 列名探查 ──────────────────────────────────────────────────────────
    d4_id_col = _find_d4_id_col(df_d4)

    # ── 字段常量 ─────────────────────────────────────────────────────────────
    _CC_NAME_COL = "末次（当前）分配CC员工姓名"
    _TEAM_COL = "末次（当前）分配CC员工组名称"
    _COL_DAYS_THIS = "本月打卡天数"
    _COL_DAYS_LAST = "上月打卡天数"
    _COL_LESSON = "本月课耗"
    _COL_REG_MONTHLY = "当月推荐注册人数"
    _COL_REG_TOTAL = "总推荐注册人数"
    _COL_PAY_MONTHLY = "本月推荐付费数"
    _COL_RENEWALS = "总续费订单数"
    _COL_CC_CALL_DATE = "CC末次拨打日期(day)"
    _COL_CARD_DAYS = "次卡距到期天数"

    # ── 筛选 ─────────────────────────────────────────────────────────────────
    df = df_d4.copy()
    if cc and _CC_NAME_COL in df.columns:
        df = df[df[_CC_NAME_COL].astype(str).str.strip() == cc.strip()]
    if team and _TEAM_COL in df.columns:
        df = df[df[_TEAM_COL].astype(str).str.strip() == team.strip()]

    if enclosure and _D4_LIFECYCLE_COL in df.columns:
        enc_list = [e.strip() for e in enclosure.split(",") if e.strip()]
        df["_m_filter"] = df[_D4_LIFECYCLE_COL].apply(
            lambda v: _M_MAP.get(_safe_str(v), _safe_str(v))
        )
        df = df[df["_m_filter"].isin(enc_list)]

    if role_config and _D4_LIFECYCLE_COL in df.columns:
        try:
            parsed_rc = json.loads(role_config)
            all_m_labels: list[str] = []
            for _rk in parsed_rc:
                bands = _parse_role_enclosures(role_config, _rk)
                if bands:
                    all_m_labels.extend(_M_MAP.get(b, b) for b in bands)
            if all_m_labels:
                df["_rc_filter"] = df[_D4_LIFECYCLE_COL].apply(
                    lambda v: _M_MAP.get(_safe_str(v), _safe_str(v))
                )
                df = df[df["_rc_filter"].isin(all_m_labels)]
        except (json.JSONDecodeError, AttributeError):
            pass

    if df.empty:
        return _empty_result

    # ── 辅助函数 ─────────────────────────────────────────────────────────────
    def _int_col(row: pd.Series, col: str, default: int = 0) -> int:
        v = row.get(col)
        if v is None:
            return default
        try:
            if pd.isna(v):
                return default
        except (TypeError, ValueError):
            pass
        try:
            return max(0, int(float(v)))
        except (ValueError, TypeError):
            return default

    def _float_col(row: pd.Series, col: str, default: float = 0.0) -> float:
        v = row.get(col)
        if v is None:
            return default
        try:
            if pd.isna(v):
                return default
        except (TypeError, ValueError):
            pass
        try:
            f = float(v)
            return default if (f != f) else f  # NaN guard
        except (ValueError, TypeError):
            return default

    today = get_today()

    def _cc_call_days_ago(row: pd.Series) -> int | None:
        raw = row.get(_COL_CC_CALL_DATE)
        if raw is None:
            return None
        s = str(raw).strip()
        if not s or s.startswith("1970") or s == "nan":
            return None
        date_str = s[:10] if len(s) >= 10 else s
        try:
            call_date = date.fromisoformat(date_str)
            return max(0, (today - call_date).days)
        except ValueError:
            return None

    # ── D3 今日打卡索引 ──────────────────────────────────────────────────────
    d3_today_index: dict[str, int] = {}
    if (
        not df_d3.empty
        and _D3_STUDENT_COL in df_d3.columns
        and _D3_CHECKIN_COL in df_d3.columns
    ):
        for _, r in df_d3.iterrows():
            sid_d3 = _safe_str(r.get(_D3_STUDENT_COL, ""))
            if sid_d3:
                val_d3 = pd.to_numeric(r.get(_D3_CHECKIN_COL, 0), errors="coerce")
                d3_today_index[sid_d3] = 0 if (val_d3 != val_d3) else int(val_d3)

    # ── 遍历行，构建学员列表 ─────────────────────────────────────────────────
    tags_cfg = _get_student_tags_config()
    students_data: list[dict] = []

    for _, row in df.iterrows():
        sid = _safe_str(row.get(d4_id_col, "")) if d4_id_col else ""
        enc_raw = _safe_str(row.get(_D4_LIFECYCLE_COL, ""))
        enc_m = _M_MAP.get(enc_raw, enc_raw) if enc_raw else "M?"

        days_this = _int_col(row, _COL_DAYS_THIS)
        days_last = _int_col(row, _COL_DAYS_LAST)
        lesson = _float_col(row, _COL_LESSON)
        reg = _int_col(row, _COL_REG_MONTHLY) or _int_col(row, _COL_REG_TOTAL)
        pay = _int_col(row, _COL_PAY_MONTHLY)
        renewals = _int_col(row, _COL_RENEWALS)
        cc_days_ago = _cc_call_days_ago(row)
        card_days_raw = _safe(row.get(_COL_CARD_DAYS))
        card_days_int: int | None = (
            int(card_days_raw) if card_days_raw is not None else None
        )

        cc_name_val = _safe_str(row.get(_CC_NAME_COL, ""))
        team_val = _safe_str(row.get(_TEAM_COL, ""))
        today_checked = d3_today_index.get(sid, 0)

        tags = _compute_student_tags(days_this, days_last, lesson, reg, tags_cfg)

        students_data.append(
            {
                "student_id": sid,
                "enclosure": enc_m,
                "cc_name": cc_name_val,
                "team": team_val,
                "days_this_month": days_this,
                "days_last_month": days_last,
                "delta": days_this - days_last,
                "lesson_this_month": lesson if lesson > 0 else None,
                "referral_registrations": reg,
                "referral_payments": pay,
                "total_renewals": renewals,
                "cc_last_call_days_ago": cc_days_ago,
                "card_days_remaining": card_days_int,
                "today_checked_in": today_checked,
                "tags": tags,
            }
        )

    n = len(students_data)

    # ── frequency_distribution ───────────────────────────────────────────────
    freq_count: dict[int, int] = {i: 0 for i in range(7)}
    for s in students_data:
        d = min(max(s["days_this_month"], 0), 6)
        freq_count[d] += 1

    frequency_distribution = [
        {
            "count": i,
            "students": freq_count[i],
            "pct": round(freq_count[i] / n, 4) if n > 0 else 0.0,
        }
        for i in range(7)
    ]

    # ── frequency_bands ──────────────────────────────────────────────────────
    band_count: dict[str, int] = {b: 0 for b in _BAND_ORDER}
    for s in students_data:
        band_count[_band_for_days(s["days_this_month"])] += 1

    frequency_bands = [
        {
            "band": b,
            "students": band_count[b],
            "pct": round(band_count[b] / n, 4) if n > 0 else 0.0,
        }
        for b in _BAND_ORDER
    ]

    # ── month_comparison ─────────────────────────────────────────────────────
    superfan_min_v = int(tags_cfg.get("superfan_min", 6))
    active_min_v = int(tags_cfg.get("active_min", 4))

    avg_days_this = (
        round(sum(s["days_this_month"] for s in students_data) / n, 4) if n > 0 else 0.0
    )
    avg_days_last = (
        round(sum(s["days_last_month"] for s in students_data) / n, 4) if n > 0 else 0.0
    )
    zero_this = freq_count.get(0, 0)
    zero_last = sum(1 for s in students_data if s["days_last_month"] == 0)
    superfan_this = sum(
        1 for s in students_data if s["days_this_month"] >= superfan_min_v
    )
    superfan_last = sum(
        1 for s in students_data if s["days_last_month"] >= superfan_min_v
    )
    active_this = sum(
        1
        for s in students_data
        if active_min_v <= s["days_this_month"] < superfan_min_v
    )
    active_last = sum(
        1
        for s in students_data
        if active_min_v <= s["days_last_month"] < superfan_min_v
    )
    participation_this = sum(1 for s in students_data if s["days_this_month"] > 0)
    participation_last = sum(1 for s in students_data if s["days_last_month"] > 0)

    month_comparison = {
        "avg_days_this": avg_days_this,
        "avg_days_last": avg_days_last,
        "zero_this": zero_this,
        "zero_last": zero_last,
        "superfan_this": superfan_this,
        "superfan_last": superfan_last,
        "active_this": active_this,
        "active_last": active_last,
        "total_students": n,
        "participation_rate_this": round(participation_this / n, 4) if n > 0 else 0.0,
        "participation_rate_last": round(participation_last / n, 4) if n > 0 else 0.0,
    }

    # ── band_groups（各分析共享） ─────────────────────────────────────────────
    band_groups: dict[str, list[dict]] = {b: [] for b in _BAND_ORDER}
    for s in students_data:
        band_groups[_band_for_days(s["days_this_month"])].append(s)

    # ── conversion_funnel ────────────────────────────────────────────────────
    conversion_funnel: list[dict] = []
    for b in _BAND_ORDER:
        grp = band_groups[b]
        cnt = len(grp)
        has_reg = sum(1 for s in grp if s["referral_registrations"] > 0)
        has_pay = sum(1 for s in grp if s["referral_payments"] > 0)
        avg_reg = (
            round(sum(s["referral_registrations"] for s in grp) / cnt, 4)
            if cnt > 0
            else 0.0
        )
        avg_pay = (
            round(sum(s["referral_payments"] for s in grp) / cnt, 4) if cnt > 0 else 0.0
        )
        conversion_funnel.append(
            {
                "band": b,
                "students": cnt,
                "has_registration_pct": round(has_reg / cnt, 4) if cnt > 0 else 0.0,
                "has_payment_pct": round(has_pay / cnt, 4) if cnt > 0 else 0.0,
                "avg_registrations": avg_reg,
                "avg_payments": avg_pay,
            }
        )

    # ── by_enclosure ─────────────────────────────────────────────────────────
    enc_groups: dict[str, list[dict]] = {}
    for s in students_data:
        enc_groups.setdefault(s["enclosure"], []).append(s)

    by_enclosure: list[dict] = []
    for enc_label, grp in sorted(
        enc_groups.items(), key=lambda x: _m_label_to_index(x[0])
    ):
        cnt = len(grp)
        avg_days = (
            round(sum(s["days_this_month"] for s in grp) / cnt, 4) if cnt > 0 else 0.0
        )
        participation = sum(1 for s in grp if s["days_this_month"] > 0)
        enc_dist: dict[int, int] = {i: 0 for i in range(7)}
        for s in grp:
            enc_dist[min(max(s["days_this_month"], 0), 6)] += 1
        by_enclosure.append(
            {
                "enclosure": enc_label,
                "total": cnt,
                "avg_days": avg_days,
                "participation_rate": round(participation / cnt, 4) if cnt > 0 else 0.0,
                "distribution": [
                    {"count": i, "students": enc_dist[i]} for i in range(7)
                ],
            }
        )

    # ── tags_summary ─────────────────────────────────────────────────────────
    tags_summary: dict[str, int] = {
        "满勤": 0,
        "活跃": 0,
        "进步明显": 0,
        "在退步": 0,
        "沉睡高潜": 0,
        "超级转化": 0,
    }
    for s in students_data:
        for tag in s["tags"]:
            if tag in tags_summary:
                tags_summary[tag] += 1

    # ── lesson_checkin_cross ─────────────────────────────────────────────────
    has_lesson_no_checkin = sum(
        1
        for s in students_data
        if (s["lesson_this_month"] or 0) > 0 and s["days_this_month"] == 0
    )
    has_lesson_has_checkin = sum(
        1
        for s in students_data
        if (s["lesson_this_month"] or 0) > 0 and s["days_this_month"] > 0
    )
    no_lesson_has_checkin = sum(
        1
        for s in students_data
        if (s["lesson_this_month"] or 0) == 0 and s["days_this_month"] > 0
    )
    no_lesson_no_checkin = sum(
        1
        for s in students_data
        if (s["lesson_this_month"] or 0) == 0 and s["days_this_month"] == 0
    )
    lesson_by_band: list[dict] = [
        {
            "band": b,
            "avg_lesson": (
                round(
                    sum((s["lesson_this_month"] or 0.0) for s in band_groups[b])
                    / len(band_groups[b]),
                    4,
                )
                if band_groups[b]
                else 0.0
            ),
            "students": len(band_groups[b]),
        }
        for b in _BAND_ORDER
    ]

    lesson_checkin_cross = {
        "has_lesson_no_checkin": has_lesson_no_checkin,
        "has_lesson_has_checkin": has_lesson_has_checkin,
        "no_lesson_has_checkin": no_lesson_has_checkin,
        "no_lesson_no_checkin": no_lesson_no_checkin,
        "by_band": lesson_by_band,
    }

    # ── contact_checkin_response ─────────────────────────────────────────────
    def _cg_stats(grp_list: list[dict]) -> dict:
        cnt = len(grp_list)
        if cnt == 0:
            return {"students": 0, "avg_days": 0.0, "participation_rate": 0.0}
        avg_d = round(sum(s["days_this_month"] for s in grp_list) / cnt, 4)
        part = sum(1 for s in grp_list if s["days_this_month"] > 0)
        return {
            "students": cnt,
            "avg_days": avg_d,
            "participation_rate": round(part / cnt, 4),
        }

    c7 = [
        s
        for s in students_data
        if s["cc_last_call_days_ago"] is not None and s["cc_last_call_days_ago"] <= 7
    ]
    c14 = [
        s
        for s in students_data
        if s["cc_last_call_days_ago"] is not None
        and 8 <= s["cc_last_call_days_ago"] <= 14
    ]
    c14p = [
        s
        for s in students_data
        if s["cc_last_call_days_ago"] is not None and s["cc_last_call_days_ago"] > 14
    ]
    cnever = [s for s in students_data if s["cc_last_call_days_ago"] is None]

    contact_checkin_response = {
        "contacted_7d": _cg_stats(c7),
        "contacted_14d": _cg_stats(c14),
        "contacted_14d_plus": _cg_stats(c14p),
        "never_contacted": _cg_stats(cnever),
    }

    # ── renewal_checkin_correlation ──────────────────────────────────────────
    renewal_by_band: list[dict] = []
    for b in _BAND_ORDER:
        grp = band_groups[b]
        cnt = len(grp)
        avg_renewals = (
            round(sum(s["total_renewals"] for s in grp) / cnt, 4) if cnt > 0 else 0.0
        )
        has_renewal = sum(1 for s in grp if s["total_renewals"] > 0)
        renewal_by_band.append(
            {
                "band": b,
                "avg_renewals": avg_renewals,
                "has_renewal_pct": round(has_renewal / cnt, 4) if cnt > 0 else 0.0,
                "students": cnt,
            }
        )

    renewal_checkin_correlation = {"by_band": renewal_by_band}

    # ── top_students ─────────────────────────────────────────────────────────
    top_students = sorted(
        students_data,
        key=lambda s: (-s["days_this_month"], -s["referral_registrations"]),
    )[: max(1, limit)]

    # ── improvement_ranking ──────────────────────────────────────────────────
    improvement_ranking = sorted(
        [s for s in students_data if s["delta"] > 0],
        key=lambda s: (-s["delta"], -s["days_this_month"]),
    )

    return {
        "frequency_distribution": frequency_distribution,
        "frequency_bands": frequency_bands,
        "month_comparison": month_comparison,
        "conversion_funnel": conversion_funnel,
        "by_enclosure": by_enclosure,
        "tags_summary": tags_summary,
        "lesson_checkin_cross": lesson_checkin_cross,
        "contact_checkin_response": contact_checkin_response,
        "renewal_checkin_correlation": renewal_checkin_correlation,
        "top_students": top_students,
        "improvement_ranking": improvement_ranking,
    }



# ── 围场动态阈值 ──────────────────────────────────────────────────────────────

_THRESHOLDS_PATH = (
    Path(__file__).resolve().parent.parent.parent / "config" / "checkin_thresholds.json"
)


def _load_checkin_thresholds_config() -> dict:
    """读取 config/checkin_thresholds.json，返回其内容。失败时返回空 dict。"""
    try:
        return json.loads(_THRESHOLDS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


@router.get(
    "/checkin/enclosure-thresholds",
    summary="围场动态打卡阈值 — M0/M1/M2 读 config，M3+ 动态计算 P75/P50/P25",
)
def get_enclosure_thresholds(
    dm: DataManager = Depends(get_data_manager),
    filters: UnifiedFilter = Depends(parse_filters),
) -> dict:
    """
    返回各围场打卡率阈值：
    - M0/M1/M2：来自 config/checkin_thresholds.json cc_warning_by_enclosure
    - M3+：从 D4（本月打卡天数/6）计算参与率，取 P75/P50/P25

    响应格式：
    {
      "thresholds": {
        "M0": {"good": 0.90, "warning": 0.80, "source": "config"},
        "M3": {"good": 0.45, "warning": 0.30, "bad_below": 0.15,
               "source": "dynamic", "method": "percentile", "sample_size": 431}
      }
    }
    """
    import numpy as np

    # 读取 config 中已配置的阈值（M0/M1/M2）
    thresholds_cfg = _load_checkin_thresholds_config()
    config_by_enc: dict[str, float] = thresholds_cfg.get("cc_warning_by_enclosure", {})

    # 加载 D4 学员数据
    df_d4: pd.DataFrame = apply_filters(
        dm.load_all().get("students", pd.DataFrame()), filters
    )

    thresholds: dict[str, dict] = {}

    # M 标签顺序
    m_labels_ordered = [
        "M0",
        "M1",
        "M2",
        "M3",
        "M4",
        "M5",
        "M6",
        "M7",
        "M8",
        "M9",
        "M10",
        "M11",
        "M12",
        "M12+",
    ]

    for m_label in m_labels_ordered:
        # 已有 config 配置的围场
        if m_label in config_by_enc:
            warning_val = float(config_by_enc[m_label])
            # good ≈ warning + 0.1（向上取整一档）
            good_val = min(warning_val + 0.10, 1.0)
            thresholds[m_label] = {
                "good": round(good_val, 4),
                "warning": round(warning_val, 4),
                "source": "config",
            }
            continue

        # 动态计算：从 D4 拿该围场学员的打卡天数
        if df_d4.empty or _D4_LIFECYCLE_COL not in df_d4.columns:
            continue

        # 找出该围场对应的原始围场值（D4 生命周期列存的是原始 band，如 "0~30"）
        # 先获取所有 D4 中能映射到此 m_label 的原始值
        target_raws = [raw for raw, mapped in _M_MAP.items() if mapped == m_label]
        if not target_raws:
            # M 标签直接存在于 D4（部分数据源）
            target_raws = [m_label]

        mask = (
            df_d4[_D4_LIFECYCLE_COL]
            .astype(str)
            .str.strip()
            .isin(set(target_raws) | {m_label})
        )
        subset_d4 = df_d4[mask]

        if subset_d4.empty or "本月打卡天数" not in subset_d4.columns:
            continue

        days_series = pd.to_numeric(subset_d4["本月打卡天数"], errors="coerce").fillna(
            0
        )
        n = len(days_series)
        if n < 5:
            # 样本量太小，跳过动态计算
            continue

        # 参与率 = 打卡天数 / 6（上限 1.0）
        rates = (days_series / 6.0).clip(0.0, 1.0).values

        p75 = float(np.percentile(rates, 75))
        p50 = float(np.percentile(rates, 50))
        p25 = float(np.percentile(rates, 25))

        thresholds[m_label] = {
            "good": round(p75, 4),
            "warning": round(p50, 4),
            "bad_below": round(p25, 4),
            "source": "dynamic",
            "method": "percentile",
            "sample_size": n,
        }

    return {"thresholds": thresholds}


# ── 运营学员排行 ──────────────────────────────────────────────────────────────
