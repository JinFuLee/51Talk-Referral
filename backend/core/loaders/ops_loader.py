"""F类 运营数据 Loader — 11 个数据源（F1-F11）

所有数据源经 BaseLoader._read_xlsx_pandas 读取，享有 Parquet 缓存层。
F1-F4 有 openpyxl name 兼容问题，_read_xlsx_pandas 会自动 fallback 到 calamine。
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class OpsLoader(BaseLoader):
    """宣宣/宣萱运营数据加载器（F1-F11）"""

    # 所有 F1-F11 均经 _read_xlsx_pandas 走缓存；F1-F4 openpyxl 有 name 兼容问题，会自动 fallback 到 calamine
    _F1_SUBDIR = "宣宣_漏斗跟进效率_D-1"
    _F2_SUBDIR = "宣宣_截面跟进效率_D-1"
    _F3_SUBDIR = "宣宣_截面跟进效率-月度环比_D-1"
    _F4_SUBDIR = "宣宣_转介绍渠道-月度环比_D-1"
    _F5_SUBDIR = "宣宣_转介绍每日外呼数据_D-1"
    _F6_SUBDIR = "宣宣_转介绍体验用户分配后跟进明细_D-1"
    _F7_SUBDIR = "宣宣_付费用户围场当月跟进明细_D-1"
    _F8_SUBDIR = "宣萱_不同围场月度付费用户跟进_D-1"
    _F9_SUBDIR = "宣萱_月度付费用户跟进_D-1"
    _F10_SUBDIR = "宣萱_首次体验课课前课后跟进_D-1"
    _F11_SUBDIR = "宣萱_明细表-泰国课前外呼覆盖_D-1"

    def _read_raw_calamine(self, path: Path) -> pd.DataFrame:
        """无 header 原始读取，走 BaseLoader 缓存层（header=None 独立缓存键，不与 header=0 互串）。
        F1-F4 文件有 openpyxl name 兼容问题，BaseLoader._read_xlsx_pandas 会自动 fallback 到 calamine。
        """
        return self._read_xlsx_pandas(path, header=None)

    # ------------------------------------------------------------------
    # 公共入口
    # ------------------------------------------------------------------

    def load_all(self) -> dict:
        return {
            "funnel_efficiency": self._load_funnel_efficiency(),  # F1
            "section_efficiency": self._load_section_efficiency(),  # F2
            "section_mom": self._load_section_mom(),  # F3
            "channel_mom": self._load_channel_mom(),  # F4
            "daily_outreach": self._load_daily_outreach(),  # F5
            "trial_followup": self._load_trial_followup(),  # F6
            "paid_user_followup": self._load_paid_user_followup(),  # F7
            "enclosure_monthly_followup": self._load_enclosure_monthly(),  # F8
            "monthly_paid_followup": self._load_monthly_paid(),  # F9
            "trial_class_followup": self._load_trial_class(),  # F10
            "pre_class_outreach": self._load_pre_class_outreach(),  # F11
        }

    # ------------------------------------------------------------------
    # F1: 宣宣_漏斗跟进效率_D-1
    # 结构: 前3行说明, 第4行(index=3)为表头, 数据从第5行(index=4)开始
    # 列: 渠道, 首分小组, 首次分配CC员工姓名, leads数, 预约数, 出席数, 付费数,
    #     预约率, 预约出席率, 出席付费率, 漏斗注册付费率, 注册24h拨打, 24h接通,
    #     24h有效接通, 48h拨打, 48h接通, 48h有效接通, 学员注册后是否拨打,
    #     学员注册后是否触达, 学员注册后是否有效触达, 24h拨打率, 24h接通率,
    #     24h有效接通率, 48h拨打率, 48h接通率, 48h有效接通率, 总拨打率, 总接通率, 总有效接通率
    # ------------------------------------------------------------------
    # ⚠️ 废弃字段清单 (Deprecated Columns) — 以下 17 列在 col_map 中被有意跳过:
    #   [11] 注册24h拨打  [12] 24h接通  [13] 24h有效接通
    #   [14] 48h拨打      [15] 48h接通  [16] 48h有效接通
    #   [19] 学员注册后是否有效触达
    #   [20] 24h拨打率    [21] 24h接通率  [22] 24h有效接通率
    #   [23] 48h拨打率    [24] 48h接通率  [25] 48h有效接通率
    #   [28] 总有效接通率
    # 原因: 这些中间率指标拆分过细，下游漏斗引擎和前端均只消费精简后的
    #       总拨打率(total_call_rate)、总接通率(total_connect_rate) 以及四大转化率。
    # ------------------------------------------------------------------

    def _load_funnel_efficiency(self) -> dict:
        path = self._find_latest_file(self._F1_SUBDIR)
        if not path:
            logger.warning("F1 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F1: Excel 为空或格式异常，返回空结果")
                return {}

            # 找表头行（包含"渠道"的行）— 向量化搜索
            header_row = 3  # 默认第4行（0-indexed=3）
            match = raw.iloc[:, 0].astype(str).str.strip().eq("渠道")
            if match.any():
                header_row = int(match.idxmax())

            df = raw.iloc[header_row:].reset_index(drop=True)
            df.columns = df.iloc[0].tolist()
            logger.debug(
                f"F1 Parsed Columns (count={len(df.columns)}): {df.columns.tolist()}"
            )
            df = df.iloc[1:].reset_index(drop=True)

            # 列名映射（精简）
            col_map = {
                df.columns[0]: "channel",
                df.columns[1]: "team",
                df.columns[2]: "cc_name",
                df.columns[3]: "leads",
                df.columns[4]: "appointments",
                df.columns[5]: "attended",
                df.columns[6]: "paid",
            }
            if len(df.columns) >= 11:
                col_map.update(
                    {
                        df.columns[7]: "appt_rate",
                        df.columns[8]: "appt_attend_rate",
                        df.columns[9]: "attend_paid_rate",
                        df.columns[10]: "funnel_paid_rate",
                    }
                )
            if len(df.columns) >= 29:
                col_map.update(
                    {
                        df.columns[17]: "total_called",
                        df.columns[18]: "total_connected",
                        df.columns[26]: "total_call_rate",
                        df.columns[27]: "total_connect_rate",
                    }
                )
            df = df.rename(columns=col_map)

            # 向量化：过滤空行（channel 非空且非 nan）
            valid_mask = df["channel"].astype(str).str.strip().ne("") & ~df[
                "channel"
            ].astype(str).str.strip().isin(("nan", "NaN"))
            df_valid = df[valid_mask].copy()

            # 向量化：规范化 team、cc_name
            df_valid["team"] = (
                df_valid["team"].astype(str).str.strip().apply(self._normalize_team)
            )
            df_valid["cc_name"] = df_valid["cc_name"].astype(str).str.strip()

            # 数值列向量化（对每列应用 _clean_numeric）
            numeric_cols = [
                "leads",
                "appointments",
                "attended",
                "paid",
                "appt_rate",
                "appt_attend_rate",
                "attend_paid_rate",
                "funnel_paid_rate",
                "total_call_rate",
                "total_connect_rate",
            ]
            for col in numeric_cols:
                if col in df_valid.columns:
                    df_valid[col] = self._clean_numeric_vec(df_valid[col])

            # 构建 records（向量化 to_dict）
            _F1_SKIP = {"nan", "NaN"}
            _F1_SKIP_CC = {"nan", "NaN", "小计"}
            rec_df = df_valid.copy()
            rec_df["channel"] = rec_df["channel"].astype(str).str.strip()
            rec_df["team"] = rec_df["team"].where(
                ~rec_df["team"].astype(str).isin(_F1_SKIP), other=None
            )
            rec_df["cc_name"] = rec_df["cc_name"].where(
                ~rec_df["cc_name"].astype(str).isin(_F1_SKIP_CC), other=None
            )
            out_cols = [
                c
                for c in [
                    "channel",
                    "team",
                    "cc_name",
                    "leads",
                    "appointments",
                    "attended",
                    "paid",
                    "appt_rate",
                    "appt_attend_rate",
                    "attend_paid_rate",
                    "funnel_paid_rate",
                    "total_call_rate",
                    "total_connect_rate",
                ]
                if c in rec_df.columns
            ]
            records = rec_df[out_cols].to_dict("records")

            # 找汇总行
            summary_row = df[
                df.get("channel", pd.Series(dtype=str)).astype(str).str.strip()
                == "总计"
            ]
            summary = {}
            if not summary_row.empty:
                r = summary_row.iloc[0]
                summary = {
                    "leads": self._clean_numeric(r.get("leads")),
                    "appointments": self._clean_numeric(r.get("appointments")),
                    "attended": self._clean_numeric(r.get("attended")),
                    "paid": self._clean_numeric(r.get("paid")),
                    "total_call_rate": self._clean_numeric(r.get("total_call_rate")),
                    "total_connect_rate": self._clean_numeric(
                        r.get("total_connect_rate")
                    ),
                }

            return {"records": records, "summary": summary}
        except Exception as e:
            logger.error(f"F1 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F2: 宣宣_截面跟进效率_D-1
    # 结构: 前2行说明, 第3行(index=2)为表头
    # 列: 渠道类型, 日期(month), CC组, CC姓名, 预约率, 预约出席率, 出席付费率, 注册付费率,
    #     注册, 预约, 出席, 付费, 美金金额
    #
    # 字段语义说明:
    #   appt_rate        = 预约率 = 预约数 / leads数（注册数）— 非触达率
    #   appt_attend_rate = 预约出席率 = 出席数 / 预约数
    #   attend_paid_rate = 出席付费率 = 付费数 / 出席数
    #   reg_paid_rate    = 注册付费率 = 付费数 / 注册数
    # 注: 触达率（有效通话>=120s学员/有效学员）来自 C 类 Cohort 数据，不在此文件
    # ------------------------------------------------------------------

    def _load_section_efficiency(self) -> dict:
        path = self._find_latest_file(self._F2_SUBDIR)
        if not path:
            logger.warning("F2 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F2: Excel 为空或格式异常，返回空结果")
                return {}

            # 找表头行（包含"渠道类型"）— 向量化搜索
            header_row = 2
            match = raw.iloc[:, 0].astype(str).str.strip().eq("渠道类型")
            if match.any():
                header_row = int(match.idxmax())

            df = raw.iloc[header_row:].reset_index(drop=True)
            df.columns = [
                "channel_type",
                "month",
                "team",
                "cc_name",
                "appt_rate",
                "appt_attend_rate",
                "attend_paid_rate",
                "reg_paid_rate",
                "registrations",
                "appointments",
                "attended",
                "paid",
                "amount_usd",
            ][: len(df.columns)]
            df = df.iloc[1:].reset_index(drop=True)

            # ffill 渠道类型（可能有合并）
            df["channel_type"] = df["channel_type"].ffill()

            # 向量化：过滤空行
            valid_mask = df["channel_type"].astype(str).str.strip().ne("") & ~df[
                "channel_type"
            ].astype(str).str.strip().isin(("nan", "NaN"))
            df_valid = df[valid_mask].copy()

            # 向量化：规范化字段
            df_valid["team"] = (
                df_valid["team"].astype(str).str.strip().apply(self._normalize_team)
            )
            df_valid["cc_name"] = df_valid["cc_name"].astype(str).str.strip()
            df_valid["month_str"] = df_valid["month"].astype(str).str.strip()

            # 数值列向量化
            for col in [
                "appt_rate",
                "appt_attend_rate",
                "attend_paid_rate",
                "reg_paid_rate",
                "registrations",
                "appointments",
                "attended",
                "paid",
                "amount_usd",
            ]:
                df_valid[col] = self._clean_numeric_vec(df_valid[col])

            # 构建 records（向量化 to_dict）
            _F2_SKIP = {"nan", "NaN", "小计"}
            rec_df = df_valid.copy()
            rec_df["channel_type"] = rec_df["channel_type"].astype(str).str.strip()
            rec_df["month"] = rec_df["month_str"].where(
                ~rec_df["month_str"].astype(str).isin(_F2_SKIP), other=None
            )
            rec_df["team"] = rec_df["team"].where(
                ~rec_df["team"].astype(str).isin(_F2_SKIP), other=None
            )
            rec_df["cc_name"] = rec_df["cc_name"].where(
                ~rec_df["cc_name"].astype(str).isin(_F2_SKIP), other=None
            )
            records = rec_df[
                [
                    "channel_type",
                    "month",
                    "team",
                    "cc_name",
                    "appt_rate",
                    "appt_attend_rate",
                    "attend_paid_rate",
                    "reg_paid_rate",
                    "registrations",
                    "appointments",
                    "attended",
                    "paid",
                    "amount_usd",
                ]
            ].to_dict("records")

            # 总计汇总（向量化）
            by_channel = {}
            for ct in ["市场", "转介绍"]:
                ct_rows = df[
                    (df["channel_type"].astype(str).str.strip() == ct)
                    & (
                        df["month"].isna()
                        | df["month"].astype(str).str.strip().isin(["小计", "nan"])
                    )
                ]
                if not ct_rows.empty:
                    r = ct_rows.iloc[0]
                    by_channel[ct] = {
                        "appt_rate": self._clean_numeric(r["appt_rate"]),
                        "attend_paid_rate": self._clean_numeric(r["attend_paid_rate"]),
                        "registrations": self._clean_numeric(r["registrations"]),
                        "paid": self._clean_numeric(r["paid"]),
                        "amount_usd": self._clean_numeric(r["amount_usd"]),
                    }

            # by_cc 聚合（修复 P0-2 Bug：补充缺失的 by_cc 数据）
            _SKIP_CC_NAMES = {"nan", "NaN", "小计", "总计", "合计", ""}
            df_cc = df_valid[
                df_valid["cc_name"].notna()
                & ~df_valid["cc_name"].astype(str).str.strip().isin(_SKIP_CC_NAMES)
            ].copy()
            by_cc: dict = {}
            if not df_cc.empty:
                cc_agg = (
                    df_cc.groupby("cc_name")
                    .agg(
                        team=("team", "first"),
                        channel_type=("channel_type", "first"),
                        month=("month_str", "first"),
                        registrations=("registrations", "sum"),
                        appointments=("appointments", "sum"),
                        attended=("attended", "sum"),
                        paid=("paid", "sum"),
                        amount_usd=("amount_usd", "sum"),
                    )
                    .reset_index()
                )

                # 向量化计算派生率，消除 iterrows
                cc_agg = cc_agg.copy()
                regs_s = cc_agg["registrations"].fillna(0)
                appts_s = cc_agg["appointments"].fillna(0)
                atts_s = cc_agg["attended"].fillna(0)
                paids_s = cc_agg["paid"].fillna(0)
                cc_agg["regs_"] = regs_s
                cc_agg["appts_"] = appts_s
                cc_agg["atts_"] = atts_s
                cc_agg["paids_"] = paids_s
                cc_agg["appt_rate_calc"] = (
                    (appts_s / regs_s.replace(0, float("nan"))).fillna(0).round(4)
                )
                cc_agg["appt_attend_rate_calc"] = (
                    (atts_s / appts_s.replace(0, float("nan"))).fillna(0).round(4)
                )
                cc_agg["attend_paid_rate_calc"] = (
                    (paids_s / atts_s.replace(0, float("nan"))).fillna(0).round(4)
                )
                cc_agg["reg_paid_rate_calc"] = (
                    (paids_s / regs_s.replace(0, float("nan"))).fillna(0).round(4)
                )
                by_cc = {
                    row["cc_name"]: {
                        "team": row["team"],
                        "channel_type": row["channel_type"],
                        "month": row["month"],
                        "registrations": row["regs_"],
                        "appointments": row["appts_"],
                        "attended": row["atts_"],
                        "paid": row["paids_"],
                        "amount_usd": row["amount_usd"],
                        "appt_rate": row["appt_rate_calc"],
                        "appt_attend_rate": row["appt_attend_rate_calc"],
                        "attend_paid_rate": row["attend_paid_rate_calc"],
                        "reg_paid_rate": row["reg_paid_rate_calc"],
                    }
                    for row in cc_agg.to_dict("records")
                }

            return {"records": records, "by_channel": by_channel, "by_cc": by_cc}
        except Exception as e:
            logger.error(f"F2 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F3: 宣宣_截面跟进效率-月度环比_D-1
    # 与 F2 结构基本相同，多了一行说明（第3行），列名略有差异（注册付费率→分配付费率）
    # 列: 渠道类型, 日期(month), CC组, CC姓名, 预约率, 预约出席率, 出席付费率, 分配付费率,
    #     分配, 预约, 出席, 付费, 美金金额
    # ------------------------------------------------------------------

    def _load_section_mom(self) -> dict:
        path = self._find_latest_file(self._F3_SUBDIR)
        if not path:
            logger.warning("F3 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F3: Excel 为空或格式异常，返回空结果")
                return {}

            # 找表头行（包含"渠道类型"）— 向量化搜索
            header_row = 3
            match_f3 = raw.iloc[:, 0].astype(str).str.strip().eq("渠道类型")
            if match_f3.any():
                header_row = int(match_f3.idxmax())

            df = raw.iloc[header_row:].reset_index(drop=True)
            df.columns = [
                "channel_type",
                "month",
                "team",
                "cc_name",
                "appt_rate",
                "appt_attend_rate",
                "attend_paid_rate",
                "alloc_paid_rate",
                "allocations",
                "appointments",
                "attended",
                "paid",
                "amount_usd",
            ]
            df = df.iloc[1:].reset_index(drop=True)
            df["channel_type"] = df["channel_type"].ffill()

            # 向量化：过滤空行
            valid_mask = df["channel_type"].astype(str).str.strip().ne("") & ~df[
                "channel_type"
            ].astype(str).str.strip().isin(("nan", "NaN"))
            df_valid = df[valid_mask].copy()

            # 向量化：规范化字段
            df_valid["team"] = (
                df_valid["team"].astype(str).str.strip().apply(self._normalize_team)
            )
            df_valid["cc_name"] = df_valid["cc_name"].astype(str).str.strip()
            df_valid["month_str"] = df_valid["month"].astype(str).str.strip()

            # 数值列向量化
            for col in [
                "appt_rate",
                "appt_attend_rate",
                "attend_paid_rate",
                "alloc_paid_rate",
                "allocations",
                "appointments",
                "attended",
                "paid",
                "amount_usd",
            ]:
                df_valid[col] = self._clean_numeric_vec(df_valid[col])

            # 构建 records（向量化 to_dict）
            _F3_SKIP = {"nan", "NaN", "小计"}
            rec_df = df_valid.copy()
            rec_df["channel_type"] = rec_df["channel_type"].astype(str).str.strip()
            rec_df["month"] = rec_df["month_str"].where(
                ~rec_df["month_str"].astype(str).isin(_F3_SKIP), other=None
            )
            rec_df["team"] = rec_df["team"].where(
                ~rec_df["team"].astype(str).isin(_F3_SKIP), other=None
            )
            rec_df["cc_name"] = rec_df["cc_name"].where(
                ~rec_df["cc_name"].astype(str).isin(_F3_SKIP), other=None
            )
            records = rec_df[
                [
                    "channel_type",
                    "month",
                    "team",
                    "cc_name",
                    "appt_rate",
                    "appt_attend_rate",
                    "attend_paid_rate",
                    "alloc_paid_rate",
                    "allocations",
                    "appointments",
                    "attended",
                    "paid",
                    "amount_usd",
                ]
            ].to_dict("records")

            # 按渠道类型汇总（向量化）
            by_channel: dict = {}
            for ct in ["市场", "转介绍"]:
                ct_rows = df[
                    (df["channel_type"].astype(str).str.strip() == ct)
                    & (
                        df["month"].isna()
                        | df["month"].astype(str).str.strip().isin(["小计", "nan"])
                    )
                ]
                if not ct_rows.empty:
                    r = ct_rows.iloc[0]
                    by_channel[ct] = {
                        "appt_rate": self._clean_numeric(r["appt_rate"]),
                        "attend_paid_rate": self._clean_numeric(r["attend_paid_rate"]),
                        "allocations": self._clean_numeric(r["allocations"]),
                        "paid": self._clean_numeric(r["paid"]),
                        "amount_usd": self._clean_numeric(r["amount_usd"]),
                    }

            # 按月份汇总（MoM 对比，向量化）
            months = df["month"].dropna().astype(str).str.strip()
            months = [m for m in months.unique() if m.isdigit() and len(m) == 6]
            by_month = {}
            for m in months:
                m_rows = df[
                    (df["month"].astype(str).str.strip() == m)
                    & (
                        df["team"].isna()
                        | df["team"].astype(str).str.strip().isin(["小计", "nan"])
                    )
                ]
                if not m_rows.empty:
                    by_month[m] = []
                    for ct in ["市场", "转介绍"]:
                        ct_m = m_rows[
                            m_rows["channel_type"].astype(str).str.strip() == ct
                        ]
                        if not ct_m.empty:
                            r = ct_m.iloc[0]
                            by_month[m].append(
                                {
                                    "channel_type": ct,
                                    "appt_rate": self._clean_numeric(r["appt_rate"]),
                                    "paid": self._clean_numeric(r["paid"]),
                                    "amount_usd": self._clean_numeric(r["amount_usd"]),
                                }
                            )

            return {"records": records, "by_channel": by_channel, "by_month": by_month}
        except Exception as e:
            logger.error(f"F3 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F4: 宣宣_转介绍渠道-月度环比_D-1
    # 宽表：行=渠道，列=各月份×指标（注册数/注册占比/注册付费率/客单价/预约率/预约出席率/出席付费率）
    # 结构: 第1-2行说明, 第3行(index=2)指标组名, 第4行(index=3)月份, 第5行(index=4)起为数据
    # ------------------------------------------------------------------

    def _load_channel_mom(self) -> dict:
        path = self._find_latest_file(self._F4_SUBDIR)
        if not path:
            logger.warning("F4 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F4: Excel 为空或格式异常，返回空结果")
                return {}

            # 解析多层表头（Python 预处理，保留）
            metric_row = raw.iloc[2].tolist()  # 指标组名（度量, 注册, 注册, ...）
            month_row = raw.iloc[3].tolist()  # 月份（三级渠道, 202512, 202601, ...）

            # 构建列名："{metric}_{month}"
            col_names = []
            current_metric = ""
            for i, (m, mo) in enumerate(zip(metric_row, month_row)):
                if i == 0:
                    col_names.append("channel")
                    continue
                if str(m).strip() and str(m).strip() not in ("nan", "NaN"):
                    current_metric = str(m).strip()
                month_val = (
                    str(mo).strip() if str(mo).strip() not in ("nan", "NaN") else ""
                )
                col_names.append(
                    f"{current_metric}__{month_val}" if month_val else current_metric
                )

            df = raw.iloc[4:].reset_index(drop=True)
            df.columns = col_names

            # 向量化：过滤空渠道行
            valid_mask = df["channel"].astype(str).str.strip().ne("") & ~df[
                "channel"
            ].astype(str).str.strip().isin(("nan", "NaN", "-"))
            df_valid = df[valid_mask].copy()

            # 向量化：对所有指标列应用 _clean_numeric
            metric_cols = col_names[1:]
            for col in metric_cols:
                df_valid[col] = self._clean_numeric_vec(df_valid[col])

            # 构建 records（聚合后小DataFrame，行数=渠道数级别）
            # 向量化：规范化 channel 列，to_dict 替代 iterrows
            df_valid = df_valid.copy()
            df_valid["channel"] = df_valid["channel"].astype(str).str.strip()
            records = df_valid[["channel"] + metric_cols].to_dict("records")

            # 提取唯一月份列表
            months = sorted(
                set(
                    col.split("__")[1]
                    for col in col_names[1:]
                    if "__" in col and col.split("__")[1].isdigit()
                )
            )

            return {"records": records, "months": months}
        except Exception as e:
            logger.error(f"F4 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F5: 宣宣_转介绍每日外呼数据_D-1
    # 792行×11列, 第1行为表头
    # ------------------------------------------------------------------

    def _load_daily_outreach(self) -> dict:
        path = self._find_latest_file(self._F5_SUBDIR)
        if not path:
            logger.warning("F5 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F5: Excel 为空或格式异常，返回空结果")
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = [
                "date_raw",
                "team",
                "cc_name",
                "avg_calls",
                "avg_connects",
                "avg_effective",
                "avg_duration_min",
                "total_calls",
                "total_connects",
                "total_effective",
                "total_duration_min",
            ]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["date"] = self._clean_date_vec(df["date_raw"])
            df["team"] = df["team"].apply(
                lambda v: (
                    self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
                )
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            num_cols = [
                "avg_calls",
                "avg_connects",
                "avg_effective",
                "avg_duration_min",
                "total_calls",
                "total_connects",
                "total_effective",
                "total_duration_min",
            ]
            for col in num_cols:
                df[col] = self._clean_numeric_vec(df[col])

            # 过滤无效行（date 或 team 为空）
            df = df[df["date"].notna() & df["team"].notna()].copy()

            # 构建 records（向量化 to_dict）
            record_cols = [
                "date",
                "team",
                "cc_name",
                "avg_calls",
                "avg_connects",
                "avg_effective",
                "avg_duration_min",
                "total_calls",
                "total_connects",
                "total_effective",
                "total_duration_min",
            ]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby）
            df_cc = df[df["cc_name"].notna()].copy()
            by_cc: dict = {}
            if not df_cc.empty:
                cc_agg = (
                    df_cc.groupby("cc_name")
                    .agg(
                        team=("team", "first"),
                        dates=("date", list),
                        total_calls=("total_calls", lambda x: sum(v or 0 for v in x)),
                        total_connects=(
                            "total_connects",
                            lambda x: sum(v or 0 for v in x),
                        ),
                        total_effective=(
                            "total_effective",
                            lambda x: sum(v or 0 for v in x),
                        ),
                        _total_duration_min=(
                            "total_duration_min",
                            lambda x: sum(v or 0.0 for v in x),
                        ),
                        _duration_days=(
                            "total_duration_min",
                            lambda x: sum(1 for v in x if v and v > 0),
                        ),
                    )
                    .reset_index()
                )
                cc_agg = cc_agg.copy()
                cc_agg["avg_duration_min"] = cc_agg.apply(
                    lambda r: (
                        round(r["_total_duration_min"] / r["_duration_days"], 2)
                        if r["_duration_days"] > 0
                        else None
                    ),
                    axis=1,
                )
                by_cc = {
                    row["cc_name"]: {
                        "team": row["team"],
                        "dates": row["dates"],
                        "total_calls": row["total_calls"],
                        "total_connects": row["total_connects"],
                        "total_effective": row["total_effective"],
                        "avg_duration_min": row["avg_duration_min"],
                    }
                    for row in cc_agg.to_dict("records")
                }

            # by_team 聚合（向量化 groupby）
            team_agg = df.groupby("team").agg(
                total_calls=("total_calls", lambda x: sum(v or 0 for v in x)),
                total_connects=("total_connects", lambda x: sum(v or 0 for v in x)),
                total_effective=("total_effective", lambda x: sum(v or 0 for v in x)),
            )
            by_team = {
                team: {
                    "total_calls": row["total_calls"],
                    "total_connects": row["total_connects"],
                    "total_effective": row["total_effective"],
                }
                for team, row in team_agg.to_dict("index").items()
            }

            # by_date 聚合（向量化 groupby）
            date_agg = (
                df.groupby("date")
                .agg(
                    total_calls=("total_calls", lambda x: sum(v or 0 for v in x)),
                    total_connects=("total_connects", lambda x: sum(v or 0 for v in x)),
                    total_effective=(
                        "total_effective",
                        lambda x: sum(v or 0 for v in x),
                    ),
                    cc_count=("cc_name", "count"),
                )
                .sort_index()
                .reset_index()
            )
            by_date_list = [
                {
                    "date": row["date"],
                    "total_calls": row["total_calls"],
                    "total_connects": row["total_connects"],
                    "total_effective": row["total_effective"],
                    "cc_count": row["cc_count"],
                }
                for row in date_agg.to_dict("records")
            ]

            return {
                "records": records,
                "by_cc": by_cc,
                "by_team": by_team,
                "by_date": by_date_list,
            }
        except Exception as e:
            logger.error(f"F5 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F6: 宣宣_转介绍体验用户分配后跟进明细_D-1
    # 1000行×9列, 第1行为表头
    # ------------------------------------------------------------------

    def _load_trial_followup(self) -> dict:
        path = self._find_latest_file(self._F6_SUBDIR)
        if not path:
            logger.warning("F6 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F6: Excel 为空或格式异常，返回空结果")
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = [
                "channel",
                "alloc_date_raw",
                "team",
                "cc_name",
                "student_id",
                "called_24h",
                "connected_24h",
                "called_48h",
                "connected_48h",
            ]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["channel"] = df["channel"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["alloc_date"] = self._clean_date_vec(df["alloc_date_raw"])
            df["team"] = df["team"].apply(
                lambda v: (
                    self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
                )
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["student_id"] = df["student_id"].apply(
                lambda v: int(v) if pd.notna(v) and str(v) != "nan" else None
            )

            # 数值列向量化（强制 int）
            for col in ["called_24h", "connected_24h", "called_48h", "connected_48h"]:
                df[col] = self._clean_numeric_vec(df[col]).fillna(0).astype(int)

            # 过滤无效行
            df = df[df["channel"].notna() & df["team"].notna()].copy()

            # 构建 records
            record_cols = [
                "channel",
                "alloc_date",
                "team",
                "cc_name",
                "student_id",
                "called_24h",
                "connected_24h",
                "called_48h",
                "connected_48h",
            ]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby）
            df_cc = df[df["cc_name"].notna()].copy()
            by_cc: dict = {}
            if not df_cc.empty:
                cc_agg = (
                    df_cc.groupby("cc_name")
                    .agg(
                        team=("team", "first"),
                        total=("cc_name", "count"),
                        called_24h=("called_24h", "sum"),
                        connected_24h=("connected_24h", "sum"),
                        called_48h=("called_48h", "sum"),
                        connected_48h=("connected_48h", "sum"),
                    )
                    .reset_index()
                )
                # 向量化计算率，消除 iterrows
                cc_agg = cc_agg.copy()
                denom_cc = cc_agg["total"].replace(0, float("nan"))
                cc_agg["call_rate_24h"] = (
                    (cc_agg["called_24h"] / denom_cc).fillna(0).round(4)
                )
                cc_agg["connect_rate_24h"] = (
                    (cc_agg["connected_24h"] / denom_cc).fillna(0).round(4)
                )
                cc_agg["call_rate_48h"] = (
                    (cc_agg["called_48h"] / denom_cc).fillna(0).round(4)
                )
                cc_agg["connect_rate_48h"] = (
                    (cc_agg["connected_48h"] / denom_cc).fillna(0).round(4)
                )
                by_cc = {
                    row["cc_name"]: {k: v for k, v in row.items() if k != "cc_name"}
                    for row in cc_agg.to_dict("records")
                }

            # by_team 聚合（向量化 groupby）
            by_team: dict = {}
            team_agg = df.groupby("team").agg(
                total=("team", "count"),
                called_24h=("called_24h", "sum"),
                connected_24h=("connected_24h", "sum"),
                called_48h=("called_48h", "sum"),
                connected_48h=("connected_48h", "sum"),
            )
            # 向量化计算率
            denom_team = team_agg["total"].replace(0, float("nan"))
            team_agg["call_rate_24h"] = (
                (team_agg["called_24h"] / denom_team).fillna(0).round(4)
            )
            team_agg["connect_rate_24h"] = (
                (team_agg["connected_24h"] / denom_team).fillna(0).round(4)
            )
            team_agg["call_rate_48h"] = (
                (team_agg["called_48h"] / denom_team).fillna(0).round(4)
            )
            team_agg["connect_rate_48h"] = (
                (team_agg["connected_48h"] / denom_team).fillna(0).round(4)
            )
            by_team = {team: row for team, row in team_agg.to_dict("index").items()}

            n = len(records)
            summary = {
                "total_leads": n,
                "call_rate_24h": round(df["called_24h"].sum() / n, 4) if n else 0,
                "connect_rate_24h": round(df["connected_24h"].sum() / n, 4) if n else 0,
                "call_rate_48h": round(df["called_48h"].sum() / n, 4) if n else 0,
                "connect_rate_48h": round(df["connected_48h"].sum() / n, 4) if n else 0,
            }

            return {
                "records": records,
                "by_cc": by_cc,
                "by_team": by_team,
                "summary": summary,
            }
        except Exception as e:
            logger.error(f"F6 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F7: 宣宣_付费用户围场当月跟进明细_D-1
    # 1000行×8列, 第1行为表头
    # 注意: 第3列"学员数"实际存储的是学员ID
    # ------------------------------------------------------------------

    def _load_paid_user_followup(self) -> dict:
        path = self._find_latest_file(self._F7_SUBDIR)
        if not path:
            logger.warning("F7 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F7: Excel 为空或格式异常，返回空结果")
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = [
                "team",
                "cc_name",
                "student_id",
                "first_paid_date_raw",
                "monthly_called",
                "monthly_connected",
                "monthly_effective",
                "monthly_effective_count",
            ]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["team"] = df["team"].apply(
                lambda v: (
                    self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
                )
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["student_id"] = df["student_id"].apply(
                lambda v: int(v) if pd.notna(v) and str(v) != "nan" else None
            )
            df["first_paid_date"] = self._clean_date_vec(df["first_paid_date_raw"])

            # 数值列向量化（强制 int）
            for col in [
                "monthly_called",
                "monthly_connected",
                "monthly_effective",
                "monthly_effective_count",
            ]:
                df[col] = self._clean_numeric_vec(df[col]).fillna(0).astype(int)

            # 过滤无效行（team 或 cc_name 为空）
            df = df[df["team"].notna() & df["cc_name"].notna()].copy()

            # 构建 records
            record_cols = [
                "team",
                "cc_name",
                "student_id",
                "first_paid_date",
                "monthly_called",
                "monthly_connected",
                "monthly_effective",
                "monthly_effective_count",
            ]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby）— 同时捕获 team 归属
            by_cc: dict = {}
            cc_agg = (
                df.groupby("cc_name")
                .agg(
                    team=("team", "first"),
                    total_students=("cc_name", "count"),
                    monthly_called=("monthly_called", "sum"),
                    monthly_connected=("monthly_connected", "sum"),
                    monthly_effective=("monthly_effective", "sum"),
                    monthly_effective_count=("monthly_effective_count", "sum"),
                )
                .reset_index()
            )
            by_cc = {
                row["cc_name"]: {k: v for k, v in row.items() if k != "cc_name"}
                for row in cc_agg.to_dict("records")
            }

            # by_team 聚合（向量化 groupby）
            by_team: dict = {}
            team_agg = df.groupby("team").agg(
                total_students=("team", "count"),
                monthly_called=("monthly_called", "sum"),
                monthly_connected=("monthly_connected", "sum"),
                monthly_effective=("monthly_effective", "sum"),
                monthly_effective_count=("monthly_effective_count", "sum"),
            )
            by_team = {team: row for team, row in team_agg.to_dict("index").items()}

            n = len(records)
            summary = {
                "total_students": n,
                "total_monthly_called": int(df["monthly_called"].sum()),
                "total_monthly_connected": int(df["monthly_connected"].sum()),
                "total_monthly_effective": int(df["monthly_effective"].sum()),
            }

            return {
                "records": records,
                "by_cc": by_cc,
                "by_team": by_team,
                "summary": summary,
            }
        except Exception as e:
            logger.error(f"F7 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F8: 宣萱_不同围场月度付费用户跟进_D-1
    # 241行×11列, 按围场段汇总，第1行为表头
    # 需要 ffill 围场列和当前小组列
    # ------------------------------------------------------------------

    def _load_enclosure_monthly(self) -> dict:
        path = self._find_latest_file(self._F8_SUBDIR)
        if not path:
            logger.warning(
                "D2/D3 围场数据为空，返回空结果（F8 文件不存在: %s）", self._F8_SUBDIR
            )
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning(
                    "D2/D3 围场数据为空，返回空结果（F8 Excel 为空或格式异常）"
                )
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = [
                "enclosure",
                "team",
                "cc_name",
                "student_id",
                "monthly_called",
                "monthly_connected",
                "monthly_effective",
                "call_coverage",
                "connect_coverage",
                "effective_coverage",
                "avg_effective_count",
            ]
            df = df.iloc[1:].reset_index(drop=True)

            # ffill 合并单元格
            df = self._ffill_merged(df, ["enclosure", "team"])

            # 围场标签归一化映射（F8 文件使用 "90以上"，统一为标准值 "91-180"）
            _F8_ENC_NORMALIZE = {"90以上": "91-180"}

            # 向量化：清洗字段
            df["enc_str"] = df["enclosure"].apply(
                lambda v: (
                    _F8_ENC_NORMALIZE.get(str(v).strip(), str(v).strip())
                    if pd.notna(v)
                    else None
                )
            )
            df["team_norm"] = df["team"].apply(
                lambda v: (
                    self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
                )
            )
            df["cc_str"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            for col in [
                "monthly_called",
                "monthly_connected",
                "monthly_effective",
                "call_coverage",
                "connect_coverage",
                "effective_coverage",
                "avg_effective_count",
            ]:
                df[col] = self._clean_numeric_vec(df[col])

            # 过滤空行
            df = df[df["enc_str"].notna() & ~df["enc_str"].isin(("nan", "NaN"))].copy()

            # 构建 by_enclosure 和 by_cc（行数=围场段×CC级别，有嵌套分支：
            # 同一行同时决定归属 by_enclosure[enc].by_team 还是 .summary，
            # 无法用 groupby+to_dict 一步替代，保留 iterrows）
            by_enclosure: dict = {}
            by_cc: list = []

            for _, row in df.iterrows():
                enc = row["enc_str"]
                team = row["team_norm"]
                cc = row["cc_str"]
                sid_val = row["student_id"]
                is_summary = cc in ("小计", None) or str(cc) in ("nan", "NaN")

                rec = {
                    "enclosure": enc,
                    "team": team,
                    "cc_name": None if is_summary else cc,
                    "student_count": self._clean_numeric(sid_val)
                    if is_summary
                    else None,
                    "student_id": int(sid_val)
                    if not is_summary and pd.notna(sid_val) and str(sid_val) != "nan"
                    else None,
                    "monthly_called": row["monthly_called"],
                    "monthly_connected": row["monthly_connected"],
                    "monthly_effective": row["monthly_effective"],
                    "call_coverage": row["call_coverage"],
                    "connect_coverage": row["connect_coverage"],
                    "effective_coverage": row["effective_coverage"],
                    "avg_effective_count": row["avg_effective_count"],
                }

                if enc not in by_enclosure:
                    by_enclosure[enc] = {"by_team": [], "summary": None}
                if team in ("小计", None) or str(team) in ("nan", "NaN"):
                    by_enclosure[enc]["summary"] = rec
                else:
                    by_enclosure[enc]["by_team"].append(rec)

                if not is_summary and cc:
                    by_cc.append(rec)

            # 总计行（向量化查找）
            total_rows = df[df["enc_str"] == "总计"]
            summary = {}
            if not total_rows.empty:
                r = total_rows.iloc[0]
                summary = {
                    "total_students": self._clean_numeric(r["student_id"]),
                    "total_called": self._clean_numeric(r["monthly_called"]),
                    "call_coverage": self._clean_numeric(r["call_coverage"]),
                    "connect_coverage": self._clean_numeric(r["connect_coverage"]),
                    "effective_coverage": self._clean_numeric(r["effective_coverage"]),
                }

            by_enclosure_list = [
                {"enclosure": enc, **data}
                for enc, data in by_enclosure.items()
                if enc != "总计"
            ]

            return {
                "by_enclosure": by_enclosure_list,
                "by_cc": by_cc,
                "summary": summary,
            }
        except Exception as e:
            logger.error(f"F8 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F9: 宣萱_月度付费用户跟进_D-1
    # 74行×10列, F8 不含围场维度的汇总版本
    # ------------------------------------------------------------------

    def _load_monthly_paid(self) -> dict:
        path = self._find_latest_file(self._F9_SUBDIR)
        if not path:
            logger.warning(
                "D2/D3 围场数据为空，返回空结果（F9 文件不存在: %s）", self._F9_SUBDIR
            )
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning(
                    "D2/D3 围场数据为空，返回空结果（F9 Excel 为空或格式异常）"
                )
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = [
                "team",
                "cc_name",
                "student_id",
                "monthly_called",
                "monthly_connected",
                "monthly_effective",
                "call_coverage",
                "connect_coverage",
                "effective_coverage",
                "avg_effective_count",
            ]
            df = df.iloc[1:].reset_index(drop=True)
            df = self._ffill_merged(df, ["team"])

            # 向量化：清洗字段
            df["team_norm"] = df["team"].apply(
                lambda v: (
                    self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
                )
            )
            df["cc_str"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            for col in [
                "monthly_called",
                "monthly_connected",
                "monthly_effective",
                "call_coverage",
                "connect_coverage",
                "effective_coverage",
                "avg_effective_count",
            ]:
                df[col] = self._clean_numeric_vec(df[col])

            # 过滤无效 team 行
            df = df[
                df["team_norm"].notna() & ~df["team_norm"].isin(("nan", "NaN"))
            ].copy()

            # 构建 by_cc 和 by_team（74行，逻辑有层级判断：
            # is_summary 判断决定填充 by_cc 还是 by_team，单次迭代写两个目标结构，
            # 无法用 groupby+to_dict 一步替代，保留 iterrows）
            by_cc = []
            by_team: dict = {}

            for _, row in df.iterrows():
                team = row["team_norm"]
                cc = row["cc_str"]
                sid = row["student_id"]
                is_summary = cc in ("小计", None) or str(cc) in ("nan", "NaN")
                rec = {
                    "team": team,
                    "cc_name": None if is_summary else cc,
                    "student_count": self._clean_numeric(sid) if is_summary else None,
                    "student_id": int(sid)
                    if not is_summary and pd.notna(sid) and str(sid) != "nan"
                    else None,
                    "monthly_called": row["monthly_called"],
                    "monthly_connected": row["monthly_connected"],
                    "monthly_effective": row["monthly_effective"],
                    "call_coverage": row["call_coverage"],
                    "connect_coverage": row["connect_coverage"],
                    "effective_coverage": row["effective_coverage"],
                    "avg_effective_count": row["avg_effective_count"],
                }

                if not is_summary and cc and cc != "总计":
                    by_cc.append(rec)

                if is_summary and team != "总计":
                    if team not in by_team:
                        by_team[team] = rec

            # 总计行（向量化查找）
            total_rows = df[
                (df["team_norm"] == "总计")
                | (df["cc_str"].isna() & (df["team_norm"] == "总计"))
            ]
            summary = {}
            if not total_rows.empty:
                r = total_rows.iloc[0]
                summary = {
                    "total_students": self._clean_numeric(r["student_id"]),
                    "call_coverage": self._clean_numeric(r["call_coverage"]),
                    "connect_coverage": self._clean_numeric(r["connect_coverage"]),
                    "effective_coverage": self._clean_numeric(r["effective_coverage"]),
                }
            else:
                r = df.iloc[0]
                summary = {
                    "total_students": self._clean_numeric(r["student_id"]),
                    "call_coverage": self._clean_numeric(r["call_coverage"]),
                    "connect_coverage": self._clean_numeric(r["connect_coverage"]),
                    "effective_coverage": self._clean_numeric(r["effective_coverage"]),
                }

            return {
                "by_cc": by_cc,
                "by_team": list(by_team.values()),
                "summary": summary,
            }
        except Exception as e:
            logger.error(f"F9 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F10: 宣萱_首次体验课课前课后跟进_D-1
    # 126行×17列, 第1行为表头
    # ------------------------------------------------------------------

    def _load_trial_class(self) -> dict:
        path = self._find_latest_file(self._F10_SUBDIR)
        if not path:
            logger.warning("F10 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F10: Excel 为空或格式异常，返回空结果")
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = [
                "channel",
                "team",
                "cc_name",
                "trial_classes",
                "attended",
                "pre_called",
                "pre_connected",
                "pre_effective",
                "post_called",
                "post_connected",
                "post_effective",
                "pre_call_rate",
                "pre_connect_rate",
                "pre_effective_rate",
                "post_call_rate",
                "post_connect_rate",
                "post_effective_rate",
            ]
            df = df.iloc[1:].reset_index(drop=True)
            df = self._ffill_merged(df, ["channel", "team"])

            # 向量化：清洗字段
            df["channel_str"] = df["channel"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["team_norm"] = df["team"].apply(
                lambda v: (
                    self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
                )
            )
            df["cc_str"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            for col in [
                "trial_classes",
                "attended",
                "pre_called",
                "pre_connected",
                "pre_effective",
                "post_called",
                "post_connected",
                "post_effective",
                "pre_call_rate",
                "pre_connect_rate",
                "pre_effective_rate",
                "post_call_rate",
                "post_connect_rate",
                "post_effective_rate",
            ]:
                df[col] = self._clean_numeric_vec(df[col])

            # 过滤空渠道行
            df = df[
                df["channel_str"].notna() & ~df["channel_str"].isin(("nan", "NaN"))
            ].copy()

            # 构建分层结果（126行，三级判断：is_cc_level/is_team_level/is_channel_level
            # 同一行同时分发到 by_cc/by_team/by_channel 三个目标结构，
            # 无法用 groupby+to_dict 一步替代，保留 iterrows）
            by_cc = []
            by_team: dict = {}
            by_channel: dict = {}

            for _, row in df.iterrows():
                channel = row["channel_str"]
                team = row["team_norm"]
                cc = row["cc_str"]

                is_cc_level = cc and cc not in ("nan", "NaN", "小计", None)
                is_team_level = (
                    team
                    and team not in ("nan", "NaN", "小计", None)
                    and not is_cc_level
                )
                is_channel_level = not is_team_level and not is_cc_level

                rec = {
                    "channel": channel,
                    "team": team,
                    "cc_name": cc if is_cc_level else None,
                    "trial_classes": row["trial_classes"],
                    "attended": row["attended"],
                    "pre_call_rate": row["pre_call_rate"],
                    "pre_connect_rate": row["pre_connect_rate"],
                    "pre_effective_rate": row["pre_effective_rate"],
                    "post_call_rate": row["post_call_rate"],
                    "post_connect_rate": row["post_connect_rate"],
                    "post_effective_rate": row["post_effective_rate"],
                    "pre_called": row["pre_called"],
                    "pre_connected": row["pre_connected"],
                    "post_called": row["post_called"],
                    "post_connected": row["post_connected"],
                }

                if is_cc_level:
                    by_cc.append(rec)
                if is_team_level and team not in by_team:
                    by_team[team] = rec
                if (
                    is_channel_level
                    and team in ("小计", None)
                    and channel not in by_channel
                ):
                    by_channel[channel] = rec

            # 总计汇总（向量化）
            summary_df = df[
                df["cc_str"].isna()
                & df["team_norm"].astype(str).str.strip().isin(["小计"])
            ]
            summary = {
                "total_trial_classes": int(
                    summary_df["trial_classes"].apply(lambda v: v or 0).sum()
                ),
            }

            return {
                "by_cc": by_cc,
                "by_team": list(by_team.values()),
                "by_channel": by_channel,
                "summary": summary,
            }
        except Exception as e:
            logger.error(f"F10 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------
    # F11: 宣萱_明细表-泰国课前外呼覆盖_D-1
    # 6931行×16列, 第1行为表头
    # ------------------------------------------------------------------

    def _load_pre_class_outreach(self) -> dict:
        path = self._find_latest_file(self._F11_SUBDIR)
        if not path:
            logger.warning("F11 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                logger.warning("F11: Excel 为空或格式异常，返回空结果")
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = [
                "class_id",
                "student_id",
                "class_time_raw",
                "team",
                "cc_name",
                "lead_grade",
                "is_new_lead",
                "lead_type",
                "channel_l3",
                "channel_l4",
                "last_connect_time",
                "last_call_time",
                "pre_called",
                "pre_connected",
                "pre_connected_2h",
                "attended",
            ]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["team"] = df["team"].apply(
                lambda v: (
                    self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
                )
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["lead_type"] = df["lead_type"].apply(
                lambda v: str(v).strip() if pd.notna(v) else "未知"
            )
            df["lead_grade"] = self._clean_numeric_vec(df["lead_grade"])
            df["is_new_lead"] = df["is_new_lead"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["channel_l3"] = df["channel_l3"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["channel_l4"] = df["channel_l4"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["last_connect_time"] = df["last_connect_time"].apply(
                lambda v: None if str(v).strip() in ("-", "nan", "") else str(v).strip()
            )
            df["last_call_time"] = df["last_call_time"].apply(
                lambda v: None if str(v).strip() in ("-", "nan", "") else str(v).strip()
            )
            df["class_time"] = df["class_time_raw"].apply(
                lambda v: str(v)[:19] if pd.notna(v) else None
            )
            df["class_id"] = df["class_id"].apply(
                lambda v: str(v) if pd.notna(v) else None
            )
            df["student_id"] = df["student_id"].apply(
                lambda v: int(v) if pd.notna(v) else None
            )

            # 数值列向量化（强制 int）
            for col in ["pre_called", "pre_connected", "pre_connected_2h", "attended"]:
                df[col] = self._clean_numeric_vec(df[col]).fillna(0).astype(int)

            # 过滤无效行（team 为空）
            df = df[df["team"].notna()].copy()

            # 构建 records（向量化 to_dict）
            record_cols = [
                "class_id",
                "student_id",
                "class_time",
                "team",
                "cc_name",
                "lead_grade",
                "is_new_lead",
                "lead_type",
                "channel_l3",
                "channel_l4",
                "last_connect_time",
                "last_call_time",
                "pre_called",
                "pre_connected",
                "pre_connected_2h",
                "attended",
            ]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby — 最大收益：6931行→74 CC）
            by_cc: dict = {}
            df_cc = df[df["cc_name"].notna()].copy()
            if not df_cc.empty:
                cc_agg = (
                    df_cc.groupby("cc_name")
                    .agg(
                        team=("team", "first"),
                        total_classes=("cc_name", "count"),
                        pre_class_call=("pre_called", "sum"),
                        pre_class_connect=("pre_connected", "sum"),
                        pre_class_2h_connect=("pre_connected_2h", "sum"),
                        attended=("attended", "sum"),
                    )
                    .reset_index()
                )
                by_cc = self._agg_to_rate_dict(cc_agg, "cc_name")

            # by_team 聚合（向量化 groupby + _agg_to_rate_dict）
            by_team: dict = {}
            team_agg = (
                df.groupby("team")
                .agg(
                    total_classes=("team", "count"),
                    pre_class_call=("pre_called", "sum"),
                    pre_class_connect=("pre_connected", "sum"),
                    pre_class_2h_connect=("pre_connected_2h", "sum"),
                    attended=("attended", "sum"),
                )
                .reset_index()
            )
            by_team = self._agg_to_rate_dict(team_agg, "team")

            # by_lead_type 聚合（向量化 groupby + _agg_to_rate_dict）
            by_lead_type: dict = {}
            lt_agg = (
                df.groupby("lead_type")
                .agg(
                    total_classes=("lead_type", "count"),
                    pre_class_call=("pre_called", "sum"),
                    pre_class_connect=("pre_connected", "sum"),
                    pre_class_2h_connect=("pre_connected_2h", "sum"),
                    attended=("attended", "sum"),
                )
                .reset_index()
            )
            by_lead_type = self._agg_to_rate_dict(lt_agg, "lead_type")

            # by_channel_l3 聚合（新增：深层渠道分析）
            by_channel_l3: dict = {}
            df_l3 = df[
                df["channel_l3"].notna()
                & (df["channel_l3"].astype(str).str.strip() != "")
            ].copy()
            if not df_l3.empty:
                l3_agg = (
                    df_l3.groupby("channel_l3")
                    .agg(
                        total_classes=("channel_l3", "count"),
                        pre_class_call=("pre_called", "sum"),
                        pre_class_connect=("pre_connected", "sum"),
                        pre_class_2h_connect=("pre_connected_2h", "sum"),
                        attended=("attended", "sum"),
                    )
                    .reset_index()
                )
                by_channel_l3 = self._agg_to_rate_dict(l3_agg, "channel_l3")

            # by_lead_grade 聚合（新增：线索质量分层）
            by_lead_grade: dict = {}
            df_lg = df[
                df["lead_grade"].notna()
                & (df["lead_grade"].astype(str).str.strip() != "")
            ].copy()
            if not df_lg.empty:
                lg_agg = (
                    df_lg.groupby("lead_grade")
                    .agg(
                        total_classes=("lead_grade", "count"),
                        pre_class_call=("pre_called", "sum"),
                        pre_class_connect=("pre_connected", "sum"),
                        pre_class_2h_connect=("pre_connected_2h", "sum"),
                        attended=("attended", "sum"),
                    )
                    .reset_index()
                )
                by_lead_grade = self._agg_to_rate_dict(lg_agg, "lead_grade")

            n = len(records)
            summary = {
                "total_records": n,
                "total_pre_called": int(df["pre_called"].sum()),
                "total_pre_connected": int(df["pre_connected"].sum()),
                "total_attended": int(df["attended"].sum()),
                "overall_call_rate": round(df["pre_called"].sum() / n, 4) if n else 0,
                "overall_connect_rate": round(df["pre_connected"].sum() / n, 4)
                if n
                else 0,
                "overall_attendance_rate": round(df["attended"].sum() / n, 4)
                if n
                else 0,
            }

            return {
                "records": records,
                "by_cc": by_cc,
                "by_team": by_team,
                "by_lead_type": by_lead_type,
                "by_channel_l3": by_channel_l3,
                "by_lead_grade": by_lead_grade,
                "summary": summary,
            }
        except Exception as e:
            logger.error(f"F11 解析失败: {e}", exc_info=True)
            return {}

    @staticmethod
    def _agg_to_rate_dict(agg_df: "pd.DataFrame", key_col: str) -> dict:
        """将 groupby 聚合结果转为 {key: {..., call_rate, connect_rate, ...}} dict，消除 iterrows。
        要求 agg_df 有列：key_col, total_classes, pre_class_call, pre_class_connect,
        pre_class_2h_connect, attended。
        """
        agg_df = agg_df.copy()
        denom = agg_df["total_classes"].replace(0, float("nan"))
        agg_df["call_rate"] = (agg_df["pre_class_call"] / denom).fillna(0).round(4)
        agg_df["connect_rate"] = (
            (agg_df["pre_class_connect"] / denom).fillna(0).round(4)
        )
        agg_df["connect_2h_rate"] = (
            (agg_df["pre_class_2h_connect"] / denom).fillna(0).round(4)
        )
        agg_df["attendance_rate"] = (agg_df["attended"] / denom).fillna(0).round(4)
        return {
            str(row[key_col]): {k: v for k, v in row.items() if k != key_col}
            for row in agg_df.to_dict("records")
        }
