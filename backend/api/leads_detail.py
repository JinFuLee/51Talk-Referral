from __future__ import annotations
import calendar
from datetime import datetime, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query

from .dependencies import get_service
from services.analysis_service import AnalysisService

router = APIRouter()


def _calculate_time_progress(ref_date: Optional[datetime] = None) -> float:
    """加权月度时间进度（周三权重0.0，周六日权重1.4x，T-1数据）"""
    if ref_date is None:
        ref_date = datetime.now()
    data_date = ref_date - timedelta(days=1)
    year, month = data_date.year, data_date.month
    days_in_month = calendar.monthrange(year, month)[1]
    current_day = data_date.day

    WEIGHTS = {0: 1.0, 1: 1.0, 2: 0.0, 3: 1.0, 4: 1.0, 5: 1.4, 6: 1.4}
    elapsed_weight = sum(
        WEIGHTS[datetime(year, month, d).weekday()] for d in range(1, current_day + 1)
    )
    total_weight = sum(
        WEIGHTS[datetime(year, month, d).weekday()] for d in range(1, days_in_month + 1)
    )
    return round(elapsed_weight / total_weight, 4) if total_weight > 0 else 0.0


@router.get("/enclosure-channel-matrix")
def get_enclosure_channel_matrix(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """A2 围场×渠道热力矩阵 — 数据源: leads.channel_efficiency.by_enclosure (A2)"""
    raw_data = getattr(svc, "_raw_data", None) or {}
    leads = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}

    # A2 channel_efficiency 返回 by_enclosure: list[{围场, 总计, CC窄口径, LP窄口径, SS窄口径, 宽口径}]
    # 每个渠道字段包含 {带货比, 参与率, 围场转率, A学员数, 推荐注册, 推荐付费}
    channel_efficiency = leads.get("channel_efficiency", {})
    by_enclosure: list = (
        channel_efficiency.get("by_enclosure", [])
        if isinstance(channel_efficiency, dict)
        else []
    )

    enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]
    channel_keys = ["CC窄口径", "SS窄口径", "LP窄口径", "宽口径"]
    channel_labels = ["CC窄", "SS窄", "LP窄", "宽口"]

    matrix = []
    if isinstance(by_enclosure, list):
        for item in by_enclosure:
            if not isinstance(item, dict):
                continue
            # A2 Loader 使用 "围场" 字段
            enc = item.get("围场") or item.get("enclosure", "")
            if not enc or enc == "小计":
                continue
            for i, ch_key in enumerate(channel_keys):
                ch_data = item.get(ch_key, {})
                if not isinstance(ch_data, dict):
                    ch_data = {}
                # A2 字段: 推荐注册 → registrations, 推荐付费 → payments
                reg = ch_data.get("推荐注册") or ch_data.get("registrations") or 0
                paid = ch_data.get("推荐付费") or ch_data.get("payments") or 0
                matrix.append(
                    {
                        "enclosure": str(enc),
                        "channel": channel_labels[i],
                        "registrations": int(reg) if reg else 0,
                        "payments": int(paid) if paid else 0,
                        "conversion_rate": round(paid / reg, 4) if reg else 0,
                    }
                )

    return {
        "matrix": matrix,
        "enclosures": enc_order,
        "channels": channel_labels,
    }


