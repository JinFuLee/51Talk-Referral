"""D类 KPI & North Star 数据加载器"""
from pathlib import Path
from typing import Optional
import logging

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class KpiLoader(BaseLoader):
    """加载 D 类 KPI / 北极星指标相关 Excel 文件"""

    # ------------------------------------------------------------------ #
    # 公开入口
    # ------------------------------------------------------------------ #

    def load_all(self) -> dict:
        return {
            "north_star_24h": self._load_north_star_24h(),
            "enclosure_market": self._load_enclosure(
                "BI-KPI_市场-本月围场数据_D-1", "market"
            ),
            "enclosure_referral": self._load_enclosure(
                "BI-KPI_转介绍-本月围场数据_D-1", "referral"
            ),
            "enclosure_combined": self._load_enclosure(
                "BI-KPI_市场&转介绍-本月围场数据_D-1", "combined"
            ),
            "checkin_rate_monthly": self._load_checkin_rate_monthly(),
        }

    # ------------------------------------------------------------------ #
    # D1: BI-北极星指标_当月24H打卡率_D-1
    # ------------------------------------------------------------------ #

    def _load_north_star_24h(self) -> dict:
        subdir = "BI-北极星指标_当月24H打卡率_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[D1] 未找到文件: {subdir}")
            return {"by_cc": [], "by_team": [], "summary": {}}

        try:
            df = self._read_xlsx_pandas(path)
            df = self._ffill_merged(df, [df.columns[0], df.columns[1]])

            # 统一列名
            col_map = {
                df.columns[0]: "region",
                df.columns[1]: "team",
                df.columns[2]: "cc_name",
                df.columns[3]: "checkin_24h_rate",
                df.columns[4]: "checkin_24h_target",
                df.columns[5]: "achievement_rate",
                df.columns[6]: "referral_participation",
                df.columns[7]: "referral_participation_checked",
                df.columns[8]: "referral_participation_unchecked",
                df.columns[9]: "checkin_multiplier",
                df.columns[10]: "referral_coefficient",
                df.columns[11]: "conversion_ratio",
            }
            df = df.rename(columns=col_map)

            # 过滤汇总行（cc_name 为总计/小计 或 NaN）
            summary_keywords = {"总计", "小计", "合计", "grand total", "subtotal"}
            detail_mask = df["cc_name"].apply(
                lambda v: isinstance(v, str)
                and str(v).strip().lower() not in summary_keywords
                and str(v).strip() != ""
            )
            detail_df = df[detail_mask].copy()

            by_cc = []
            for _, row in detail_df.iterrows():
                by_cc.append(
                    {
                        "cc_name": str(row["cc_name"]).strip(),
                        "team": self._normalize_team(str(row["team"]).strip())
                        if pd.notna(row["team"])
                        else "THCC",
                        "checkin_24h_rate": self._clean_numeric(row["checkin_24h_rate"]),
                        "checkin_24h_target": self._clean_numeric(
                            row["checkin_24h_target"]
                        ),
                        "achievement_rate": self._clean_numeric(row["achievement_rate"]),
                        "referral_participation": self._clean_numeric(
                            row["referral_participation"]
                        ),
                        "referral_coefficient": self._clean_numeric(
                            row["referral_coefficient"]
                        ),
                        "conversion_ratio": self._clean_numeric(row["conversion_ratio"]),
                    }
                )

            # 按团队聚合
            by_team = self._aggregate_by_team_24h(detail_df)

            # 汇总行（总计）
            total_rows = df[~detail_mask & df["cc_name"].apply(
                lambda v: isinstance(v, str) and "总计" in str(v)
            )]
            summary: dict = {}
            if not total_rows.empty:
                tr = total_rows.iloc[0]
                summary = {
                    "avg_checkin_24h_rate": self._clean_numeric(tr["checkin_24h_rate"]),
                    "target": self._clean_numeric(tr["checkin_24h_target"]),
                    "total_achievement": self._clean_numeric(tr["achievement_rate"]),
                }

            return {"by_cc": by_cc, "by_team": by_team, "summary": summary}

        except Exception as e:
            logger.error(f"[D1] 加载失败: {e}", exc_info=True)
            return {"by_cc": [], "by_team": [], "summary": {}}

    def _aggregate_by_team_24h(self, df: pd.DataFrame) -> list:
        """按团队聚合 D1 数据"""
        result = []
        try:
            groups = df.groupby("team")
            for team, grp in groups:
                rates = grp["checkin_24h_rate"].apply(self._clean_numeric).dropna()
                targets = grp["checkin_24h_target"].apply(self._clean_numeric).dropna()
                result.append(
                    {
                        "team": str(team),
                        "checkin_24h_rate": float(rates.mean()) if not rates.empty else None,
                        "checkin_24h_target": float(targets.mean()) if not targets.empty else None,
                        "cc_count": len(grp),
                    }
                )
        except Exception as e:
            logger.warning(f"[D1] 团队聚合失败: {e}")
        return result

    # ------------------------------------------------------------------ #
    # D2 / D3 / D4: 围场数据（统一方法）
    # ------------------------------------------------------------------ #

    def _load_enclosure(self, subdir: str, source_type: str) -> dict:
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[D2/3/4] 未找到文件: {subdir}")
            return {"by_enclosure": [], "total": {}, "source_type": source_type}

        try:
            df = self._read_xlsx_pandas(path)
            df = self._ffill_merged(df, [df.columns[0]])

            col_map = {
                df.columns[0]: "region",
                df.columns[1]: "enclosure",
                df.columns[2]: "conversion_rate",
                df.columns[3]: "participation_rate",
                df.columns[4]: "ratio",
                df.columns[5]: "active_students",
                df.columns[6]: "monthly_b_registrations",
                df.columns[7]: "monthly_b_paid",
                df.columns[8]: "monthly_active_referrers",
                df.columns[9]: "total_b_registrations",
            }
            df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

            # 分离明细行与小计/总计
            enclosure_labels = {"0-30", "31-60", "61-90", "91-180", "181+", "小计"}
            total_labels = {"总计", "合计", "grand total"}

            by_enclosure = []
            total: dict = {}

            for _, row in df.iterrows():
                enc = str(row.get("enclosure", "")).strip()
                if enc.lower() in total_labels or enc == "":
                    if enc.lower() in total_labels or "总计" in enc:
                        total = {
                            "active_students": self._clean_numeric(
                                row.get("active_students")
                            ),
                            "monthly_b_registrations": self._clean_numeric(
                                row.get("monthly_b_registrations")
                            ),
                            "monthly_b_paid": self._clean_numeric(row.get("monthly_b_paid")),
                            "conversion_rate": self._clean_numeric(row.get("conversion_rate")),
                            "participation_rate": self._clean_numeric(
                                row.get("participation_rate")
                            ),
                            "ratio": self._clean_numeric(row.get("ratio")),
                        }
                    continue

                by_enclosure.append(
                    {
                        "enclosure": enc,
                        "conversion_rate": self._clean_numeric(row.get("conversion_rate")),
                        "participation_rate": self._clean_numeric(
                            row.get("participation_rate")
                        ),
                        "ratio": self._clean_numeric(row.get("ratio")),
                        "active_students": self._clean_numeric(row.get("active_students")),
                        "monthly_b_registrations": self._clean_numeric(
                            row.get("monthly_b_registrations")
                        ),
                        "monthly_b_paid": self._clean_numeric(row.get("monthly_b_paid")),
                        "monthly_active_referrers": self._clean_numeric(
                            row.get("monthly_active_referrers")
                        ),
                        "total_b_registrations": self._clean_numeric(
                            row.get("total_b_registrations")
                        ),
                    }
                )

            return {
                "by_enclosure": by_enclosure,
                "total": total,
                "source_type": source_type,
            }

        except Exception as e:
            logger.error(f"[D2/3/4] 加载失败 {subdir}: {e}", exc_info=True)
            return {"by_enclosure": [], "total": {}, "source_type": source_type}

    # ------------------------------------------------------------------ #
    # D5: BI-KPI_当月转介绍打卡率_D-1
    # ------------------------------------------------------------------ #

    def _load_checkin_rate_monthly(self) -> dict:
        subdir = "BI-KPI_当月转介绍打卡率_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[D5] 未找到文件: {subdir}")
            return {"by_cc": [], "by_team": [], "summary": {}}

        try:
            df = self._read_xlsx_pandas(path)
            df = self._ffill_merged(df, [df.columns[0], df.columns[1]])

            # 列数可能是 13，按位置映射
            columns = list(df.columns)
            col_map: dict = {
                columns[0]: "region",
                columns[1]: "team",
                columns[2]: "cc_name",
                columns[3]: "checkin_rate",
                columns[4]: "referral_participation_total",
                columns[5]: "referral_participation_checked",
                columns[6]: "referral_participation_unchecked",
                columns[7]: "checkin_multiplier",
            }
            # 后续列（带新系数 total/checked/unchecked/倍率，带货比）
            if len(columns) > 8:
                col_map[columns[8]] = "referral_coefficient_total"
            if len(columns) > 9:
                col_map[columns[9]] = "referral_coefficient_checked"
            if len(columns) > 10:
                col_map[columns[10]] = "referral_coefficient_unchecked"
            if len(columns) > 11:
                col_map[columns[11]] = "referral_coefficient_multiplier"
            if len(columns) > 12:
                col_map[columns[12]] = "conversion_ratio"

            df = df.rename(columns=col_map)

            summary_keywords = {"总计", "小计", "合计"}
            detail_mask = df["cc_name"].apply(
                lambda v: isinstance(v, str)
                and str(v).strip() not in summary_keywords
                and str(v).strip() != ""
            )
            detail_df = df[detail_mask].copy()

            by_cc = []
            for _, row in detail_df.iterrows():
                by_cc.append(
                    {
                        "cc_name": str(row["cc_name"]).strip(),
                        "team": self._normalize_team(str(row["team"]).strip())
                        if pd.notna(row.get("team"))
                        else "THCC",
                        "checkin_rate": self._clean_numeric(row.get("checkin_rate")),
                        "referral_participation_total": self._clean_numeric(
                            row.get("referral_participation_total")
                        ),
                        "referral_participation_checked": self._clean_numeric(
                            row.get("referral_participation_checked")
                        ),
                        "referral_participation_unchecked": self._clean_numeric(
                            row.get("referral_participation_unchecked")
                        ),
                        "checkin_multiplier": self._clean_numeric(
                            row.get("checkin_multiplier")
                        ),
                        "referral_coefficient_total": self._clean_numeric(
                            row.get("referral_coefficient_total")
                        ),
                        "conversion_ratio": self._clean_numeric(
                            row.get("conversion_ratio")
                        ),
                    }
                )

            by_team = self._aggregate_by_team_checkin(detail_df)

            # 总计行摘要
            total_rows = df[~detail_mask & df["cc_name"].apply(
                lambda v: isinstance(v, str) and "总计" in str(v)
            )]
            summary: dict = {}
            if not total_rows.empty:
                tr = total_rows.iloc[0]
                summary = {
                    "avg_checkin_rate": self._clean_numeric(tr.get("checkin_rate")),
                    "avg_referral_participation": self._clean_numeric(
                        tr.get("referral_participation_total")
                    ),
                    "avg_conversion_ratio": self._clean_numeric(
                        tr.get("conversion_ratio")
                    ),
                }

            return {"by_cc": by_cc, "by_team": by_team, "summary": summary}

        except Exception as e:
            logger.error(f"[D5] 加载失败: {e}", exc_info=True)
            return {"by_cc": [], "by_team": [], "summary": {}}

    def _aggregate_by_team_checkin(self, df: pd.DataFrame) -> list:
        result = []
        try:
            for team, grp in df.groupby("team"):
                rates = grp["checkin_rate"].apply(self._clean_numeric).dropna()
                result.append(
                    {
                        "team": str(team),
                        "avg_checkin_rate": float(rates.mean()) if not rates.empty else None,
                        "cc_count": len(grp),
                    }
                )
        except Exception as e:
            logger.warning(f"[D5] 团队聚合失败: {e}")
        return result
