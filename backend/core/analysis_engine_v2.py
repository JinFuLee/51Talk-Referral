"""
51Talk 转介绍运营分析引擎 V2
跨源联动分析：基于 MultiSourceLoader 输出的 35 源统一数据字典
"""
from __future__ import annotations

import calendar
import json
import logging
import math
import statistics
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ── 工具函数 ──────────────────────────────────────────────────────────────────

def _safe_div(numerator, denominator) -> Optional[float]:
    """安全除法：分母为 0 或 None 返回 None"""
    if denominator is None or denominator == 0:
        return None
    if numerator is None:
        return None
    return numerator / denominator


def _safe_pct(numerator, denominator) -> Optional[float]:
    """安全百分比 (0~1 小数)"""
    result = _safe_div(numerator, denominator)
    return round(result, 4) if result is not None else None


def _norm_cc(name: str) -> str:
    """标准化 CC 姓名：lowercase + strip，用于跨表匹配"""
    if not name:
        return ""
    return str(name).lower().strip()


def _is_json_serializable(v) -> bool:
    try:
        json.dumps(v)
        return True
    except (TypeError, ValueError):
        return False


def _clean_for_json(obj):
    """递归清洗，确保 JSON 可序列化"""
    if obj is None:
        return None
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (int, str, bool)):
        return obj
    if isinstance(obj, dict):
        return {str(k): _clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean_for_json(i) for i in obj]
    # numpy / pandas 类型退出
    try:
        return float(obj)
    except (TypeError, ValueError):
        pass
    return str(obj)


# ── 主引擎 ────────────────────────────────────────────────────────────────────