@router.get("/time-interval")
def get_time_interval(svc: AnalysisService = Depends(get_service)) -> dict[str, Any]:
    """A3 注册→付费时间间隔分布 — 数据源: leads.leads_detail.records[].days_to_payment"""
    raw_data = getattr(svc, "_raw_data", None) or {}
    leads = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}
    # LeadsLoader.load_all() returns {leads_achievement, channel_efficiency, leads_detail, ...}
    leads_detail = leads.get("leads_detail", {}) if isinstance(leads, dict) else {}
    records = leads_detail.get("records", []) if isinstance(leads_detail, dict) else []

    # 从明细记录中计算注册→付费天数
    intervals = []
    if isinstance(records, list):
        for rec in records:
            if not isinstance(rec, dict):
                continue
            import math

            days = rec.get("days_to_payment") or rec.get("interval_days")
            if days is not None and isinstance(days, (int, float)):
                if not math.isnan(days) and not math.isinf(days):
                    intervals.append(int(days))

    # 分桶统计
    buckets = [
        {"label": "0-3天", "min": 0, "max": 3},
        {"label": "4-7天", "min": 4, "max": 7},
        {"label": "8-14天", "min": 8, "max": 14},
        {"label": "15-30天", "min": 15, "max": 30},
        {"label": "31+天", "min": 31, "max": 999999},
    ]

    total = len(intervals) or 1
    histogram = []
    for b in buckets:
        count = sum(1 for d in intervals if b["min"] <= d <= b["max"])
        histogram.append(
            {
                "bucket": b["label"],
                "count": count,
                "percentage": round(count / total * 100, 1),
            }
        )

    sorted_intervals = sorted(intervals) if intervals else [0]
    avg_days = round(sum(intervals) / total, 1) if intervals else 0
    median_idx = len(sorted_intervals) // 2
    median_days = sorted_intervals[median_idx] if sorted_intervals else 0
    p90_idx = int(len(sorted_intervals) * 0.9)
    p90_days = (
        sorted_intervals[min(p90_idx, len(sorted_intervals) - 1)]
        if sorted_intervals
        else 0
    )

    return {
        "histogram": histogram,
        "avg_days": avg_days,
        "median_days": median_days,
        "p90_days": p90_days,
        "total_records": len(intervals),
    }


# ── 口径 key 映射 ─────────────────────────────────────────────────────────────
_SCOPE_MAP = {
    "total": "total",
    "cc_narrow": "cc_narrow",
    "ss_narrow": "ss_narrow",
    "lp_narrow": "lp_narrow",
    "wide": "wide",
}

# A5 数据源（leads_overview_trend）只有 total/cc_narrow/ss_narrow/other 四个 key
# LP窄口径 和 宽口 在 A5 中合并为 "other"
_A5_SCOPE_MAP = {
    "total": "total",
    "cc_narrow": "cc_narrow",
    "ss_narrow": "ss_narrow",
    "lp_narrow": "other",
    "wide": "other",
}

_METRIC_KEYS = [
    "register",
    "appointment",
    "showup",
    "paid",
    "revenue_usd",
    "leads_to_pay_rate",
]

# channel_metric_scope 角色映射（来自 projects/referral/config.json）
# full_funnel: 看全漏斗; leads_only: 只看 register
_SCOPE_ROLE: dict[str, str] = {
    "total": "full_funnel",
    "cc_narrow": "full_funnel",
    "ss_narrow": "leads_and_process",   # SS: leads数 + 过程指标（触达率/打卡率）+ leads→CC转化率
    "lp_narrow": "leads_and_process",   # LP: 同 SS
    "wide": "leads_only",               # 宽口径仅 register（质量低，无过程追踪）
}
# 注意: leads_detail 页面的实际过滤逻辑仍只展示 register（不展示过程指标）
# 过程指标（触达率/打卡率）在 ranking 和 funnel 页面展示，此处角色值为语义声明，与 config.json 对齐

# A1 by_channel 中文 key 映射（leads_only 口径用 A1 替代 A5）
_A1_CH_CN: dict[str, str] = {
    "ss_narrow": "SS窄口径",
    "lp_narrow": "LP窄口径",
    "wide": "宽口径",
}


def _extract_scope_metrics(trend_entry: dict[str, Any], scope: str) -> dict[str, Any]:
    """从 monthly_trend 单条记录中提取指定口径的 6 个核心指标"""
    scope_data = (
        trend_entry.get(scope, {}) if isinstance(trend_entry.get(scope), dict) else {}
    )
    return {k: scope_data.get(k) for k in _METRIC_KEYS}


def _safe_div(a: Optional[float], b: Optional[float]) -> Optional[float]:
    """安全除法，除数为 0 或 None 时返回 None"""
    if a is None or b is None or b == 0:
        return None
    return round(a / b, 4)


