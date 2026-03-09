"""
OrderAnalyzer — 订单分析 + 人效分析
从 analysis_engine_v2.py 行 1083-1251 提取。
"""

from __future__ import annotations

from .context import AnalyzerContext
from .utils import _safe_div


class OrderAnalyzer:
    def __init__(self, ctx: AnalyzerContext) -> None:
        self.ctx = ctx

    def analyze_productivity(self) -> dict:
        """人效分析：E1/E2 上班人数 × E3 订单 × E5 业绩趋势"""
        ctx = self.ctx
        e1 = ctx.data.get("order", {}).get("cc_attendance", []) or []
        e2 = ctx.data.get("order", {}).get("ss_attendance", []) or []
        e3_summary = (
            ctx.data.get("order", {}).get("order_detail", {}).get("summary", {}) or {}
        )
        e3_by_team = (
            ctx.data.get("order", {}).get("order_detail", {}).get("by_team", {}) or {}
        )

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
        e5 = ctx.data.get("order", {}).get("revenue_daily_trend", []) or []
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

    def analyze_orders(self) -> dict:
        """订单分析：E3-E8"""
        ctx = self.ctx
        e3 = ctx.data.get("order", {}).get("order_detail", {})
        e3_summary = e3.get("summary", {}) or {}
        e3_by_team = e3.get("by_team", {}) or {}
        e3_by_channel = e3.get("by_channel", {}) or {}

        e4 = ctx.data.get("order", {}).get("order_daily_trend", []) or []
        e5 = ctx.data.get("order", {}).get("revenue_daily_trend", []) or []
        e6 = ctx.data.get("order", {}).get("package_ratio", {}) or {}
        e7_raw = (
            ctx.data.get("order", {}).get("team_package_ratio", {}).get("by_team", [])
            or []
        )
        e8_raw = (
            ctx.data.get("order", {})
            .get("channel_revenue", {})
            .get("by_channel_product", [])
            or []
        )

        total_orders = e3_summary.get("total_orders", 0)
        new_orders = e3_summary.get("new_orders", 0)
        renewal = e3_summary.get("renewal_orders", 0)
        rev_cny = e3_summary.get("total_revenue_cny", 0.0)
        rev_usd = e3_summary.get("total_revenue_usd", 0.0)

        # 日趋势整合
        e4_by_date = {r["date"]: r for r in e4}
        e5_by_date = {r["date"]: r for r in e5}
        all_dates = sorted(set(e4_by_date) | set(e5_by_date))
        daily_trend = [
            {
                "date": d,
                "order_count": e4_by_date.get(d, {}).get("order_count"),
                "revenue_cny": e5_by_date.get(d, {}).get("revenue_cny"),
            }
            for d in all_dates
        ]

        # E7: 分小组套餐占比 → 标准化
        team_package = self._normalize_team_package(e7_raw)

        # E8: 渠道×套餐金额 → 标准化
        channel_product = self._normalize_channel_revenue(e8_raw)

        return {
            "summary": {
                "total": total_orders,
                "new": new_orders,
                "renewal": renewal,
                "revenue_cny": round(rev_cny, 2),
                "revenue_usd": round(rev_usd, 2),
            },
            "by_channel": e3_by_channel,
            "by_team": list(e3_by_team.values())
            if isinstance(e3_by_team, dict)
            else e3_by_team,
            "records": e3.get("records", []),
            "daily_trend": daily_trend,
            "package_distribution": e6,
            "team_package": team_package,
            "channel_product": channel_product,
        }

    def _normalize_team_package(self, raw: list) -> list:
        """将 E7 双层表头展平数据归一化为 [{team, items: [{product_type, ratio}]}]"""
        if not raw:
            return []
        result = []
        for row in raw:
            if not isinstance(row, dict):
                continue
            cols = list(row.keys())
            if not cols:
                continue
            team_name = str(row.get(cols[0], "")).strip()
            if not team_name or team_name.lower() in ("nan", "none", ""):
                continue
            items = []
            for col in cols[1:]:
                val = row.get(col)
                if val is None:
                    continue
                try:
                    ratio = float(val)
                    items.append(
                        {"product_type": str(col).strip(), "ratio": round(ratio, 4)}
                    )
                except (TypeError, ValueError):
                    pass
            result.append({"team": team_name, "items": items})
        return result

    def _normalize_channel_revenue(self, raw: list) -> list:
        """将 E8 渠道×套餐金额数据归一化为 [{channel, product, amount_usd, amount_thb}]"""
        if not raw:
            return []
        result = []
        for row in raw:
            if not isinstance(row, dict):
                continue
            cols = list(row.keys())
            if len(cols) < 2:
                continue
            product_col = cols[0]
            product_name = str(row.get(product_col, "")).strip()
            if not product_name or product_name.lower() in ("nan", "none", ""):
                continue
            for col in cols[1:]:
                val = row.get(col)
                if val is None:
                    continue
                try:
                    amount = float(val)
                    if amount <= 0:
                        continue
                    channel_name = str(col).strip()
                    # amount 字段通常是 THB，转 USD（÷34）
                    amount_usd = round(amount / 34.0, 2)
                    result.append(
                        {
                            "channel": channel_name,
                            "product": product_name,
                            "amount_usd": amount_usd,
                            "amount_thb": round(amount, 2),
                        }
                    )
                except (TypeError, ValueError):
                    pass
        return result
