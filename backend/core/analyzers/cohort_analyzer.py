"""
Cohort & ROI Analyzer — extracted from AnalysisEngineV2 (M30)

Covers:
  - analyze_cohort_roi   (原 _analyze_cohort_roi,  行 837-936)
  - calc_half_life       (原 _calc_half_life,       行 938-955)
  - analyze_enclosure_cross (原 _analyze_enclosure_cross, 行 959-1021)
  - analyze_checkin_impact  (原 _analyze_checkin_impact,  行 1025-1079)
  - analyze_ltv          (原 _analyze_ltv,          行 2070-2093)
"""
from __future__ import annotations

import statistics
from typing import Optional

from .context import AnalyzerContext
from .utils import _safe_div, _safe_pct, _clean_for_json  # noqa: F401


class CohortAnalyzer:
    def __init__(self, ctx: AnalyzerContext):
        self.ctx = ctx

    # ── 7. cohort_roi ─────────────────────────────────────────────────────────

    def analyze_cohort_roi(self) -> dict:
        """Cohort × ROI 跨源联动：C1-C5 衰减曲线 × B1 成本模型"""
        cohort = self.ctx.data.get("cohort", {})
        roi_data = self.ctx.data.get("roi", {})

        # B1: 成本模型
        roi_summary = roi_data.get("summary", {}) or {}
        total_roi_data = roi_summary.get("_total", {})
        total_cost    = total_roi_data.get("实际成本") or 0
        total_revenue = total_roi_data.get("实际营收") or 0
        overall_roi   = total_roi_data.get("实际ROI")

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
        # C3: 打卡率 by_month
        checkin_by_month = {
            r["月份"]: r
            for r in (cohort.get("checkin_rate", {}).get("by_month", []) or [])
            if r.get("月份")
        }
        # C4: 带新系数 by_month
        ref_coef_by_month = {
            r["月份"]: r
            for r in (cohort.get("referral_coefficient", {}).get("by_month", []) or [])
            if r.get("月份")
        }
        # C5: 带货比 by_month
        ratio_by_month = {
            r["月份"]: r
            for r in (cohort.get("conversion_ratio", {}).get("by_month", []) or [])
            if r.get("月份")
        }

        avg_unit_price = self.ctx.targets.get("客单价", 850)  # USD

        all_months = sorted(set(reach_by_month) | set(part_by_month) | set(checkin_by_month))
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

            # P0-1 提取 m1-m12 的各项指标全集，方便前端渲染实测曲线
            reach_m_dict = {f"m{i}": reach.get(f"m{i}") for i in range(1, 13)}
            part_m_dict  = {f"m{i}": part.get(f"m{i}") for i in range(1, 13)}
            checkin_m_dict = {f"m{i}": checkin_by_month.get(month, {}).get(f"m{i}") for i in range(1, 13)}

            by_month.append({
                "cohort_month":     month,
                "reach_rate_m1":    reach.get("m1"),
                "participation_m1": part.get("m1"),
                "ltv_12m":          round(ltv, 2),
                "acquisition_cost": round(acq_cost, 2),
                "roi":              round(roi_val, 4) if roi_val else None,
                "reach_rates":      reach_m_dict,
                "participation_rates": part_m_dict,
                "checkin_rates":    checkin_m_dict,
            })

        # 半衰期估算（触达率/参与率从 m1 降至 m1/2 的月份）
        reach_half_life = self.calc_half_life(reach_by_month)
        part_half_life  = self.calc_half_life(part_by_month)
        checkin_half_life = self.calc_half_life(checkin_by_month)

        # 最优月龄
        top_months = sorted(
            [r for r in by_month if r.get("roi") is not None],
            key=lambda x: x["roi"],
            reverse=True,
        )[:3]
        optimal_months = [r["cohort_month"] for r in top_months]

        # B1: 成本明细列表（直接透传，供前端展示真实成本结构）
        cost_list = roi_data.get("cost_list", []) or []

        # B1: 产品类型 ROI 汇总（次卡 / 现金）
        by_product = {}
        for product_key in ("次卡", "现金"):
            pdata = roi_summary.get(product_key, {})
            if pdata:
                by_product[product_key] = {
                    "revenue_target": pdata.get("目标营收"),
                    "roi_target":     pdata.get("目标ROI"),
                    "revenue_actual": pdata.get("实际营收"),
                    "cost_actual":    pdata.get("实际成本"),
                    "roi_actual":     pdata.get("实际ROI"),
                }

        return {
            "by_month":        by_month,
            "optimal_months":  optimal_months,
            "overall_roi":     round(overall_roi, 4) if overall_roi else None,
            "total_cost_usd":  round(total_cost, 2),
            "total_revenue_usd": round(total_revenue, 2),
            "decay_summary": {
                "reach_half_life":        reach_half_life,
                "participation_half_life": part_half_life,
                "checkin_half_life":      checkin_half_life,
            },
            "cost_list":    cost_list,
            "by_product":   by_product,
        }

    def calc_half_life(self, by_month: dict) -> Optional[int]:
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
            vals = [
                by_month[mon].get(f"m{m_idx}")
                for mon in months_sorted
                if by_month[mon].get(f"m{m_idx}") is not None
            ]
            if vals:
                avg = statistics.mean(vals)
                if avg <= half:
                    return m_idx
        return None

    # ── 8. enclosure_cross ────────────────────────────────────────────────────

    def analyze_enclosure_cross(self) -> dict:
        """围场交叉分析：D2-D4 围场KPI × F8 围场跟进 × A2 围场效率"""
        # D2: 转介绍围场数据
        d_enc = self.ctx.data.get("kpi", {}).get("enclosure_referral", {})
        by_enc_d = {
            r["enclosure"]: r
            for r in (d_enc.get("by_enclosure", []) or [])
            if r.get("enclosure")
        }

        # F8: 围场跟进
        f8_data = self.ctx.data.get("ops", {}).get("enclosure_monthly_followup", {})
        by_enc_f8 = {
            e["enclosure"]: e
            for e in (f8_data.get("by_enclosure", []) or [])
            if e.get("enclosure")
        }

        # A2: 当月效率（按围场）
        a2_data = self.ctx.data.get("leads", {}).get("channel_efficiency", {})
        by_enc_a2 = {
            r["围场"]: r
            for r in (a2_data.get("by_enclosure", []) or [])
            if r.get("围场")
        }

        all_enclosures = set(by_enc_d) | set(by_enc_f8) | set(by_enc_a2)
        enc_order = ["0-30", "31-60", "61-90", "91-180", "181+"]
        all_enclosures = (
            [e for e in enc_order if e in all_enclosures]
            + [e for e in all_enclosures if e not in enc_order]
        )

        by_enclosure = []
        for enc in all_enclosures:
            d_row  = by_enc_d.get(enc, {})
            f8_row = by_enc_f8.get(enc, {})
            a2_row = by_enc_a2.get(enc, {})

            students  = d_row.get("active_students") or 0
            conv_rate = d_row.get("conversion_rate")
            part_rate = d_row.get("participation_rate")

            # 跟进率来自 F8 summary
            f8_summary   = f8_row.get("summary", {}) or {}
            followup_rate = f8_summary.get("call_coverage") or f8_summary.get("effective_coverage")

            # ROI 指数（相对值）：用参与率 × 带货比近似
            a2_total = a2_row.get("总计", {}) or {}
            ratio    = a2_total.get("带货比")
            part     = a2_total.get("参与率")
            roi_index = round((ratio or 0) * (part or 0) * 10, 2) if ratio and part else None

            # 建议
            if roi_index is not None:
                recommendation = (
                    "加大投入" if roi_index >= 1.0
                    else ("维持" if roi_index >= 0.3 else "降低优先级")
                )
            else:
                recommendation = "数据不足"

            by_enclosure.append({
                "segment":            enc,
                "students":           students,
                "conversion_rate":    conv_rate,
                "participation_rate": part_rate,
                "followup_rate":      followup_rate,
                "roi_index":          roi_index,
                "recommendation":     recommendation,
            })

        # 资源分配建议（按 roi_index 归一化）
        valid = [r for r in by_enclosure if r.get("roi_index") is not None and r["roi_index"] > 0]
        total_roi_sum = sum(r["roi_index"] for r in valid) or 1.0
        resource_allocation = {
            r["segment"]: round(r["roi_index"] / total_roi_sum, 3)
            for r in valid
        }

        return {
            "by_enclosure":        by_enclosure,
            "resource_allocation": {"optimal": resource_allocation},
        }

    # ── 9. checkin_impact ─────────────────────────────────────────────────────

    def analyze_checkin_impact(self) -> dict:
        """打卡→带新因果：D1 × D5 已打卡/未打卡对比"""
        d5 = self.ctx.data.get("kpi", {}).get("checkin_rate_monthly", {})
        d5_summary = d5.get("summary", {}) or {}
        d5_by_cc   = d5.get("by_cc", []) or []

        # D5 已包含 referral_participation_checked/unchecked
        checked_parts = [
            r.get("referral_participation_checked")
            for r in d5_by_cc
            if r.get("referral_participation_checked") is not None
        ]
        unchecked_parts = [
            r.get("referral_participation_unchecked")
            for r in d5_by_cc
            if r.get("referral_participation_unchecked") is not None
        ]

        avg_checked   = statistics.mean(checked_parts) if checked_parts else None
        avg_unchecked = statistics.mean(unchecked_parts) if unchecked_parts else None
        part_multiplier = _safe_div(avg_checked, avg_unchecked)

        # 带新系数
        d1_by_cc       = self.ctx.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []
        checked_coefs  = []
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
            "conclusion":       conclusion,
        }

    # ── 20. ltv ───────────────────────────────────────────────────────────────

    def analyze_ltv(self) -> dict:
        """LTV 简化估算（基于 cohort 带货比衰减）"""
        cohort = self.ctx.data.get("cohort", {})
        ratio_by_month = cohort.get("conversion_ratio", {}).get("by_month", []) or []
        ref_coef_by_month = cohort.get("referral_coefficient", {}).get("by_month", []) or []

        avg_unit = self.ctx.targets.get("客单价", 850)

        # 取最新月份的 cohort 指标
        if ratio_by_month:
            latest  = ratio_by_month[-1]
            latest_coef = ref_coef_by_month[-1] if ref_coef_by_month else {}

            # 融入带新系数乘数 (referral_multiplier) 提升 LTV (如果为空则默认1)
            # P1-1: C4 Cohort 带新系数
            def _get_ratio(m_str: str) -> float:
                rat = latest.get(m_str) or 0.0
                coef = latest_coef.get(m_str) or 1.0 # 默认为1
                return rat * coef

            ltv_3m  = sum(_get_ratio(f"m{i}") for i in range(1, 4)) * avg_unit
            ltv_6m  = sum(_get_ratio(f"m{i}") for i in range(1, 7)) * avg_unit
            ltv_12m = sum(_get_ratio(f"m{i}") for i in range(1, 13)) * avg_unit
        else:
            ltv_3m  = None
            ltv_6m  = None
            ltv_12m = None

        return {
            "ltv_3m_usd":        round(ltv_3m, 2) if ltv_3m else None,
            "ltv_6m_usd":        round(ltv_6m, 2) if ltv_6m else None,
            "ltv_12m_usd":       round(ltv_12m, 2) if ltv_12m else None,
            "avg_unit_price_usd": avg_unit,
        }
