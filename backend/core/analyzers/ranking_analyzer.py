"""
Ranking Analyzer — extracted from AnalysisEngineV2 (M30)

Covers:
  - analyze_cc_360      (原 _analyze_cc_360,      行 674-833)
  - analyze_cc_ranking  (原 _analyze_cc_ranking,  行 1349-1697)
  - analyze_ss_lp_ranking (原 _analyze_ss_lp_ranking, 行 1701-1742)
"""
from __future__ import annotations

import statistics
from typing import Optional

from .context import AnalyzerContext
from .utils import _safe_div, _safe_pct, _norm_cc


class RankingAnalyzer:
    def __init__(self, ctx: AnalyzerContext):
        self.ctx = ctx

    # ── CC 360° 画像 ──────────────────────────────────────────────────────────

    def analyze_cc_360(self) -> dict:
        """CC 360° 画像跨源联动：D1 × F5 × A4 × E3 × F9"""
        # D1: 24H 打卡率
        d1_cc = {
            _norm_cc(r["cc_name"]): r
            for r in (self.ctx.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or [])
            if r.get("cc_name")
        }

        # F5: 每日外呼
        f5_cc = (self.ctx.data.get("ops", {}).get("daily_outreach", {}).get("by_cc", {}) or {})
        f5_cc_norm = {_norm_cc(k): v for k, v in f5_cc.items()}

        # A4: 个人 leads
        a4_records = self.ctx.data.get("leads", {}).get("leads_achievement_personal", {}).get("records", []) or []
        a4_cc: dict = {}
        for r in a4_records:
            name = _norm_cc(r.get("name", ""))
            if name:
                a4_cc[name] = r

        # E3: 订单（按 seller 聚合收入）
        e3_records = self.ctx.data.get("order", {}).get("order_detail", {}).get("records", []) or []
        e3_revenue: dict = {}
        for r in e3_records:
            seller = _norm_cc(r.get("seller", ""))
            if seller:
                e3_revenue[seller] = e3_revenue.get(seller, 0.0) + (r.get("amount_usd") or 0.0)

        # F9: 付费用户跟进
        f9_cc = (self.ctx.data.get("ops", {}).get("monthly_paid_followup", {}).get("by_cc", []) or [])
        f9_cc_norm = {_norm_cc(r.get("cc_name", "")): r for r in f9_cc if r.get("cc_name")}

        # 合并所有 CC 姓名
        all_cc_names = set(d1_cc.keys()) | set(f5_cc_norm.keys()) | set(a4_cc.keys())
        all_cc_names.discard("")

        # 获取原始姓名映射（用于展示）
        raw_name_map: dict = {}
        for r in (self.ctx.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []):
            raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")
        for name in f5_cc.keys():
            raw_name_map[_norm_cc(name)] = name
        for r in a4_records:
            raw_name_map[_norm_cc(r.get("name", ""))] = r.get("name", "")

        profiles = []
        for norm_name in all_cc_names:
            d1_row = d1_cc.get(norm_name, {})
            f5_row = f5_cc_norm.get(norm_name, {})
            a4_row = a4_cc.get(norm_name, {})
            f9_row = f9_cc_norm.get(norm_name, {})

            team = (
                d1_row.get("team")
                or f5_row.get("team")
                or a4_row.get("group")
                or None
            )

            checkin_rate        = d1_row.get("checkin_24h_rate")
            _ranking_targets    = (
                self.ctx.project_config.ranking_targets
                if self.ctx.project_config is not None
                else {}
            )
            checkin_target      = d1_row.get("checkin_24h_target") or _ranking_targets.get(
                "checkin_rate_target", 0.6
            )
            checkin_achievement = _safe_div(checkin_rate, checkin_target) if checkin_rate else None

            # 外呼达标：以总通话量判断（粗估，目标从 ranking_targets 读取）
            total_calls  = f5_row.get("total_calls") or 0
            total_days   = len(f5_row.get("dates", [])) or 1
            avg_calls    = _safe_div(total_calls, total_days)
            _calls_target = _ranking_targets.get("outreach_calls_per_day", 30.0)
            outreach_score = min(1.0, _safe_div(avg_calls, _calls_target) or 0.0)

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
                _conv_full = _ranking_targets.get("conversion_rate_full_score", 0.3)
                scores.append(min(1.0, conversion_rate / _conv_full) * 25)
            # 收入贡献：相对分，暂填满分组均值占比
            scores.append(25.0)  # 收入维度留待后处理归一化

            composite_score = round(sum(scores), 1)

            strengths:  list = []
            weaknesses: list = []
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
                "cc_name":        raw_name_map.get(norm_name, norm_name),
                "team":           team,
                "checkin_24h":    checkin_rate,
                "checkin_target": checkin_target,
                "outreach_score": round(outreach_score, 4),
                "avg_daily_calls": round(avg_calls, 1) if avg_calls else None,
                "conversion_rate": conversion_rate,
                "leads":           leads,
                "paid":            paid,
                "revenue_usd":     round(revenue, 2),
                "composite_score": composite_score,
                "strengths":       strengths,
                "weaknesses":      weaknesses,
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
                "avg_composite":  round(statistics.mean(vals["scores"]), 1) if vals["scores"] else None,
                "avg_checkin":    round(statistics.mean(vals["checkin"]), 4) if vals["checkin"] else None,
                "avg_conversion": round(statistics.mean(vals["conversion"]), 4) if vals["conversion"] else None,
            }

        return {
            "profiles":        profiles,
            "team_averages":   team_averages,
            "top_performers":  profiles[:5],
            "needs_attention": profiles[-5:] if len(profiles) >= 5 else profiles,
        }

    # ── CC 排名（三类18维加权）────────────────────────────────────────────────

    def analyze_cc_ranking(self) -> list:
        """CC 排名：三类18维加权算法
        - 过程指标 (25%): 外呼/接通/有效接通/付费前跟进/预约课前跟进/预约课后跟进/付费后跟进
        - 结果指标 (60%): 注册数/leads数/转介绍用户数/客单价/付费单量/转介绍业绩/业绩占比
        - 效率指标 (15%): 注册→付费转化率/打卡率/参与率/带新系数
        """

        # ── 数据源加载 ────────────────────────────────────────────────────────

        # D1: 24H 打卡率 (by_cc = list)
        d1_by_cc_list = (
            self.ctx.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []
        )
        d1_cc: dict = {}
        for r in d1_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                d1_cc[nm] = r

        # D5: 打卡参与率 (by_cc = list)
        d5_by_cc_list = (
            self.ctx.data.get("kpi", {}).get("checkin_rate_monthly", {}).get("by_cc", []) or []
        )
        d5_cc: dict = {}
        for r in d5_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                d5_cc[nm] = r

        # F5: 每日外呼 (by_cc = dict)
        f5_by_cc_raw = (
            self.ctx.data.get("ops", {}).get("daily_outreach", {}).get("by_cc", {}) or {}
        )
        f5_cc: dict = {_norm_cc(k): v for k, v in f5_by_cc_raw.items()}

        # F6: 体验课跟进 (by_cc = dict)
        f6_by_cc_raw = (
            self.ctx.data.get("ops", {}).get("trial_followup", {}).get("by_cc", {}) or {}
        )
        f6_cc: dict = {_norm_cc(k): v for k, v in f6_by_cc_raw.items()}

        # F7: 付费用户跟进 (by_cc = dict)
        f7_by_cc_raw = (
            self.ctx.data.get("ops", {}).get("paid_user_followup", {}).get("by_cc", {}) or {}
        )
        f7_cc: dict = {_norm_cc(k): v for k, v in f7_by_cc_raw.items()}

        # F9: 月度付费用户跟进 (by_cc = list)
        f9_by_cc_list = (
            self.ctx.data.get("ops", {}).get("monthly_paid_followup", {}).get("by_cc", []) or []
        )
        f9_cc: dict = {}
        for r in f9_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                f9_cc[nm] = r

        # F10: 首次体验课课前课后跟进 (by_cc = list)
        f10_by_cc_list = (
            self.ctx.data.get("ops", {}).get("trial_class_followup", {}).get("by_cc", []) or []
        )
        f10_cc: dict = {}
        for r in f10_by_cc_list:
            nm = _norm_cc(r.get("cc_name", ""))
            if nm:
                f10_cc[nm] = r

        # A3: leads明细 (by_cc = dict)
        a3_by_cc_raw = (
            self.ctx.data.get("leads", {}).get("leads_detail", {}).get("by_cc", {}) or {}
        )
        a3_cc: dict = {_norm_cc(k): v for k, v in a3_by_cc_raw.items()}

        # A4: 个人leads达成 (records = list)
        a4_records = (
            self.ctx.data.get("leads", {}).get("leads_achievement_personal", {}).get("records", []) or []
        )
        a4_cc: dict = {}
        for r in a4_records:
            nm = _norm_cc(r.get("name", ""))
            if nm:
                a4_cc[nm] = r

        # E3: 订单明细 - 按 CC/seller 聚合收入和付费单量
        e3_records = (
            self.ctx.data.get("order", {}).get("order_detail", {}).get("records", []) or []
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
            d1  = d1_cc.get(nm, {})
            d5  = d5_cc.get(nm, {})
            f5  = f5_cc.get(nm, {})
            f6  = f6_cc.get(nm, {})
            f7  = f7_cc.get(nm, {})
            f9  = f9_cc.get(nm, {})
            f10 = f10_cc.get(nm, {})
            a3  = a3_cc.get(nm, {})
            a4  = a4_cc.get(nm, {})
            e3  = e3_cc.get(nm, {})

            # 过程指标原始值
            outreach_calls  = f5.get("total_calls") or 0
            connected_calls = f5.get("total_connects") or 0
            effective_calls = f5.get("total_effective") or 0

            # 付费前跟进: F6 called_24h (体验课跟进)
            pre_paid_followup   = f6.get("called_24h") or 0
            # 预约课前跟进: F10 pre_called
            pre_class_followup  = f10.get("pre_called") or 0
            # 预约课后跟进: F10 post_called
            post_class_followup = f10.get("post_called") or 0
            # 付费后跟进: F7 monthly_called，fallback F9
            post_paid_followup  = (
                (f7.get("monthly_called") or 0)
                or (f9.get("monthly_called") or 0)
            )

            # 结果指标原始值
            # Bug 2 fix: registrations 取实际注册人数字段，与 leads_count（转介绍leads数）区分
            registrations  = (
                a3.get("注册") or a3.get("registered") or a4.get("registered") or 0
            )
            leads_count    = a3.get("leads") or a4.get("leads") or 0
            # Bug 3 fix: 转介绍用户数 = 转介绍注册人数 = leads数，fallback 到 leads_count
            referral_users = (
                a3.get("推荐注册") or a3.get("referral_registered")
                or a4.get("referral_users") or leads_count
            )
            paid_count_e3  = e3.get("paid_count") or 0
            revenue_usd    = e3.get("revenue_usd") or 0.0
            # 客单价 (ASP)
            amounts = e3.get("amounts", []) or []
            asp_usd = (sum(amounts) / len(amounts)) if amounts else 0.0
            # 业绩占比
            revenue_share = revenue_usd / team_revenue_total

            # 效率指标原始值
            paid_for_conv    = a3.get("付费") or a4.get("paid") or paid_count_e3
            conversion_rate  = _safe_pct(paid_for_conv, registrations) or 0.0
            checkin_rate     = min(d1.get("checkin_24h_rate") or d5.get("checkin_rate") or 0.0, 1.0)
            contact_rate     = min(_safe_pct(effective_calls, outreach_calls) or 0.0, 1.0)
            # 参与率: D5 participation_rate
            participation_rate = min(d5.get("participation_rate") or 0.0, 1.0)
            # 带新系数: D1 referral_coefficient 或 D5 referral_coefficient_total
            bring_new_coeff = (
                d1.get("referral_coefficient")
                or d5.get("referral_coefficient_total")
                or 0.0
            )

            raw_data.append({
                "cc_name":   raw_name_map.get(nm, nm),
                "norm_name": nm,
                "team":      _get_team(nm),
                # 过程
                "outreach_calls":     outreach_calls,
                "connected_calls":    connected_calls,
                "effective_calls":    effective_calls,
                "pre_paid_followup":  pre_paid_followup,
                "pre_class_followup": pre_class_followup,
                "post_class_followup": post_class_followup,
                "post_paid_followup": post_paid_followup,
                # 结果
                "registrations":  registrations,
                "leads_count":    leads_count,
                "referral_users": referral_users,
                "asp_usd":        asp_usd,
                "paid_count":     paid_count_e3,
                "revenue_usd":    revenue_usd,
                "revenue_share":  revenue_share,
                # 效率
                "conversion_rate":    conversion_rate,
                "checkin_rate":       checkin_rate,
                "contact_rate":       contact_rate,
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
            "conversion_rate", "checkin_rate", "contact_rate", "participation_rate", "bring_new_coeff",
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

        def _has_data(key: str) -> bool:
            return any(row[key] for row in raw_data)

        # Bug 1 fix: 类内权重归一化到 1.0，_score() 返回 0~1，
        # 再乘类别权重（0.25/0.60/0.15）后 composite_score 满分=1.0
        PROCESS_DIMS = [
            ("outreach_calls",      0.1600),  # 0.04 / 0.25
            ("connected_calls",     0.1600),  # 0.04 / 0.25
            ("effective_calls",     0.2000),  # 0.05 / 0.25
            ("pre_paid_followup",   0.1200),  # 0.03 / 0.25
            ("pre_class_followup",  0.1200),  # 0.03 / 0.25
            ("post_class_followup", 0.1200),  # 0.03 / 0.25
            ("post_paid_followup",  0.1200),  # 0.03 / 0.25
        ]
        RESULT_DIMS = [
            ("registrations",  0.2000),  # 0.12 / 0.60
            ("leads_count",    0.1333),  # 0.08 / 0.60
            ("referral_users", 0.1333),  # 0.08 / 0.60
            ("asp_usd",        0.1167),  # 0.07 / 0.60
            ("paid_count",     0.2000),  # 0.12 / 0.60
            ("revenue_usd",    0.1500),  # 0.09 / 0.60
            ("revenue_share",  0.0667),  # 0.04 / 0.60
        ]
        EFFICIENCY_DIMS = [
            ("conversion_rate",    0.3333),  # 0.05 / 0.15
            ("checkin_rate",       0.2667),  # 0.04 / 0.15
            ("participation_rate", 0.2000),  # 0.03 / 0.15
            ("bring_new_coeff",    0.2000),  # 0.03 / 0.15
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

            def _score(dims) -> float:
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
                "cc_name":          row["cc_name"],
                "team":             row["team"],
                "rank":             None,  # 填充在排序后
                "composite_score":  round(composite_score, 4),
                "process_score":    round(process_score, 4),
                "result_score":     round(result_score, 4),
                "efficiency_score": round(efficiency_score, 4),
                # 关键业务指标（前端/适配器消费）
                "registrations":    row["registrations"],
                "payments":         row["paid_count"],
                "revenue_usd":      round(row["revenue_usd"], 2),
                "checkin_rate":     row["checkin_rate"],
                "contact_rate":     row["contact_rate"],
                "conversion_rate":  row["conversion_rate"],
                "detail":           detail,
            })

        ranking.sort(key=lambda x: x["composite_score"], reverse=True)
        for i, item in enumerate(ranking):
            item["rank"] = i + 1

        return ranking

    # ── SS/LP 排名 ────────────────────────────────────────────────────────────
    def analyze_ss_lp_ranking(self) -> dict:
        """SS/LP 排名：跨源采集人员，解决单独从 A4 导致的人数缺失问题"""
        # ── 数据源收集 ────────────────────────────────────────────────────────
        d1_list = self.ctx.data.get("kpi", {}).get("north_star_24h", {}).get("by_cc", []) or []
        d5_list = self.ctx.data.get("kpi", {}).get("checkin_rate_monthly", {}).get("by_cc", []) or []
        f5_dict = self.ctx.data.get("ops", {}).get("daily_outreach", {}).get("by_cc", {}) or {}
        a4_records = self.ctx.data.get("leads", {}).get("leads_achievement_personal", {}).get("records", []) or []
        f10_list = self.ctx.data.get("ops", {}).get("trial_class_followup", {}).get("by_cc", []) or []

        d1_cc = {_norm_cc(r.get("cc_name", "")): r for r in d1_list if r.get("cc_name")}
        d5_cc = {_norm_cc(r.get("cc_name", "")): r for r in d5_list if r.get("cc_name")}
        f5_cc = {_norm_cc(k): v for k, v in f5_dict.items()}
        a4_cc = {_norm_cc(r.get("name", "")): r for r in a4_records if r.get("name")}
        f10_cc = {_norm_cc(r.get("cc_name", "")): r for r in f10_list if r.get("cc_name")}
        
        all_cc = set(d1_cc.keys()) | set(d5_cc.keys()) | set(f5_cc.keys()) | set(a4_cc.keys()) | set(f10_cc.keys())
        all_cc.discard("")

        raw_name_map = {}
        for r in d1_list: raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")
        for r in d5_list: raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")
        for k in f5_dict: raw_name_map[_norm_cc(k)] = k
        for r in a4_records: raw_name_map[_norm_cc(r.get("name", ""))] = r.get("name", "")
        for r in f10_list: raw_name_map[_norm_cc(r.get("cc_name", ""))] = r.get("cc_name", "")

        def _get_team(nm: str) -> str:
            return (
                (d1_cc.get(nm) or {}).get("team")
                or (f5_cc.get(nm) or {}).get("team")
                or (a4_cc.get(nm) or {}).get("group")
                or (a4_cc.get(nm) or {}).get("team")
                or (f10_cc.get(nm) or {}).get("team")
                or ""
            )

        ss_raw: list = []
        lp_raw: list = []

        for nm in all_cc:
            team_str = _get_team(nm)
            team_upper = team_str.upper() if team_str else ""

            # Since names are like TH-CC05Team, TH-SS04Team, we can just do exact checks:
            # We must be careful that "EA" is inside "TEAM", so we check for "-EA", "-SS" etc.
            is_ss = ("-SS" in team_upper) or (team_upper.startswith("SS")) or ("-EA" in team_upper) or (team_upper.startswith("EA")) or ("EA" in team_upper and "TEAM" not in team_upper)
            is_lp = ("-LP" in team_upper) or (team_upper.startswith("LP")) or ("-CM" in team_upper) or (team_upper.startswith("CM"))

            if not is_ss and not is_lp:
                continue
            a4 = a4_cc.get(nm, {})
            d1 = d1_cc.get(nm, {})
            d5 = d5_cc.get(nm, {})
            f5 = f5_cc.get(nm, {})

            leads = a4.get("leads") or 0
            reserve = a4.get("reserve") or 0
            showup = a4.get("showup") or 0
            paid = a4.get("paid") or 0
            conversion = a4.get("conversion_rate") or _safe_pct(paid, leads) or 0.0

            outreach_calls = f5.get("total_calls") or 0
            effective_calls = f5.get("total_effective") or 0
            contact_rate = _safe_pct(effective_calls, outreach_calls) or 0.0

            checkin_rate = min(d1.get("checkin_24h_rate") or d5.get("checkin_rate") or 0.0, 1.0)
            participation_rate = min(d5.get("participation_rate") or 0.0, 1.0)
            new_coeff = d1.get("referral_coefficient") or d5.get("referral_coefficient_total") or 0.0

            record = {
                "norm_name":          nm,
                "name":               raw_name_map.get(nm, nm),
                "team":               team_str,
                "group":              a4.get("group") or team_str,
                "leads":              leads,
                "reserve":            reserve,
                "showup":             showup,
                "paid":               paid,
                "cc_converted_paid":  paid,
                "conversion_rate":    conversion,
                "leads_to_cc_rate":   conversion,
                "contact_rate":       contact_rate,
                "checkin_rate":       checkin_rate,
                "participation_rate": participation_rate,
                "new_coeff":          new_coeff,
            }
            if is_ss:
                ss_raw.append(record)
            elif is_lp:
                lp_raw.append(record)

        # ── paid_share 预计算（按角色分组，除零保护）────────────────────────────

        ss_total_paid = sum(r["paid"] for r in ss_raw) or 0
        lp_total_paid = sum(r["paid"] for r in lp_raw) or 0

        for r in ss_raw:
            r["paid_share"] = _safe_div(r["paid"], ss_total_paid) if ss_total_paid else 0.0
        for r in lp_raw:
            r["paid_share"] = _safe_div(r["paid"], lp_total_paid) if lp_total_paid else 0.0

        # ── SS/LP 共用评分常量 ────────────────────────────────────────────────

        SS_LP_DIMS = {
            "process":      [("contact_rate", 0.5), ("checkin_rate", 0.5)],
            "result":       [("leads", 1.0)],
            "quality":      [("conversion_rate", 1.0)],
            "contribution": [("paid_share", 1.0)],
        }
        SS_LP_WEIGHTS = {"process": 0.25, "result": 0.30, "quality": 0.25, "contribution": 0.20}
        SS_LP_METRIC_KEYS = ["contact_rate", "checkin_rate", "leads", "conversion_rate", "paid_share"]

        def _build_ranked_list(data_list: list) -> list:
            """对单个角色列表执行 min-max 归一化 + 综合评分 + 排序。"""
            if not data_list:
                return []

            # min-max 归一化（独立于本角色列表）
            def _minmax_role(key: str) -> dict:
                values = [r[key] for r in data_list if r.get(key) is not None]
                if not values:
                    return {r["norm_name"]: 0.5 for r in data_list}
                mn, mx = min(values), max(values)
                result: dict = {}
                for r in data_list:
                    v = r.get(key)
                    if v is None:
                        result[r["norm_name"]] = 0.5
                    elif mx == mn:
                        result[r["norm_name"]] = 0.5
                    else:
                        result[r["norm_name"]] = (v - mn) / (mx - mn)
                return result

            norm_maps_role = {k: _minmax_role(k) for k in SS_LP_METRIC_KEYS}

            # _redistribute 模式：无数据维度等比分摊权重
            def _has_role_data(key: str) -> bool:
                return any(r.get(key) for r in data_list)

            def _redistribute_role(dims: list) -> list:
                active = [(k, w) for k, w in dims if _has_role_data(k)]
                inactive_w = sum(w for k, w in dims if not _has_role_data(k))
                if not active:
                    return []
                total_active_w = sum(w for _, w in active)
                if total_active_w <= 0:
                    return active
                scale = (total_active_w + inactive_w) / total_active_w
                return [(k, round(w * scale, 6)) for k, w in active]

            active_dims = {cat: _redistribute_role(dims) for cat, dims in SS_LP_DIMS.items()}

            ranked: list = []
            for r in data_list:
                nm = r["norm_name"]

                def _cat_score(cat: str) -> float:
                    dims = active_dims.get(cat, [])
                    if not dims:
                        return 0.5
                    return sum(norm_maps_role[k][nm] * w for k, w in dims)

                process_score      = _cat_score("process")
                result_score       = _cat_score("result")
                quality_score      = _cat_score("quality")
                contribution_score = _cat_score("contribution")
                composite_score = (
                    process_score      * SS_LP_WEIGHTS["process"]
                    + result_score     * SS_LP_WEIGHTS["result"]
                    + quality_score    * SS_LP_WEIGHTS["quality"]
                    + contribution_score * SS_LP_WEIGHTS["contribution"]
                )

                detail = {
                    "reserve":            {"raw": r["reserve"],            "norm": 0.5},
                    "showup":             {"raw": r["showup"],             "norm": 0.5},
                    "contact_rate":       {"raw": r["contact_rate"],       "norm": round(norm_maps_role["contact_rate"][nm], 4)},
                    "checkin_rate":       {"raw": r["checkin_rate"],       "norm": round(norm_maps_role["checkin_rate"][nm], 4)},
                    "leads":              {"raw": r["leads"],              "norm": round(norm_maps_role["leads"][nm], 4)},
                    "conversion_rate":    {"raw": r["conversion_rate"],    "norm": round(norm_maps_role["conversion_rate"][nm], 4)},
                    "paid_share":         {"raw": r["paid_share"],         "norm": round(norm_maps_role["paid_share"][nm], 4)},
                    "participation_rate": {"raw": r["participation_rate"], "norm": 0.5},
                    "new_coefficient":    {"raw": r["new_coeff"],          "norm": 0.5},
                }

                ranked.append({
                    "name":               r["name"],
                    "team":               r["team"],
                    "group":              r["group"],
                    "rank":               None,  # 填充在排序后
                    "composite_score":    round(composite_score, 4),
                    "process_score":      round(process_score, 4),
                    "result_score":       round(result_score, 4),
                    "quality_score":      round(quality_score, 4),
                    "contribution_score": round(contribution_score, 4),
                    "leads":              r["leads"],
                    "paid":               r["paid"],
                    "cc_converted_paid":  r["cc_converted_paid"],
                    "reserve":            None,   # SS/LP 不参与预约流程
                    "showup":             None,   # SS/LP 不参与出席流程
                    "conversion_rate":    r["conversion_rate"],
                    "leads_to_cc_rate":   r["leads_to_cc_rate"],
                    "contact_rate":       r["contact_rate"],
                    "checkin_rate":       r["checkin_rate"],
                    "participation_rate": r["participation_rate"],
                    "paid_share":         round(r["paid_share"], 4),
                    "detail":             detail,
                })

            ranked.sort(key=lambda x: x["composite_score"], reverse=True)
            for i, item in enumerate(ranked):
                item["rank"] = i + 1

            return ranked

        ss_list = _build_ranked_list(ss_raw)
        lp_list = _build_ranked_list(lp_raw)

        return {"ss": ss_list, "lp": lp_list}
