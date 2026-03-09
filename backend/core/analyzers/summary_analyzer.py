"""
SummaryAnalyzer — 概览/漏斗/渠道对比/学员旅程
从 analysis_engine_v2.py 行 314-671 提取。
"""
from __future__ import annotations

from typing import Any, Optional

from .context import AnalyzerContext
from .utils import _safe_div, _safe_pct


class SummaryAnalyzer:
    def __init__(self, ctx: AnalyzerContext) -> None:
        self.ctx = ctx

    def analyze_summary(self) -> dict:
        """概览 KPI：注册/预约/出席/付费/收入/打卡率 vs 目标"""
        from backend.core.config import EXCHANGE_RATE_THB_USD
        ctx = self.ctx
        time_progress = ctx.targets.get("时间进度", 0.0)

        # ── 工作日计算
        elapsed_workdays, remaining_workdays = ctx.calc_workdays()

        # ── 从 leads (A1) 取注册/预约/出席/付费
        a1 = ctx.data.get("leads", {}).get("leads_achievement", {})
        total = a1.get("by_channel", {}).get("总计", {}) or a1.get("total", {})

        reg_actual     = total.get("注册") or 0
        reserve_actual = total.get("预约") or 0
        attend_actual  = total.get("出席") or 0
        paid_actual    = total.get("付费") or 0

        reg_target    = ctx.targets.get("注册目标", 0)
        paid_target   = ctx.targets.get("付费目标", 0)
        amount_target = ctx.targets.get("金额目标", 0)

        # ── 从 order (E3) 取转介绍渠道收入（CC前端+新单+转介绍，精确过滤）
        order_detail = ctx.data.get("order", {}).get("order_detail", {})
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
        d1 = ctx.data.get("kpi", {}).get("north_star_24h", {})
        checkin_summary = d1.get("summary", {})
        checkin_rate   = checkin_summary.get("avg_checkin_24h_rate")
        checkin_target = checkin_summary.get("target") or 0.60

        # ── THB 换算（汇率从 config 读取）
        exchange_rate = EXCHANGE_RATE_THB_USD
        revenue_thb = round(revenue_usd * exchange_rate, 2)

        def _progress_gap(actual, target) -> tuple[Optional[float], Optional[float]]:
            if not target:
                return None, None
            prog = _safe_pct(actual, target)
            gap = (prog - time_progress) if prog is not None else None
            return prog, gap

        def _kpi_daily(actual, target) -> tuple[Optional[float], Optional[float], Optional[float], float, Optional[float]]:
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
            pace_daily_needed = (
                round(max(0, pace_target - actual) / max(1, remaining_workdays), 2)
                if remaining_workdays > 0 else None
            )
            return daily_avg, remaining_daily_avg, efficiency_lift_pct, absolute_gap, pace_daily_needed

        reg_prog, reg_gap    = _progress_gap(reg_actual, reg_target)
        paid_prog, paid_gap  = _progress_gap(paid_actual, paid_target)
        amount_prog, amt_gap = _progress_gap(revenue_usd, amount_target)

        reg_daily, reg_rem_daily, reg_lift, reg_abs_gap, reg_pace_daily = _kpi_daily(reg_actual, reg_target)
        paid_daily, paid_rem_daily, paid_lift, paid_abs_gap, paid_pace_daily = _kpi_daily(paid_actual, paid_target)
        rev_daily, rev_rem_daily, rev_lift, rev_abs_gap, rev_pace_daily = _kpi_daily(revenue_usd, amount_target)

        def _status(gap) -> str:
            if gap is None:
                return "gray"
            if gap >= ctx.GAP_GREEN:
                return "green"
            if gap >= ctx.GAP_YELLOW:
                return "yellow"
            return "red"

        # ── 打卡率效率影响链
        checkin_impact = ctx.calc_efficiency_impact(
            metric_name="checkin_24h",
            actual_rate=checkin_rate,
            target_rate=checkin_target,
            upstream_base=float(reg_actual),
        )

        # ── 巅峰/谷底（从历史快照查询，无数据时为 None）
        reg_pv  = ctx.get_peak_valley("注册")
        paid_pv = ctx.get_peak_valley("付费")
        rev_pv  = ctx.get_peak_valley("金额")

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

    def analyze_funnel(self) -> dict:
        """转化漏斗：各口径注册→预约→出席→付费"""
        ctx = self.ctx
        a1 = ctx.data.get("leads", {}).get("leads_achievement", {})
        by_channel = a1.get("by_channel", {})

        # KPI 数据源：有效学员 + 效率指标
        kpi = ctx.data.get("kpi", {})
        d4_total = kpi.get("enclosure_combined", {}).get("total", {}) or {}
        d3_total = kpi.get("enclosure_referral", {}).get("total", {}) or {}

        # 有效学员数（优先 D4 合并，fallback D3 转介绍）
        valid_students = int(d4_total.get("active_students") or d3_total.get("active_students") or 0)

        # 参与率：从 D4/D3 total 获取
        participation_rate = d4_total.get("participation_rate") or d3_total.get("participation_rate") or 0

        # 触达率：暂用 D4 conversion_rate 近似，待真实外呼数据（>=120s 有效通话）对接
        contact_rate = d4_total.get("conversion_rate") or d3_total.get("conversion_rate") or 0

        def _chan(label) -> dict[str, Any]:
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
                "valid_students": valid_students,
                "rates": {
                    "reserve_rate":       _safe_pct(resv, reg),
                    "attend_rate":        _safe_pct(att, resv),
                    "paid_rate":          _safe_pct(paid, att),
                    "register_paid_rate": _safe_pct(paid, reg),
                    "contact_rate":       contact_rate,
                    "participation_rate": participation_rate,
                },
            }

        return {
            "total":       _chan("总计"),
            "cc_narrow":   _chan("CC窄口径"),
            "ss_narrow":   _chan("SS窄口径"),
            "lp_narrow":   _chan("LP窄口径"),
            "wide":        _chan("宽口径"),
        }

    def analyze_channel_comparison(self) -> dict:
        """渠道对比：各口径效能指数"""
        ctx = self.ctx
        a1 = ctx.data.get("leads", {}).get("leads_achievement", {})
        by_channel = a1.get("by_channel", {})
        total = by_channel.get("总计", {}) or {}

        total_reg  = total.get("注册") or 1
        total_paid = total.get("付费") or 1
        time_prog  = ctx.targets.get("时间进度", 0.0)

        channels = ctx._channel_labels
        comparison = {}

        for ch in channels:
            d = by_channel.get(ch, {}) or {}
            reg  = d.get("注册") or 0
            paid = d.get("付费") or 0
            reg_ratio  = _safe_pct(reg, total_reg)
            paid_ratio = _safe_pct(paid, total_paid)
            eff_index  = _safe_div(paid_ratio, reg_ratio)

            sub = ctx.targets.get("子口径", {}).get(ch, {})
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

    def analyze_student_journey(self) -> dict:
        """学员全旅程跨源联动：A3 leads明细 × E3 订单 × F6 体验跟进 × F11 课前外呼"""
        ctx = self.ctx
        a3_records  = ctx.data.get("leads", {}).get("leads_detail", {}).get("records", []) or []
        e3_records  = ctx.data.get("order", {}).get("order_detail", {}).get("records", []) or []
        f6_records  = ctx.data.get("ops", {}).get("trial_followup", {}).get("records", []) or []
        f11_records = ctx.data.get("ops", {}).get("pre_class_outreach", {}).get("records", []) or []

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

        outreached_conv     = _safe_pct(outreached_paid, outreached_count)
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
