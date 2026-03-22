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
            "出席数": "attendance",
            "转介绍付费数": "paid_count",
            "客单价": "avg_price",
            "总带新付费金额USD": "total_revenue_usd",
            "注册预约率": "reg_to_appt_rate",
            "预约出席率": "appt_to_attend_rate",
            "出席付费率": "attend_to_paid_rate",
            "注册转化率": "reg_to_paid_rate",
            "转介绍基础业绩单量标": "target_paid_count",
            "转介绍基础业绩标USD": "target_revenue_usd",
            "转介绍基础业绩客单价标USD": "target_avg_price_usd",
            "区域单量达成率": "region_count_attainment",
            "区域业绩达成率": "region_revenue_attainment",
            "区域转介绍客单价达成率": "region_price_attainment",
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
                    "label": str(row[group_col]) if row[group_col] else "",
                    "paid_count": paid,
                    "total_revenue_usd": revenue,
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
                    "label": str(row[group_col]) if row[group_col] else "",
                    "paid_count": paid,
                    "total_revenue_usd": revenue,
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
            "predicted_attainment_pct": predicted_attainment_pct,
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
            "predicted_attainment_pct": None,
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
                timeline.append(
                    {
                        "date": str(row.get("统计日期", "") or ""),
                        "enclosure": str(row.get("围场", "") or ""),
                        "registrations": _safe(row.get("转介绍注册数")),
                        "invitations": _safe(row.get("邀约数")),
                        "attendance": _safe(row.get("出席数")),
                        "payments": _safe(row.get("转介绍付费数")),
                        "revenue_usd": _safe(row.get("总带新付费金额USD")),
                        "checkin": _safe(row.get("有效打卡")),
                        "cc_contact": _safe(row.get("CC接通")),
                        "ss_contact": _safe(row.get("SS接通")),
                        "lp_contact": _safe(row.get("LP接通")),
                    }
                )

        return {
            "stdt_id": stdt_id,
            "in_high_potential": in_hp,
            "hp_info": hp_info,
            "d4_info": d4_info,
            "timeline": timeline,
            "timeline_length": len(timeline),
        }
