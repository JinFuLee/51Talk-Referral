"""
OpsAnalyzer — 外呼分析 + 体验课跟进
从 analysis_engine_v2.py 行 1254-1345 提取。
"""

from __future__ import annotations

import statistics

from .context import AnalyzerContext
from .utils import _safe_div, _safe_pct


class OpsAnalyzer:
    def __init__(self, ctx: AnalyzerContext) -> None:
        self.ctx = ctx

    def analyze_outreach(self) -> dict:
        """外呼分析：F5 每日外呼 + F6 体验跟进 + F7 付费用户跟进"""
        ctx = self.ctx
        f5 = ctx.data.get("ops", {}).get("daily_outreach", {}) or {}
        f6 = ctx.data.get("ops", {}).get("trial_followup", {}) or {}
        f7 = ctx.data.get("ops", {}).get("paid_user_followup", {}) or {}

        f5_summary_cc = f5.get("by_cc", {}) or {}
        f5_by_date = f5.get("by_date", []) or []
        f6_summary = f6.get("summary", {}) or {}
        f7_summary = f7.get("summary", {}) or {}
        f7_total = f7_summary.get("total_students", 0) or 0
        f7_called = f7_summary.get("total_monthly_called", 0) or 0
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

        compliance_rate = (
            min(1.0, _safe_div(avg_calls_per_cc, 30.0) or 0.0)
            if avg_calls_per_cc
            else None
        )

        return {
            "daily_outreach": {
                "by_date": f5_by_date,
                "by_cc": f5_summary_cc,
            },
            "trial_followup": {
                "call_rate_24h": f6_summary.get("call_rate_24h"),
                "connect_rate_24h": f6_summary.get("connect_rate_24h"),
                "by_cc": f6.get("by_cc", {}),
            },
            "paid_followup": {
                "total_students": f7_total,
                "total_called": f7_called,
                "coverage": paid_followup_coverage,
                "by_cc": f7.get("by_cc", {}),
            },
            "compliance": {
                "target_calls_per_day": 30,
                "avg_actual": avg_calls_per_cc,
                "compliance_rate": round(compliance_rate, 4)
                if compliance_rate
                else None,
            },
        }

    def analyze_trial_followup(self) -> dict:
        """体验课跟进：F10 课前课后 + F11 课前外呼覆盖"""
        ctx = self.ctx
        f10 = ctx.data.get("ops", {}).get("trial_class_followup", {}) or {}
        f11 = ctx.data.get("ops", {}).get("pre_class_outreach", {}) or {}

        f10_by_cc = f10.get("by_cc", []) or []
        f11_summary = f11.get("summary", {}) or {}

        # 汇总 F10 整体（取转介绍渠道的汇总行）
        f10_by_channel = f10.get("by_channel", {}) or {}
        f10_referral = f10_by_channel.get("转介绍", {}) or {}

        pre_call_rate = f10_referral.get("pre_call_rate") or f11_summary.get(
            "overall_call_rate"
        )
        pre_connect_rate = f10_referral.get("pre_connect_rate") or f11_summary.get(
            "overall_connect_rate"
        )

        # 课前外呼→出席率关联（F11 by_lead_type 对比）
        f11_by_lead = f11.get("by_lead_type", {}) or {}
        called_att = (
            f11_by_lead.get("转介绍", {}).get("attendance_rate")
            if f11_by_lead
            else None
        )
        # 未外呼出席率无法直接取得，用 F10 overall 和 F11 called_att 反推
        # overall_att = called_att * call_rate + not_called_att * (1 - call_rate)
        # 故 not_called_att = (overall_att - called_att * call_rate) / (1 - call_rate)
        not_called_att = None
        overall_att = f10_referral.get("attendance_rate") or f11_summary.get(
            "overall_attendance_rate"
        )
        if (
            overall_att is not None
            and called_att is not None
            and pre_call_rate is not None
            and 0 <= pre_call_rate < 1
        ):
            try:
                calc_val = (overall_att - called_att * pre_call_rate) / (
                    1.0 - pre_call_rate
                )
                not_called_att = max(0.0, min(1.0, calc_val))
            except ZeroDivisionError:
                not_called_att = None

        return {
            "pre_class": {
                "call_rate": pre_call_rate,
                "connect_rate": pre_connect_rate,
            },
            "post_class": {
                "call_rate": f10_referral.get("post_call_rate"),
                "connect_rate": f10_referral.get("post_connect_rate"),
            },
            "by_cc": f10_by_cc,
            "correlation": {
                "pre_call_attendance": called_att,
                "no_call_attendance": not_called_att,
            },
            "f11_summary": f11_summary,
            # F11 完整聚合（供 outreach-coverage 端点使用）
            "f11_by_cc": f11.get("by_cc", {}) or {},
            "f11_by_lead_type": f11.get("by_lead_type", {}) or {},
            "f11_records": f11.get("records", []) or [],
        }
