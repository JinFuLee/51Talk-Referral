"""交叉分析引擎 — CrossAnalyzer

整合 D1/D2/D3/D4/D5 数据，提供跨维度交叉分析能力。
"""

from __future__ import annotations

import logging
import math
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def _safe(val) -> Any:
    """统一的安全值转换（NaN/Inf → None，数值字符串化兜底）"""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        f = float(val)
        return None if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return str(val) if val else None


def _pct(val) -> float | None:
    """转换百分比值，处理 None/NaN"""
    s = _safe(val)
    if s is None:
        return None
    return round(float(s) * 100, 2) if float(s) <= 1.5 else round(float(s), 2)


class CrossAnalyzer:
    """
    交叉分析引擎：接收 DataManager.load_all() 返回的 data dict，
    提供 5 个核心分析方法。
    """

    def __init__(self, data: dict[str, pd.DataFrame]) -> None:
        self._result: pd.DataFrame = data.get("result", pd.DataFrame())
        self._enclosure_cc: pd.DataFrame = data.get("enclosure_cc", pd.DataFrame())
        self._students: pd.DataFrame = data.get("students", pd.DataFrame())
        self._detail: pd.DataFrame = data.get("detail", pd.DataFrame())
        self._high_potential: pd.DataFrame = data.get("high_potential", pd.DataFrame())

    # ──────────────────────────────────────────────────────────────────────────
    # D1 摘要：第一行映射为英文字段 dict
    # ──────────────────────────────────────────────────────────────────────────

    def attribution_summary(self) -> dict[str, Any]:
        """D1 第一行全字段映射（中文列名 → 英文 key + 原始值）"""
        if self._result.empty:
            return {}

        row = self._result.iloc[0]

        col_map = {
            "统计日期": "stat_date",
            "区域": "region",
            "转介绍注册数": "registrations",
            "预约数": "appointments",
            "出席数": "attendances",
            "转介绍付费数": "payments",
            "客单价": "avg_order_value",
            "总带新付费金额USD": "total_revenue",
            "注册预约率": "reg_to_appt_rate",
            "预约出席率": "appt_to_attend_rate",
            "出席付费率": "attend_to_pay_rate",
            "注册转化率": "registration_conversion_rate",
            "转介绍基础业绩单量标": "monthly_target_units",
            "转介绍基础业绩标USD": "monthly_target_revenue",
            "转介绍基础业绩客单价标USD": "target_order_value",
            "区域单量达成率": "unit_achievement_rate",
            "区域业绩达成率": "revenue_achievement_rate",
            "区域转介绍客单价达成率": "order_value_achievement_rate",
        }

        result: dict[str, Any] = {}
        for cn, en in col_map.items():
            val = row.get(cn)
            result[en] = _safe(val)

        return result

    # ──────────────────────────────────────────────────────────────────────────
    # 归因拆解：按维度聚合付费数/金额/达成率
    # ──────────────────────────────────────────────────────────────────────────

    def attribution_breakdown(self, group_by: str) -> list[dict[str, Any]]:
        """
        归因拆解。

        group_by:
            "enclosure"  → D2 按围场聚合
            "cc"         → D2 按 CC 姓名聚合
            "channel"    → D4 按三级渠道聚合
            "lifecycle"  → D4 按生命周期聚合
        """
        # D1 目标：转介绍基础业绩单量标
        target_paid = self._d1_val("转介绍基础业绩单量标")

        if group_by in ("enclosure", "cc"):
            return self._breakdown_d2(group_by, target_paid)
        elif group_by == "channel":
            return self._breakdown_d4_channel(target_paid)
        elif group_by == "lifecycle":
            return self._breakdown_d4_lifecycle(target_paid)
        else:
            raise ValueError(f"不支持的 group_by 维度: {group_by}")

    def _d1_val(self, col: str) -> float | None:
        if self._result.empty:
            return None
        val = self._result.iloc[0].get(col)
        return _safe(val)

    def _breakdown_d2(
        self, group_by: str, target_paid: float | None
    ) -> list[dict[str, Any]]:
        df = self._enclosure_cc
        if df.empty:
            return []

        # 过滤：是否有效 == "是" 且 围场 != "小计"
        valid_col = df.get("是否有效", pd.Series(dtype=str))
        enc_col = df.get("围场", pd.Series(dtype=str))
        valid_mask = valid_col.astype(str).str.strip() == "是"
        enclosure_mask = enc_col.astype(str).str.strip() != "小计"
        df = df[valid_mask & enclosure_mask].copy()

        if df.empty:
            return []

        group_col = "围场" if group_by == "enclosure" else "last_cc_name"
        if group_col not in df.columns:
            logger.warning(f"D2 缺少列 {group_col}")
            return []

        agg = (
            df.groupby(group_col, dropna=False)
            .agg(
                paid_count=("转介绍付费数", "sum"),
                total_revenue_usd=("总带新付费金额USD", "sum"),
            )
            .reset_index()
        )

        results: list[dict[str, Any]] = []
        for _, row in agg.iterrows():
            paid = _safe(row["paid_count"])
            revenue = _safe(row["total_revenue_usd"])
            pct_of_target: float | None = None
            if target_paid and paid is not None and float(target_paid) > 0:
                pct_of_target = round(float(paid) / float(target_paid) * 100, 2)

            results.append(
                {
                    "dimension": group_by,
                    "group_key": str(row[group_col]) if row[group_col] else "",
                    "paid_count": paid,
                    "revenue": revenue,
                    "pct_of_target": pct_of_target,
                }
            )

        # 按付费数降序
        return sorted(results, key=lambda x: x["paid_count"] or 0, reverse=True)

    def _breakdown_d4_channel(
        self, target_paid: float | None
    ) -> list[dict[str, Any]]:
        df = self._students
        if df.empty:
            return []

        # 尝试确定三级渠道列名（D4 59列中可能的命名）
        channel_col = self._find_col(
            df,
            ["转介绍类型_新", "三级渠道", "referral_channel", "转介绍类型"],
        )
        if channel_col is None:
            logger.warning("D4 未找到渠道列，返回空")
            return []

        paid_col = self._find_col(
            df, ["本月推荐付费数", "转介绍付费数", "当月推荐付费数"]
        )
        revenue_col = self._find_col(
            df, ["总带新付费金额USD", "当月带新付费金额USD", "总推荐付费金额USD"]
        )

        return self._agg_d4(
            df, channel_col, paid_col, revenue_col, "channel", target_paid
        )

    def _breakdown_d4_lifecycle(
        self, target_paid: float | None
    ) -> list[dict[str, Any]]:
        df = self._students
        if df.empty:
            return []

        lifecycle_col = self._find_col(df, ["生命周期", "围场", "lifecycle"])
        if lifecycle_col is None:
            logger.warning("D4 未找到生命周期列，返回空")
            return []

        paid_col = self._find_col(
            df, ["本月推荐付费数", "转介绍付费数", "当月推荐付费数"]
        )
        revenue_col = self._find_col(
            df, ["总带新付费金额USD", "当月带新付费金额USD", "总推荐付费金额USD"]
        )

        return self._agg_d4(
            df, lifecycle_col, paid_col, revenue_col, "lifecycle", target_paid
        )

    def _agg_d4(
        self,
        df: pd.DataFrame,
        group_col: str,
        paid_col: str | None,
        revenue_col: str | None,
        dimension: str,
        target_paid: float | None,
    ) -> list[dict[str, Any]]:
        agg_cols: dict[str, Any] = {}
        if paid_col and paid_col in df.columns:
            agg_cols["paid_count"] = (paid_col, "sum")
        if revenue_col and revenue_col in df.columns:
            agg_cols["total_revenue_usd"] = (revenue_col, "sum")

        if not agg_cols:
            logger.warning(f"D4 无可聚合数值列 (dimension={dimension})")
            return []

        agg = df.groupby(group_col, dropna=False).agg(**agg_cols).reset_index()

        results: list[dict[str, Any]] = []
        for _, row in agg.iterrows():
            paid = _safe(row.get("paid_count")) if "paid_count" in row else None
            revenue = (
                _safe(row.get("total_revenue_usd"))
                if "total_revenue_usd" in row
                else None
            )
            pct_of_target: float | None = None
            if target_paid and paid is not None and float(target_paid) > 0:
                pct_of_target = round(float(paid) / float(target_paid) * 100, 2)

            results.append(
                {
                    "dimension": dimension,
                    "group_key": str(row[group_col]) if row[group_col] else "",
                    "paid_count": paid,
                    "revenue": revenue,
                    "pct_of_target": pct_of_target,
                }
            )

        return sorted(results, key=lambda x: x["paid_count"] or 0, reverse=True)

    @staticmethod
    def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
        for c in candidates:
            if c in df.columns:
                return c
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # 模拟预测：某 segment 注册转化率提升至 new_rate 后对达成率的影响
    # ──────────────────────────────────────────────────────────────────────────

    def attribution_simulation(
        self, segment: str, new_rate: float
    ) -> dict[str, Any]:
        """
        模拟：若 D2 中 segment(围场) 的注册转化率提升至 new_rate，预测达成率变化。

        返回:
            current_rate, current_registrations, current_paid,
            new_paid, delta, predicted_attainment_pct
        """
        df = self._enclosure_cc
        if df.empty:
            return self._empty_simulation()

        # 过滤有效数据 + 指定 segment
        valid_col = df.get("是否有效", pd.Series(dtype=str))
        enc_col = df.get("围场", pd.Series(dtype=str))
        valid_mask = valid_col.astype(str).str.strip() == "是"
        enclosure_mask = enc_col.astype(str).str.strip() != "小计"
        seg_mask = enc_col.astype(str).str.strip() == segment.strip()
        seg_df = df[valid_mask & enclosure_mask & seg_mask].copy()

        if seg_df.empty:
            logger.warning(f"simulation: segment '{segment}' 在 D2 中无数据")
            return self._empty_simulation()

        cols = seg_df.columns
        current_rate_mean = (
            _safe(seg_df["注册转化率"].mean()) if "注册转化率" in cols else None  # noqa: E501
        )
        current_registrations = (
            _safe(seg_df["转介绍注册数"].sum()) if "转介绍注册数" in cols else None  # noqa: E501
        )
        current_paid = (
            _safe(seg_df["转介绍付费数"].sum()) if "转介绍付费数" in cols else None  # noqa: E501
        )

        # 新付费 = 注册数 × new_rate
        new_paid: float | None = None
        delta: float | None = None
        if current_registrations is not None:
            new_paid = round(float(current_registrations) * new_rate, 2)
            if current_paid is not None:
                delta = round(new_paid - float(current_paid), 2)

        # 预测达成率 = (D1.转介绍付费数 + delta) / D1.转介绍基础业绩单量标 * 100
        predicted_attainment_pct: float | None = None
        d1_paid = self._d1_val("转介绍付费数")
        d1_target = self._d1_val("转介绍基础业绩单量标")
        if (
            delta is not None
            and d1_paid is not None
            and d1_target
            and float(d1_target) > 0
        ):
            predicted_attainment_pct = round(
                (float(d1_paid) + delta) / float(d1_target) * 100, 2
            )

        return {
            "segment": segment,
            "new_rate": new_rate,
            "current_rate": current_rate_mean,
            "current_registrations": current_registrations,
            "current_paid": current_paid,
            "new_paid": new_paid,
            "delta": delta,
            "predicted_achievement": predicted_attainment_pct,
            "d1_paid_count": d1_paid,
            "d1_target_paid": d1_target,
        }

    @staticmethod
    def _empty_simulation() -> dict[str, Any]:
        return {
            "segment": None,
            "new_rate": None,
            "current_rate": None,
            "current_registrations": None,
            "current_paid": None,
            "new_paid": None,
            "delta": None,
            "predicted_achievement": None,
            "d1_paid_count": None,
            "d1_target_paid": None,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # 高潜作战室：D5 × D3 联合分析
    # ──────────────────────────────────────────────────────────────────────────

    def hp_warroom(
        self,
        urgency: str | None = None,
        cc_names: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        高潜作战室：D5 × D3 merge，补充联络状态 + urgency。

        urgency: "red" / "yellow" / "green" / None（不过滤）
        cc_names: CC 姓名过滤列表（空/None = 不过滤）
        """
        hp = self._high_potential
        detail = self._detail

        if hp.empty:
            return []

        # D5 × D3 left merge on stdt_id
        merged = self._merge_hp_detail(hp, detail)

        results: list[dict[str, Any]] = []
        for _, row in merged.iterrows():
            item = self._build_warroom_item(row)
            results.append(item)

        # 过滤 urgency
        if urgency:
            results = [r for r in results if r.get("urgency_level") == urgency]

        # 过滤 cc_names
        if cc_names:
            cc_set = {n.strip() for n in cc_names}
            results = [r for r in results if r.get("cc_name") in cc_set]

        # 按 urgency_score 降序（red=3, yellow=2, green=1）
        urgency_order = {"red": 3, "yellow": 2, "green": 1}
        results.sort(
            key=lambda x: urgency_order.get(x.get("urgency_level", ""), 0),
            reverse=True,
        )

        return results

    def _merge_hp_detail(
        self, hp: pd.DataFrame, detail: pd.DataFrame
    ) -> pd.DataFrame:
        """D5 left merge D3，按 stdt_id 聚合 D3 联络指标"""
        if detail.empty or "stdt_id" not in detail.columns:
            return hp.copy()

        if "stdt_id" not in hp.columns:
            return hp.copy()

        # D3 聚合：每个学员的联络摘要
        d3_agg = self._aggregate_detail(detail)

        merged = hp.merge(d3_agg, on="stdt_id", how="left")
        return merged

    def _aggregate_detail(self, detail: pd.DataFrame) -> pd.DataFrame:
        """将 D3 按 stdt_id 聚合为联络摘要"""
        agg_dict: dict[str, Any] = {}

        if "CC接通" in detail.columns:
            agg_dict["contact_count_7d"] = ("CC接通", "sum")
        if "有效打卡" in detail.columns:
            agg_dict["checkin_7d"] = ("有效打卡", "sum")

        if not agg_dict:
            return pd.DataFrame({"stdt_id": detail["stdt_id"].unique()})

        agg = detail.groupby("stdt_id", dropna=False).agg(**agg_dict).reset_index()

        # last_contact_date：CC接通==1 的最新统计日期
        if "CC接通" in detail.columns and "统计日期" in detail.columns:
            contacted = detail[detail["CC接通"].astype(str).str.strip() == "1"].copy()
            if not contacted.empty:
                last_contact = (
                    contacted.groupby("stdt_id")["统计日期"].max().reset_index()
                )
                last_contact.columns = ["stdt_id", "last_contact_date"]
                agg = agg.merge(last_contact, on="stdt_id", how="left")
            else:
                agg["last_contact_date"] = None
        else:
            agg["last_contact_date"] = None

        return agg

    def _build_warroom_item(self, row: pd.Series) -> dict[str, Any]:
        """构建单个高潜学员的作战室数据项"""
        stdt_id = str(row.get("stdt_id", "") or "")

        # 计算 days_remaining（30天围场周期 - 已过天数）
        days_remaining: int | None = None
        stat_date_raw = row.get("统计日期")
        if stat_date_raw is not None:
            try:
                stat_date = pd.to_datetime(stat_date_raw)
                elapsed = (pd.Timestamp.now().normalize() - stat_date).days
                days_remaining = max(0, 30 - elapsed)
            except Exception:
                days_remaining = None

        # urgency_level 判定
        contact_count = _safe(row.get("contact_count_7d"))
        payments = _safe(row.get("转介绍付费数"))
        total_new = _safe(row.get("总带新人数"))

        urgency_level = self._compute_urgency(
            days_remaining=days_remaining,
            contact_count=contact_count,
            payments=payments,
            total_new=total_new,
        )

        return {
            "stdt_id": stdt_id,
            "region": str(row.get("区域", "") or ""),
            "business_line": str(row.get("业务线", "") or ""),
            "enclosure": str(row.get("围场", "") or ""),
            "total_new": total_new,
            "attendance": _safe(row.get("出席数")),
            "payments": payments,
            "cc_name": str(row.get("last_cc_name", "") or ""),
            "cc_group": str(row.get("last_cc_group_name", "") or ""),
            "ss_name": str(row.get("last_ss_name", "") or ""),
            "ss_group": str(row.get("last_ss_group_name", "") or ""),
            "lp_name": str(row.get("last_lp_name", "") or ""),
            "lp_group": str(row.get("last_lp_group_name", "") or ""),
            "stat_date": str(stat_date_raw) if stat_date_raw else None,
            "last_contact_date": str(row.get("last_contact_date", "") or "") or None,
            "checkin_7d": _safe(row.get("checkin_7d")),
            "contact_count_7d": contact_count,
            "days_remaining": days_remaining,
            "urgency_level": urgency_level,
        }

    @staticmethod
    def _compute_urgency(
        days_remaining: int | None,
        contact_count: float | None,
        payments: float | None,
        total_new: float | None,
    ) -> str:
        """
        urgency_level 判定规则：
        - red:    days_remaining <= 7，或已有带新但零接通
        - yellow: days_remaining <= 15，或接通次数 < 2
        - green:  其他
        """
        if days_remaining is not None and days_remaining <= 7:
            return "red"

        if payments and float(payments) == 0 and total_new and float(total_new) > 0:
            return "red"

        if days_remaining is not None and days_remaining <= 15:
            return "yellow"

        if contact_count is not None and float(contact_count) < 2:
            return "yellow"

        return "green"

    # ──────────────────────────────────────────────────────────────────────────
    # daily_monitor：D3 日报触达分析
    # ──────────────────────────────────────────────────────────────────────────

    def daily_contact_stats(
        self,
        date: str | None = None,
        segments: list[str] | None = None,
        role: str | None = None,
    ) -> dict[str, Any]:
        """D3 聚合：总触达率 + 围场段分布 + 角色对比 + 带新漏斗"""
        df = self._detail
        if df.empty:
            return {
                "total_students": None,
                "cc_contact_rate": None,
                "ss_contact_rate": None,
                "lp_contact_rate": None,
                "by_segment": [],
                "funnel": {
                    "registrations": None,
                    "invitations": None,
                    "attendance": None,
                    "payments": None,
                    "revenue_usd": None,
                },
                "checkin_rate": None,
            }

        # 过滤日期
        if date and "统计日期" in df.columns:
            df = df[df["统计日期"].astype(str).str.startswith(date)].copy()

        # 过滤围场段
        if segments and "围场" in df.columns:
            df = df[df["围场"].astype(str).isin(segments)].copy()

        cols = df.columns

        # 整体触达率（mean of binary 0/1 列）
        overall_cc = _safe(df["CC接通"].mean()) if "CC接通" in cols else None
        overall_ss = _safe(df["SS接通"].mean()) if "SS接通" in cols else None
        overall_lp = _safe(df["LP接通"].mean()) if "LP接通" in cols else None

        # 围场段分布（by_segment = 前端期望的字段名）
        segment_breakdown: list[dict[str, Any]] = []
        if "围场" in cols:
            for seg, grp in df.groupby("围场", dropna=False):
                seg_str = str(seg) if seg else ""
                if seg_str in ("小计", ""):
                    continue
                student_cnt = int(len(grp))
                segment_breakdown.append(
                    {
                        "segment": seg_str,
                        "cc_rate": _safe(grp["CC接通"].mean())
                        if "CC接通" in cols
                        else None,
                        "ss_rate": _safe(grp["SS接通"].mean())
                        if "SS接通" in cols
                        else None,
                        "lp_rate": _safe(grp["LP接通"].mean())
                        if "LP接通" in cols
                        else None,
                        # 前端期望 students
                        "students": student_cnt,
                        "student_count": student_cnt,
                    }
                )

        # 带新漏斗（与前端 FunnelStats 对齐）
        funnel = {
            "registrations": _safe(df["转介绍注册数"].sum())
            if "转介绍注册数" in cols
            else None,
            "invitations": _safe(df["邀约数"].sum()) if "邀约数" in cols else None,
            "attendance": _safe(df["出席数"].sum()) if "出席数" in cols else None,
            # 前端期望 payments
            "payments": _safe(df["转介绍付费数"].sum())
            if "转介绍付费数" in cols
            else None,
            "paid_count": _safe(df["转介绍付费数"].sum())
            if "转介绍付费数" in cols
            else None,
            "revenue_usd": _safe(df["总带新付费金额USD"].sum())
            if "总带新付费金额USD" in cols
            else None,
        }

        # 整体打卡率（有效打卡 mean）
        checkin_rate = _safe(df["有效打卡"].mean()) if "有效打卡" in cols else None

        # 总学员数
        total_students: int | None = None
        if "stdt_id" in cols:
            total_students = int(df["stdt_id"].nunique())
        elif len(df) > 0:
            total_students = int(len(df))

        return {
            "total_students": total_students,
            "cc_contact_rate": overall_cc,
            "ss_contact_rate": overall_ss,
            "lp_contact_rate": overall_lp,
            "by_segment": segment_breakdown,
            "funnel": funnel,
            "checkin_rate": checkin_rate,
        }

    def daily_cc_ranking(self, role: str = "cc") -> list[dict[str, Any]]:
        """D3 按 last_cc_name 聚合接通数排行"""
        df = self._detail
        if df.empty:
            return []

        role_col_map = {
            "cc": "CC接通",
            "ss": "SS接通",
            "lp": "LP接通",
        }
        contact_col = role_col_map.get(role.lower(), "CC接通")
        if "last_cc_name" not in df.columns:
            return []

        agg_dict: dict[str, Any] = {}
        if contact_col in df.columns:
            agg_dict["contact_count"] = (contact_col, "sum")
            agg_dict["contact_rate"] = (contact_col, "mean")
        agg_dict["student_count"] = ("stdt_id", "nunique") if "stdt_id" in df.columns else ("last_cc_name", "count")  # noqa: E501

        agg = df.groupby("last_cc_name", dropna=False).agg(**agg_dict).reset_index()
        agg = agg.sort_values("contact_count", ascending=False)

        results = []
        for rank, (_, row) in enumerate(agg.iterrows(), start=1):
            results.append(
                {
                    "cc_name": str(row["last_cc_name"] or ""),
                    "role": role,
                    "contact_count": _safe(row.get("contact_count")),
                    "contact_rate": _safe(row.get("contact_rate")),
                    "student_count": int(row.get("student_count", 0) or 0),
                    "rank": rank,
                }
            )
        return results

    def contact_vs_conversion(self) -> list[dict[str, Any]]:
        """D3接通率 × D2转化率 → CC维度散点"""
        d3 = self._detail
        d2 = self._enclosure_cc

        if d3.empty or "last_cc_name" not in d3.columns:
            return []

        # D3: CC接通 mean by CC
        d3_agg_cols: dict[str, Any] = {}
        if "CC接通" in d3.columns:
            d3_agg_cols["contact_rate"] = ("CC接通", "mean")
        if not d3_agg_cols:
            return []

        d3_agg = d3.groupby("last_cc_name", dropna=False).agg(**d3_agg_cols).reset_index()  # noqa: E501

        # D2: 注册转化率 mean by CC，过滤有效且非小计
        if d2.empty or "last_cc_name" not in d2.columns or "注册转化率" not in d2.columns:  # noqa: E501
            # 无 D2 数据，仅返回 D3
            return [
                {
                    "cc_name": str(row["last_cc_name"] or ""),
                    "contact_rate": _safe(row.get("contact_rate")),
                    "conversion_rate": None,
                }
                for _, row in d3_agg.iterrows()
            ]

        valid_mask = d2.get("是否有效", pd.Series(dtype=str)).astype(str).str.strip() == "是"  # noqa: E501
        enc_mask = d2.get("围场", pd.Series(dtype=str)).astype(str).str.strip() != "小计"  # noqa: E501
        d2_valid = d2[valid_mask & enc_mask]

        d2_agg = (
            d2_valid.groupby("last_cc_name", dropna=False)
            .agg(conversion_rate=("注册转化率", "mean"))
            .reset_index()
        )

        merged = d3_agg.merge(d2_agg, on="last_cc_name", how="inner")
        return [
            {
                "cc_name": str(row["last_cc_name"] or ""),
                "contact_rate": _safe(row.get("contact_rate")),
                "conversion_rate": _safe(row.get("conversion_rate")),
            }
            for _, row in merged.iterrows()
        ]

    # ──────────────────────────────────────────────────────────────────────────
    # cc_matrix：CC×围场矩阵分析
    # ──────────────────────────────────────────────────────────────────────────

    def cc_enclosure_heatmap(
        self, metric: str = "带新系数", segments: list[str] | None = None
    ) -> dict[str, Any]:
        """D2 透视为 CC×围场 热力矩阵"""
        df = self._enclosure_cc
        if df.empty:
            return {"data": [], "rows": [], "cols": [], "metric": metric}

        # 过滤有效且非小计
        valid_mask = df.get("是否有效", pd.Series(dtype=str)).astype(str).str.strip() == "是"  # noqa: E501
        enc_mask = df.get("围场", pd.Series(dtype=str)).astype(str).str.strip() != "小计"  # noqa: E501
        df = df[valid_mask & enc_mask].copy()

        if segments:
            df = df[df["围场"].astype(str).isin(segments)].copy()

        if df.empty or "last_cc_name" not in df.columns or "围场" not in df.columns:
            return {"data": [], "rows": [], "cols": [], "metric": metric}

        # metric 列存在性检查
        if metric not in df.columns:
            logger.warning(f"cc_enclosure_heatmap: metric '{metric}' 不在 D2 列中")
            return {"data": [], "rows": [], "cols": [], "metric": metric}

        pivot = df.pivot_table(
            index="last_cc_name",
            columns="围场",
            values=metric,
            aggfunc="mean",
        )

        cells: list[dict[str, Any]] = []
        for cc_name, row in pivot.iterrows():
            for seg, val in row.items():
                cells.append(
                    {
                        "cc_name": str(cc_name or ""),
                        "segment": str(seg or ""),
                        "value": _safe(val),
                    }
                )

        return {
            "data": cells,
            "rows": [str(x or "") for x in pivot.index.tolist()],
            "cols": [str(x or "") for x in pivot.columns.tolist()],
            "metric": metric,
        }

    def cc_radar(self, cc_name: str) -> dict[str, Any]:
        """D2 单个CC的5维能力值"""
        df = self._enclosure_cc
        base = {
            "cc_name": cc_name,
            "participation_rate": None,
            "conversion_rate": None,
            "checkin_rate": None,
            "contact_rate": None,
            "carry_ratio": None,
        }
        if df.empty or "last_cc_name" not in df.columns:
            return base

        valid_mask = df.get("是否有效", pd.Series(dtype=str)).astype(str).str.strip() == "是"  # noqa: E501
        enc_mask = df.get("围场", pd.Series(dtype=str)).astype(str).str.strip() != "小计"  # noqa: E501
        cc_mask = df["last_cc_name"].astype(str) == cc_name
        filtered = df[valid_mask & enc_mask & cc_mask]

        if filtered.empty:
            return base

        def _mean(col: str) -> float | None:
            return _safe(filtered[col].mean()) if col in filtered.columns else None

        base["participation_rate"] = _mean("转介绍参与率")
        base["conversion_rate"] = _mean("注册转化率")
        base["checkin_rate"] = _mean("当月有效打卡率")
        base["contact_rate"] = _mean("CC触达率")
        base["carry_ratio"] = _mean("带货比")
        return base

    def cc_drilldown(self, cc_name: str, segment: str) -> list[dict[str, Any]]:
        """D4(students) 过滤 last_cc_name + 围场/生命周期 → 学员列表"""
        df = self._students
        if df.empty:
            return []

        if "last_cc_name" not in df.columns:
            return []

        cc_mask = df["last_cc_name"].astype(str) == cc_name

        # 围场 or 生命周期匹配
        seg_mask = pd.Series([False] * len(df), index=df.index)
        for col in ("围场", "生命周期"):
            if col in df.columns:
                seg_mask = seg_mask | (df[col].astype(str) == segment)

        filtered = df[cc_mask & seg_mask]

        results = []
        for _, row in filtered.iterrows():
            stdt_id_col = self._find_col(df, ["stdt_id", "学员id"])
            results.append(
                {
                    "stdt_id": str(row.get(stdt_id_col, "") or "") if stdt_id_col else None,  # noqa: E501
                    "enclosure": str(row.get("围场", "") or ""),
                    "lifecycle": str(row.get("生命周期", "") or ""),
                    "cc_name": str(row.get("last_cc_name", "") or ""),
                    "region": str(row.get("区域", "") or ""),
                    "paid_amount_usd": _safe(row.get("总带新付费金额USD")),
                    "referral_paid_count": _safe(row.get("转介绍付费数")),
                    "referral_revenue_usd": _safe(row.get("总带新付费金额USD")),
                }
            )
        return results

    # ──────────────────────────────────────────────────────────────────────────
    # enclosure_health：围场健康度分析
    # ──────────────────────────────────────────────────────────────────────────

    def _d2_valid(self) -> pd.DataFrame:
        """D2 过滤有效且非小计的通用方法"""
        df = self._enclosure_cc
        if df.empty:
            return df
        valid_mask = df.get("是否有效", pd.Series(dtype=str)).astype(str).str.strip() == "是"  # noqa: E501
        enc_mask = df.get("围场", pd.Series(dtype=str)).astype(str).str.strip() != "小计"  # noqa: E501
        return df[valid_mask & enc_mask].copy()

    def enclosure_health_scores(self) -> list[dict[str, Any]]:
        """D2 按围场加权评分 = 参与率*0.3 + 转化率*0.4 + 打卡率*0.3"""
        df = self._d2_valid()
        if df.empty or "围场" not in df.columns:
            return []

        results = []
        for seg, grp in df.groupby("围场", dropna=False):
            seg_str = str(seg or "")
            if not seg_str:
                continue

            participation = _safe(grp["转介绍参与率"].mean()) if "转介绍参与率" in grp.columns else None  # noqa: E501
            conversion = _safe(grp["注册转化率"].mean()) if "注册转化率" in grp.columns else None  # noqa: E501
            checkin = _safe(grp["当月有效打卡率"].mean()) if "当月有效打卡率" in grp.columns else None  # noqa: E501

            score: float | None = None
            vals = [participation, conversion, checkin]
            weights = [0.3, 0.4, 0.3]
            weighted_sum = sum(
                float(v) * w for v, w in zip(vals, weights, strict=False) if v is not None  # noqa: E501
            )
            valid_weight = sum(
                w for v, w in zip(vals, weights, strict=False) if v is not None
            )
            if valid_weight > 0:
                score = round(weighted_sum / valid_weight * 100, 2)

            # Compute level from health_score (>=80→green, 60-80→yellow, <60→red)
            level: str | None = None
            if score is not None:
                if score >= 80:
                    level = "green"
                elif score >= 60:
                    level = "yellow"
                else:
                    level = "red"

            results.append(
                {
                    "segment": seg_str,
                    "health_score": score,
                    # 前端期望 participation（非 participation_rate）
                    "participation": participation,
                    # 前端期望 conversion（非 conversion_rate）
                    "conversion": conversion,
                    # 前端期望 checkin（非 checkin_rate）
                    "checkin": checkin,
                    "level": level,
                    "cc_count": int(grp["last_cc_name"].nunique())
                    if "last_cc_name" in grp.columns
                    else None,
                }
            )

        return sorted(results, key=lambda x: x["health_score"] or 0, reverse=True)

    def enclosure_benchmark(self) -> list[dict[str, Any]]:
        """D2 围场间4指标对标"""
        df = self._d2_valid()
        if df.empty or "围场" not in df.columns:
            return []

        results = []
        for seg, grp in df.groupby("围场", dropna=False):
            seg_str = str(seg or "")
            if not seg_str:
                continue

            def _m(col: str, _grp: pd.DataFrame = grp) -> float | None:
                return _safe(_grp[col].mean()) if col in _grp.columns else None

            results.append(
                {
                    "segment": seg_str,
                    "participation_rate": _m("转介绍参与率"),
                    "conversion_rate": _m("注册转化率"),
                    "checkin_rate": _m("当月有效打卡率"),
                    "contact_rate": _m("CC触达率"),
                    "carry_ratio": _m("带货比"),
                }
            )

        return results

    def enclosure_cc_variance(self) -> list[dict[str, Any]]:
        """D2 同围场内CC的带新系数方差/min/max/median"""
        df = self._d2_valid()
        if df.empty or "围场" not in df.columns or "带新系数" not in df.columns:
            return []

        results = []
        for seg, grp in df.groupby("围场", dropna=False):
            seg_str = str(seg or "")
            if not seg_str:
                continue

            # CC 维度聚合带新系数 mean
            if "last_cc_name" not in grp.columns:
                continue
            cc_means = grp.groupby("last_cc_name")["带新系数"].mean().dropna()
            if cc_means.empty:
                continue

            results.append(
                {
                    "segment": seg_str,
                    "variance": _safe(cc_means.var()),
                    "std_dev": _safe(cc_means.std()),
                    "min_value": _safe(cc_means.min()),
                    "max_value": _safe(cc_means.max()),
                    "median_value": _safe(cc_means.median()),
                    "cc_count": int(len(cc_means)),
                }
            )

        return sorted(results, key=lambda x: x["variance"] or 0, reverse=True)

    # ──────────────────────────────────────────────────────────────────────────
    # student_360：学员 360° 搜索/详情/推荐网络
    # ──────────────────────────────────────────────────────────────────────────

    def student_search(
        self,
        query: str | None = None,
        filters: dict[str, Any] | None = None,
        sort: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        """D4 全表搜索+筛选+分页，join D5高潜标签"""
        df = self._students
        if df.empty:
            return {"items": [], "total": 0, "page": page, "page_size": page_size}

        # 文本搜索（stdt_id / last_cc_name / 区域）
        if query:
            q = query.strip()
            masks = []
            for col in ["stdt_id", "学员id", "last_cc_name", "区域"]:
                if col in df.columns:
                    masks.append(df[col].astype(str).str.contains(q, na=False, case=False))  # noqa: E501
            if masks:
                combined = masks[0]
                for m in masks[1:]:
                    combined = combined | m
                df = df[combined].copy()

        # 过滤条件
        if filters:
            segment = filters.get("segment")
            if segment and "围场" in df.columns:
                df = df[df["围场"].astype(str) == str(segment)]
            lifecycle = filters.get("lifecycle")
            if lifecycle and "生命周期" in df.columns:
                df = df[df["生命周期"].astype(str) == str(lifecycle)]
            cc_name = filters.get("cc_name")
            if cc_name and "last_cc_name" in df.columns:
                df = df[df["last_cc_name"].astype(str) == str(cc_name)]
            is_hp = filters.get("is_hp")
            if is_hp is not None:
                hp = self._high_potential
                if not hp.empty and "stdt_id" in hp.columns:
                    hp_ids = set(hp["stdt_id"].astype(str).tolist())
                    id_col = self._find_col(df, ["stdt_id", "学员id"])
                    if id_col:
                        in_hp = df[id_col].astype(str).isin(hp_ids)
                        df = df[in_hp] if is_hp else df[~in_hp]

        total = len(df)

        # 排序
        if sort and sort in df.columns:
            df = df.sort_values(sort, ascending=False)

        # 分页
        start = (page - 1) * page_size
        end = start + page_size
        page_df = df.iloc[start:end]

        # 高潜 ID 集合
        hp_ids: set[str] = set()
        if not self._high_potential.empty and "stdt_id" in self._high_potential.columns:
            hp_ids = set(self._high_potential["stdt_id"].astype(str).tolist())

        id_col = self._find_col(df, ["stdt_id", "学员id"])
        items = []
        for _, row in page_df.iterrows():
            stdt_id = str(row.get(id_col, "") or "") if id_col else ""
            items.append(
                {
                    "stdt_id": stdt_id,
                    "region": str(row.get("区域", "") or ""),
                    "lifecycle": str(row.get("生命周期", "") or ""),
                    "cc_name": str(row.get("last_cc_name", "") or ""),
                    "paid_amount_usd": _safe(row.get("总带新付费金额USD")),
                    "referral_paid_count": _safe(row.get("转介绍付费数")),
                    "referral_revenue_usd": _safe(row.get("总带新付费金额USD")),
                    "is_high_potential": stdt_id in hp_ids,
                    "channel": str(row.get("三级渠道", row.get("转介绍类型_新", "")) or ""),  # noqa: E501
                }
            )

        return {"items": items, "total": total, "page": page, "page_size": page_size}

    def student_detail(self, stdt_id: str) -> dict[str, Any]:
        """D4 单行59列 + D3 日报 + D5 高潜标签"""
        df = self._students
        id_col = self._find_col(df, ["stdt_id", "学员id"]) if not df.empty else None

        d4_row: pd.Series | None = None
        raw_d4: dict[str, Any] = {}
        if id_col and not df.empty:
            rows = df[df[id_col].astype(str) == stdt_id]
            if not rows.empty:
                d4_row = rows.iloc[0]
                raw_d4 = {
                    k: _safe(v) if not isinstance(v, str) else v
                    for k, v in d4_row.to_dict().items()
                }

        # D5 高潜标签
        is_hp = False
        hp_info: dict[str, Any] = {}
        if not self._high_potential.empty and "stdt_id" in self._high_potential.columns:
            hp_rows = self._high_potential[
                self._high_potential["stdt_id"].astype(str) == stdt_id
            ]
            if not hp_rows.empty:
                is_hp = True
                r = hp_rows.iloc[0]
                hp_info = {
                    "total_new": _safe(r.get("总带新人数")),
                    "attendance": _safe(r.get("出席数")),
                    "payments": _safe(r.get("转介绍付费数")),
                    "cc_name": str(r.get("last_cc_name", "") or ""),
                }

        # D3 时间线
        timeline: list[dict[str, Any]] = []
        if not self._detail.empty and "stdt_id" in self._detail.columns:
            d3 = self._detail[self._detail["stdt_id"].astype(str) == stdt_id]
            if "统计日期" in d3.columns:
                d3 = d3.sort_values("统计日期")
            for _, row in d3.iterrows():
                timeline.append(
                    {
                        "date": str(row.get("统计日期", "") or ""),
                        "enclosure": str(row.get("围场", "") or ""),
                        "registrations": _safe(row.get("转介绍注册数")),
                        "invitations": _safe(row.get("邀约数")),
                        "attendance": _safe(row.get("出席数")),
                        "paid_count": _safe(row.get("转介绍付费数")),
                        "revenue_usd": _safe(row.get("总带新付费金额USD")),
                        "checkin": _safe(row.get("有效打卡")),
                        "cc_contact": _safe(row.get("CC接通")),
                        "ss_contact": _safe(row.get("SS接通")),
                        "lp_contact": _safe(row.get("LP接通")),
                    }
                )

        return {
            "stdt_id": stdt_id,
            "region": str(d4_row.get("区域", "") or "") if d4_row is not None else None,  # noqa: E501
            "lifecycle": str(d4_row.get("生命周期", "") or "") if d4_row is not None else None,  # noqa: E501
            "cc_name": str(d4_row.get("last_cc_name", "") or "") if d4_row is not None else None,  # noqa: E501
            "paid_amount_usd": _safe(d4_row.get("总带新付费金额USD")) if d4_row is not None else None,  # noqa: E501
            "referral_paid_count": _safe(d4_row.get("转介绍付费数")) if d4_row is not None else None,  # noqa: E501
            "referral_revenue_usd": _safe(d4_row.get("总带新付费金额USD")) if d4_row is not None else None,  # noqa: E501
            "channel": str(d4_row.get("三级渠道", d4_row.get("转介绍类型_新", "")) or "") if d4_row is not None else None,  # noqa: E501
            # D4 补全字段
            "referral_reward_status": str(d4_row.get("推荐奖励领取状态", "") or "") or None if d4_row is not None else None,  # noqa: E501
            "avg_lesson_consumed_3m": _safe(d4_row.get("近3个月平均课耗")) if d4_row is not None else None,  # noqa: E501
            "days_to_card_expiry": _safe(d4_row.get("次卡距到期天数")) if d4_row is not None else None,  # noqa: E501
            "days_since_last_renewal": _safe(d4_row.get("末次续费日期距今天数")) if d4_row is not None else None,  # noqa: E501
            "total_renewal_orders": _safe(d4_row.get("总续费订单数")) if d4_row is not None else None,  # noqa: E501
            "is_high_potential": is_hp,
            "hp_info": hp_info,
            "timeline": timeline,
            "raw_d4": raw_d4,
        }

    def student_network(self, stdt_id: str, depth: int = 2) -> dict[str, Any]:
        """D4 推荐人链 递归查（推荐人学员ID → 学员id）"""
        df = self._students
        if df.empty:
            return {"root_id": stdt_id, "nodes": [], "edges": [], "depth": depth}

        id_col = self._find_col(df, ["stdt_id", "学员id"])
        referrer_col = self._find_col(df, ["推荐人学员ID", "referrer_id"])

        if not id_col or not referrer_col:
            return {"root_id": stdt_id, "nodes": [], "edges": [], "depth": depth}

        # 构建查找索引
        id_to_row: dict[str, pd.Series] = {
            str(row[id_col]): row for _, row in df.iterrows()
        }

        nodes: list[dict[str, Any]] = []
        edges: list[dict[str, str]] = []
        visited: set[str] = set()

        def _traverse(current_id: str, current_depth: int) -> None:
            if current_id in visited or current_depth > depth:
                return
            visited.add(current_id)
            row = id_to_row.get(current_id)
            nodes.append(
                {
                    "stdt_id": current_id,
                    "cc_name": str(row.get("last_cc_name", "") or "") if row is not None else None,  # noqa: E501
                    "lifecycle": str(row.get("生命周期", "") or "") if row is not None else None,  # noqa: E501
                    "referral_paid_count": _safe(row.get("转介绍付费数")) if row is not None else None,  # noqa: E501
                    "depth": current_depth,
                }
            )

            if row is None:
                return
            referrer = str(row.get(referrer_col, "") or "")
            if referrer and referrer != "nan" and referrer != current_id:
                edges.append({"source": referrer, "target": current_id})
                _traverse(referrer, current_depth + 1)

        _traverse(stdt_id, 0)

        return {
            "root_id": stdt_id,
            "nodes": nodes,
            "edges": edges,
            "depth": depth,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # 高潜学员时间线：D3 + D4 + D5 联合
    # ──────────────────────────────────────────────────────────────────────────

    def hp_timeline(self, stdt_id: str) -> dict[str, Any]:
        """
        单个高潜学员的时间线数据：
        - D3 明细（按统计日期排序）
        - D4 学员基本信息
        - D5 高潜标记
        """
        # D5 check
        in_hp = False
        hp_info: dict[str, Any] = {}
        if not self._high_potential.empty and "stdt_id" in self._high_potential.columns:
            hp_rows = self._high_potential[
                self._high_potential["stdt_id"].astype(str) == stdt_id
            ]
            in_hp = not hp_rows.empty
            if in_hp:
                r = hp_rows.iloc[0]
                hp_info = {
                    "total_new": _safe(r.get("总带新人数")),
                    "attendance": _safe(r.get("出席数")),
                    "payments": _safe(r.get("转介绍付费数")),
                    "cc_name": str(r.get("last_cc_name", "") or ""),
                    "cc_group": str(r.get("last_cc_group_name", "") or ""),
                }

        # D4 基本信息
        d4_info: dict[str, Any] = {}
        if not self._students.empty:
            id_col = self._find_col(self._students, ["stdt_id", "学员id"])
            if id_col:
                d4_rows = self._students[
                    self._students[id_col].astype(str) == stdt_id
                ]
                if not d4_rows.empty:
                    r = d4_rows.iloc[0]
                    d4_info = {
                        "name": str(r.get("真实姓名", "") or ""),
                        "enclosure": str(r.get("生命周期", "") or ""),
                        "region": str(r.get("区域", "") or ""),
                    }

        # D3 时间线（按统计日期排序）
        timeline: list[dict[str, Any]] = []
        if not self._detail.empty and "stdt_id" in self._detail.columns:
            _d3 = self._detail[self._detail["stdt_id"].astype(str) == stdt_id]
            d3_rows = (
                _d3.sort_values("统计日期")
                if "统计日期" in self._detail.columns
                else _d3
            )

            for _, row in d3_rows.iterrows():
                # Map D3 columns → DailyContact (frontend field names)
                cc_val = _safe(row.get("CC接通"))
                ss_val = _safe(row.get("SS接通"))
                lp_val = _safe(row.get("LP接通"))
                checkin_val = _safe(row.get("有效打卡"))
                timeline.append(
                    {
                        "date": str(row.get("统计日期", "") or ""),
                        "cc_connected": bool(cc_val) if cc_val is not None else False,
                        "ss_connected": bool(ss_val) if ss_val is not None else False,
                        "lp_connected": bool(lp_val) if lp_val is not None else False,
                        "valid_checkin": bool(checkin_val) if checkin_val is not None else False,  # noqa: E501
                        "new_reg": _safe(row.get("转介绍注册数")),
                        "new_attend": _safe(row.get("出席数")),
                        "new_paid": _safe(row.get("转介绍付费数")),
                    }
                )

        # Build profile from d4_info + hp_info
        profile = {
            "cc_name": hp_info.get("cc_name", "") if hp_info else "",
            "ss_name": "",
            "enclosure": d4_info.get("enclosure", "") if d4_info else "",
        }

        return {
            "stdt_id": stdt_id,
            "profile": profile,
            "daily_log": timeline,
            "is_high_potential": in_hp,
            # Internal fields kept for backward compatibility
            "in_high_potential": in_hp,
            "hp_info": hp_info,
            "d4_info": d4_info,
            "timeline_length": len(timeline),
        }
