"""F类 运营数据 Loader — 11 个数据源（F1-F11）

F1-F4 使用 calamine 引擎读取（openpyxl 遇到 name 参数异常无法解析）
F5-F11 使用 openpyxl → calamine fallback
"""
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class OpsLoader(BaseLoader):
    """宣宣/宣萱运营数据加载器（F1-F11）"""

    # F1-F4 直接用 calamine，跳过 openpyxl（已知有 name 参数兼容问题）
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

    def _read_calamine(self, path: Path, header: int = 0, skiprows=None) -> pd.DataFrame:
        """强制用 calamine 读取（用于 F1-F4 openpyxl 报 name 错误的文件）"""
        try:
            return pd.read_excel(path, engine="calamine", header=header, skiprows=skiprows)
        except Exception as e:
            logger.error(f"calamine 读取失败 {path}: {e}")
            return pd.DataFrame()

    def _read_raw_calamine(self, path: Path) -> pd.DataFrame:
        """无 header 原始读取（用于需要手动定位表头行的文件）"""
        try:
            return pd.read_excel(path, engine="calamine", header=None)
        except Exception as e:
            logger.error(f"calamine 原始读取失败 {path}: {e}")
            return pd.DataFrame()

    # ------------------------------------------------------------------
    # 公共入口
    # ------------------------------------------------------------------

    def load_all(self) -> dict:
        return {
            "funnel_efficiency": self._load_funnel_efficiency(),          # F1
            "section_efficiency": self._load_section_efficiency(),        # F2
            "section_mom": self._load_section_mom(),                      # F3
            "channel_mom": self._load_channel_mom(),                      # F4
            "daily_outreach": self._load_daily_outreach(),                # F5
            "trial_followup": self._load_trial_followup(),                # F6
            "paid_user_followup": self._load_paid_user_followup(),        # F7
            "enclosure_monthly_followup": self._load_enclosure_monthly(), # F8
            "monthly_paid_followup": self._load_monthly_paid(),           # F9
            "trial_class_followup": self._load_trial_class(),             # F10
            "pre_class_outreach": self._load_pre_class_outreach(),        # F11
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

    def _load_funnel_efficiency(self) -> dict:
        path = self._find_latest_file(self._F1_SUBDIR)
        if not path:
            logger.warning("F1 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                return {}

            # 找表头行（包含"渠道"的行）— 小循环(<10行)，保留 iterrows
            header_row = 3  # 默认第4行（0-indexed=3）
            for i, row in raw.iterrows():
                if str(row.iloc[0]).strip() == "渠道":
                    header_row = i
                    break

            df = raw.iloc[header_row:].reset_index(drop=True)
            df.columns = df.iloc[0].tolist()
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
                df.columns[7]: "appt_rate",
                df.columns[8]: "appt_attend_rate",
                df.columns[9]: "attend_paid_rate",
                df.columns[10]: "funnel_paid_rate",
                df.columns[11]: "call_24h",
                df.columns[12]: "connect_24h",
                df.columns[13]: "effective_24h",
                df.columns[14]: "call_48h",
                df.columns[15]: "connect_48h",
                df.columns[16]: "effective_48h",
                df.columns[17]: "total_called",
                df.columns[18]: "total_connected",
                df.columns[19]: "total_effective",
                df.columns[20]: "call_rate_24h",
                df.columns[21]: "connect_rate_24h",
                df.columns[22]: "effective_rate_24h",
                df.columns[23]: "call_rate_48h",
                df.columns[24]: "connect_rate_48h",
                df.columns[25]: "effective_rate_48h",
                df.columns[26]: "total_call_rate",
                df.columns[27]: "total_connect_rate",
                df.columns[28]: "total_effective_rate",
            } if len(df.columns) >= 29 else {}
            df = df.rename(columns=col_map)

            # 向量化：过滤空行（channel 非空且非 nan）
            valid_mask = (
                df["channel"].astype(str).str.strip().ne("") &
                ~df["channel"].astype(str).str.strip().isin(("nan", "NaN"))
            )
            df_valid = df[valid_mask].copy()

            # 向量化：规范化 team、cc_name
            df_valid["team"] = df_valid["team"].astype(str).str.strip().apply(self._normalize_team)
            df_valid["cc_name"] = df_valid["cc_name"].astype(str).str.strip()

            # 数值列向量化（对每列应用 _clean_numeric）
            numeric_cols = [
                "leads", "appointments", "attended", "paid",
                "appt_rate", "appt_attend_rate", "attend_paid_rate", "funnel_paid_rate",
                "call_rate_24h", "connect_rate_24h", "effective_rate_24h",
                "call_rate_48h", "connect_rate_48h", "effective_rate_48h",
                "total_call_rate", "total_connect_rate", "total_effective_rate",
            ]
            for col in numeric_cols:
                if col in df_valid.columns:
                    df_valid[col] = df_valid[col].apply(self._clean_numeric)

            # 构建 records（小DataFrame转dict，行数=CC人数级别）
            records = []
            for _, row in df_valid.iterrows():
                channel = str(row["channel"]).strip()
                team = row["team"]
                cc = row["cc_name"]
                records.append({
                    "channel": channel,
                    "team": team if team not in ("nan", "NaN") else None,
                    "cc_name": cc if cc not in ("nan", "NaN", "小计") else None,
                    "leads": row.get("leads"),
                    "appointments": row.get("appointments"),
                    "attended": row.get("attended"),
                    "paid": row.get("paid"),
                    "appt_rate": row.get("appt_rate"),
                    "appt_attend_rate": row.get("appt_attend_rate"),
                    "attend_paid_rate": row.get("attend_paid_rate"),
                    "funnel_paid_rate": row.get("funnel_paid_rate"),
                    "call_rate_24h": row.get("call_rate_24h"),
                    "connect_rate_24h": row.get("connect_rate_24h"),
                    "effective_rate_24h": row.get("effective_rate_24h"),
                    "call_rate_48h": row.get("call_rate_48h"),
                    "connect_rate_48h": row.get("connect_rate_48h"),
                    "effective_rate_48h": row.get("effective_rate_48h"),
                    "total_call_rate": row.get("total_call_rate"),
                    "total_connect_rate": row.get("total_connect_rate"),
                    "total_effective_rate": row.get("total_effective_rate"),
                })

            # 找汇总行
            summary_row = df[df.get("channel", pd.Series(dtype=str)).astype(str).str.strip() == "总计"]
            summary = {}
            if not summary_row.empty:
                r = summary_row.iloc[0]
                summary = {
                    "leads": self._clean_numeric(r.get("leads")),
                    "appointments": self._clean_numeric(r.get("appointments")),
                    "attended": self._clean_numeric(r.get("attended")),
                    "paid": self._clean_numeric(r.get("paid")),
                    "total_call_rate": self._clean_numeric(r.get("total_call_rate")),
                    "total_connect_rate": self._clean_numeric(r.get("total_connect_rate")),
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
    # ------------------------------------------------------------------

    def _load_section_efficiency(self) -> dict:
        path = self._find_latest_file(self._F2_SUBDIR)
        if not path:
            logger.warning("F2 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                return {}

            # 找表头行（包含"渠道类型"）— 小循环，保留 iterrows
            header_row = 2
            for i, row in raw.iterrows():
                if str(row.iloc[0]).strip() == "渠道类型":
                    header_row = i
                    break

            df = raw.iloc[header_row:].reset_index(drop=True)
            df.columns = ["channel_type", "month", "team", "cc_name",
                          "appt_rate", "appt_attend_rate", "attend_paid_rate", "reg_paid_rate",
                          "registrations", "appointments", "attended", "paid", "amount_usd"]
            df = df.iloc[1:].reset_index(drop=True)

            # ffill 渠道类型（可能有合并）
            df["channel_type"] = df["channel_type"].ffill()

            # 向量化：过滤空行
            valid_mask = (
                df["channel_type"].astype(str).str.strip().ne("") &
                ~df["channel_type"].astype(str).str.strip().isin(("nan", "NaN"))
            )
            df_valid = df[valid_mask].copy()

            # 向量化：规范化字段
            df_valid["team"] = df_valid["team"].astype(str).str.strip().apply(self._normalize_team)
            df_valid["cc_name"] = df_valid["cc_name"].astype(str).str.strip()
            df_valid["month_str"] = df_valid["month"].astype(str).str.strip()

            # 数值列向量化
            for col in ["appt_rate", "appt_attend_rate", "attend_paid_rate", "reg_paid_rate",
                        "registrations", "appointments", "attended", "paid", "amount_usd"]:
                df_valid[col] = df_valid[col].apply(self._clean_numeric)

            # 构建 records（聚合后小DataFrame）
            records = []
            for _, row in df_valid.iterrows():
                ct = str(row["channel_type"]).strip()
                month = row["month_str"]
                team = row["team"]
                cc = row["cc_name"]
                records.append({
                    "channel_type": ct,
                    "month": month if month not in ("nan", "NaN", "小计") else None,
                    "team": team if team not in ("nan", "NaN", "小计") else None,
                    "cc_name": cc if cc not in ("nan", "NaN", "小计") else None,
                    "appt_rate": row["appt_rate"],
                    "appt_attend_rate": row["appt_attend_rate"],
                    "attend_paid_rate": row["attend_paid_rate"],
                    "reg_paid_rate": row["reg_paid_rate"],
                    "registrations": row["registrations"],
                    "appointments": row["appointments"],
                    "attended": row["attended"],
                    "paid": row["paid"],
                    "amount_usd": row["amount_usd"],
                })

            # 总计汇总（向量化）
            by_channel = {}
            for ct in ["市场", "转介绍"]:
                ct_rows = df[
                    (df["channel_type"].astype(str).str.strip() == ct) &
                    (df["month"].isna() | df["month"].astype(str).str.strip().isin(["小计", "nan"]))
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

            return {"records": records, "by_channel": by_channel}
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
                return {}

            # 找表头行（包含"渠道类型"）— 小循环，保留 iterrows
            header_row = 3
            for i, row in raw.iterrows():
                if str(row.iloc[0]).strip() == "渠道类型":
                    header_row = i
                    break

            df = raw.iloc[header_row:].reset_index(drop=True)
            df.columns = ["channel_type", "month", "team", "cc_name",
                          "appt_rate", "appt_attend_rate", "attend_paid_rate", "alloc_paid_rate",
                          "allocations", "appointments", "attended", "paid", "amount_usd"]
            df = df.iloc[1:].reset_index(drop=True)
            df["channel_type"] = df["channel_type"].ffill()

            # 向量化：过滤空行
            valid_mask = (
                df["channel_type"].astype(str).str.strip().ne("") &
                ~df["channel_type"].astype(str).str.strip().isin(("nan", "NaN"))
            )
            df_valid = df[valid_mask].copy()

            # 向量化：规范化字段
            df_valid["team"] = df_valid["team"].astype(str).str.strip().apply(self._normalize_team)
            df_valid["cc_name"] = df_valid["cc_name"].astype(str).str.strip()
            df_valid["month_str"] = df_valid["month"].astype(str).str.strip()

            # 数值列向量化
            for col in ["appt_rate", "appt_attend_rate", "attend_paid_rate", "alloc_paid_rate",
                        "allocations", "appointments", "attended", "paid", "amount_usd"]:
                df_valid[col] = df_valid[col].apply(self._clean_numeric)

            # 构建 records（聚合后小DataFrame）
            records = []
            for _, row in df_valid.iterrows():
                ct = str(row["channel_type"]).strip()
                month = row["month_str"]
                team = row["team"]
                cc = row["cc_name"]
                records.append({
                    "channel_type": ct,
                    "month": month if month not in ("nan", "NaN", "小计") else None,
                    "team": team if team not in ("nan", "NaN", "小计") else None,
                    "cc_name": cc if cc not in ("nan", "NaN", "小计") else None,
                    "appt_rate": row["appt_rate"],
                    "appt_attend_rate": row["appt_attend_rate"],
                    "attend_paid_rate": row["attend_paid_rate"],
                    "alloc_paid_rate": row["alloc_paid_rate"],
                    "allocations": row["allocations"],
                    "appointments": row["appointments"],
                    "attended": row["attended"],
                    "paid": row["paid"],
                    "amount_usd": row["amount_usd"],
                })

            # 按渠道类型汇总（向量化）
            by_channel: dict = {}
            for ct in ["市场", "转介绍"]:
                ct_rows = df[
                    (df["channel_type"].astype(str).str.strip() == ct) &
                    (df["month"].isna() | df["month"].astype(str).str.strip().isin(["小计", "nan"]))
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
                    (df["month"].astype(str).str.strip() == m) &
                    (df["team"].isna() | df["team"].astype(str).str.strip().isin(["小计", "nan"]))
                ]
                if not m_rows.empty:
                    by_month[m] = []
                    for ct in ["市场", "转介绍"]:
                        ct_m = m_rows[m_rows["channel_type"].astype(str).str.strip() == ct]
                        if not ct_m.empty:
                            r = ct_m.iloc[0]
                            by_month[m].append({
                                "channel_type": ct,
                                "appt_rate": self._clean_numeric(r["appt_rate"]),
                                "paid": self._clean_numeric(r["paid"]),
                                "amount_usd": self._clean_numeric(r["amount_usd"]),
                            })

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
                return {}

            # 解析多层表头（Python 预处理，保留）
            metric_row = raw.iloc[2].tolist()    # 指标组名（度量, 注册, 注册, ...）
            month_row = raw.iloc[3].tolist()     # 月份（三级渠道, 202512, 202601, ...）

            # 构建列名："{metric}_{month}"
            col_names = []
            current_metric = ""
            for i, (m, mo) in enumerate(zip(metric_row, month_row)):
                if i == 0:
                    col_names.append("channel")
                    continue
                if str(m).strip() and str(m).strip() not in ("nan", "NaN"):
                    current_metric = str(m).strip()
                month_val = str(mo).strip() if str(mo).strip() not in ("nan", "NaN") else ""
                col_names.append(f"{current_metric}__{month_val}" if month_val else current_metric)

            df = raw.iloc[4:].reset_index(drop=True)
            df.columns = col_names

            # 向量化：过滤空渠道行
            valid_mask = (
                df["channel"].astype(str).str.strip().ne("") &
                ~df["channel"].astype(str).str.strip().isin(("nan", "NaN", "-"))
            )
            df_valid = df[valid_mask].copy()

            # 向量化：对所有指标列应用 _clean_numeric
            metric_cols = col_names[1:]
            for col in metric_cols:
                df_valid[col] = df_valid[col].apply(self._clean_numeric)

            # 构建 records（聚合后小DataFrame，行数=渠道数级别）
            records = []
            for _, row in df_valid.iterrows():
                rec = {"channel": str(row["channel"]).strip()}
                for col in metric_cols:
                    rec[col] = row[col]
                records.append(rec)

            # 提取唯一月份列表
            months = sorted(set(
                col.split("__")[1] for col in col_names[1:]
                if "__" in col and col.split("__")[1].isdigit()
            ))

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
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = ["date_raw", "team", "cc_name",
                          "avg_calls", "avg_connects", "avg_effective", "avg_duration_min",
                          "total_calls", "total_connects", "total_effective", "total_duration_min"]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["date"] = df["date_raw"].apply(self._clean_date)
            df["team"] = df["team"].apply(
                lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            num_cols = ["avg_calls", "avg_connects", "avg_effective", "avg_duration_min",
                        "total_calls", "total_connects", "total_effective", "total_duration_min"]
            for col in num_cols:
                df[col] = df[col].apply(self._clean_numeric)

            # 过滤无效行（date 或 team 为空）
            df = df[df["date"].notna() & df["team"].notna()].copy()

            # 构建 records（向量化 to_dict）
            record_cols = ["date", "team", "cc_name",
                           "avg_calls", "avg_connects", "avg_effective", "avg_duration_min",
                           "total_calls", "total_connects", "total_effective", "total_duration_min"]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby）
            df_cc = df[df["cc_name"].notna()].copy()
            by_cc: dict = {}
            if not df_cc.empty:
                cc_agg = df_cc.groupby("cc_name").agg(
                    team=("team", "first"),
                    dates=("date", list),
                    total_calls=("total_calls", lambda x: sum(v or 0 for v in x)),
                    total_connects=("total_connects", lambda x: sum(v or 0 for v in x)),
                    total_effective=("total_effective", lambda x: sum(v or 0 for v in x)),
                    _total_duration_min=("total_duration_min", lambda x: sum(v or 0.0 for v in x)),
                    _duration_days=("total_duration_min", lambda x: sum(1 for v in x if v and v > 0)),
                ).reset_index()
                for _, row in cc_agg.iterrows():
                    days = row["_duration_days"]
                    total_dur = row["_total_duration_min"]
                    by_cc[row["cc_name"]] = {
                        "team": row["team"],
                        "dates": row["dates"],
                        "total_calls": row["total_calls"],
                        "total_connects": row["total_connects"],
                        "total_effective": row["total_effective"],
                        "avg_duration_min": round(total_dur / days, 2) if days > 0 else None,
                    }

            # by_team 聚合（向量化 groupby）
            team_agg = df.groupby("team").agg(
                total_calls=("total_calls", lambda x: sum(v or 0 for v in x)),
                total_connects=("total_connects", lambda x: sum(v or 0 for v in x)),
                total_effective=("total_effective", lambda x: sum(v or 0 for v in x)),
            ).reset_index()
            by_team = {row["team"]: row[["total_calls", "total_connects", "total_effective"]].to_dict()
                       for _, row in team_agg.iterrows()}

            # by_date 聚合（向量化 groupby）
            date_agg = df.groupby("date").agg(
                total_calls=("total_calls", lambda x: sum(v or 0 for v in x)),
                total_connects=("total_connects", lambda x: sum(v or 0 for v in x)),
                total_effective=("total_effective", lambda x: sum(v or 0 for v in x)),
                cc_count=("cc_name", "count"),
            ).reset_index()
            by_date_list = [
                {"date": row["date"], "total_calls": row["total_calls"],
                 "total_connects": row["total_connects"], "total_effective": row["total_effective"],
                 "cc_count": row["cc_count"]}
                for _, row in date_agg.sort_values("date").iterrows()
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
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = ["channel", "alloc_date_raw", "team", "cc_name",
                          "student_id", "called_24h", "connected_24h", "called_48h", "connected_48h"]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["channel"] = df["channel"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["alloc_date"] = df["alloc_date_raw"].apply(self._clean_date)
            df["team"] = df["team"].apply(
                lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["student_id"] = df["student_id"].apply(
                lambda v: int(v) if pd.notna(v) and str(v) != "nan" else None
            )

            # 数值列向量化（强制 int）
            for col in ["called_24h", "connected_24h", "called_48h", "connected_48h"]:
                df[col] = df[col].apply(lambda v: int(self._clean_numeric(v) or 0))

            # 过滤无效行
            df = df[df["channel"].notna() & df["team"].notna()].copy()

            # 构建 records
            record_cols = ["channel", "alloc_date", "team", "cc_name", "student_id",
                           "called_24h", "connected_24h", "called_48h", "connected_48h"]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby）
            df_cc = df[df["cc_name"].notna()].copy()
            by_cc: dict = {}
            if not df_cc.empty:
                cc_agg = df_cc.groupby("cc_name").agg(
                    team=("team", "first"),
                    total=("cc_name", "count"),
                    called_24h=("called_24h", "sum"),
                    connected_24h=("connected_24h", "sum"),
                    called_48h=("called_48h", "sum"),
                    connected_48h=("connected_48h", "sum"),
                ).reset_index()
                for _, row in cc_agg.iterrows():
                    d = row.to_dict()
                    cc_name = d.pop("cc_name")
                    total = d["total"]
                    if total > 0:
                        d["call_rate_24h"] = round(d["called_24h"] / total, 4)
                        d["connect_rate_24h"] = round(d["connected_24h"] / total, 4)
                        d["call_rate_48h"] = round(d["called_48h"] / total, 4)
                        d["connect_rate_48h"] = round(d["connected_48h"] / total, 4)
                    by_cc[cc_name] = d

            # by_team 聚合（向量化 groupby）
            by_team: dict = {}
            team_agg = df.groupby("team").agg(
                total=("team", "count"),
                called_24h=("called_24h", "sum"),
                connected_24h=("connected_24h", "sum"),
                called_48h=("called_48h", "sum"),
                connected_48h=("connected_48h", "sum"),
            ).reset_index()
            for _, row in team_agg.iterrows():
                d = row.to_dict()
                team_name = d.pop("team")
                total = d["total"]
                if total > 0:
                    d["call_rate_24h"] = round(d["called_24h"] / total, 4)
                    d["connect_rate_24h"] = round(d["connected_24h"] / total, 4)
                    d["call_rate_48h"] = round(d["called_48h"] / total, 4)
                    d["connect_rate_48h"] = round(d["connected_48h"] / total, 4)
                by_team[team_name] = d

            n = len(records)
            summary = {
                "total_leads": n,
                "call_rate_24h": round(df["called_24h"].sum() / n, 4) if n else 0,
                "connect_rate_24h": round(df["connected_24h"].sum() / n, 4) if n else 0,
                "call_rate_48h": round(df["called_48h"].sum() / n, 4) if n else 0,
                "connect_rate_48h": round(df["connected_48h"].sum() / n, 4) if n else 0,
            }

            return {"records": records, "by_cc": by_cc, "by_team": by_team, "summary": summary}
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
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = ["team", "cc_name", "student_id",
                          "first_paid_date_raw", "monthly_called", "monthly_connected",
                          "monthly_effective", "monthly_effective_count"]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["team"] = df["team"].apply(
                lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["student_id"] = df["student_id"].apply(
                lambda v: int(v) if pd.notna(v) and str(v) != "nan" else None
            )
            df["first_paid_date"] = df["first_paid_date_raw"].apply(self._clean_date)

            # 数值列向量化（强制 int）
            for col in ["monthly_called", "monthly_connected", "monthly_effective", "monthly_effective_count"]:
                df[col] = df[col].apply(lambda v: int(self._clean_numeric(v) or 0))

            # 过滤无效行（team 或 cc_name 为空）
            df = df[df["team"].notna() & df["cc_name"].notna()].copy()

            # 构建 records
            record_cols = ["team", "cc_name", "student_id", "first_paid_date",
                           "monthly_called", "monthly_connected", "monthly_effective", "monthly_effective_count"]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby）— 同时捕获 team 归属
            by_cc: dict = {}
            cc_agg = df.groupby("cc_name").agg(
                team=("team", "first"),
                total_students=("cc_name", "count"),
                monthly_called=("monthly_called", "sum"),
                monthly_connected=("monthly_connected", "sum"),
                monthly_effective=("monthly_effective", "sum"),
                monthly_effective_count=("monthly_effective_count", "sum"),
            ).reset_index()
            for _, row in cc_agg.iterrows():
                d = row.to_dict()
                cc_name = d.pop("cc_name")
                by_cc[cc_name] = d

            # by_team 聚合（向量化 groupby）
            by_team: dict = {}
            team_agg = df.groupby("team").agg(
                total_students=("team", "count"),
                monthly_called=("monthly_called", "sum"),
                monthly_connected=("monthly_connected", "sum"),
                monthly_effective=("monthly_effective", "sum"),
                monthly_effective_count=("monthly_effective_count", "sum"),
            ).reset_index()
            for _, row in team_agg.iterrows():
                d = row.to_dict()
                team_name = d.pop("team")
                by_team[team_name] = d

            n = len(records)
            summary = {
                "total_students": n,
                "total_monthly_called": int(df["monthly_called"].sum()),
                "total_monthly_connected": int(df["monthly_connected"].sum()),
                "total_monthly_effective": int(df["monthly_effective"].sum()),
            }

            return {"records": records, "by_cc": by_cc, "by_team": by_team, "summary": summary}
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
            logger.warning("F8 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = ["enclosure", "team", "cc_name", "student_id",
                          "monthly_called", "monthly_connected", "monthly_effective",
                          "call_coverage", "connect_coverage", "effective_coverage",
                          "avg_effective_count"]
            df = df.iloc[1:].reset_index(drop=True)

            # ffill 合并单元格
            df = self._ffill_merged(df, ["enclosure", "team"])

            # 向量化：清洗字段
            df["enc_str"] = df["enclosure"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["team_norm"] = df["team"].apply(
                lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
            )
            df["cc_str"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            for col in ["monthly_called", "monthly_connected", "monthly_effective",
                        "call_coverage", "connect_coverage", "effective_coverage", "avg_effective_count"]:
                df[col] = df[col].apply(self._clean_numeric)

            # 过滤空行
            df = df[df["enc_str"].notna() & ~df["enc_str"].isin(("nan", "NaN"))].copy()

            # 构建 by_enclosure 和 by_cc（行数=围场段×CC级别，逻辑复杂保留优化后迭代）
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
                    "student_count": self._clean_numeric(sid_val) if is_summary else None,
                    "student_id": int(sid_val) if not is_summary and pd.notna(sid_val) and str(sid_val) != "nan" else None,
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
            logger.warning("F9 文件不存在")
            return {}
        try:
            raw = self._read_raw_calamine(path)
            if raw.empty:
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = ["team", "cc_name", "student_id",
                          "monthly_called", "monthly_connected", "monthly_effective",
                          "call_coverage", "connect_coverage", "effective_coverage",
                          "avg_effective_count"]
            df = df.iloc[1:].reset_index(drop=True)
            df = self._ffill_merged(df, ["team"])

            # 向量化：清洗字段
            df["team_norm"] = df["team"].apply(
                lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
            )
            df["cc_str"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            for col in ["monthly_called", "monthly_connected", "monthly_effective",
                        "call_coverage", "connect_coverage", "effective_coverage", "avg_effective_count"]:
                df[col] = df[col].apply(self._clean_numeric)

            # 过滤无效 team 行
            df = df[
                df["team_norm"].notna() & ~df["team_norm"].isin(("nan", "NaN"))
            ].copy()

            # 构建 by_cc 和 by_team（74行，逻辑有层级判断，保留优化后迭代）
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
                    "student_id": int(sid) if not is_summary and pd.notna(sid) and str(sid) != "nan" else None,
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
                (df["team_norm"] == "总计") |
                (df["cc_str"].isna() & (df["team_norm"] == "总计"))
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
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = ["channel", "team", "cc_name",
                          "trial_classes", "attended",
                          "pre_called", "pre_connected", "pre_effective",
                          "post_called", "post_connected", "post_effective",
                          "pre_call_rate", "pre_connect_rate", "pre_effective_rate",
                          "post_call_rate", "post_connect_rate", "post_effective_rate"]
            df = df.iloc[1:].reset_index(drop=True)
            df = self._ffill_merged(df, ["channel", "team"])

            # 向量化：清洗字段
            df["channel_str"] = df["channel"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["team_norm"] = df["team"].apply(
                lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
            )
            df["cc_str"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

            # 数值列向量化
            for col in ["trial_classes", "attended",
                        "pre_called", "pre_connected", "pre_effective",
                        "post_called", "post_connected", "post_effective",
                        "pre_call_rate", "pre_connect_rate", "pre_effective_rate",
                        "post_call_rate", "post_connect_rate", "post_effective_rate"]:
                df[col] = df[col].apply(self._clean_numeric)

            # 过滤空渠道行
            df = df[
                df["channel_str"].notna() & ~df["channel_str"].isin(("nan", "NaN"))
            ].copy()

            # 构建分层结果（126行，层级判断逻辑保留优化后迭代）
            by_cc = []
            by_team: dict = {}
            by_channel: dict = {}

            for _, row in df.iterrows():
                channel = row["channel_str"]
                team = row["team_norm"]
                cc = row["cc_str"]

                is_cc_level = cc and cc not in ("nan", "NaN", "小计", None)
                is_team_level = team and team not in ("nan", "NaN", "小计", None) and not is_cc_level
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
                if is_channel_level and team in ("小计", None) and channel not in by_channel:
                    by_channel[channel] = rec

            # 总计汇总（向量化）
            summary_df = df[
                df["cc_str"].isna() &
                df["team_norm"].astype(str).str.strip().isin(["小计"])
            ]
            summary = {
                "total_trial_classes": int(summary_df["trial_classes"].apply(lambda v: v or 0).sum()),
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
                return {}

            df = raw.iloc[0:].reset_index(drop=True)
            df.columns = ["class_id", "student_id", "class_time_raw",
                          "team", "cc_name", "lead_grade",
                          "is_new_lead", "lead_type",
                          "channel_l3", "channel_l4",
                          "last_connect_time", "last_call_time",
                          "pre_called", "pre_connected", "pre_connected_2h",
                          "attended"]
            df = df.iloc[1:].reset_index(drop=True)

            # 向量化：清洗字段
            df["team"] = df["team"].apply(
                lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else "THCC"
            )
            df["cc_name"] = df["cc_name"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["lead_type"] = df["lead_type"].apply(
                lambda v: str(v).strip() if pd.notna(v) else "未知"
            )
            df["lead_grade"] = df["lead_grade"].apply(self._clean_numeric)
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
                df[col] = df[col].apply(lambda v: int(self._clean_numeric(v) or 0))

            # 过滤无效行（team 为空）
            df = df[df["team"].notna()].copy()

            # 构建 records（向量化 to_dict）
            record_cols = [
                "class_id", "student_id", "class_time", "team", "cc_name",
                "lead_grade", "is_new_lead", "lead_type", "channel_l3", "channel_l4",
                "last_connect_time", "last_call_time",
                "pre_called", "pre_connected", "pre_connected_2h", "attended",
            ]
            records = df[record_cols].to_dict("records")

            # by_cc 聚合（向量化 groupby — 最大收益：6931行→74 CC）
            by_cc: dict = {}
            df_cc = df[df["cc_name"].notna()].copy()
            if not df_cc.empty:
                cc_agg = df_cc.groupby("cc_name").agg(
                    team=("team", "first"),
                    total_classes=("cc_name", "count"),
                    pre_class_call=("pre_called", "sum"),
                    pre_class_connect=("pre_connected", "sum"),
                    pre_class_2h_connect=("pre_connected_2h", "sum"),
                    attended=("attended", "sum"),
                ).reset_index()
                for _, row in cc_agg.iterrows():
                    d = row.to_dict()
                    cc_name = d.pop("cc_name")
                    total = d["total_classes"]
                    if total > 0:
                        d["call_rate"] = round(d["pre_class_call"] / total, 4)
                        d["connect_rate"] = round(d["pre_class_connect"] / total, 4)
                        d["connect_2h_rate"] = round(d["pre_class_2h_connect"] / total, 4)
                        d["attendance_rate"] = round(d["attended"] / total, 4)
                    by_cc[cc_name] = d

            # by_team 聚合（向量化 groupby）
            by_team: dict = {}
            team_agg = df.groupby("team").agg(
                total_classes=("team", "count"),
                pre_class_call=("pre_called", "sum"),
                pre_class_connect=("pre_connected", "sum"),
                pre_class_2h_connect=("pre_connected_2h", "sum"),
                attended=("attended", "sum"),
            ).reset_index()
            for _, row in team_agg.iterrows():
                d = row.to_dict()
                team_name = d.pop("team")
                total = d["total_classes"]
                if total > 0:
                    d["call_rate"] = round(d["pre_class_call"] / total, 4)
                    d["connect_rate"] = round(d["pre_class_connect"] / total, 4)
                    d["connect_2h_rate"] = round(d["pre_class_2h_connect"] / total, 4)
                    d["attendance_rate"] = round(d["attended"] / total, 4)
                by_team[team_name] = d

            # by_lead_type 聚合（向量化 groupby）
            by_lead_type: dict = {}
            lt_agg = df.groupby("lead_type").agg(
                total_classes=("lead_type", "count"),
                pre_class_call=("pre_called", "sum"),
                pre_class_connect=("pre_connected", "sum"),
                pre_class_2h_connect=("pre_connected_2h", "sum"),
                attended=("attended", "sum"),
            ).reset_index()
            for _, row in lt_agg.iterrows():
                d = row.to_dict()
                lt_name = d.pop("lead_type")
                total = d["total_classes"]
                if total > 0:
                    d["call_rate"] = round(d["pre_class_call"] / total, 4)
                    d["connect_rate"] = round(d["pre_class_connect"] / total, 4)
                    d["connect_2h_rate"] = round(d["pre_class_2h_connect"] / total, 4)
                    d["attendance_rate"] = round(d["attended"] / total, 4)
                by_lead_type[lt_name] = d

            n = len(records)
            summary = {
                "total_records": n,
                "total_pre_called": int(df["pre_called"].sum()),
                "total_pre_connected": int(df["pre_connected"].sum()),
                "total_attended": int(df["attended"].sum()),
                "overall_call_rate": round(df["pre_called"].sum() / n, 4) if n else 0,
                "overall_connect_rate": round(df["pre_connected"].sum() / n, 4) if n else 0,
                "overall_attendance_rate": round(df["attended"].sum() / n, 4) if n else 0,
            }

            return {
                "records": records,
                "by_cc": by_cc,
                "by_team": by_team,
                "by_lead_type": by_lead_type,
                "summary": summary,
            }
        except Exception as e:
            logger.error(f"F11 解析失败: {e}", exc_info=True)
            return {}
