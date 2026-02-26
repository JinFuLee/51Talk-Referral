"""
Member Profile API
GET /api/member/{cc_name}/profile — CC 个人战斗力全息档案
整合 F1/F5/F7/F8/E3 数据，返回 MemberProfileResponse 结构
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from .dependencies import get_service
from services.analysis_service import AnalysisService

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

router = APIRouter()


# ── 工具函数 ─────────────────────────────────────────────────────────────────


def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _percentile_score(value: float, team_values: list[float]) -> float:
    """
    百分位排名归一化，高值为优。
    rank = 升序排名（1-indexed），pessimistic ranking（同分取最大排名）。
    score = rank / team_size × 100
    """
    if not team_values:
        return 0.0
    sorted_vals = sorted(team_values)
    # pessimistic: 找最后一个 <= value 的位置
    rank = 0
    for v in sorted_vals:
        if v <= value:
            rank += 1
        else:
            break
    if rank == 0:
        rank = 1
    return round(rank / len(team_values) * 100, 1)


# ── 数据提取工具 ──────────────────────────────────────────────────────────────


def _get_f1_records(raw_data: dict) -> list[dict]:
    """从 raw_data 中提取 F1 漏斗数据 records"""
    ops: dict = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    funnel_eff: Any = ops.get("funnel_efficiency", {})
    if isinstance(funnel_eff, list):
        return funnel_eff
    if isinstance(funnel_eff, dict):
        return funnel_eff.get("records", [])
    return []


def _get_f5_by_cc(raw_data: dict) -> dict:
    """从 raw_data 中提取 F5 外呼数据 by_cc"""
    ops: dict = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    daily_outreach: Any = ops.get("daily_outreach", {})
    if isinstance(daily_outreach, dict):
        return daily_outreach.get("by_cc", {})
    return {}


def _get_f5_records(raw_data: dict) -> list[dict]:
    """从 raw_data 中提取 F5 外呼原始 records（按天×CC）"""
    ops: dict = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    daily_outreach: Any = ops.get("daily_outreach", {})
    if isinstance(daily_outreach, dict):
        return daily_outreach.get("records", [])
    return []


def _get_f7_by_cc(raw_data: dict) -> dict:
    """从 raw_data 中提取 F7 付费用户围场跟进 by_cc"""
    ops: dict = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    paid_followup: Any = ops.get("paid_user_followup", {})
    if isinstance(paid_followup, dict):
        return paid_followup.get("by_cc", {})
    return {}


def _get_f8_by_cc(raw_data: dict) -> list[dict]:
    """从 raw_data 中提取 F8 围场月度跟进 by_cc（list）"""
    ops: dict = raw_data.get("ops", {}) if isinstance(raw_data, dict) else {}
    enc_monthly: Any = ops.get("enclosure_monthly_followup", {})
    if isinstance(enc_monthly, dict):
        return enc_monthly.get("by_cc", [])
    return []


def _get_order_records(raw_data: dict) -> list[dict]:
    """从 raw_data 中提取 E3 订单明细 records"""
    order: dict = raw_data.get("order", {}) if isinstance(raw_data, dict) else {}
    order_detail: Any = order.get("order_detail", {})
    if isinstance(order_detail, dict):
        return order_detail.get("records", [])
    return []


# ── Identity & Badges 计算 ────────────────────────────────────────────────────


def _build_identity(cc_name: str, f1_records: list[dict]) -> dict:
    """提取 cc_name 对应的 team，推算 hire_days"""
    team = "THCC"
    hire_days = 999  # 无法推算时默认为老员工

    cc_rows = [r for r in f1_records if r.get("cc_name") == cc_name]
    if cc_rows:
        team = cc_rows[0].get("team") or "THCC"

    return {
        "name": cc_name,
        "team": str(team) if team else "THCC",
        "hire_days": hire_days,
    }


def _compute_badges(
    cc_name: str,
    f1_records: list[dict],
    f5_records: list[dict],
) -> tuple[list[str], list[dict]]:
    """
    计算三个徽章的触发状态。
    返回 (triggered_badge_ids, badge_details_list)
    """
    # ── 徽章 1：转化尖兵（attend_paid_rate 排名前 15%）──────────────────────
    cc_attend_paid: dict[str, float] = {}
    team_of_cc: Optional[str] = None
    for r in f1_records:
        name = r.get("cc_name")
        if not name or name in ("nan", "小计", "总计"):
            continue
        val = _safe_float(r.get("attend_paid_rate"))
        cc_attend_paid[name] = val
        if name == cc_name:
            team_of_cc = r.get("team")

    # 只比较同组成员
    same_team_ccs = {
        name: val
        for name, val in cc_attend_paid.items()
        if any(
            r.get("cc_name") == name and r.get("team") == team_of_cc
            for r in f1_records
        )
    }
    if not same_team_ccs:
        same_team_ccs = cc_attend_paid

    team_size = len(same_team_ccs)
    threshold_rank = math.ceil(team_size * 0.15) if team_size > 0 else 1

    # 降序排名（前 N% = 最高值排前面）
    sorted_ccs = sorted(same_team_ccs.items(), key=lambda x: x[1], reverse=True)
    cc_rank = next(
        (i + 1 for i, (name, _) in enumerate(sorted_ccs) if name == cc_name),
        team_size + 1,
    )
    personal_attend_paid = same_team_ccs.get(cc_name, 0.0)
    conversion_triggered = team_size > 0 and cc_rank <= threshold_rank

    # ── 徽章 2：外呼劳模（连续 4 周日均拨打 ≥ 28）────────────────────────────
    # 从 f5_records 提取该 CC 的每日拨打数（按周聚合）
    from collections import defaultdict
    import datetime as dt_module

    cc_daily_calls: dict[str, int] = {}
    for rec in f5_records:
        if rec.get("cc_name") != cc_name:
            continue
        date_val = rec.get("date")
        calls = int(_safe_float(rec.get("total_calls")))
        if date_val:
            cc_daily_calls[str(date_val)] = calls

    # 按自然周聚合（ISO 周）
    week_calls: dict[str, list[int]] = defaultdict(list)
    for date_str, calls in cc_daily_calls.items():
        try:
            d = dt_module.date.fromisoformat(date_str[:10])
            week_key = d.strftime("%Y-W%W")
            week_calls[week_key].append(calls)
        except ValueError:
            continue

    # 计算各周日均，检查最近连续 4 个完整周
    sorted_weeks = sorted(week_calls.keys(), reverse=True)
    consecutive_good_weeks = 0
    for wk in sorted_weeks[:8]:  # 检查最近 8 周
        calls_in_week = week_calls[wk]
        if not calls_in_week:
            break
        week_avg = sum(calls_in_week) / len(calls_in_week)
        if week_avg >= 28:
            consecutive_good_weeks += 1
        else:
            break

    diligence_triggered = consecutive_good_weeks >= 4
    week_avg_value = (
        sum(week_calls[sorted_weeks[0]]) / len(week_calls[sorted_weeks[0]])
        if sorted_weeks and week_calls[sorted_weeks[0]]
        else 0.0
    )

    # ── 徽章 3：转介绍杀手（bring_new_coeff > 团队中位数 × 1.2）──────────────
    # 当前数据源中暂无 bring_new_coeff 字段，降级：始终为未触发
    referral_triggered = False
    referral_value = 0.0
    referral_threshold_str = "带新系数 > 团队中位数 × 1.2（需 D1/D5 数据源）"

    badges_triggered = []
    if referral_triggered:
        badges_triggered.append("referral_killer")
    if diligence_triggered:
        badges_triggered.append("call_diligence")
    if conversion_triggered:
        badges_triggered.append("conversion_elite")

    badge_details = [
        {
            "id": "referral_killer",
            "label": "转介绍杀手",
            "triggered": referral_triggered,
            "trigger_value": referral_value,
            "threshold": referral_threshold_str,
        },
        {
            "id": "call_diligence",
            "label": "外呼劳模",
            "triggered": diligence_triggered,
            "trigger_value": round(week_avg_value, 1),
            "threshold": "连续 4 周日均拨打 ≥ 28 次",
        },
        {
            "id": "conversion_elite",
            "label": "转化尖兵",
            "triggered": conversion_triggered,
            "trigger_value": round(personal_attend_paid * 100, 1),
            "threshold": f"出席付费率排名前 15%（≤ 第 {threshold_rank}/{team_size} 名）",
        },
    ]

    return badges_triggered, badge_details


# ── Radar 6 维百分位 ──────────────────────────────────────────────────────────


def _build_radar(
    cc_name: str,
    f1_records: list[dict],
    f7_by_cc: dict,
    f8_by_cc: list[dict],
    order_records: list[dict],
) -> dict:
    """
    计算六边形雷达 6 维百分位分数。
    维度顺序（顺时针从顶部）：
      触达穿透 | 邀约手腕 | 出勤保障 | 临门一脚 | 服务覆盖 | 价值单产
    """
    DIMENSIONS = ["触达穿透", "邀约手腕", "出勤保障", "临门一脚", "服务覆盖", "价值单产"]
    BENCHMARK = [50.0] * 6

    # 过滤有效 CC（排除汇总行）
    valid_skip = {"nan", "NaN", "小计", "总计", None}
    cc_f1: dict[str, dict] = {}
    for r in f1_records:
        name = r.get("cc_name")
        if name and name not in valid_skip:
            cc_f1[name] = r

    if cc_name not in cc_f1:
        return {
            "personal": [0.0] * 6,
            "benchmark": BENCHMARK,
            "dimensions": DIMENSIONS,
        }

    # 维度 1-4：从 F1 提取
    def _dim_values(field: str) -> dict[str, float]:
        return {name: _safe_float(row.get(field)) for name, row in cc_f1.items()}

    dim1_vals = _dim_values("total_connect_rate")
    dim2_vals = _dim_values("appt_rate")
    dim3_vals = _dim_values("appt_attend_rate")
    dim4_vals = _dim_values("attend_paid_rate")

    # 维度 5：服务覆盖 = F7 monthly_effective / total_students（围场跟进覆盖率）
    # F7 by_cc 结构：{cc_name: {total_students, monthly_effective, ...}}
    dim5_vals: dict[str, float] = {}
    for name in cc_f1:
        f7_data = f7_by_cc.get(name, {})
        students = _safe_float(f7_data.get("total_students"), 1.0)
        effective = _safe_float(f7_data.get("monthly_effective"))
        dim5_vals[name] = effective / students if students > 0 else 0.0

    # F8 补充（如果 F7 无数据，从 F8 by_cc 列表找）
    f8_dict: dict[str, dict] = {}
    for row in f8_by_cc:
        name = row.get("cc_name")
        if name:
            f8_dict[name] = row

    for name in cc_f1:
        if dim5_vals.get(name, 0.0) == 0.0 and name in f8_dict:
            f8_row = f8_dict[name]
            cov = _safe_float(f8_row.get("effective_coverage"))
            dim5_vals[name] = cov

    # 维度 6：价值单产 = CC 转介绍新单 ASP（USD）
    # 过滤条件：channel=="转介绍" AND seller==cc_name AND order_tag=="新单"
    cc_revenue: dict[str, float] = {}
    cc_order_count: dict[str, int] = {}
    for rec in order_records:
        channel = (rec.get("channel") or "").strip()
        seller = (rec.get("seller") or "").strip()
        order_tag = (rec.get("order_tag") or "").strip()
        team = (rec.get("team") or "").upper()
        if channel == "转介绍" and "CC" in team and order_tag == "新单":
            if seller not in cc_revenue:
                cc_revenue[seller] = 0.0
                cc_order_count[seller] = 0
            cc_revenue[seller] += _safe_float(rec.get("amount_usd"))
            cc_order_count[seller] += 1

    dim6_vals: dict[str, float] = {}
    for name in cc_f1:
        rev = cc_revenue.get(name, 0.0)
        cnt = cc_order_count.get(name, 0)
        dim6_vals[name] = rev / cnt if cnt > 0 else 0.0

    all_dims = [dim1_vals, dim2_vals, dim3_vals, dim4_vals, dim5_vals, dim6_vals]
    personal_scores: list[float] = []
    for dim_vals in all_dims:
        team_values = list(dim_vals.values())
        cc_val = dim_vals.get(cc_name, 0.0)
        if team_values:
            score = _percentile_score(cc_val, team_values)
        else:
            score = 0.0
        personal_scores.append(score)

    return {
        "personal": personal_scores,
        "benchmark": BENCHMARK,
        "dimensions": DIMENSIONS,
    }


# ── Anomaly 30 天外呼监测 ─────────────────────────────────────────────────────


def _build_anomaly(cc_name: str, f5_records: list[dict]) -> dict:
    """
    从 F5 records 提取该 CC 近 30 天每日拨打数，生成异常旗帜。
    """
    import datetime as dt_module

    # 提取该 CC 每日数据
    cc_daily: dict[str, int] = {}
    for rec in f5_records:
        if rec.get("cc_name") != cc_name:
            continue
        date_val = rec.get("date")
        calls = int(_safe_float(rec.get("total_calls")))
        if date_val:
            cc_daily[str(date_val)[:10]] = calls

    if not cc_daily:
        return {
            "daily_calls": [],
            "red_flags": [],
            "yellow_flags": [],
        }

    # 取最近 30 个自然日（从最晚日期往前）
    sorted_dates = sorted(cc_daily.keys(), reverse=True)[:30]
    sorted_dates = sorted(sorted_dates)

    daily_calls: list[dict] = []
    for date_str in sorted_dates:
        count = cc_daily[date_str]
        try:
            d = dt_module.date.fromisoformat(date_str)
            # 周三（weekday==2）为休息日
            is_rest = d.weekday() == 2
        except ValueError:
            is_rest = False

        if is_rest:
            flag = "rest"
        elif count < 18:
            flag = "red"
        elif count < 25:
            flag = "yellow"
        else:
            flag = "normal"

        daily_calls.append({"date": date_str, "count": count, "flag": flag})

    # 生成红旗文本
    red_flags: list[str] = []
    yellow_flags: list[str] = []

    # 检测连续红旗
    consecutive_red = 0
    red_start: Optional[str] = None
    red_end: Optional[str] = None

    for item in daily_calls:
        if item["flag"] == "rest":
            if consecutive_red >= 3 and red_start and red_end:
                red_flags.append(
                    f"连续 {consecutive_red} 天外呼低于 18 次（{red_start}～{red_end}）"
                )
            consecutive_red = 0
            red_start = None
            red_end = None
            continue

        if item["flag"] == "red":
            if consecutive_red == 0:
                red_start = item["date"]
            red_end = item["date"]
            consecutive_red += 1
            # 单日严重低于
            if item["count"] < 10:
                red_flags.append(
                    f"{item['date']} 仅拨打 {item['count']} 次，需确认是否出勤"
                )
        else:
            if consecutive_red >= 3 and red_start and red_end:
                red_flags.append(
                    f"连续 {consecutive_red} 天外呼低于 18 次（{red_start}～{red_end}）"
                )
            consecutive_red = 0
            red_start = None
            red_end = None

        if item["flag"] == "yellow":
            yellow_flags.append(f"{item['date']} 外呼 {item['count']} 次（黄旗）")

    # 最后一段连续红旗未关闭
    if consecutive_red >= 3 and red_start and red_end:
        red_flags.append(
            f"连续 {consecutive_red} 天外呼低于 18 次（{red_start}～{red_end}）"
        )

    # 去重 + 限制数量
    red_flags = list(dict.fromkeys(red_flags))[:10]
    yellow_flags = list(dict.fromkeys(yellow_flags))[:10]

    return {
        "daily_calls": daily_calls,
        "red_flags": red_flags,
        "yellow_flags": yellow_flags,
    }


# ── Revenue 收入面板 ──────────────────────────────────────────────────────────


def _build_revenue(cc_name: str, order_records: list[dict]) -> dict:
    """
    计算该 CC 当月转介绍新单收入、排名、套餐分布。
    过滤：channel=="转介绍" AND team 含 "CC" AND order_tag=="新单"
    """
    # 先聚合所有 CC 收入（用于排名）
    cc_revenue_map: dict[str, float] = {}
    cc_orders_map: dict[str, list[dict]] = {}

    for rec in order_records:
        channel = (rec.get("channel") or "").strip()
        seller = (rec.get("seller") or "").strip()
        order_tag = (rec.get("order_tag") or "").strip()
        team = (rec.get("team") or "").upper()

        if channel == "转介绍" and "CC" in team and order_tag == "新单" and seller:
            if seller not in cc_revenue_map:
                cc_revenue_map[seller] = 0.0
                cc_orders_map[seller] = []
            cc_revenue_map[seller] += _safe_float(rec.get("amount_usd"))
            cc_orders_map[seller].append(rec)

    # 该 CC 的数据
    my_orders = cc_orders_map.get(cc_name, [])
    mtd_usd = cc_revenue_map.get(cc_name, 0.0)
    mtd_thb = round(mtd_usd * 34, 2)  # 默认汇率 1 USD = 34 THB

    # ASP
    order_count = len(my_orders)
    asp_usd = round(mtd_usd / order_count, 2) if order_count > 0 else 0.0

    # 团队排名（按 revenue 降序）
    sorted_ccs = sorted(cc_revenue_map.items(), key=lambda x: x[1], reverse=True)
    team_size = len(sorted_ccs)
    rank_in_team = next(
        (i + 1 for i, (name, _) in enumerate(sorted_ccs) if name == cc_name),
        team_size + 1,
    )

    # 套餐分布
    product_count: dict[str, int] = {}
    for rec in my_orders:
        pkg = (rec.get("product") or rec.get("product_name") or "未知").strip()
        product_count[pkg] = product_count.get(pkg, 0) + 1

    # 超过 5 种套餐合并为"其他"
    sorted_pkgs = sorted(product_count.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_pkgs) > 5:
        top5 = sorted_pkgs[:5]
        other_count = sum(cnt for _, cnt in sorted_pkgs[5:])
        package_items = list(top5) + [("其他", other_count)]
    else:
        package_items = sorted_pkgs

    package_mix = [
        {
            "type": pkg,
            "count": cnt,
            "pct": round(cnt / order_count, 4) if order_count > 0 else 0.0,
        }
        for pkg, cnt in package_items
    ]

    return {
        "mtd_usd": round(mtd_usd, 2),
        "mtd_thb": mtd_thb,
        "rank_in_team": rank_in_team,
        "team_size": team_size,
        "package_mix": package_mix,
        "asp_usd": asp_usd,
    }


# ── 主端点 ────────────────────────────────────────────────────────────────────


@router.get("/{cc_name}/profile")
def get_member_profile(
    cc_name: str,
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    GET /api/member/{cc_name}/profile
    返回 MemberProfileResponse 结构（identity / radar / anomaly / revenue）

    数据来源：
    - F1 funnel_efficiency.records — 漏斗效率 + 徽章转化尖兵
    - F5 daily_outreach.records — 每日外呼明细（徽章外呼劳模 + 异常监测）
    - F7 paid_user_followup.by_cc — 围场跟进覆盖（雷达维度5）
    - F8 enclosure_monthly_followup.by_cc — 围场月度覆盖补充
    - E3 order_detail.records — 订单明细（雷达维度6 + 收入面板）
    """
    raw_data: Any = getattr(svc, "_raw_data", None) or {}
    if not raw_data:
        result = svc.get_cached_result()
        if result:
            raw_data = result.get("ops_raw") or {}

    # 提取各数据源
    f1_records = _get_f1_records(raw_data)
    f5_records = _get_f5_records(raw_data)
    f7_by_cc = _get_f7_by_cc(raw_data)
    f8_by_cc = _get_f8_by_cc(raw_data)
    order_records = _get_order_records(raw_data)

    # 校验 CC 是否存在（F1 中查找）
    valid_skip = {"nan", "NaN", "小计", "总计", None}
    known_ccs = {r.get("cc_name") for r in f1_records if r.get("cc_name") not in valid_skip}

    if not known_ccs:
        # 数据未加载，返回空结构而非 404
        return _empty_profile(cc_name)

    # 先精确匹配，失败时做容错：去掉常见 team 前缀（thcc-/thcc_）再 case-insensitive 比对
    resolved_cc_name = cc_name
    if cc_name not in known_ccs:
        # 尝试去掉 team 前缀（如 "thcc-Wave" → "Wave"）
        stripped = cc_name
        for prefix in ("thcc-", "thcc_", "THCC-", "THCC_"):
            if cc_name.lower().startswith(prefix.lower()):
                stripped = cc_name[len(prefix):]
                break

        # case-insensitive 匹配
        lower_map = {n.lower(): n for n in known_ccs if n}
        match = lower_map.get(stripped.lower()) or lower_map.get(cc_name.lower())
        if match:
            resolved_cc_name = match
        else:
            raise HTTPException(status_code=404, detail=f"CC '{cc_name}' 不存在于 F1 数据中")

    # 组装各模块（统一使用 resolved_cc_name — 已对齐 F1 原始数据中的格式）
    identity_base = _build_identity(resolved_cc_name, f1_records)
    badges_triggered, badge_details = _compute_badges(resolved_cc_name, f1_records, f5_records)
    identity = {**identity_base, "badges": badges_triggered, "badge_details": badge_details}

    radar = _build_radar(resolved_cc_name, f1_records, f7_by_cc, f8_by_cc, order_records)
    anomaly = _build_anomaly(resolved_cc_name, f5_records)
    revenue = _build_revenue(resolved_cc_name, order_records)

    return {
        "identity": identity,
        "radar": radar,
        "anomaly": anomaly,
        "revenue": revenue,
    }


def _empty_profile(cc_name: str) -> dict[str, Any]:
    """数据源未加载时的空结构（不抛 404，而是返回空态）"""
    return {
        "identity": {
            "name": cc_name,
            "team": "",
            "hire_days": 0,
            "badges": [],
            "badge_details": [],
        },
        "radar": {
            "personal": [0.0] * 6,
            "benchmark": [50.0] * 6,
            "dimensions": ["触达穿透", "邀约手腕", "出勤保障", "临门一脚", "服务覆盖", "价值单产"],
        },
        "anomaly": {
            "daily_calls": [],
            "red_flags": [],
            "yellow_flags": [],
        },
        "revenue": {
            "mtd_usd": 0.0,
            "mtd_thb": 0.0,
            "rank_in_team": 0,
            "team_size": 0,
            "package_mix": [],
            "asp_usd": 0.0,
        },
    }
