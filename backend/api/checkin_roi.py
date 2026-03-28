"""打卡 ROI 分析 API — D3 JOIN D4，计算每位学员的活动成本与转介绍收入

业务逻辑：
  两种常驻活动：
    1. 社群打卡（FB 分享）：每周 1 次，审核通过 = 1 次卡，月上限 4 次
    2. 精彩瞬间（视频分享）：每 2 周 1 次，审核通过 = 2 次卡，月上限 2 次
  满勤 = 6 次/月，最多获得 8 次卡（4×1 + 2×2）

  其他激励：
    User B 绑定 → A 获 1 次卡
    B 出席 → A 获 2 次卡
    B 付费 → A 获 N 次卡（可配置，默认 3）

  次卡单价：$1.31 USD（可配置）
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter()

# ── 配置加载 ──────────────────────────────────────────────────────────────────

_ROI_CONFIG_PATH = (
    Path(__file__).resolve().parent.parent.parent / "config" / "roi_cost_rules.json"
)
_ROI_CONFIG_CACHE: dict | None = None
_ROI_CONFIG_MTIME: float = 0.0


def _get_roi_config() -> dict:
    """Lazy load roi_cost_rules.json，带 mtime 检查。"""
    global _ROI_CONFIG_CACHE, _ROI_CONFIG_MTIME
    try:
        current_mtime = _ROI_CONFIG_PATH.stat().st_mtime
    except OSError:
        current_mtime = 0.0

    if _ROI_CONFIG_CACHE is None or current_mtime != _ROI_CONFIG_MTIME:
        try:
            with open(_ROI_CONFIG_PATH, encoding="utf-8") as f:
                _ROI_CONFIG_CACHE = json.load(f)
            _ROI_CONFIG_MTIME = current_mtime
        except Exception:
            # fallback 默认值
            _ROI_CONFIG_CACHE = {
                "card_unit_cost_usd": 1.31,
                "activity_cost_mapping": {
                    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 6, "6": 8
                },
                "binding_cards_per_user_b": 1,
                "attendance_cards_per_user_b": 2,
                "payment_cards_per_user_b": 3,
                "avg_unit_price_usd": 150.0,
                "blacklist_thresholds": {
                    "min_consecutive_months": 2,
                    "min_monthly_checkin": 4,
                    "high_value_lesson_threshold": 10,
                },
            }
    return _ROI_CONFIG_CACHE


# ── 围场 M 标签映射 ───────────────────────────────────────────────────────────

_M_MAP: dict[str, str] = {
    "0~30": "M0", "31~60": "M1", "61~90": "M2",
    "91~120": "M3", "121~150": "M4", "151~180": "M5",
    "6M": "M6", "7M": "M7", "8M": "M8",
    "9M": "M9", "10M": "M10", "11M": "M11",
    "12M": "M12", "12M+": "M12+", "M6+": "M6+",
    # 生命周期列格式
    "0M": "M0", "1M": "M1", "2M": "M2", "3M": "M3",
    "4M": "M4", "5M": "M5",
}

# ── 工具函数 ──────────────────────────────────────────────────────────────────


def _safe(val: Any) -> float | None:
    """安全转 float，None / NaN / 无法转换 → None。"""
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
        return None


def _safe_str(val: Any) -> str:
    if val is None:
        return ""
    try:
        if pd.isna(val):
            return ""
    except (TypeError, ValueError):
        pass
    return str(val).strip()


def _safe_int(val: Any, default: int = 0) -> int:
    f = _safe(val)
    return int(f) if f is not None else default


def _find_d4_id_col(df: pd.DataFrame) -> str | None:
    for c in ("学员id", "stdt_id"):
        if c in df.columns:
            return c
    return None


# ── 核心计算 ──────────────────────────────────────────────────────────────────


def _calc_activity_cards(
    days_checkin: int, days_transcode: int, cost_config: dict
) -> int:
    """
    打卡/转码活动次卡计算。
    取 本月打卡天数 与 本月转码次数 的最大值，分段映射 → 活动次卡数。

    活动映射（前4次=社群打卡1张/次，第5-6次=精彩瞬间2张/次）：
      0→0, 1→1, 2→2, 3→3, 4→4, 5→6, 6→8
    """
    days = max(days_checkin, days_transcode)
    days = min(days, 6)  # 上限 6
    mapping = cost_config.get("activity_cost_mapping", {})
    return int(mapping.get(str(days), 0))


def _calc_student_roi(
    d4_row: pd.Series,
    d3_revenue: float,
    cost_config: dict,
) -> dict[str, Any]:
    """
    计算单个学员的 ROI 相关指标。
    返回包含所有字段的 dict。
    """
    card_unit = float(cost_config.get("card_unit_cost_usd", 1.31))
    binding_per_b = int(cost_config.get("binding_cards_per_user_b", 1))
    attendance_per_b = int(cost_config.get("attendance_cards_per_user_b", 2))
    payment_per_b = int(cost_config.get("payment_cards_per_user_b", 3))
    hv_lesson_threshold = float(
        cost_config.get("blacklist_thresholds", {}).get(
            "high_value_lesson_threshold", 10
        )
    )

    # D4 字段读取
    days_checkin = _safe_int(d4_row.get("本月打卡天数"))
    days_transcode = _safe_int(d4_row.get("本月转码次数"))
    referral_reg = _safe_int(
        d4_row.get("当月推荐注册人数") or d4_row.get("总推荐注册人数")
    )
    referral_att = _safe_int(
        d4_row.get("当月推荐出席人数") or d4_row.get("本月推荐出席数")
    )
    referral_pay = _safe_int(
        d4_row.get("本月推荐付费数") or d4_row.get("推荐付费")
    )
    lesson_raw = _safe(d4_row.get("本月课耗") or d4_row.get("课耗"))
    lesson_this_month = float(lesson_raw or 0.0)

    # 次卡计算
    activity_cards = _calc_activity_cards(days_checkin, days_transcode, cost_config)
    binding_cards = referral_reg * binding_per_b
    attendance_cards = referral_att * attendance_per_b
    payment_cards = referral_pay * payment_per_b

    total_cards = activity_cards + binding_cards + attendance_cards + payment_cards
    total_cost_usd = round(total_cards * card_unit, 2)

    # 收入（来自 D3 revenue index）
    revenue_usd = round(float(d3_revenue), 2) if d3_revenue else 0.0

    # ROI
    roi: float | None = None
    if total_cost_usd > 0:
        roi = round((revenue_usd - total_cost_usd) / total_cost_usd * 100, 1)

    # 围场 M 标签
    enc_raw = _safe_str(d4_row.get("生命周期") or d4_row.get("围场"))
    enc_m = _M_MAP.get(enc_raw, enc_raw)

    # 负责人信息
    cc_name = _safe_str(d4_row.get("末次（当前）分配CC员工姓名"))
    team = _safe_str(d4_row.get("末次（当前）分配CC员工组名称"))
    student_id = _safe_str(d4_row.get("学员id") or d4_row.get("stdt_id"))

    # 四级风险分层
    risk_level = _classify_risk(
        total_cost_usd=total_cost_usd,
        revenue_usd=revenue_usd,
        lesson_this_month=lesson_this_month,
        enc_m=enc_m,
        hv_lesson_threshold=hv_lesson_threshold,
    )

    # 累计 ROI（2 月滚动窗口，消除时间差偏差）
    days_last = _safe_int(d4_row.get("上月打卡天数"))
    last_pay = _safe_int(d4_row.get("上月推荐付费数"))
    last_activity_cards = _calc_activity_cards(days_last, days_last, cost_config)
    last_cost = (last_activity_cards + last_pay * payment_per_b) * card_unit
    cumulative_cost = total_cost_usd + last_cost
    # 上月收入无精确数据，保守使用当月收入
    cumulative_roi: float | None = None
    if cumulative_cost > 0:
        cumulative_roi = round(
            (revenue_usd - cumulative_cost) / cumulative_cost * 100, 1
        )

    return {
        "student_id": student_id,
        "enclosure": enc_m,
        "cc_name": cc_name,
        "team": team,
        "activity_cards": activity_cards,
        "binding_cards": binding_cards,
        "attendance_cards": attendance_cards,
        "payment_cards": payment_cards,
        "total_cards": total_cards,
        "total_cost_usd": total_cost_usd,
        "revenue_usd": revenue_usd,
        "roi": roi,
        "cumulative_roi": cumulative_roi,
        "risk_level": risk_level,
        "days_this_month": max(days_checkin, days_transcode),
        "referral_registrations": referral_reg,
        "referral_payments": referral_pay,
        "lesson_this_month": lesson_this_month,
    }


def _classify_risk(
    total_cost_usd: float,
    revenue_usd: float,
    lesson_this_month: float,
    enc_m: str,
    hv_lesson_threshold: float,
) -> str:
    """
    四级风险分层：
    - high_value: ROI ≥ 200%（收入 ≥ 成本 × 3）
    - normal: ROI 0-200%（收入 ≥ 成本）
    - focus: 有推荐但入不敷出（0 < 收入 < 成本）
    - newcomer: 新人观望（M0/M1 围场，零推荐零付费）
    - high_value_freeloader: 高课耗白嫖（不限制）
    - pure_freeloader: 低价值白嫖（需关注）
    - no_cost: 无成本（无活动参与）
    """
    if total_cost_usd <= 0:
        return "no_cost"

    if revenue_usd >= total_cost_usd * 3:
        return "high_value"

    if revenue_usd >= total_cost_usd:
        return "normal"

    if revenue_usd > 0 and revenue_usd < total_cost_usd:
        return "focus"

    # revenue_usd == 0 且 cost > 0 → 白嫖子分层
    if enc_m in ("M0", "M1"):
        return "newcomer"

    if lesson_this_month >= hv_lesson_threshold:
        return "high_value_freeloader"

    return "pure_freeloader"


# ── 渠道 ROI 聚合 ─────────────────────────────────────────────────────────────


def _aggregate_channel_roi(
    students: list[dict[str, Any]],
    cost_config: dict,
) -> dict[str, dict[str, Any]]:
    """
    渠道 ROI 矩阵：CC / SS / LP / 宽口 四维度。
    使用 D4 中各渠道带新字段（col.52-59）聚合。
    """
    channels = ["CC", "SS", "LP", "宽口"]
    result: dict[str, dict[str, Any]] = {}

    # 从 students 列表汇总近似渠道分配
    # 注：D4 实际有 CC/SS/LP/宽口 带新人数和付费数字段，但学生级数据已聚合到 student ROI
    # 渠道矩阵从整体学生数据中按 cc_name / team 归因（近似）
    card_unit = float(cost_config.get("card_unit_cost_usd", 1.31))
    binding_per_b = int(cost_config.get("binding_cards_per_user_b", 1))
    payment_per_b = int(cost_config.get("payment_cards_per_user_b", 3))
    avg_unit = float(cost_config.get("avg_unit_price_usd", 150.0))

    for ch in channels:
        result[ch] = {
            "new_count": 0,
            "new_paid": 0,
            "cost_cards": 0,
            "cost_usd": 0.0,
            "revenue_approx_usd": 0.0,
            "roi": None,
        }

    for s in students:
        reg = int(s.get("referral_registrations") or 0)
        pay = int(s.get("referral_payments") or 0)
        enc_m = s.get("enclosure", "")

        # 按围场段简单归因到渠道（与 CLAUDE.md 围场-角色边界对齐）
        if enc_m in ("M0", "M1", "M2"):
            ch = "CC"
        elif enc_m == "M3":
            ch = "SS"
        elif enc_m in ("M4", "M5"):
            ch = "LP"
        else:
            ch = "宽口"

        result[ch]["new_count"] += reg
        result[ch]["new_paid"] += pay
        result[ch]["cost_cards"] += reg * binding_per_b + pay * payment_per_b
        result[ch]["cost_usd"] += round(
            (reg * binding_per_b + pay * payment_per_b) * card_unit, 2
        )
        result[ch]["revenue_approx_usd"] += pay * avg_unit

    # 计算各渠道 ROI
    for ch in channels:
        cost = result[ch]["cost_usd"]
        rev = result[ch]["revenue_approx_usd"]
        result[ch]["cost_usd"] = round(cost, 2)
        result[ch]["revenue_approx_usd"] = round(rev, 2)
        if cost > 0:
            result[ch]["roi"] = round((rev - cost) / cost * 100, 1)

    return result


# ── API 端点 ──────────────────────────────────────────────────────────────────


@router.get(
    "/checkin/roi-analysis",
    summary="打卡 ROI 分析 — 学员成本×收入×风险分层",
)
def get_checkin_roi_analysis(
    role_config: str | None = Query(None, description="围场配置 JSON"),
    enclosure: str | None = Query(None, description="围场过滤（M 标签，如 M0）"),
    dm: DataManager = Depends(get_data_manager),
) -> JSONResponse:
    """
    计算每位学员的打卡活动成本、转介绍收入和 ROI，返回风险分层汇总。

    数据源：
    - D4（students）：打卡天数、转码次数、推荐数据、负责人信息
    - D3（detail）：转介绍收入（总带新付费金额 USD）
    """
    data = dm.load_all()
    df_d4: pd.DataFrame = data.get("students", pd.DataFrame())
    df_d3: pd.DataFrame = data.get("detail", pd.DataFrame())

    if df_d4.empty:
        return JSONResponse(content={
            "summary": {
                "total_students": 0,
                "total_cost_usd": 0.0,
                "total_revenue_usd": 0.0,
                "overall_roi": None,
                "risk_distribution": {},
            },
            "students": [],
            "channel_roi": {},
        })

    cost_config = _get_roi_config()

    # ── 构建 D3 收入索引（stdt_id → 总带新付费金额USD）─────────────────────────
    d3_revenue_index: dict[str, float] = {}
    if not df_d3.empty:
        d3_id_col = "stdt_id" if "stdt_id" in df_d3.columns else None
        d3_rev_col = None
        for c in ("总带新付费金额USD", "总带新付费金额usd", "带新付费金额"):
            if c in df_d3.columns:
                d3_rev_col = c
                break

        if d3_id_col and d3_rev_col:
            for _, row in df_d3.iterrows():
                sid = _safe_str(row.get(d3_id_col, ""))
                rev = _safe(row.get(d3_rev_col))
                if sid and rev is not None:
                    d3_revenue_index[sid] = d3_revenue_index.get(sid, 0.0) + float(rev)

    # ── D4 处理 ───────────────────────────────────────────────────────────────
    d4_id_col = _find_d4_id_col(df_d4)
    if not d4_id_col:
        return JSONResponse(content={
            "summary": {
                "total_students": 0,
                "total_cost_usd": 0.0,
                "total_revenue_usd": 0.0,
                "overall_roi": None,
                "risk_distribution": {},
            },
            "students": [],
            "channel_roi": {},
        })

    # 围场过滤
    if enclosure:
        # enclosure 是 M 标签（M0/M1...），需要将 D4 的生命周期列映射后过滤
        lifecycle_col = "生命周期" if "生命周期" in df_d4.columns else None
        if lifecycle_col:
            df_d4 = df_d4[
                df_d4[lifecycle_col].apply(
                    lambda x: _M_MAP.get(_safe_str(x), _safe_str(x)) == enclosure
                )
            ]

    # ── 逐行计算 ROI ──────────────────────────────────────────────────────────
    students_result: list[dict[str, Any]] = []

    for _, row in df_d4.iterrows():
        sid = _safe_str(row.get(d4_id_col, ""))
        revenue = d3_revenue_index.get(sid, 0.0)
        student_data = _calc_student_roi(row, revenue, cost_config)

        # 只返回有实际参与的学员（有打卡或有推荐）
        has_activity = (
            student_data["activity_cards"] > 0
            or student_data["binding_cards"] > 0
            or student_data["attendance_cards"] > 0
            or student_data["payment_cards"] > 0
            or student_data["revenue_usd"] > 0
        )
        if has_activity:
            students_result.append(student_data)

    # ── 汇总统计 ──────────────────────────────────────────────────────────────
    total_cost = round(sum(s["total_cost_usd"] for s in students_result), 2)
    total_revenue = round(sum(s["revenue_usd"] for s in students_result), 2)
    overall_roi: float | None = None
    if total_cost > 0:
        overall_roi = round((total_revenue - total_cost) / total_cost * 100, 1)

    # 风险分层统计
    risk_counts: dict[str, int] = {}
    for s in students_result:
        rl = s["risk_level"]
        risk_counts[rl] = risk_counts.get(rl, 0) + 1

    total_students = len(students_result)
    risk_distribution: dict[str, dict[str, Any]] = {}
    all_risk_levels = [
        "high_value", "normal", "focus",
        "pure_freeloader", "high_value_freeloader", "newcomer", "no_cost",
    ]
    for rl in all_risk_levels:
        cnt = risk_counts.get(rl, 0)
        risk_distribution[rl] = {
            "count": cnt,
            "pct": round(cnt / total_students, 4) if total_students > 0 else 0.0,
        }

    # 渠道 ROI 矩阵
    channel_roi = _aggregate_channel_roi(students_result, cost_config)

    # 学员列表按 ROI 降序排（None ROI 放末尾）
    students_result.sort(
        key=lambda s: (s["roi"] is None, -(s["roi"] or 0))
    )

    return JSONResponse(content={
        "summary": {
            "total_students": total_students,
            "total_cost_usd": total_cost,
            "total_revenue_usd": total_revenue,
            "overall_roi": overall_roi,
            "risk_distribution": risk_distribution,
        },
        "students": students_result,
        "channel_roi": channel_roi,
    })