class AnalysisEngineV2:
    """
    跨源联动分析引擎 V2

    用法:
        data = MultiSourceLoader(input_dir).load_all()
        targets = get_targets(report_date)
        engine = AnalysisEngineV2(data, targets, report_date)
        result = engine.analyze()
    """

    GAP_GREEN = 0.0
    GAP_YELLOW = -0.05

    def __init__(self, data: dict, targets: dict, report_date: datetime, snapshot_store=None):
        self.data = data
        self.targets = targets
        self.report_date = report_date
        self.data_date = report_date - timedelta(days=1)
        self._result: Optional[dict] = None
        self._snapshot_store = snapshot_store  # Optional[SnapshotStore]，用于峰谷/YoY/WoW 查询

    # ── 主入口 ────────────────────────────────────────────────────────────────

    def analyze(self) -> dict:
        """主分析入口，返回全部分析结果（全部可 JSON 序列化）"""
        result: dict = {}

        modules = [
            ("meta",                self._build_meta),
            ("summary",             self._analyze_summary),
            ("funnel",              self._analyze_funnel),
            ("channel_comparison",  self._analyze_channel_comparison),
            ("student_journey",     self._analyze_student_journey),
            ("cc_360",              self._analyze_cc_360),
            ("cohort_roi",          self._analyze_cohort_roi),
            ("enclosure_cross",     self._analyze_enclosure_cross),
            ("checkin_impact",      self._analyze_checkin_impact),
            ("productivity",        self._analyze_productivity),
            ("order_analysis",      self._analyze_orders),
            ("outreach_analysis",   self._analyze_outreach),
            ("trial_followup",      self._analyze_trial_followup),
            ("ranking_cc",          self._analyze_cc_ranking),
            ("ranking_ss_lp",       self._analyze_ss_lp_ranking),
            ("trend",               self._analyze_trend),
            ("prediction",          self._analyze_prediction),
            ("anomalies",           self._detect_anomalies),
            # risk_alerts depends on anomalies, built last
        ]

        for key, fn in modules:
            try:
                result[key] = fn()
            except Exception as e:
                logger.error(f"[{key}] 分析失败: {e}", exc_info=True)
                result[key] = {}

        # risk_alerts 依赖 summary + anomalies
        try:
            result["risk_alerts"] = self._generate_risk_alerts(
                result.get("summary", {}),
                result.get("anomalies", []),
            )
        except Exception as e:
            logger.error(f"[risk_alerts] 生成失败: {e}", exc_info=True)
            result["risk_alerts"] = []

        # 兼容旧 API key 名称
        result["cohort_analysis"]   = result.get("enclosure_cross", {})
        result["checkin_analysis"]  = result.get("checkin_impact", {})
        result["leads_achievement"] = result.get("funnel", {})
        result["followup_analysis"] = result.get("outreach_analysis", {})
        # mom_trend / yoy_trend / wow_trend 各自指向 trend 子结构，避免指向同一对象
        _trend_full = result.get("trend", {})
        result["mom_trend"]         = _trend_full.get("mom", _trend_full)
        result["yoy_trend"]         = _trend_full.get("yoy", {})
        result["wow_trend"]         = _trend_full.get("wow", {})
        result["cc_ranking"]        = result.get("ranking_cc", [])
        result["ss_ranking"]        = result.get("ranking_ss_lp", {}).get("ss", [])
        result["lp_ranking"]        = result.get("ranking_ss_lp", {}).get("lp", [])
        result["ltv"]               = self._analyze_ltv()
        result["roi_estimate"]      = result.get("cohort_roi", {})
        result["time_progress"]     = self.targets.get("时间进度", 0.0)

        self._result = _clean_for_json(result)
        return self._result

    # ── 1. meta ───────────────────────────────────────────────────────────────

    def _build_meta(self) -> dict:
        dd = self.data_date
        return {
            "report_date": self.report_date.strftime("%Y-%m-%d"),
            "data_date": dd.strftime("%Y-%m-%d"),
            "current_month": dd.strftime("%Y%m"),
            "days_in_month": calendar.monthrange(dd.year, dd.month)[1],
            "current_day": dd.day,
            "time_progress": self.targets.get("时间进度", 0.0),
        }

    # ── 2. summary ────────────────────────────────────────────────────────────

    def _calc_workdays(self) -> tuple[int, int]:
        """
        计算当月已过工作日和剩余工作日。
        泰国排班：每周仅周三休息，周六周日正常上班。
        T-1 数据：data_date 为实际数据日期。
        返回 (elapsed_workdays, remaining_workdays)
        """
        dd = self.data_date
        year, month = dd.year, dd.month
        days_in_month = calendar.monthrange(year, month)[1]
        current_day = dd.day

        def _is_workday(d: int) -> bool:
            # 周三 (weekday() == 2) 是唯一休息日；周六周日正常上班
            return datetime(year, month, d).weekday() != 2

        elapsed = sum(1 for d in range(1, current_day + 1) if _is_workday(d))
        remaining = sum(1 for d in range(current_day + 1, days_in_month + 1) if _is_workday(d))
        return elapsed, remaining

    def _calc_efficiency_impact(
        self,
        metric_name: str,
        actual_rate: Optional[float],
        target_rate: Optional[float],
        upstream_base: float,
        asp_usd: float = 850.0,
        conversion_rate: float = 0.23,
    ) -> Optional[dict]:
        """
        计算效率 gap 对下游的量化影响。
        因果链：打卡率 → 参与学员损失 → 注册损失 → 付费损失 → $损失
        """
        if actual_rate is None or target_rate is None or upstream_base <= 0:
            return None
        if target_rate <= actual_rate:
            return None
        gap = actual_rate - target_rate  # 负数表示落后
        lost_students = abs(gap) * upstream_base
        lost_payments = lost_students * conversion_rate
        lost_revenue_usd = lost_payments * asp_usd
        return {
            "gap": round(gap, 4),
            "lost_students": round(lost_students),
            "lost_payments": round(lost_payments),
            "lost_revenue_usd": round(lost_revenue_usd, 2),
        }

    def _analyze_summary(self) -> dict:
        """概览 KPI：注册/预约/出席/付费/收入/打卡率 vs 目标"""
        from core.config import EXCHANGE_RATE_THB_USD
        time_progress = self.targets.get("时间进度", 0.0)

        # ── 工作日计算
        elapsed_workdays, remaining_workdays = self._calc_workdays()

        # ── 从 leads (A1) 取注册/预约/出席/付费
        a1 = self.data.get("leads", {}).get("leads_achievement", {})
        total = a1.get("by_channel", {}).get("总计", {}) or a1.get("total", {})

        reg_actual    = total.get("注册") or 0
        reserve_actual = total.get("预约") or 0
        attend_actual = total.get("出席") or 0
        paid_actual   = total.get("付费") or 0

        reg_target    = self.targets.get("注册目标", 0)
        paid_target   = self.targets.get("付费目标", 0)
        amount_target = self.targets.get("金额目标", 0)

        # ── 从 order (E3) 取转介绍渠道收入（CC前端+新单+转介绍，精确过滤）
        order_detail = self.data.get("order", {}).get("order_detail", {})
        referral_cc_new = order_detail.get("referral_cc_new", {})
        if referral_cc_new and referral_cc_new.get("count", 0) > 0:
            revenue_cny = referral_cc_new.get("revenue_cny", 0.0)
            revenue_usd = referral_cc_new.get("revenue_usd", 0.0)
        else:
            # fallback：精确数据不存在时用 by_channel["转介绍"]
            order_by_channel = order_detail.get("by_channel", {})
            referral_rev = order_by_channel.get("转介绍", {})
            if referral_rev:
                revenue_cny = referral_rev.get("revenue_cny", 0.0)
                revenue_usd = referral_rev.get("revenue_usd", 0.0)
            else:
                # 最终 fallback：无渠道拆分时用总计
                order_summary = order_detail.get("summary", {})
                revenue_cny = order_summary.get("total_revenue_cny", 0.0)
                revenue_usd = order_summary.get("total_revenue_usd", 0.0)

        # ── 从 kpi (D1) 取打卡率
        d1 = self.data.get("kpi", {}).get("north_star_24h", {})
        checkin_summary = d1.get("summary", {})
        checkin_rate    = checkin_summary.get("avg_checkin_24h_rate")
        checkin_target  = checkin_summary.get("target") or 0.60

        # ── THB 换算（汇率从 config 读取）
        exchange_rate = EXCHANGE_RATE_THB_USD
        revenue_thb = round(revenue_usd * exchange_rate, 2)

        def _progress_gap(actual, target):
            if not target:
                return None, None
            prog = _safe_pct(actual, target)
            gap = (prog - time_progress) if prog is not None else None
            return prog, gap

        def _kpi_daily(actual, target):
            """计算日均指标和效率提升需求"""
            daily_avg = round(actual / elapsed_workdays, 2) if elapsed_workdays > 0 else None
            gap_to_target = max(0, (target or 0) - actual)
            remaining_daily_avg = (
                round(gap_to_target / remaining_workdays, 2)
                if remaining_workdays > 0 else None
            )
            efficiency_lift_pct = None
            if daily_avg and daily_avg > 0 and remaining_daily_avg is not None:
                efficiency_lift_pct = round(remaining_daily_avg / daily_avg - 1, 4)
            # 双差额
            absolute_gap = round(actual - (target or 0), 2)  # 负=落后，正=超额
            pace_target = (target or 0) * time_progress  # 时间进度线应达到的值
            pace_gap_val = actual - pace_target  # 与进度线的差距
            pace_daily_needed = (
                round(max(0, pace_target - actual) / max(1, remaining_workdays), 2)
                if remaining_workdays > 0 else None
            )
            return daily_avg, remaining_daily_avg, efficiency_lift_pct, absolute_gap, pace_daily_needed

        reg_prog, reg_gap     = _progress_gap(reg_actual, reg_target)
        paid_prog, paid_gap   = _progress_gap(paid_actual, paid_target)
        amount_prog, amt_gap  = _progress_gap(revenue_usd, amount_target)

        reg_daily, reg_rem_daily, reg_lift, reg_abs_gap, reg_pace_daily = _kpi_daily(reg_actual, reg_target)
        paid_daily, paid_rem_daily, paid_lift, paid_abs_gap, paid_pace_daily = _kpi_daily(paid_actual, paid_target)
        rev_daily, rev_rem_daily, rev_lift, rev_abs_gap, rev_pace_daily = _kpi_daily(revenue_usd, amount_target)

        def _status(gap):
            if gap is None:
                return "gray"
            if gap >= self.GAP_GREEN:
                return "green"
            if gap >= self.GAP_YELLOW:
                return "yellow"
            return "red"

        # ── 打卡率效率影响链
        checkin_impact = self._calc_efficiency_impact(
            metric_name="checkin_24h",
            actual_rate=checkin_rate,
            target_rate=checkin_target,
            upstream_base=float(reg_actual),
        )

        # ── 巅峰/谷底（从历史快照查询，无数据时为 None）
        reg_pv  = self._get_peak_valley("注册")
        paid_pv = self._get_peak_valley("付费")
        rev_pv  = self._get_peak_valley("金额")

        return {
            "registration": {
                "actual": reg_actual,
                "target": reg_target,
                "progress": reg_prog,
                "gap": reg_gap,
                "status": _status(reg_gap),
                "daily_avg": reg_daily,
                "remaining_daily_avg": reg_rem_daily,
                "efficiency_lift_pct": reg_lift,
                "absolute_gap": reg_abs_gap,
                "pace_daily_needed": reg_pace_daily,
                "remaining_workdays": remaining_workdays,
                "peak":   reg_pv["peak"],
                "valley": reg_pv["valley"],
            },
            "appointment": {
                "actual": reserve_actual,
                "target": None,
            },
            "attendance": {
                "actual": attend_actual,
                "target": None,
            },
            "payment": {
                "actual": paid_actual,
                "target": paid_target,
                "progress": paid_prog,
                "gap": paid_gap,
                "status": _status(paid_gap),
                "daily_avg": paid_daily,
                "remaining_daily_avg": paid_rem_daily,
                "efficiency_lift_pct": paid_lift,
                "absolute_gap": paid_abs_gap,
                "pace_daily_needed": paid_pace_daily,
                "remaining_workdays": remaining_workdays,
                "peak":   paid_pv["peak"],
                "valley": paid_pv["valley"],
            },
            "revenue": {
                "cny": round(revenue_cny, 2),
                "usd": round(revenue_usd, 2),
                "thb": revenue_thb,
                "target_usd": amount_target,
                "progress": amount_prog,
                "gap": amt_gap,
                "status": _status(amt_gap),
                "daily_avg": rev_daily,
                "remaining_daily_avg": rev_rem_daily,
                "efficiency_lift_pct": rev_lift,
                "absolute_gap": rev_abs_gap,
                "pace_daily_needed": rev_pace_daily,
                "remaining_workdays": remaining_workdays,
                "peak":   rev_pv["peak"],
                "valley": rev_pv["valley"],
            },
            "checkin_24h": {
                "rate": checkin_rate,
                "target": checkin_target,
                "achievement": _safe_pct(checkin_rate, checkin_target) if checkin_rate else None,
                "impact": checkin_impact,
            },
            "time_progress": time_progress,
            "elapsed_workdays": elapsed_workdays,
            "remaining_workdays": remaining_workdays,
            "overall_status": _status(min(
                [g for g in [reg_gap, paid_gap] if g is not None],
                default=0.0
            )),
        }

    # ── 3. funnel ─────────────────────────────────────────────────────────────

    def _analyze_funnel(self) -> dict:
        """转化漏斗：各口径注册→预约→出席→付费"""
        a1 = self.data.get("leads", {}).get("leads_achievement", {})
        by_channel = a1.get("by_channel", {})

        def _chan(label):
            ch = by_channel.get(label, {}) or {}
            reg  = ch.get("注册") or 0
            resv = ch.get("预约") or 0
            att  = ch.get("出席") or 0
            paid = ch.get("付费") or 0
            return {
                "register": reg,
                "reserve": resv,
                "attend": att,
                "paid": paid,
                "rates": {
                    "reserve_rate":      _safe_pct(resv, reg),
                    "attend_rate":       _safe_pct(att, resv),
                    "paid_rate":         _safe_pct(paid, att),
                    "register_paid_rate": _safe_pct(paid, reg),
                },
            }

        return {
            "total":       _chan("总计"),
            "cc_narrow":   _chan("CC窄口径"),
            "ss_narrow":   _chan("SS窄口径"),
            "lp_narrow":   _chan("LP窄口径"),
            "wide":        _chan("宽口径"),
        }

    # ── 4. channel_comparison ─────────────────────────────────────────────────

    def _analyze_channel_comparison(self) -> dict:
        """渠道对比：各口径效能指数"""
        a1 = self.data.get("leads", {}).get("leads_achievement", {})
        by_channel = a1.get("by_channel", {})
        total = by_channel.get("总计", {}) or {}

        total_reg  = total.get("注册") or 1
        total_paid = total.get("付费") or 1
        time_prog  = self.targets.get("时间进度", 0.0)

        channels = ["CC窄口径", "SS窄口径", "LP窄口径", "宽口径"]
        comparison = {}

        for ch in channels:
            d = by_channel.get(ch, {}) or {}
            reg  = d.get("注册") or 0
            paid = d.get("付费") or 0
            reg_ratio  = _safe_pct(reg, total_reg)
            paid_ratio = _safe_pct(paid, total_paid)
            eff_index  = _safe_div(paid_ratio, reg_ratio)

            sub = self.targets.get("子口径", {}).get(ch, {})
            ch_target = sub.get("倒子目标", 0) or 0
            prog = _safe_pct(reg, ch_target) if ch_target else None
            gap  = (prog - time_prog) if prog is not None else None

            comparison[ch] = {
                "register": reg,
                "register_ratio": reg_ratio,
                "paid": paid,
                "paid_ratio": paid_ratio,
                "efficiency_index": round(eff_index, 4) if eff_index else None,
                "target": ch_target,
                "progress": prog,
                "gap": gap,
            }

        return comparison

    # ── 5. student_journey ────────────────────────────────────────────────────

    def _analyze_student_journey(self) -> dict:
        """学员全旅程跨源联动：A3 leads明细 × E3 订单 × F6 体验跟进 × F11 课前外呼"""
        a3_records = self.data.get("leads", {}).get("leads_detail", {}).get("records", []) or []
        e3_records = self.data.get("order", {}).get("order_detail", {}).get("records", []) or []
        f6_records = self.data.get("ops", {}).get("trial_followup", {}).get("records", []) or []
        f11_records = self.data.get("ops", {}).get("pre_class_outreach", {}).get("records", []) or []

        # 建立 student_id 索引
        paid_ids: set = set()
        for r in e3_records:
            sid = r.get("student_id")
            if sid:
                paid_ids.add(str(sid).strip())

        # F6: 分配后跟进 — 被外呼过的学员
        outreached_ids: set = set()
        for r in f6_records:
            sid = r.get("student_id")
            if sid and (r.get("called_24h", 0) or r.get("called_48h", 0)):
                outreached_ids.add(str(sid).strip())

        # F11: 课前外呼覆盖
        pre_outreached_ids: set = set()
        for r in f11_records:
            sid = r.get("student_id")
            if sid and r.get("pre_called", 0):
                pre_outreached_ids.add(str(sid).strip())

        total_registered = len(a3_records)
        reserved_ids: set = set()
        attended_ids: set = set()

        for r in a3_records:
            sid = str(r.get("学员ID", "")).strip()
            if r.get("当月是否预约") in ("1", "1.0", 1, True, "是"):
                reserved_ids.add(sid)
            if r.get("当月是否出席") in ("1", "1.0", 1, True, "是"):
                attended_ids.add(sid)

        all_sids = {str(r.get("学员ID", "")).strip() for r in a3_records if r.get("学员ID")}
        outreached_count = len(outreached_ids & all_sids)
        reserved_count   = len(reserved_ids)
        attended_count   = len(attended_ids)
        paid_count       = len(paid_ids & all_sids) if all_sids else len(paid_ids)

        # 转化率
        outreach_to_reserve = _safe_pct(reserved_count, outreached_count)
        reserve_to_attend   = _safe_pct(attended_count, reserved_count)
        attend_to_paid      = _safe_pct(paid_count, attended_count)

        # 外呼影响力对比
        outreached_paid = len(paid_ids & outreached_ids)
        non_outreached  = all_sids - outreached_ids
        non_outreached_paid = len(paid_ids & non_outreached)

        outreached_conv = _safe_pct(outreached_paid, outreached_count)
        non_outreached_conv = _safe_pct(non_outreached_paid, len(non_outreached)) if non_outreached else None
        lift = _safe_div(outreached_conv, non_outreached_conv) if non_outreached_conv else None

        return {
            "journey_funnel": {
                "registered":  total_registered,
                "outreached":  outreached_count,
                "reserved":    reserved_count,
                "attended":    attended_count,
                "paid":        paid_count,
            },
            "conversion_rates": {
                "outreach_to_reserve": outreach_to_reserve,
                "reserve_to_attend":   reserve_to_attend,
                "attend_to_paid":      attend_to_paid,
            },
            "drop_off_analysis": {
                "no_outreach":         total_registered - outreached_count,
                "outreach_no_reserve": max(0, outreached_count - reserved_count),
                "reserve_no_attend":   max(0, reserved_count - attended_count),
                "attend_no_paid":      max(0, attended_count - paid_count),
            },
            "outreach_impact": {
                "outreached_conversion":     outreached_conv,
                "non_outreached_conversion": non_outreached_conv,
                "lift":                      round(lift, 2) if lift else None,
            },
        }

    # ── 6. cc_360 ─────────────────────────────────────────────────────────────

    def _analyze_cc_360(self) -> dict:
        """CC 360° 画像跨源联动：D1 × F5 × A4 × E3 × F9"""
        # D1: 24H 打卡率
        d1_cc = {
            _norm_cc(r["cc_name"]): r
            for r in (self.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or [])
            if r.get("cc_name")
        }

        # F5: 每日外呼
        f5_cc = (self.data.get("ops", {}).get("daily_outreach", {}).get("by_cc", {}) or {})
        f5_cc_norm = {_norm_cc(k): v for k, v in f5_cc.items()}

        # A4: 个人 leads
        a4_records = self.data.get("leads", {}).get("leads_achievement_personal", {}).get("records", []) or []
        a4_cc: dict = {}
        for r in a4_records:
            name = _norm_cc(r.get("name", ""))
            if name:
                a4_cc[name] = r

        # E3: 订单（按 seller 聚合收入）
        e3_records = self.data.get("order", {}).get("order_detail", {}).get("records", []) or []
        e3_revenue: dict = {}
        for r in e3_records:
            seller = _norm_cc(r.get("seller", ""))
            if seller:
                e3_revenue[seller] = e3_revenue.get(seller, 0.0) + (r.get("amount_usd") or 0.0)

        # F9: 付费用户跟进
        f9_cc = (self.data.get("ops", {}).get("monthly_paid_followup", {}).get("by_cc", []) or [])
        f9_cc_norm = {_norm_cc(r.get("cc_name", "")): r for r in f9_cc if r.get("cc_name")}

        # 合并所有 CC 姓名
        all_cc_names = set(d1_cc.keys()) | set(f5_cc_norm.keys()) | set(a4_cc.keys())
        all_cc_names.discard("")

        # 获取原始姓名映射（用于展示）
        raw_name_map: dict = {}
        for r in (self.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []):
            raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")
        for name in f5_cc.keys():
            raw_name_map[_norm_cc(name)] = name
        for r in a4_records:
            raw_name_map[_norm_cc(r.get("name", ""))] = r.get("name", "")

        profiles = []
        for norm_name in all_cc_names:
            d1_row  = d1_cc.get(norm_name, {})
            f5_row  = f5_cc_norm.get(norm_name, {})
            a4_row  = a4_cc.get(norm_name, {})
            f9_row  = f9_cc_norm.get(norm_name, {})

            team = (
                d1_row.get("team")
                or f5_row.get("team")
                or a4_row.get("group")
                or None
            )

            checkin_rate = d1_row.get("checkin_24h_rate")
            checkin_target = d1_row.get("checkin_24h_target") or 0.6
            checkin_achievement = _safe_div(checkin_rate, checkin_target) if checkin_rate else None

            # 外呼达标：以总通话量判断（粗估，目标 30 次/天)
            total_calls = f5_row.get("total_calls") or 0
            total_days  = len(f5_row.get("dates", [])) or 1
            avg_calls   = _safe_div(total_calls, total_days)
            outreach_score = min(1.0, _safe_div(avg_calls, 30.0) or 0.0)

            # 转化率
            leads = a4_row.get("leads") or 0
            paid  = a4_row.get("paid") or 0
            conversion_rate = _safe_pct(paid, leads)

            # 收入
            revenue = e3_revenue.get(norm_name, 0.0)

            # 综合得分 (0~100)
            scores = []
            if checkin_achievement is not None:
                scores.append(min(1.0, checkin_achievement) * 25)
            if outreach_score is not None:
                scores.append(outreach_score * 25)
            if conversion_rate is not None:
                scores.append(min(1.0, conversion_rate / 0.3) * 25)  # 30% 为满分基准
            # 收入贡献：相对分，暂填满分组均值占比
            scores.append(25.0)  # 收入维度留待后处理归一化

            composite_score = round(sum(scores), 1)

            strengths = []
            weaknesses = []
            if checkin_achievement is not None:
                if checkin_achievement >= 0.9:
                    strengths.append("打卡达标")
                elif checkin_achievement < 0.5:
                    weaknesses.append("打卡率低")
            if outreach_score >= 0.8:
                strengths.append("外呼积极")
            elif outreach_score < 0.4:
                weaknesses.append("外呼不足")
            if conversion_rate is not None:
                if conversion_rate >= 0.25:
                    strengths.append("转化高")
                elif conversion_rate < 0.10:
                    weaknesses.append("转化低")

            profiles.append({
                "cc_name": raw_name_map.get(norm_name, norm_name),
                "team": team,
                "checkin_24h": checkin_rate,
                "checkin_target": checkin_target,
                "outreach_score": round(outreach_score, 4),
                "avg_daily_calls": round(avg_calls, 1) if avg_calls else None,
                "conversion_rate": conversion_rate,
                "leads": leads,
                "paid": paid,
                "revenue_usd": round(revenue, 2),
                "composite_score": composite_score,
                "strengths": strengths,
                "weaknesses": weaknesses,
            })

        # 按综合得分排序
        profiles.sort(key=lambda x: x["composite_score"], reverse=True)
        for i, p in enumerate(profiles):
            p["rank"] = i + 1

        # 收入归一化：最高收入=100%
        max_rev = max((p["revenue_usd"] for p in profiles), default=1.0) or 1.0
        for p in profiles:
            p["revenue_rank_pct"] = round(p["revenue_usd"] / max_rev, 4)

        # 团队均值
        teams: dict = {}
        for p in profiles:
            t = p.get("team") or "未知"
            if t not in teams:
                teams[t] = {"scores": [], "checkin": [], "conversion": []}
            teams[t]["scores"].append(p["composite_score"])
            if p["checkin_24h"] is not None:
                teams[t]["checkin"].append(p["checkin_24h"])
            if p["conversion_rate"] is not None:
                teams[t]["conversion"].append(p["conversion_rate"])

        team_averages = {}
        for t, vals in teams.items():
            team_averages[t] = {
                "avg_composite": round(statistics.mean(vals["scores"]), 1) if vals["scores"] else None,
                "avg_checkin":   round(statistics.mean(vals["checkin"]), 4) if vals["checkin"] else None,
                "avg_conversion": round(statistics.mean(vals["conversion"]), 4) if vals["conversion"] else None,
            }

        return {
            "profiles": profiles,
            "team_averages": team_averages,
            "top_performers": profiles[:5],
            "needs_attention": profiles[-5:] if len(profiles) >= 5 else profiles,
        }

    # ── 7. cohort_roi ─────────────────────────────────────────────────────────

    def _analyze_cohort_roi(self) -> dict:
        """Cohort × ROI 跨源联动：C1-C5 衰减曲线 × B1 成本模型"""
        cohort = self.data.get("cohort", {})
        roi_data = self.data.get("roi", {})

        # B1: 成本模型
        roi_summary = roi_data.get("summary", {}) or {}
        total_roi_data = roi_summary.get("_total", {})
        total_cost   = total_roi_data.get("实际成本") or 0
        total_revenue = total_roi_data.get("实际营收") or 0
        overall_roi  = total_roi_data.get("实际ROI")

        # C1: 触达率 by_month
        reach_by_month = {
            r["月份"]: r
            for r in (cohort.get("reach_rate", {}).get("by_month", []) or [])
            if r.get("月份")
        }
        # C2: 参与率 by_month
        part_by_month = {
            r["月份"]: r
            for r in (cohort.get("participation_rate", {}).get("by_month", []) or [])
            if r.get("月份")
        }
        # C5: 带货比 by_month
        ratio_by_month = {
            r["月份"]: r
            for r in (cohort.get("conversion_ratio", {}).get("by_month", []) or [])
            if r.get("月份")
        }

        avg_unit_price = self.targets.get("客单价", 850)  # USD

        all_months = sorted(set(reach_by_month) | set(part_by_month))
        by_month = []
        for month in all_months:
            reach = reach_by_month.get(month, {})
            part  = part_by_month.get(month, {})
            ratio = ratio_by_month.get(month, {})

            # 累积12月 LTV = Σ(带货比_m × 客单价)
            ltv = 0.0
            for m in range(1, 13):
                ratio_m = ratio.get(f"m{m}") or part.get(f"m{m}")
                if ratio_m is not None:
                    ltv += ratio_m * avg_unit_price

            acq_cost = (total_cost / len(all_months)) if all_months else 0
            roi_val  = _safe_div(ltv, acq_cost)

            by_month.append({
                "cohort_month":     month,
                "reach_rate_m1":    reach.get("m1"),
                "participation_m1": part.get("m1"),
                "ltv_12m":          round(ltv, 2),
                "acquisition_cost": round(acq_cost, 2),
                "roi":              round(roi_val, 4) if roi_val else None,
            })

        # 半衰期估算（触达率/参与率从 m1 降至 m1/2 的月份）
        reach_half_life  = self._calc_half_life(reach_by_month)
        part_half_life   = self._calc_half_life(part_by_month)

        # 最优月龄
        top_months = sorted(
            [r for r in by_month if r.get("roi") is not None],
            key=lambda x: x["roi"],
            reverse=True,
        )[:3]
        optimal_months = [r["cohort_month"] for r in top_months]

        return {
            "by_month":        by_month,
            "optimal_months":  optimal_months,
            "overall_roi":     round(overall_roi, 4) if overall_roi else None,
            "total_cost_usd":  round(total_cost, 2),
            "total_revenue_usd": round(total_revenue, 2),
            "decay_summary": {
                "reach_half_life":        reach_half_life,
                "participation_half_life": part_half_life,
            },
        }

    def _calc_half_life(self, by_month: dict) -> Optional[int]:
        """粗估指标半衰期：找第一个月 m1 值降至一半的月份索引"""
        if not by_month:
            return None
        months_sorted = sorted(by_month.keys())
        if not months_sorted:
            return None
        first = by_month[months_sorted[0]].get("m1")
        if not first:
            return None
        half = first / 2.0
        for m_idx in range(1, 13):
            vals = [by_month[mon].get(f"m{m_idx}") for mon in months_sorted if by_month[mon].get(f"m{m_idx}") is not None]
            if vals:
                avg = statistics.mean(vals)
                if avg <= half:
                    return m_idx
        return None

    # ── 8. enclosure_cross ────────────────────────────────────────────────────

    def _analyze_enclosure_cross(self) -> dict:
        """围场交叉分析：D2-D4 围场KPI × F8 围场跟进 × A2 围场效率"""
        # D2: 转介绍围场数据
        d_enc = self.data.get("kpi", {}).get("enclosure_referral", {})
        by_enc_d = {r["enclosure"]: r for r in (d_enc.get("by_enclosure", []) or []) if r.get("enclosure")}

        # F8: 围场跟进
        f8_data = self.data.get("ops", {}).get("enclosure_monthly_followup", {})
        by_enc_f8 = {e["enclosure"]: e for e in (f8_data.get("by_enclosure", []) or []) if e.get("enclosure")}

        # A2: 当月效率（按围场）
        a2_data = self.data.get("leads", {}).get("channel_efficiency", {})
        by_enc_a2 = {r["围场"]: r for r in (a2_data.get("by_enclosure", []) or []) if r.get("围场")}

        all_enclosures = set(by_enc_d) | set(by_enc_f8) | set(by_enc_a2)
        enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]
        all_enclosures = [e for e in enc_order if e in all_enclosures] + [e for e in all_enclosures if e not in enc_order]

        by_enclosure = []
        for enc in all_enclosures:
            d_row  = by_enc_d.get(enc, {})
            f8_row = by_enc_f8.get(enc, {})
            a2_row = by_enc_a2.get(enc, {})

            students = d_row.get("active_students") or 0
            conv_rate = d_row.get("conversion_rate")
            part_rate = d_row.get("participation_rate")

            # 跟进率来自 F8 summary
            f8_summary = f8_row.get("summary", {}) or {}
            followup_rate = f8_summary.get("call_coverage") or f8_summary.get("effective_coverage")

            # ROI 指数（相对值）：用参与率 × 带货比近似
            a2_total = a2_row.get("总计", {}) or {}
            ratio = a2_total.get("带货比")
            part  = a2_total.get("参与率")
            roi_index = round((ratio or 0) * (part or 0) * 10, 2) if ratio and part else None

            # 建议
            if roi_index is not None:
                recommendation = "加大投入" if roi_index >= 1.0 else ("维持" if roi_index >= 0.3 else "降低优先级")
            else:
                recommendation = "数据不足"

            by_enclosure.append({
                "segment":          enc,
                "students":         students,
                "conversion_rate":  conv_rate,
                "participation_rate": part_rate,
                "followup_rate":    followup_rate,
                "roi_index":        roi_index,
                "recommendation":   recommendation,
            })

        # 资源分配建议（按 roi_index 归一化）
        valid = [r for r in by_enclosure if r.get("roi_index") is not None and r["roi_index"] > 0]
        total_roi_sum = sum(r["roi_index"] for r in valid) or 1.0
        resource_allocation = {r["segment"]: round(r["roi_index"] / total_roi_sum, 3) for r in valid}

        return {
            "by_enclosure":      by_enclosure,
            "resource_allocation": {"optimal": resource_allocation},
        }

    # ── 9. checkin_impact ─────────────────────────────────────────────────────

    def _analyze_checkin_impact(self) -> dict:
        """打卡→带新因果：D1 × D5 已打卡/未打卡对比"""
        d5 = self.data.get("kpi", {}).get("checkin_rate_monthly", {})
        d5_summary = d5.get("summary", {}) or {}
        d5_by_cc = d5.get("by_cc", []) or []

        # D5 已包含 referral_participation_checked/unchecked
        checked_parts   = [r.get("referral_participation_checked") for r in d5_by_cc if r.get("referral_participation_checked") is not None]
        unchecked_parts = [r.get("referral_participation_unchecked") for r in d5_by_cc if r.get("referral_participation_unchecked") is not None]

        avg_checked   = statistics.mean(checked_parts) if checked_parts else None
        avg_unchecked = statistics.mean(unchecked_parts) if unchecked_parts else None
        part_multiplier = _safe_div(avg_checked, avg_unchecked)

        # 带新系数
        d1_by_cc = self.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []
        checked_coefs   = []
        unchecked_coefs = []
        for r in d1_by_cc:
            rate = r.get("checkin_24h_rate") or 0
            coef = r.get("referral_coefficient")
            if coef is None:
                continue
            if rate >= 0.8:
                checked_coefs.append(coef)
            elif rate < 0.3:
                unchecked_coefs.append(coef)

        avg_coef_checked   = statistics.mean(checked_coefs) if checked_coefs else None
        avg_coef_unchecked = statistics.mean(unchecked_coefs) if unchecked_coefs else None
        coef_multiplier    = _safe_div(avg_coef_checked, avg_coef_unchecked)

        summary_avg_checkin = d5_summary.get("avg_checkin_rate")

        if part_multiplier and avg_unchecked:
            conclusion = f"24H打卡使参与率提升{part_multiplier:.1f}倍"
            if coef_multiplier:
                conclusion += f"，带新系数提升{coef_multiplier:.1f}倍"
        else:
            conclusion = "数据不足，无法得出结论"

        return {
            "participation_lift": {
                "checkin":    avg_checked,
                "no_checkin": avg_unchecked,
                "multiplier": round(part_multiplier, 2) if part_multiplier else None,
            },
            "coefficient_lift": {
                "checkin":    avg_coef_checked,
                "no_checkin": avg_coef_unchecked,
                "multiplier": round(coef_multiplier, 2) if coef_multiplier else None,
            },
            "avg_checkin_rate": summary_avg_checkin,
            "conclusion": conclusion,
        }

    # ── 10. productivity ──────────────────────────────────────────────────────

    def _analyze_productivity(self) -> dict:
        """人效分析：E1/E2 上班人数 × E3 订单 × E5 业绩趋势"""
        e1 = self.data.get("order", {}).get("cc_attendance", []) or []
        e2 = self.data.get("order", {}).get("ss_attendance", []) or []
        e3_summary = self.data.get("order", {}).get("order_detail", {}).get("summary", {}) or {}
        e3_by_team = self.data.get("order", {}).get("order_detail", {}).get("by_team", {}) or {}

        # 最新一天的上班人数
        cc_active = e1[-1]["active_5min"] if e1 else None
        ss_active = e2[-1]["active_5min"] if e2 else None

        total_rev_cny = e3_summary.get("total_revenue_cny", 0.0)
        total_rev_usd = e3_summary.get("total_revenue_usd", 0.0)

        # 按角色分类（CC vs SS）
        cc_teams = [k for k in e3_by_team if "CC" in k.upper()]
        ss_teams = [k for k in e3_by_team if any(x in k.upper() for x in ["SS", "EA"])]

        cc_rev = sum(e3_by_team[t].get("revenue_usd", 0.0) for t in cc_teams)
        ss_rev = sum(e3_by_team[t].get("revenue_usd", 0.0) for t in ss_teams)

        # 日趋势
        e5 = self.data.get("order", {}).get("revenue_daily_trend", []) or []
        daily_trend = [
            {"date": r["date"], "revenue_cny": r.get("revenue_cny")}
            for r in sorted(e5, key=lambda x: x.get("date", ""))
        ]

        return {
            "cc": {
                "active_count": cc_active,
                "total_revenue_usd": round(cc_rev, 2),
                "per_capita_usd": round(_safe_div(cc_rev, cc_active) or 0, 2),
            },
            "ss": {
                "active_count": ss_active,
                "total_revenue_usd": round(ss_rev, 2),
                "per_capita_usd": round(_safe_div(ss_rev, ss_active) or 0, 2),
            },
            "total_revenue_cny": round(total_rev_cny, 2),
            "total_revenue_usd": round(total_rev_usd, 2),
            "daily_trend": daily_trend[-30:],  # 最近30天
        }

    # ── 11. order_analysis ────────────────────────────────────────────────────

    def _analyze_orders(self) -> dict:
        """订单分析：E3-E8"""
        e3 = self.data.get("order", {}).get("order_detail", {})
        e3_summary = e3.get("summary", {}) or {}
        e3_by_team = e3.get("by_team", {}) or {}
        e3_by_channel = e3.get("by_channel", {}) or {}
        e3_by_date = e3.get("by_date", []) or []

        e4 = self.data.get("order", {}).get("order_daily_trend", []) or []
        e5 = self.data.get("order", {}).get("revenue_daily_trend", []) or []
        e6 = self.data.get("order", {}).get("package_ratio", {}) or {}

        total_orders = e3_summary.get("total_orders", 0)
        new_orders   = e3_summary.get("new_orders", 0)
        renewal      = e3_summary.get("renewal_orders", 0)
        rev_cny      = e3_summary.get("total_revenue_cny", 0.0)
        rev_usd      = e3_summary.get("total_revenue_usd", 0.0)

        # 日趋势整合
        e4_by_date = {r["date"]: r for r in e4}
        e5_by_date = {r["date"]: r for r in e5}
        all_dates  = sorted(set(e4_by_date) | set(e5_by_date))
        daily_trend = [
            {
                "date":        d,
                "order_count": e4_by_date.get(d, {}).get("order_count"),
                "revenue_cny": e5_by_date.get(d, {}).get("revenue_cny"),
            }
            for d in all_dates
        ]

        return {
            "summary": {
                "total": total_orders,
                "new":   new_orders,
                "renewal": renewal,
                "revenue_cny": round(rev_cny, 2),
                "revenue_usd": round(rev_usd, 2),
            },
            "by_channel": e3_by_channel,
            "by_team":    list(e3_by_team.values()) if isinstance(e3_by_team, dict) else e3_by_team,
            "daily_trend": daily_trend,
            "package_distribution": e6,
        }

    # ── 12. outreach_analysis ─────────────────────────────────────────────────

    def _analyze_outreach(self) -> dict:
        """外呼分析：F5 每日外呼 + F6 体验跟进 + F7 付费用户跟进"""
        f5 = self.data.get("ops", {}).get("daily_outreach", {}) or {}
        f6 = self.data.get("ops", {}).get("trial_followup", {}) or {}
        f7 = self.data.get("ops", {}).get("paid_user_followup", {}) or {}

        f5_summary_cc  = f5.get("by_cc", {}) or {}
        f5_by_date     = f5.get("by_date", []) or []
        f6_summary     = f6.get("summary", {}) or {}
        f7_summary     = f7.get("summary", {}) or {}
        f7_total       = f7_summary.get("total_students", 0) or 0
        f7_called      = f7_summary.get("total_monthly_called", 0) or 0
        paid_followup_coverage = _safe_pct(f7_called, f7_total)

        # 合规率估算（目标：每 CC 每天 30 次）
        avg_calls_per_cc = None
        if f5_summary_cc:
            all_avgs = []
            for cc_data in f5_summary_cc.values():
                days = len(cc_data.get("dates", [])) or 1
                calls = cc_data.get("total_calls", 0) or 0
                all_avgs.append(calls / days)
            avg_calls_per_cc = round(statistics.mean(all_avgs), 1) if all_avgs else None

        compliance_rate = min(1.0, _safe_div(avg_calls_per_cc, 30.0) or 0.0) if avg_calls_per_cc else None

        return {
            "daily_outreach": {
                "by_date":  f5_by_date,
                "by_cc":    f5_summary_cc,
            },
            "trial_followup": {
                "call_rate_24h":    f6_summary.get("call_rate_24h"),
                "connect_rate_24h": f6_summary.get("connect_rate_24h"),
                "by_cc":            f6.get("by_cc", {}),
            },
            "paid_followup": {
                "total_students":    f7_total,
                "total_called":      f7_called,
                "coverage":          paid_followup_coverage,
                "by_cc":             f7.get("by_cc", {}),
            },
            "compliance": {
                "target_calls_per_day": 30,
                "avg_actual":          avg_calls_per_cc,
                "compliance_rate":     round(compliance_rate, 4) if compliance_rate else None,
            },
        }

    # ── 13. trial_followup ────────────────────────────────────────────────────

    def _analyze_trial_followup(self) -> dict:
        """体验课跟进：F10 课前课后 + F11 课前外呼覆盖"""
        f10 = self.data.get("ops", {}).get("trial_class_followup", {}) or {}
        f11 = self.data.get("ops", {}).get("pre_class_outreach", {}) or {}

        f10_by_cc = f10.get("by_cc", []) or []
        f11_summary = f11.get("summary", {}) or {}

        # 汇总 F10 整体（取转介绍渠道的汇总行）
        f10_by_channel = f10.get("by_channel", {}) or {}
        f10_referral = f10_by_channel.get("转介绍", {}) or {}

        pre_call_rate    = f10_referral.get("pre_call_rate") or f11_summary.get("overall_call_rate")
        pre_connect_rate = f10_referral.get("pre_connect_rate") or f11_summary.get("overall_connect_rate")

        # 课前外呼→出席率关联（F11 by_lead_type 对比）
        f11_by_lead = f11.get("by_lead_type", {}) or {}
        called_att   = f11_by_lead.get("转介绍", {}).get("attendance_rate") if f11_by_lead else None
        # 未外呼出席率无法直接取得，用 F10 overall
        not_called_att = None

        return {
            "pre_class": {
                "call_rate":    pre_call_rate,
                "connect_rate": pre_connect_rate,
            },
            "post_class": {
                "call_rate":    f10_referral.get("post_call_rate"),
                "connect_rate": f10_referral.get("post_connect_rate"),
            },
            "by_cc":  f10_by_cc,
            "correlation": {
                "pre_call_attendance":    called_att,
                "no_call_attendance":     not_called_att,
            },
            "f11_summary": f11_summary,
        }

    # ── 14. cc_ranking ────────────────────────────────────────────────────────

    def _analyze_cc_ranking(self) -> list:
        """CC 排名：三类18维加权算法
        - 过程指标 (25%): 外呼/接通/有效接通/付费前跟进/预约课前跟进/预约课后跟进/付费后跟进
        - 结果指标 (60%): 注册数/leads数/转介绍用户数/客单价/付费单量/转介绍业绩/业绩占比
        - 效率指标 (15%): 注册→付费转化率/打卡率/参与率/带新系数
        """

        # ── 数据源加载 ────────────────────────────────────────────────────────

        # D1: 24H 打卡率 (by_cc = list)
        d1_by_cc_list = (
            self.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []
        )
        d1_cc: dict = {}
        for r in d1_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                d1_cc[nm] = r

        # D5: 打卡参与率 (by_cc = list, 有 checkin_rate / referral_participation_* / conversion_ratio)
        d5_by_cc_list = (
            self.data.get("kpi", {}).get("checkin_participation", {}).get("by_cc", []) or []
        )
        d5_cc: dict = {}
        for r in d5_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                d5_cc[nm] = r

        # F5: 每日外呼 (by_cc = dict: {cc_name: {total_calls, total_connects, total_effective, dates, team}})
        f5_by_cc_raw = (
            self.data.get("ops", {}).get("daily_outreach", {}).get("by_cc", {}) or {}
        )
        f5_cc: dict = {_norm_cc(k): v for k, v in f5_by_cc_raw.items()}

        # F6: 体验课跟进 (by_cc = dict: {cc_name: {total, called_24h, connected_24h, called_48h, connected_48h}})
        f6_by_cc_raw = (
            self.data.get("ops", {}).get("trial_followup", {}).get("by_cc", {}) or {}
        )
        f6_cc: dict = {_norm_cc(k): v for k, v in f6_by_cc_raw.items()}

        # F7: 付费用户跟进 (by_cc = dict: {cc_name: {monthly_called, monthly_connected, monthly_effective}})
        f7_by_cc_raw = (
            self.data.get("ops", {}).get("paid_user_followup", {}).get("by_cc", {}) or {}
        )
        f7_cc: dict = {_norm_cc(k): v for k, v in f7_by_cc_raw.items()}

        # F9: 月度付费用户跟进 (by_cc = list: [{cc_name, monthly_called, ...}])
        f9_by_cc_list = (
            self.data.get("ops", {}).get("monthly_paid_followup", {}).get("by_cc", []) or []
        )
        f9_cc: dict = {}
        for r in f9_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                f9_cc[nm] = r

        # F10: 首次体验课课前课后跟进 (by_cc = list: [{cc_name, pre_called, post_called, ...}])
        f10_by_cc_list = (
            self.data.get("ops", {}).get("trial_class_followup", {}).get("by_cc", []) or []
        )
        f10_cc: dict = {}
        for r in f10_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                f10_cc[nm] = r

        # A3: leads明细 (by_cc = dict: {cc_name: {leads, 预约, 出席, 付费}})
        a3_by_cc_raw = (
            self.data.get("leads", {}).get("leads_detail", {}).get("by_cc", {}) or {}
        )
        a3_cc: dict = {_norm_cc(k): v for k, v in a3_by_cc_raw.items()}

        # A4: 个人leads达成 (records = list, 含 name/leads/paid/conversion_rate)
        a4_records = (
            self.data.get("leads", {}).get("leads_achievement_personal", {}).get("records", []) or []
        )
        a4_cc: dict = {}
        for r in a4_records:
            nm = _norm_cc(r.get("name", ""))
            if nm:
                a4_cc[nm] = r

        # E3: 订单明细 - 按 CC/seller 聚合收入和付费单量
        e3_records = (
            self.data.get("order", {}).get("order_detail", {}).get("records", []) or []
        )
        e3_cc: dict = {}
        for r in e3_records:
            seller = _norm_cc(r.get("seller", "") or "")
            if not seller:
                continue
            if seller not in e3_cc:
                e3_cc[seller] = {"paid_count": 0, "revenue_usd": 0.0, "amounts": []}
            e3_cc[seller]["paid_count"] += 1
            amt = r.get("amount_usd") or 0.0
            e3_cc[seller]["revenue_usd"] += amt
            if amt > 0:
                e3_cc[seller]["amounts"].append(amt)

        # 计算团队总收入（用于业绩占比）
        team_revenue_total = sum(v["revenue_usd"] for v in e3_cc.values()) or 1.0

        # 合并所有 CC 名称
        raw_name_map: dict = {}
        for r in d1_by_cc_list:
            raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")
        for r in d5_by_cc_list:
            raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")
        for k in f5_by_cc_raw:
            raw_name_map[_norm_cc(k)] = k
        for k in a3_by_cc_raw:
            raw_name_map[_norm_cc(k)] = k
        for r in a4_records:
            raw_name_map[_norm_cc(r.get("name", ""))] = r.get("name", "")
        for r in f10_by_cc_list:
            raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")

        all_cc = set(raw_name_map.keys())
        all_cc.discard("")

        if not all_cc:
            return []

        # ── 每个 CC 采集原始值 ─────────────────────────────────────────────────

        def _get_team(nm: str) -> Optional[str]:
            return (
                (d1_cc.get(nm) or {}).get("team")
                or (f5_cc.get(nm) or {}).get("team")
                or (a4_cc.get(nm) or {}).get("group")
                or None
            )

        raw_data: list = []
        for nm in all_cc:
            d1 = d1_cc.get(nm, {})
            d5 = d5_cc.get(nm, {})
            f5 = f5_cc.get(nm, {})
            f6 = f6_cc.get(nm, {})
            f7 = f7_cc.get(nm, {})
            f9 = f9_cc.get(nm, {})
            f10 = f10_cc.get(nm, {})
            a3 = a3_cc.get(nm, {})
            a4 = a4_cc.get(nm, {})
            e3 = e3_cc.get(nm, {})

            # 过程指标原始值
            outreach_calls   = f5.get("total_calls") or 0
            connected_calls  = f5.get("total_connects") or 0
            effective_calls  = f5.get("total_effective") or 0

            # 付费前跟进: F6 called_24h (体验课跟进)
            pre_paid_followup = f6.get("called_24h") or 0
            # 预约课前跟进: F10 pre_called
            pre_class_followup = f10.get("pre_called") or 0
            # 预约课后跟进: F10 post_called
            post_class_followup = f10.get("post_called") or 0
            # 付费后跟进: F7 monthly_called（付费用户跟进），fallback F9
            post_paid_followup = (
                (f7.get("monthly_called") or 0)
                or (f9.get("monthly_called") or 0)
            )

            # 结果指标原始值
            registrations    = a3.get("leads") or a4.get("leads") or 0
            leads_count      = a3.get("leads") or a4.get("leads") or 0
            # 转介绍用户数：从 a3 中取 转介绍口径；如无，粗估 paid 数
            referral_users   = a3.get("付费") or a4.get("paid") or 0
            paid_count_e3    = e3.get("paid_count") or 0
            revenue_usd      = e3.get("revenue_usd") or 0.0
            # 客单价 (ASP)
            amounts = e3.get("amounts", []) or []
            asp_usd = (sum(amounts) / len(amounts)) if amounts else 0.0
            # 业绩占比
            revenue_share    = revenue_usd / team_revenue_total

            # 效率指标原始值
            paid_for_conv    = a3.get("付费") or a4.get("paid") or paid_count_e3
            conversion_rate  = _safe_pct(paid_for_conv, registrations) or 0.0
            checkin_rate     = d1.get("checkin_24h_rate") or 0.0
            # 参与率: D5 referral_participation_checked / total
            participation_total   = d5.get("referral_participation_total") or 0
            participation_checked = d5.get("referral_participation_checked") or 0
            participation_rate = _safe_pct(participation_checked, participation_total) or 0.0
            # 带新系数: D1 referral_coefficient 或 D5 referral_coefficient_total
            bring_new_coeff = (
                d1.get("referral_coefficient")
                or d5.get("referral_coefficient_total")
                or 0.0
            )

            raw_data.append({
                "cc_name": raw_name_map.get(nm, nm),
                "norm_name": nm,
                "team": _get_team(nm),
                # 过程
                "outreach_calls":     outreach_calls,
                "connected_calls":    connected_calls,
                "effective_calls":    effective_calls,
                "pre_paid_followup":  pre_paid_followup,
                "pre_class_followup": pre_class_followup,
                "post_class_followup": post_class_followup,
                "post_paid_followup": post_paid_followup,
                # 结果
                "registrations":   registrations,
                "leads_count":     leads_count,
                "referral_users":  referral_users,
                "asp_usd":         asp_usd,
                "paid_count":      paid_count_e3,
                "revenue_usd":     revenue_usd,
                "revenue_share":   revenue_share,
                # 效率
                "conversion_rate":    conversion_rate,
                "checkin_rate":       checkin_rate,
                "participation_rate": participation_rate,
                "bring_new_coeff":    bring_new_coeff,
            })

        if not raw_data:
            return []

        # ── min-max 归一化 ────────────────────────────────────────────────────

        METRICS = [
            "outreach_calls", "connected_calls", "effective_calls",
            "pre_paid_followup", "pre_class_followup", "post_class_followup", "post_paid_followup",
            "registrations", "leads_count", "referral_users", "asp_usd",
            "paid_count", "revenue_usd", "revenue_share",
            "conversion_rate", "checkin_rate", "participation_rate", "bring_new_coeff",
        ]

        def _minmax(key: str) -> dict:
            """返回每个 norm_name → normalized_value 的映射"""
            values = [row[key] for row in raw_data if row[key] is not None]
            if not values:
                return {row["norm_name"]: 0.5 for row in raw_data}
            mn, mx = min(values), max(values)
            result = {}
            for row in raw_data:
                v = row[key]
                if v is None:
                    result[row["norm_name"]] = 0.5
                elif mx == mn:
                    result[row["norm_name"]] = 0.5
                else:
                    result[row["norm_name"]] = (v - mn) / (mx - mn)
            return result

        norm_maps: dict = {m: _minmax(m) for m in METRICS}

        # ── 三类权重定义 (可用维度等比分摊) ──────────────────────────────────

        # 检查哪些维度有实际数据（非全0）
        def _has_data(key: str) -> bool:
            return any(row[key] for row in raw_data)

        PROCESS_DIMS = [
            ("outreach_calls",     0.04),
            ("connected_calls",    0.04),
            ("effective_calls",    0.05),
            ("pre_paid_followup",  0.03),
            ("pre_class_followup", 0.03),
            ("post_class_followup",0.03),
            ("post_paid_followup", 0.03),
        ]
        RESULT_DIMS = [
            ("registrations",  0.12),
            ("leads_count",    0.08),
            ("referral_users", 0.08),
            ("asp_usd",        0.07),
            ("paid_count",     0.12),
            ("revenue_usd",    0.09),
            ("revenue_share",  0.04),
        ]
        EFFICIENCY_DIMS = [
            ("conversion_rate",    0.05),
            ("checkin_rate",       0.04),
            ("participation_rate", 0.03),
            ("bring_new_coeff",    0.03),
        ]

        def _redistribute(dims: list) -> list:
            """过滤掉无数据维度，等比分摊其权重到有数据的维度"""
            active = [(k, w) for k, w in dims if _has_data(k)]
            inactive_weight = sum(w for k, w in dims if not _has_data(k))
            if not active:
                return []
            total_active_w = sum(w for _, w in active)
            if total_active_w <= 0:
                return active
            scale = (total_active_w + inactive_weight) / total_active_w
            return [(k, round(w * scale, 6)) for k, w in active]

        active_process    = _redistribute(PROCESS_DIMS)
        active_result     = _redistribute(RESULT_DIMS)
        active_efficiency = _redistribute(EFFICIENCY_DIMS)

        # ── 计算各 CC 得分 ────────────────────────────────────────────────────

        ranking = []
        for row in raw_data:
            nm = row["norm_name"]

            def _score(dims):
                if not dims:
                    return 0.5
                return sum(norm_maps[k][nm] * w for k, w in dims)

            process_score    = _score(active_process)
            result_score     = _score(active_result)
            efficiency_score = _score(active_efficiency)
            composite_score  = (
                process_score * 0.25
                + result_score * 0.60
                + efficiency_score * 0.15
            )

            detail = {
                k: {
                    "raw":  row[k],
                    "norm": round(norm_maps[k][nm], 4),
                }
                for k in METRICS
            }

            ranking.append({
                "cc_name":         row["cc_name"],
                "team":            row["team"],
                "rank":            None,  # 填充在排序后
                "composite_score": round(composite_score, 4),
                "process_score":   round(process_score, 4),
                "result_score":    round(result_score, 4),
                "efficiency_score": round(efficiency_score, 4),
                # 关键业务指标（前端/适配器消费）
                "registrations":   row["registrations"],
                "payments":        row["paid_count"],
                "revenue_usd":     round(row["revenue_usd"], 2),
                "checkin_rate":    row["checkin_rate"],
                "conversion_rate": row["conversion_rate"],
                "detail":          detail,
            })

        ranking.sort(key=lambda x: x["composite_score"], reverse=True)
        for i, item in enumerate(ranking):
            item["rank"] = i + 1

        return ranking

    # ── 15. ss_lp_ranking ────────────────────────────────────────────────────

    def _analyze_ss_lp_ranking(self) -> dict:
        """SS/LP 排名：从 A4 个人 leads 取 leads/paid 排序"""
        a4_records = self.data.get("leads", {}).get("leads_achievement_personal", {}).get("records", []) or []

        ss_list = []
        lp_list = []

        for r in a4_records:
            team = (r.get("team") or "").upper()
            record = {
                "name":            r.get("name"),
                "team":            r.get("team"),
                "group":           r.get("group"),
                "leads":           r.get("leads") or 0,
                "reserve":         r.get("reserve") or 0,
                "showup":          r.get("showup") or 0,
                "paid":            r.get("paid") or 0,
                "conversion_rate": r.get("conversion_rate"),
            }
            if "SS" in team or "EA" in team:
                ss_list.append(record)
            elif "LP" in team or "CM" in team:
                lp_list.append(record)

        ss_list.sort(key=lambda x: (x.get("paid") or 0), reverse=True)
        lp_list.sort(key=lambda x: (x.get("paid") or 0), reverse=True)
        for i, r in enumerate(ss_list):
            r["rank"] = i + 1
        for i, r in enumerate(lp_list):
            r["rank"] = i + 1

        return {"ss": ss_list, "lp": lp_list}

    # ── 16. trend ─────────────────────────────────────────────────────────────

    def _detect_trend_direction(self, values: List[float]) -> str:
        """
        趋势方向引擎：判断近期走向。
        连续 >=3 期上升 = "rising"
        连续 >=3 期下降 = "falling"
        数据不足        = "insufficient"
        否则            = "volatile"
        """
        if len(values) < 3:
            return "insufficient"
        diffs = [values[i + 1] - values[i] for i in range(len(values) - 1)]
        last_3 = diffs[-3:]
        if all(d > 0 for d in last_3):
            return "rising"
        if all(d < 0 for d in last_3):
            return "falling"
        return "volatile"

    def _get_peak_valley(self, metric: str) -> dict:
        """
        从历史快照查询指定指标的巅峰/谷底。
        若无 SnapshotStore 或无历史数据，返回 None。
        """
        if self._snapshot_store is None:
            return {"peak": None, "valley": None}
        try:
            return self._snapshot_store.get_peak_valley(metric)
        except Exception as e:
            logger.warning(f"[_get_peak_valley] metric={metric} 查询失败: {e}")
            return {"peak": None, "valley": None}

    def _analyze_trend(self) -> dict:
        """
        趋势分析，返回三层结构：
          - mom: 月度环比（F3 数据源）
          - yoy: 年同比（从快照查去年同月，无数据返回 available=False）
          - wow: 周环比（从快照查近 4 周 daily_kpi 聚合）
        顶层保留 daily（日趋势序列）和 direction（趋势方向）。
        """
        e5 = self.data.get("order", {}).get("revenue_daily_trend", []) or []
        e4 = self.data.get("order", {}).get("order_daily_trend", []) or []
        f3 = self.data.get("ops", {}).get("section_mom", {}) or {}

        e5_sorted = sorted(e5, key=lambda x: x.get("date", ""))
        e4_sorted = sorted(e4, key=lambda x: x.get("date", ""))

        # 按日期聚合收入/订单
        e5_by_date: dict = {}
        for r in e5_sorted:
            d = r.get("date", "")
            e5_by_date[d] = (e5_by_date.get(d) or 0) + (r.get("revenue_cny") or 0)

        e4_by_date: dict = {}
        for r in e4_sorted:
            d = r.get("date", "")
            e4_by_date[d] = (e4_by_date.get(d) or 0) + (r.get("order_count") or 0)

        all_dates = sorted(set(e5_by_date) | set(e4_by_date))
        daily = [
            {
                "date":        d,
                "revenue_cny": e5_by_date.get(d),
                "order_count": e4_by_date.get(d),
            }
            for d in all_dates
        ]

        # 趋势方向（基于日收入序列）
        rev_values = [e5_by_date[d] for d in all_dates if e5_by_date.get(d) is not None]
        direction = self._detect_trend_direction(rev_values)

        # ── MoM：F3 月度环比 ──────────────────────────────────────────────────
        f3_by_month = f3.get("by_month", {}) or {}
        mom_months = sorted(f3_by_month.keys())
        mom = {
            "months":    mom_months,
            "data":      f3_by_month,
            "direction": direction,
        }

        # ── YoY：从快照查去年同月 ─────────────────────────────────────────────
        current_month = self.data_date.strftime("%Y%m")
        yoy: dict
        if self._snapshot_store is not None:
            try:
                last_year_row = self._snapshot_store.get_same_month_last_year("注册", current_month)
                if last_year_row:
                    yoy = {
                        "available":     True,
                        "last_year_month": last_year_row.get("month"),
                        "registrations": {
                            "last_year_avg": last_year_row.get("avg_value"),
                            "last_year_sum": last_year_row.get("sum_value"),
                        },
                        "direction": direction,
                    }
                else:
                    yoy = {"available": False, "reason": "无去年同月历史数据"}
            except Exception as e:
                logger.warning(f"[YoY] 快照查询失败: {e}")
                yoy = {"available": False, "reason": f"快照查询异常: {e}"}
        else:
            yoy = {"available": False, "reason": "快照存储未初始化"}

        # ── WoW：从快照查近 4 周聚合 ─────────────────────────────────────────
        wow: dict
        if self._snapshot_store is not None:
            try:
                weekly_rows = self._snapshot_store.get_weekly_kpi("注册", weeks_back=4)
                wow_values = [r.get("avg_value") for r in weekly_rows if r.get("avg_value") is not None]
                wow = {
                    "available": len(weekly_rows) >= 2,
                    "weeks":     weekly_rows,
                    "direction": self._detect_trend_direction(wow_values) if len(wow_values) >= 3 else "insufficient",
                }
            except Exception as e:
                logger.warning(f"[WoW] 快照查询失败: {e}")
                wow = {"available": False, "reason": f"快照查询异常: {e}"}
        else:
            wow = {"available": False, "reason": "快照存储未初始化"}

        return {
            "daily":     daily[-60:],   # 最近 60 天日趋势
            "direction": direction,     # 顶层趋势方向
            "mom":       mom,
            "yoy":       yoy,
            "wow":       wow,
        }

    # ── 17. prediction ────────────────────────────────────────────────────────

    def _analyze_prediction(self) -> dict:
        """三模型预测（线性/WMA/EWM 三选优）：E5 日趋势预测月底收入"""
        e5 = self.data.get("order", {}).get("revenue_daily_trend", []) or []

        # 聚合日收入
        by_date: dict = {}
        for r in e5:
            d = r.get("date", "")
            by_date[d] = (by_date.get(d) or 0) + (r.get("revenue_cny") or 0)

        sorted_dates = sorted(by_date.keys())
        values = [by_date[d] for d in sorted_dates]

        if len(values) < 3:
            return {
                "revenue": {"predicted": None, "model": None, "confidence": None},
                "registration": {"predicted": None, "model": None, "confidence": None},
                "payment": {"predicted": None, "model": None, "confidence": None},
            }

        days_in_month = calendar.monthrange(self.data_date.year, self.data_date.month)[1]
        elapsed_days  = self.data_date.day
        remaining     = days_in_month - elapsed_days

        cumulative    = sum(values)
        daily_avg     = cumulative / max(elapsed_days, 1)

        # Linear
        linear_pred   = cumulative + daily_avg * remaining

        # WMA (权重越近越大)
        if len(values) >= 5:
            recent = values[-5:]
            weights = [1, 2, 3, 4, 5]
            wma_daily = sum(v * w for v, w in zip(recent, weights)) / sum(weights)
        else:
            wma_daily = daily_avg
        wma_pred = cumulative + wma_daily * remaining

        # EWM (指数平滑, alpha=0.3)
        alpha = 0.3
        ewm = values[0]
        for v in values[1:]:
            ewm = alpha * v + (1 - alpha) * ewm
        ewm_pred = cumulative + ewm * remaining

        # 选最接近均值的模型
        preds = {"linear": linear_pred, "wma": wma_pred, "ewm": ewm_pred}
        mean_pred = statistics.mean(preds.values())
        best_model = min(preds, key=lambda k: abs(preds[k] - mean_pred))

        # leads 预测（从 A1 total）
        a1_total = self.data.get("leads", {}).get("leads_achievement", {}).get("total", {}) or {}
        reg_actual  = a1_total.get("注册") or 0
        paid_actual = a1_total.get("付费") or 0
        reg_target  = self.targets.get("注册目标") or 0
        paid_target = self.targets.get("付费目标") or 0
        time_prog   = self.targets.get("时间进度", 0.0)

        reg_pred  = round(reg_actual / max(time_prog, 0.01)) if time_prog > 0 and reg_actual else None
        paid_pred = round(paid_actual / max(time_prog, 0.01)) if time_prog > 0 and paid_actual else None

        return {
            "revenue": {
                "predicted":   round(preds[best_model], 2),
                "model":       best_model,
                "confidence":  0.75,
                "all_models": {k: round(v, 2) for k, v in preds.items()},
            },
            "registration": {
                "predicted":  reg_pred,
                "model":      "linear",
                "confidence": 0.70,
            },
            "payment": {
                "predicted":  paid_pred,
                "model":      "linear",
                "confidence": 0.65,
            },
        }

    # ── 18. anomalies ────────────────────────────────────────────────────────

    def _detect_anomalies(self) -> list:
        """动态阈值异常检测 (±2σ)"""
        anomalies = []

        # 日收入异常
        e5 = self.data.get("order", {}).get("revenue_daily_trend", []) or []
        daily_rev: dict = {}
        for r in e5:
            d = r.get("date", "")
            daily_rev[d] = (daily_rev.get(d) or 0) + (r.get("revenue_cny") or 0)

        if len(daily_rev) >= 5:
            vals = list(daily_rev.values())
            mean_rev = statistics.mean(vals)
            std_rev  = statistics.stdev(vals) if len(vals) > 1 else 0
            threshold = 2.0 * std_rev

            for date, val in daily_rev.items():
                if abs(val - mean_rev) > threshold and threshold > 0:
                    direction = "骤降" if val < mean_rev else "骤升"
                    pct_change = abs(val - mean_rev) / mean_rev
                    severity = "red" if pct_change >= 0.5 else "yellow"
                    anomalies.append({
                        "metric":   "daily_revenue_cny",
                        "date":     date,
                        "value":    round(val, 2),
                        "expected": round(mean_rev, 2),
                        "severity": severity,
                        "message":  f"收入{direction}{pct_change:.0%}",
                    })

        # CC 打卡率异常
        d1_by_cc = self.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []
        rates = [r.get("checkin_24h_rate") for r in d1_by_cc if r.get("checkin_24h_rate") is not None]
        if len(rates) >= 5:
            mean_c = statistics.mean(rates)
            std_c  = statistics.stdev(rates) if len(rates) > 1 else 0
            for r in d1_by_cc:
                rate = r.get("checkin_24h_rate")
                if rate is not None and std_c > 0 and abs(rate - mean_c) > 2 * std_c:
                    anomalies.append({
                        "metric":   "cc_checkin_rate",
                        "cc_name":  r.get("cc_name"),
                        "value":    rate,
                        "expected": round(mean_c, 4),
                        "severity": "yellow",
                        "message":  f"打卡率异常 ({rate:.0%} vs 均值{mean_c:.0%})",
                    })

        return sorted(anomalies, key=lambda x: x.get("severity", ""), reverse=True)

    # ── 19. risk_alerts ───────────────────────────────────────────────────────

    def _generate_risk_alerts(self, summary: dict, anomalies: list) -> list:
        """风险预警：基于 summary 缺口 + anomalies 汇总"""
        alerts = []
        time_prog = self.targets.get("时间进度", 0.0)

        def _add(level, category, message, action=""):
            alerts.append({
                "level":    level,
                "category": category,
                "message":  message,
                "action":   action,
            })

        # 付费进度
        payment = summary.get("payment", {})
        paid_progress = payment.get("progress")
        paid_gap = payment.get("gap")
        if paid_gap is not None:
            paid_actual = payment.get("actual", 0)
            paid_target = payment.get("target", 0)
            if paid_gap < -0.15:
                _add("red", "业绩",
                     f"付费达成率{paid_progress:.1%}，低于时间进度{time_prog:.1%}，缺口{paid_gap:.1%}",
                     "立即复盘高意向学员名单，加强外呼追踪")
            elif paid_gap < -0.05:
                _add("yellow", "业绩",
                     f"付费进度偏慢，缺口{paid_gap:.1%}",
                     "关注近期出席未付费学员，安排跟进")

        # 打卡率
        checkin = summary.get("checkin_24h", {})
        checkin_rate = checkin.get("rate")
        checkin_target = checkin.get("target") or 0.6
        if checkin_rate is not None and checkin_rate < checkin_target * 0.8:
            _add("yellow", "打卡",
                 f"24H打卡率{checkin_rate:.1%}，低于目标{checkin_target:.1%}",
                 "提醒 CC 加强打卡宣导")

        # 注册进度
        reg = summary.get("registration", {})
        reg_gap = reg.get("gap")
        if reg_gap is not None and reg_gap < -0.10:
            _add("red", "注册",
                 f"注册进度缺口{reg_gap:.1%}",
                 "检查 leads 分配情况")

        # 异常转化
        red_anomalies = [a for a in anomalies if a.get("severity") == "red"]
        for a in red_anomalies[:3]:
            _add("red", "异常",
                 a.get("message", ""),
                 "排查数据异常原因")

        return sorted(alerts, key=lambda x: {"red": 0, "yellow": 1, "green": 2}.get(x["level"], 3))

    # ── 20. ltv ───────────────────────────────────────────────────────────────

    def _analyze_ltv(self) -> dict:
        """LTV 简化估算（基于 cohort 带货比衰减）"""
        cohort = self.data.get("cohort", {})
        ratio_by_month = cohort.get("conversion_ratio", {}).get("by_month", []) or []

        avg_unit = self.targets.get("客单价", 850)

        # 取最新月份的 cohort 指标
        if ratio_by_month:
            latest = ratio_by_month[-1]
            ltv_3m  = sum(latest.get(f"m{i}") or 0 for i in range(1, 4)) * avg_unit
            ltv_6m  = sum(latest.get(f"m{i}") or 0 for i in range(1, 7)) * avg_unit
            ltv_12m = sum(latest.get(f"m{i}") or 0 for i in range(1, 13)) * avg_unit
        else:
            ltv_3m  = None
            ltv_6m  = None
            ltv_12m = None

        return {
            "ltv_3m_usd":   round(ltv_3m, 2) if ltv_3m else None,
            "ltv_6m_usd":   round(ltv_6m, 2) if ltv_6m else None,
            "ltv_12m_usd":  round(ltv_12m, 2) if ltv_12m else None,
            "avg_unit_price_usd": avg_unit,
        }