def _safe_sub(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None:
        return None
    return round(a - b, 4)


@router.get("/leads-overview")
def get_leads_overview(
    scope: str = Query(
        "total", description="口径: total/cc_narrow/ss_narrow/lp_narrow/wide"
    ),
    period: Optional[str] = Query(None, description="月份 YYYYMM，默认最新月"),
    svc: AnalysisService = Depends(get_service),
) -> dict[str, Any]:
    """
    Leads 总揽概览 — 数据源: leads.leads_overview_trend (A5) + leads.leads_achievement (A1) + leads.channel_efficiency (A2)
    """
    raw_data = getattr(svc, "_raw_data", None) or {}
    leads = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}

    # A5 数据
    a5 = leads.get("leads_overview_trend", {}) if isinstance(leads, dict) else {}
    monthly_trend_raw: list = (
        a5.get("monthly_trend", []) if isinstance(a5, dict) else []
    )
    team_details_raw: list = a5.get("team_details", []) if isinstance(a5, dict) else []
    current_month_a5: str = a5.get("current_month", "") if isinstance(a5, dict) else ""

    # A1 数据（团队×口径漏斗）
    a1 = leads.get("leads_achievement", {}) if isinstance(leads, dict) else {}
    a1_by_team: list = a1.get("by_team", []) if isinstance(a1, dict) else []
    a1_by_channel: dict = a1.get("by_channel", {}) if isinstance(a1, dict) else {}

    # A2 数据（围场×口径效率）
    a2 = leads.get("channel_efficiency", {}) if isinstance(leads, dict) else {}
    a2_by_enclosure: list = a2.get("by_enclosure", []) if isinstance(a2, dict) else []
    a2_by_channel: dict = a2.get("by_channel", {}) if isinstance(a2, dict) else {}

    # 校验 scope
    scope_key = _SCOPE_MAP.get(scope, "total")
    a5_scope_key = _A5_SCOPE_MAP.get(scope, "total")
    scopes_available = ["total", "cc_narrow", "ss_narrow", "lp_narrow", "wide"]
    role = _SCOPE_ROLE.get(scope_key, "full_funnel")

    # ── monthly_trend（按 scope 提取核心指标）────────────────────────────────
    # leads_only 口径：lp_narrow/wide 的 A5 数据为 LP+宽口合并，不可用，返回空列表
    # leads_only 口径：ss_narrow 的 A5 有独立数据，但只保留 register 列
    # full_funnel 口径：保持原有全漏斗逻辑
    monthly_trend: list[dict[str, Any]] = []
    if role == "leads_only" and scope_key in ("lp_narrow", "wide"):
        # A5 无法拆分 LP 和宽口，返回空趋势
        pass
    else:
        for entry in monthly_trend_raw:
            if not isinstance(entry, dict):
                continue
            scope_data = (
                entry.get(a5_scope_key, {})
                if isinstance(entry.get(a5_scope_key), dict)
                else {}
            )
            if role == "leads_only":
                # ss_narrow: 只保留 register 列，其余 None
                monthly_trend.append(
                    {
                        "month": entry.get("month"),
                        "register": scope_data.get("register"),
                        "appointment": None,
                        "showup": None,
                        "paid": None,
                        "revenue_usd": None,
                        "leads_to_pay_rate": None,
                    }
                )
            else:
                monthly_trend.append(
                    {
                        "month": entry.get("month"),
                        "register": scope_data.get("register"),
                        "appointment": scope_data.get("appointment"),
                        "showup": scope_data.get("showup"),
                        "paid": scope_data.get("paid"),
                        "revenue_usd": scope_data.get("revenue_usd"),
                        "leads_to_pay_rate": scope_data.get("leads_to_pay_rate"),
                    }
                )

    # 确定目标月份（最新月）
    target_month = period or current_month_a5
    if not target_month and monthly_trend:
        target_month = monthly_trend[-1].get("month", "")
    if not target_month and monthly_trend_raw:
        target_month = monthly_trend_raw[-1].get("month", "")

    # ── 当月 achievement ─────────────────────────────────────────────────────
    # leads_only 口径：使用 A1 by_channel 纯口径数据（避免 A5 的 LP+宽口合并污染）
    # full_funnel 口径：继续使用 A5 历史趋势数据
    if role == "leads_only":
        ch_cn = _A1_CH_CN.get(scope_key, "")
        ch_data = (
            a1_by_channel.get(ch_cn, {})
            if ch_cn and isinstance(a1_by_channel, dict)
            else {}
        )
        ch_data = ch_data if isinstance(ch_data, dict) else {}
        achievement: dict[str, Any] = {
            "register": ch_data.get("注册") or 0,
            "appointment": None,
            "showup": None,
            "paid": None,
            "revenue_usd": None,
            "leads_to_pay_rate": None,
        }
    else:
        current_entry = next(
            (e for e in monthly_trend_raw if e.get("month") == target_month),
            monthly_trend_raw[-1] if monthly_trend_raw else {},
        )
        achievement = _extract_scope_metrics(current_entry, a5_scope_key)

    # ── 上月 MoM gap ──────────────────────────────────────────────────────────
    # leads_only 口径：A5 数据对 lp_narrow/wide 不可靠，MoM gap 仅计算 register；
    # full_funnel 口径：保持全漏斗 MoM 计算
    mom_gap: dict[str, Any] = {}
    if role == "full_funnel" and len(monthly_trend_raw) >= 2:
        current_entry_mom = next(
            (e for e in monthly_trend_raw if e.get("month") == target_month),
            monthly_trend_raw[-1] if monthly_trend_raw else {},
        )
        idx = next(
            (
                i
                for i, e in enumerate(monthly_trend_raw)
                if e.get("month") == target_month
            ),
            len(monthly_trend_raw) - 1,
        )
        if idx > 0:
            prev_metrics = _extract_scope_metrics(
                monthly_trend_raw[idx - 1], a5_scope_key
            )
            curr_metrics = _extract_scope_metrics(current_entry_mom, a5_scope_key)
            for k in _METRIC_KEYS:
                cur = curr_metrics.get(k)
                prev = prev_metrics.get(k)
                if cur is not None and prev and prev != 0:
                    mom_gap[k] = round((cur - prev) / abs(prev), 4)
                else:
                    mom_gap[k] = None
    elif (
        role == "leads_only"
        and scope_key == "ss_narrow"
        and len(monthly_trend_raw) >= 2
    ):
        # ss_narrow 有 A5 独立数据，只计算 register 维度的 MoM
        idx = next(
            (
                i
                for i, e in enumerate(monthly_trend_raw)
                if e.get("month") == target_month
            ),
            len(monthly_trend_raw) - 1,
        )
        if idx > 0:
            prev_reg = monthly_trend_raw[idx - 1].get(a5_scope_key, {})
            curr_reg = monthly_trend_raw[idx].get(a5_scope_key, {})
            prev_val = prev_reg.get("register") if isinstance(prev_reg, dict) else None
            curr_val = curr_reg.get("register") if isinstance(curr_reg, dict) else None
            if curr_val is not None and prev_val and prev_val != 0:
                mom_gap["register"] = round((curr_val - prev_val) / abs(prev_val), 4)
            else:
                mom_gap["register"] = None

    # ── 时间进度 ─────────────────────────────────────────────────────────────
    time_progress = _calculate_time_progress()

    # ── 月度目标（从 config 读取） ────────────────────────────────────────────
    targets: dict[str, Any] = {}
    try:
        import sys
        from pathlib import Path as _Path

        _backend_dir = str(_Path(__file__).resolve().parent.parent)
        if _backend_dir not in sys.path:
            sys.path.insert(0, _backend_dir)
        from core.config import MONTHLY_TARGETS

        now = datetime.now()
        month_key = target_month if target_month else now.strftime("%Y%m")
        cfg_month = month_key if len(month_key) == 6 else now.strftime("%Y%m")
        t = MONTHLY_TARGETS.get(cfg_month, MONTHLY_TARGETS.get("202602", {}))
        register_target = t.get("注册目标", 0)
        paid_target = t.get("付费目标", 0)
        revenue_target = t.get("金额目标", 0)
        unit_price = t.get("客单价", 0)
        conv_target = t.get("目标转化率", 0)
        appt_rate = t.get("约课率目标", 0)
        showup_rate = t.get("出席率目标", 0)

        # 按口径按比例分配注册目标（从 A1 by_channel 推导比例）
        leads_by_channel: dict[str, Any] = {}
        a1_total = a1_by_channel.get("总计", {})
        a1_cc = a1_by_channel.get("CC窄口径", {})
        a1_ss = a1_by_channel.get("SS窄口径", {})
        a1_lp = a1_by_channel.get("LP窄口径", {})
        a1_wide = a1_by_channel.get("宽口径", {})

        total_reg = a1_total.get("注册") or 0
        if total_reg > 0:

            def _alloc(ch_data: dict) -> int:
                reg = ch_data.get("注册") or 0
                return round(register_target * reg / total_reg) if total_reg else 0

            leads_by_channel = {
                "cc_narrow": _alloc(a1_cc),
                "ss_narrow": _alloc(a1_ss),
                "lp_narrow": _alloc(a1_lp),
                "wide": _alloc(a1_wide),
            }
        else:
            # 无 A1 数据时按子口径拆分配置
            sub = t.get("子口径", {})
            leads_by_channel = {
                "cc_narrow": sub.get("CC窄口径", {}).get("倒子目标", 0),
                "ss_narrow": sub.get("SS窄口径", {}).get("倒子目标", 0),
                "lp_narrow": sub.get("LP窄口径", {}).get("倒子目标", 0),
                "wide": sub.get("宽口径", {}).get("倒子目标", 0),
            }

        # 推导各漏斗目标
        appt_target = round(register_target * appt_rate) if appt_rate else 0
        showup_target = round(appt_target * showup_rate) if showup_rate else 0

        if role == "leads_only":
            # leads_only 口径：只关心 register，使用子口径目标，其余设为 None
            channel_register_target = leads_by_channel.get(scope_key, 0)
            targets = {
                "register": channel_register_target,
                "appointment": None,
                "showup": None,
                "paid": None,
                "revenue_usd": None,
                "leads_to_pay_rate": None,
            }
        else:
            targets = {
                "register": register_target,
                "appointment": appt_target,
                "showup": showup_target,
                "paid": paid_target,
                "revenue_usd": revenue_target,
                "leads_to_pay_rate": conv_target,
            }

        target_decomposition: dict[str, Any] = {
            "revenue_target": revenue_target,
            "unit_price": unit_price,
            "unit_target": paid_target,
            "conversion_target": conv_target,
            "leads_target": register_target,
            "leads_by_channel": leads_by_channel,
        }
    except Exception:
        target_decomposition = {}

    # ── progress_bm & target_gap ─────────────────────────────────────────────
    # leads_only 口径：只计算 register 维度，其余 None
    progress_bm: dict[str, Any] = {}
    target_gap: dict[str, Any] = {}
    active_metrics = ["register"] if role == "leads_only" else _METRIC_KEYS
    for k in _METRIC_KEYS:
        if k not in active_metrics:
            progress_bm[k] = None
            target_gap[k] = None
            continue
        act = achievement.get(k)
        tgt = targets.get(k)
        prog = _safe_div(act, tgt) if tgt else None
        progress_bm[k] = prog
        tp_gap = _safe_sub(prog, time_progress) if prog is not None else None
        target_gap[k] = tp_gap

    # ── gap_analysis ─────────────────────────────────────────────────────────
    act_reg = achievement.get("register") or 0
    tgt_reg = targets.get("register") or 0
    lead_gap = round(act_reg - tgt_reg * time_progress) if tgt_reg else None

    # 子口径 gap（来自 A1 当月数据）
    def _a1_reg(ch_key: str) -> float:
        ch = a1_by_channel.get(ch_key, {})
        return float(ch.get("注册") or 0) if isinstance(ch, dict) else 0.0

    def _leads_tgt(ch_en: str) -> float:
        return float(target_decomposition.get("leads_by_channel", {}).get(ch_en, 0))

    if role == "leads_only":
        # leads_only 口径：只保留 lead_gap 和当前口径的 channel gap
        # 其他漏斗相关 gap（performance_gap/bill_gap/showup_gap/appointment_gap/unit_price_gap）不适用
        _ch_cn = _A1_CH_CN.get(scope_key, "")
        ch_actual = _a1_reg(_ch_cn) if _ch_cn else 0.0
        ch_tgt = _leads_tgt(scope_key)
        ch_gap = round(ch_actual - ch_tgt * time_progress) if ch_tgt else None

        gap_analysis: dict[str, Any] = {
            "performance_gap": None,
            "unit_price_gap": None,
            "bill_gap": None,
            "showup_gap": None,
            "appointment_gap": None,
            "lead_gap": lead_gap,
            "cc_lead_gap": None,
            "ss_lead_gap": ch_gap if scope_key == "ss_narrow" else None,
            "lp_lead_gap": ch_gap if scope_key == "lp_narrow" else None,
            "wide_lead_gap": ch_gap if scope_key == "wide" else None,
        }
    else:
        act_appt = achievement.get("appointment") or 0
        act_showup = achievement.get("showup") or 0
        act_paid = achievement.get("paid") or 0
        act_rev = achievement.get("revenue_usd") or 0

        tgt_paid = targets.get("paid") or 0
        tgt_rev = targets.get("revenue_usd") or 0
        tgt_appt = targets.get("appointment") or 0
        tgt_showup = targets.get("showup") or 0
        unit_p = tgt_rev / tgt_paid if tgt_paid else 0

        # 进度差（actual - target * time_progress）
        performance_gap = (
            round(act_rev - tgt_rev * time_progress, 2) if tgt_rev else None
        )
        bill_gap = round(act_paid - tgt_paid * time_progress) if tgt_paid else None
        showup_gap = (
            round(act_showup - tgt_showup * time_progress) if tgt_showup else None
        )
        appointment_gap = (
            round(act_appt - tgt_appt * time_progress) if tgt_appt else None
        )

        cc_lead_gap = (
            round(_a1_reg("CC窄口径") - _leads_tgt("cc_narrow") * time_progress)
            if _leads_tgt("cc_narrow")
            else None
        )
        ss_lead_gap = (
            round(_a1_reg("SS窄口径") - _leads_tgt("ss_narrow") * time_progress)
            if _leads_tgt("ss_narrow")
            else None
        )
        lp_lead_gap = (
            round(_a1_reg("LP窄口径") - _leads_tgt("lp_narrow") * time_progress)
            if _leads_tgt("lp_narrow")
            else None
        )
        wide_lead_gap = (
            round(_a1_reg("宽口径") - _leads_tgt("wide") * time_progress)
            if _leads_tgt("wide")
            else None
        )

        act_unit_price = round(act_rev / act_paid, 2) if act_paid else None
        unit_price_gap = (
            round((act_unit_price or 0) - unit_p, 2)
            if unit_p and act_unit_price
            else None
        )

        gap_analysis: dict[str, Any] = {
            "performance_gap": performance_gap,
            "unit_price_gap": unit_price_gap,
            "bill_gap": bill_gap,
            "showup_gap": showup_gap,
            "appointment_gap": appointment_gap,
            "lead_gap": lead_gap,
            "cc_lead_gap": cc_lead_gap,
            "ss_lead_gap": ss_lead_gap,
            "lp_lead_gap": lp_lead_gap,
            "wide_lead_gap": wide_lead_gap,
        }

    # ── team_channel_matrix（A1×A2 交叉） ────────────────────────────────────
    # A1 by_team: list[{海外大区, 团队, 小组, 总计, CC窄口径, SS窄口径, LP窄口径, 宽口径}]
    # 每个通道字段: {注册付费率, 注册, 预约, 出席, 付费}
    # A2 by_channel: {CC窄口径: {带货比, 参与率, 围场转率, A学员数, 推荐注册, 推荐付费}, ...}
    _CH_KEYS = [
        ("CC窄口径", "cc_narrow"),
        ("SS窄口径", "ss_narrow"),
        ("LP窄口径", "lp_narrow"),
        ("宽口径", "wide"),
    ]
    team_channel_matrix: list[dict[str, Any]] = []
    seen_teams: set[str] = set()
    for rec in a1_by_team:
        if not isinstance(rec, dict):
            continue
        team_cn = rec.get("团队") or ""
        group_cn = rec.get("小组") or ""
        # 跳过汇总行
        if team_cn in ("小计", "总计", "") and group_cn in ("小计", "总计", ""):
            continue
        team_label = team_cn or group_cn
        if not team_label or team_label in seen_teams:
            continue
        seen_teams.add(team_label)

        matrix_entry: dict[str, Any] = {"team": team_label}
        for ch_cn, ch_en in _CH_KEYS:
            ch_data = rec.get(ch_cn, {}) if isinstance(rec.get(ch_cn), dict) else {}
            reg = ch_data.get("注册") or 0
            paid_ch = ch_data.get("付费") or 0
            a2_ch = (
                a2_by_channel.get(ch_cn, {})
                if isinstance(a2_by_channel.get(ch_cn), dict)
                else {}
            )
            cargo_ratio = a2_ch.get("带货比")
            matrix_entry[ch_en] = {
                "register": reg,
                "paid": paid_ch,
                "conversion": round(paid_ch / reg, 4) if reg else None,
                "cargo_ratio": cargo_ratio,
            }
        team_channel_matrix.append(matrix_entry)

    # ── enclosure_baseline（A5×A2 交叉） ─────────────────────────────────────
    # A5 历史均值（跨月平均）用作基线
    # A2 by_enclosure: list[{围场, 总计, CC窄口径, ...} 每通道含 {带货比, 参与率, 围场转率, ...}]
    _ENC_ORDER = ["0-30", "31-60", "61-90", "91-180", "181+"]
    _A2_ENC_NORMALIZE = {
        "0-30天": "0-30",
        "31-60天": "31-60",
        "61-90天": "61-90",
        "90天以上": "91-180",
        "0-30": "0-30",
        "31-60": "31-60",
        "61-90": "61-90",
        "91-180": "91-180",
        "181+": "181+",
    }

    # 计算 A5 团队明细按围场的历史均值（A5 不含围场维度，仅用 A2 基线）
    # enclosure_baseline 主要对比 A2 当前值 vs A2 历史均值（暂用全部 by_enclosure 均值作基线）
    enclosure_baseline: list[dict[str, Any]] = []
    # 用 A2 by_enclosure 数据，选 scope_key 通道
    _A2_SCOPE_MAP = {
        "total": "总计",
        "cc_narrow": "CC窄口径",
        "ss_narrow": "SS窄口径",
        "lp_narrow": "LP窄口径",
        "wide": "宽口径",
    }
    a2_scope_cn = _A2_SCOPE_MAP.get(scope_key, "总计")

    for enc_entry in a2_by_enclosure:
        if not isinstance(enc_entry, dict):
            continue
        enc_raw = enc_entry.get("围场") or enc_entry.get("enclosure", "")
        enc = _A2_ENC_NORMALIZE.get(str(enc_raw).strip(), str(enc_raw).strip())
        if enc in ("小计", "总计") or not enc:
            continue
        ch_data = (
            enc_entry.get(a2_scope_cn, {})
            if isinstance(enc_entry.get(a2_scope_cn), dict)
            else {}
        )
        cargo_ratio = ch_data.get("带货比")
        participation = ch_data.get("参与率")
        conversion = ch_data.get("围场转率")

        # 此处没有历史基线数据，留空占位（待未来接入快照数据）
        enclosure_baseline.append(
            {
                "enclosure": enc,
                "current": {
                    "cargo_ratio": cargo_ratio,
                    "participation": participation,
                    "conversion": conversion,
                },
                "baseline_avg": {
                    "cargo_ratio": None,
                    "participation": None,
                    "conversion": None,
                },
                "deviation": {
                    "cargo_ratio": None,
                    "participation": None,
                    "conversion": None,
                },
            }
        )

    metrics_available = (
        ["register"]
        if role == "leads_only"
        else [
            "register",
            "appointment",
            "showup",
            "paid",
            "revenue_usd",
            "leads_to_pay_rate",
        ]
    )
    trend_unavailable_reason = (
        "A5数据源LP与宽口合并，无法单独显示历史趋势"
        if (role == "leads_only" and scope_key in ("lp_narrow", "wide"))
        else None
    )

    return {
        "monthly_trend": monthly_trend,
        "mom_gap": mom_gap,
        "time_progress": time_progress,
        "targets": targets,
        "achievement": achievement,
        "progress_bm": progress_bm,
        "target_gap": target_gap,
        "target_decomposition": target_decomposition,
        "gap_analysis": gap_analysis,
        "team_channel_matrix": team_channel_matrix,
        "enclosure_baseline": enclosure_baseline,
        "scopes_available": scopes_available,
        "role": role,
        "metrics_available": metrics_available,
        "trend_unavailable_reason": trend_unavailable_reason,
    }
