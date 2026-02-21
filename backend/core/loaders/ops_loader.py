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

            # 找表头行（包含"渠道"的行）
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

            # 过滤掉汇总行（总计/小计）
            records = []
            for _, row in df.iterrows():
                channel = str(row.get("channel", "")).strip()
                team = self._normalize_team(str(row.get("team", "")).strip())
                cc = str(row.get("cc_name", "")).strip()
                # 跳过空行
                if not channel or channel in ("nan", "NaN"):
                    continue
                records.append({
                    "channel": channel,
                    "team": team if team not in ("nan", "NaN") else None,
                    "cc_name": cc if cc not in ("nan", "NaN", "小计") else None,
                    "leads": self._clean_numeric(row.get("leads")),
                    "appointments": self._clean_numeric(row.get("appointments")),
                    "attended": self._clean_numeric(row.get("attended")),
                    "paid": self._clean_numeric(row.get("paid")),
                    "appt_rate": self._clean_numeric(row.get("appt_rate")),
                    "appt_attend_rate": self._clean_numeric(row.get("appt_attend_rate")),
                    "attend_paid_rate": self._clean_numeric(row.get("attend_paid_rate")),
                    "funnel_paid_rate": self._clean_numeric(row.get("funnel_paid_rate")),
                    "call_rate_24h": self._clean_numeric(row.get("call_rate_24h")),
                    "connect_rate_24h": self._clean_numeric(row.get("connect_rate_24h")),
                    "effective_rate_24h": self._clean_numeric(row.get("effective_rate_24h")),
                    "call_rate_48h": self._clean_numeric(row.get("call_rate_48h")),
                    "connect_rate_48h": self._clean_numeric(row.get("connect_rate_48h")),
                    "effective_rate_48h": self._clean_numeric(row.get("effective_rate_48h")),
                    "total_call_rate": self._clean_numeric(row.get("total_call_rate")),
                    "total_connect_rate": self._clean_numeric(row.get("total_connect_rate")),
                    "total_effective_rate": self._clean_numeric(row.get("total_effective_rate")),
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

            # 找表头行（包含"渠道类型"）
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

            records = []
            for _, row in df.iterrows():
                ct = str(row["channel_type"]).strip()
                month = str(row["month"]).strip()
                team = self._normalize_team(str(row["team"]).strip())
                cc = str(row["cc_name"]).strip()
                if not ct or ct in ("nan", "NaN"):
                    continue
                records.append({
                    "channel_type": ct,
                    "month": month if month not in ("nan", "NaN", "小计") else None,
                    "team": team if team not in ("nan", "NaN", "小计") else None,
                    "cc_name": cc if cc not in ("nan", "NaN", "小计") else None,
                    "appt_rate": self._clean_numeric(row["appt_rate"]),
                    "appt_attend_rate": self._clean_numeric(row["appt_attend_rate"]),
                    "attend_paid_rate": self._clean_numeric(row["attend_paid_rate"]),
                    "reg_paid_rate": self._clean_numeric(row["reg_paid_rate"]),
                    "registrations": self._clean_numeric(row["registrations"]),
                    "appointments": self._clean_numeric(row["appointments"]),
                    "attended": self._clean_numeric(row["attended"]),
                    "paid": self._clean_numeric(row["paid"]),
                    "amount_usd": self._clean_numeric(row["amount_usd"]),
                })

            # 总计汇总
            total_rows = df[df["channel_type"].astype(str).str.strip().isin(["市场", "转介绍"])]
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

            # 找表头行（包含"渠道类型"）
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

            records = []
            for _, row in df.iterrows():
                ct = str(row["channel_type"]).strip()
                month = str(row["month"]).strip()
                team = self._normalize_team(str(row["team"]).strip())
                cc = str(row["cc_name"]).strip()
                if not ct or ct in ("nan", "NaN"):
                    continue
                records.append({
                    "channel_type": ct,
                    "month": month if month not in ("nan", "NaN", "小计") else None,
                    "team": team if team not in ("nan", "NaN", "小计") else None,
                    "cc_name": cc if cc not in ("nan", "NaN", "小计") else None,
                    "appt_rate": self._clean_numeric(row["appt_rate"]),
                    "appt_attend_rate": self._clean_numeric(row["appt_attend_rate"]),
                    "attend_paid_rate": self._clean_numeric(row["attend_paid_rate"]),
                    "alloc_paid_rate": self._clean_numeric(row["alloc_paid_rate"]),
                    "allocations": self._clean_numeric(row["allocations"]),
                    "appointments": self._clean_numeric(row["appointments"]),
                    "attended": self._clean_numeric(row["attended"]),
                    "paid": self._clean_numeric(row["paid"]),
                    "amount_usd": self._clean_numeric(row["amount_usd"]),
                })

            # 按渠道类型汇总
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

            # 按月份汇总（MoM 对比）
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

            # 解析多层表头
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

            records = []
            for _, row in df.iterrows():
                ch = str(row["channel"]).strip()
                if not ch or ch in ("nan", "NaN", "-"):
                    continue
                rec = {"channel": ch}
                for col in col_names[1:]:
                    rec[col] = self._clean_numeric(row[col])
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

            records = []
            by_cc: dict = {}
            by_team: dict = {}
            by_date: dict = {}

            for _, row in df.iterrows():
                date = self._clean_date(row["date_raw"])
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                if not date or not team:
                    continue

                rec = {
                    "date": date,
                    "team": team,
                    "cc_name": cc,
                    "avg_calls": self._clean_numeric(row["avg_calls"]),
                    "avg_connects": self._clean_numeric(row["avg_connects"]),
                    "avg_effective": self._clean_numeric(row["avg_effective"]),
                    "avg_duration_min": self._clean_numeric(row["avg_duration_min"]),
                    "total_calls": self._clean_numeric(row["total_calls"]),
                    "total_connects": self._clean_numeric(row["total_connects"]),
                    "total_effective": self._clean_numeric(row["total_effective"]),
                    "total_duration_min": self._clean_numeric(row["total_duration_min"]),
                }
                records.append(rec)

                # by_cc 聚合
                if cc:
                    if cc not in by_cc:
                        by_cc[cc] = {"team": team, "dates": [], "total_calls": 0,
                                     "total_connects": 0, "total_effective": 0,
                                     "_total_duration_min": 0.0, "_duration_days": 0}
                    by_cc[cc]["dates"].append(date)
                    by_cc[cc]["total_calls"] += rec["total_calls"] or 0
                    by_cc[cc]["total_connects"] += rec["total_connects"] or 0
                    by_cc[cc]["total_effective"] += rec["total_effective"] or 0
                    dur = rec["total_duration_min"] or 0.0
                    by_cc[cc]["_total_duration_min"] += dur
                    if dur > 0:
                        by_cc[cc]["_duration_days"] += 1

                # by_team 聚合
                if team not in by_team:
                    by_team[team] = {"total_calls": 0, "total_connects": 0, "total_effective": 0}
                by_team[team]["total_calls"] += rec["total_calls"] or 0
                by_team[team]["total_connects"] += rec["total_connects"] or 0
                by_team[team]["total_effective"] += rec["total_effective"] or 0

                # by_date 聚合
                if date not in by_date:
                    by_date[date] = {"total_calls": 0, "total_connects": 0, "total_effective": 0, "cc_count": 0}
                by_date[date]["total_calls"] += rec["total_calls"] or 0
                by_date[date]["total_connects"] += rec["total_connects"] or 0
                by_date[date]["total_effective"] += rec["total_effective"] or 0
                by_date[date]["cc_count"] += 1

            by_date_list = [{"date": d, **v} for d, v in sorted(by_date.items())]

            # 计算每个 CC 的平均通话时长并清理临时字段
            for cc_data in by_cc.values():
                days = cc_data.pop("_duration_days", 0)
                total_dur = cc_data.pop("_total_duration_min", 0.0)
                cc_data["avg_duration_min"] = round(total_dur / days, 2) if days > 0 else None

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

            records = []
            by_cc: dict = {}
            by_team: dict = {}

            for _, row in df.iterrows():
                channel = str(row["channel"]).strip() if pd.notna(row["channel"]) else None
                alloc_date = self._clean_date(row["alloc_date_raw"])
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                sid = row["student_id"]
                if not channel or not team:
                    continue

                c24 = int(self._clean_numeric(row["called_24h"]) or 0)
                cn24 = int(self._clean_numeric(row["connected_24h"]) or 0)
                c48 = int(self._clean_numeric(row["called_48h"]) or 0)
                cn48 = int(self._clean_numeric(row["connected_48h"]) or 0)

                rec = {
                    "channel": channel,
                    "alloc_date": alloc_date,
                    "team": team,
                    "cc_name": cc,
                    "student_id": int(sid) if pd.notna(sid) and str(sid) != "nan" else None,
                    "called_24h": c24,
                    "connected_24h": cn24,
                    "called_48h": c48,
                    "connected_48h": cn48,
                }
                records.append(rec)

                # by_cc 聚合
                if cc:
                    if cc not in by_cc:
                        by_cc[cc] = {"team": team, "total": 0, "called_24h": 0, "connected_24h": 0,
                                     "called_48h": 0, "connected_48h": 0}
                    by_cc[cc]["total"] += 1
                    by_cc[cc]["called_24h"] += c24
                    by_cc[cc]["connected_24h"] += cn24
                    by_cc[cc]["called_48h"] += c48
                    by_cc[cc]["connected_48h"] += cn48

                # by_team 聚合
                if team:
                    if team not in by_team:
                        by_team[team] = {"total": 0, "called_24h": 0, "connected_24h": 0,
                                         "called_48h": 0, "connected_48h": 0}
                    by_team[team]["total"] += 1
                    by_team[team]["called_24h"] += c24
                    by_team[team]["connected_24h"] += cn24
                    by_team[team]["called_48h"] += c48
                    by_team[team]["connected_48h"] += cn48

            # 计算比率
            def _add_rates(d: dict):
                total = d.get("total", 0)
                if total > 0:
                    d["call_rate_24h"] = round(d["called_24h"] / total, 4)
                    d["connect_rate_24h"] = round(d["connected_24h"] / total, 4)
                    d["call_rate_48h"] = round(d["called_48h"] / total, 4)
                    d["connect_rate_48h"] = round(d["connected_48h"] / total, 4)

            for v in by_cc.values():
                _add_rates(v)
            for v in by_team.values():
                _add_rates(v)

            n = len(records)
            summary = {
                "total_leads": n,
                "call_rate_24h": round(sum(r["called_24h"] for r in records) / n, 4) if n else 0,
                "connect_rate_24h": round(sum(r["connected_24h"] for r in records) / n, 4) if n else 0,
                "call_rate_48h": round(sum(r["called_48h"] for r in records) / n, 4) if n else 0,
                "connect_rate_48h": round(sum(r["connected_48h"] for r in records) / n, 4) if n else 0,
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

            records = []
            by_cc: dict = {}
            by_team: dict = {}

            for _, row in df.iterrows():
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                sid = row["student_id"]
                if not team or not cc:
                    continue

                called = int(self._clean_numeric(row["monthly_called"]) or 0)
                connected = int(self._clean_numeric(row["monthly_connected"]) or 0)
                effective = int(self._clean_numeric(row["monthly_effective"]) or 0)
                eff_count = int(self._clean_numeric(row["monthly_effective_count"]) or 0)

                rec = {
                    "team": team,
                    "cc_name": cc,
                    "student_id": int(sid) if pd.notna(sid) and str(sid) != "nan" else None,
                    "first_paid_date": self._clean_date(row["first_paid_date_raw"]),
                    "monthly_called": called,
                    "monthly_connected": connected,
                    "monthly_effective": effective,
                    "monthly_effective_count": eff_count,
                }
                records.append(rec)

                for key, d in [(cc, by_cc), (team, by_team)]:
                    if key not in d:
                        d[key] = {"total_students": 0, "monthly_called": 0,
                                  "monthly_connected": 0, "monthly_effective": 0,
                                  "monthly_effective_count": 0}
                    d[key]["total_students"] += 1
                    d[key]["monthly_called"] += called
                    d[key]["monthly_connected"] += connected
                    d[key]["monthly_effective"] += effective
                    d[key]["monthly_effective_count"] += eff_count

            # 为 by_cc 记录 team
            for _, row in df.iterrows():
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                if cc and cc in by_cc and "team" not in by_cc[cc]:
                    by_cc[cc]["team"] = team

            n = len(records)
            summary = {
                "total_students": n,
                "total_monthly_called": sum(r["monthly_called"] for r in records),
                "total_monthly_connected": sum(r["monthly_connected"] for r in records),
                "total_monthly_effective": sum(r["monthly_effective"] for r in records),
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

            by_enclosure: dict = {}
            by_cc: list = []

            for _, row in df.iterrows():
                enc = str(row["enclosure"]).strip() if pd.notna(row["enclosure"]) else None
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                if not enc or enc in ("nan", "NaN"):
                    continue

                sid_val = row["student_id"]
                is_summary = cc in ("小计", None) or str(cc) in ("nan", "NaN")

                rec = {
                    "enclosure": enc,
                    "team": team,
                    "cc_name": None if is_summary else cc,
                    "student_count": self._clean_numeric(sid_val) if is_summary else None,
                    "student_id": int(sid_val) if not is_summary and pd.notna(sid_val) and str(sid_val) != "nan" else None,
                    "monthly_called": self._clean_numeric(row["monthly_called"]),
                    "monthly_connected": self._clean_numeric(row["monthly_connected"]),
                    "monthly_effective": self._clean_numeric(row["monthly_effective"]),
                    "call_coverage": self._clean_numeric(row["call_coverage"]),
                    "connect_coverage": self._clean_numeric(row["connect_coverage"]),
                    "effective_coverage": self._clean_numeric(row["effective_coverage"]),
                    "avg_effective_count": self._clean_numeric(row["avg_effective_count"]),
                }

                # 汇总行放入 by_enclosure
                if enc not in by_enclosure:
                    by_enclosure[enc] = {"by_team": [], "summary": None}
                if team in ("小计", None) or str(team) in ("nan", "NaN"):
                    by_enclosure[enc]["summary"] = rec
                else:
                    by_enclosure[enc]["by_team"].append(rec)

                # 个人级放 by_cc
                if not is_summary and cc:
                    by_cc.append(rec)

            # 总计行
            total_rows = df[df["enclosure"].astype(str).str.strip() == "总计"]
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

            by_cc = []
            by_team: dict = {}

            for _, row in df.iterrows():
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                sid = row["student_id"]
                if not team or team in ("nan", "NaN"):
                    continue

                is_summary = cc in ("小计", None) or str(cc) in ("nan", "NaN")
                rec = {
                    "team": team,
                    "cc_name": None if is_summary else cc,
                    "student_count": self._clean_numeric(sid) if is_summary else None,
                    "student_id": int(sid) if not is_summary and pd.notna(sid) and str(sid) != "nan" else None,
                    "monthly_called": self._clean_numeric(row["monthly_called"]),
                    "monthly_connected": self._clean_numeric(row["monthly_connected"]),
                    "monthly_effective": self._clean_numeric(row["monthly_effective"]),
                    "call_coverage": self._clean_numeric(row["call_coverage"]),
                    "connect_coverage": self._clean_numeric(row["connect_coverage"]),
                    "effective_coverage": self._clean_numeric(row["effective_coverage"]),
                    "avg_effective_count": self._clean_numeric(row["avg_effective_count"]),
                }

                if not is_summary and cc and cc != "总计":
                    by_cc.append(rec)

                # team 汇总行
                if is_summary and team != "总计":
                    if team not in by_team:
                        by_team[team] = rec

            # 总计行
            total_rows = df[
                (df["team"].astype(str).str.strip() == "总计") |
                (df["cc_name"].isna() & df["team"].astype(str).str.strip().isin(["总计"]))
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
                # 尝试第一行（总计行）
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

            by_cc = []
            by_team: dict = {}
            by_channel: dict = {}

            for _, row in df.iterrows():
                channel = str(row["channel"]).strip() if pd.notna(row["channel"]) else None
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                if not channel or channel in ("nan", "NaN"):
                    continue

                is_cc_level = cc and cc not in ("nan", "NaN", "小计", None)
                is_team_level = team and team not in ("nan", "NaN", "小计", None) and not is_cc_level
                is_channel_level = not is_team_level and not is_cc_level

                rec = {
                    "channel": channel,
                    "team": team,
                    "cc_name": cc if is_cc_level else None,
                    "trial_classes": self._clean_numeric(row["trial_classes"]),
                    "attended": self._clean_numeric(row["attended"]),
                    "pre_call_rate": self._clean_numeric(row["pre_call_rate"]),
                    "pre_connect_rate": self._clean_numeric(row["pre_connect_rate"]),
                    "pre_effective_rate": self._clean_numeric(row["pre_effective_rate"]),
                    "post_call_rate": self._clean_numeric(row["post_call_rate"]),
                    "post_connect_rate": self._clean_numeric(row["post_connect_rate"]),
                    "post_effective_rate": self._clean_numeric(row["post_effective_rate"]),
                    "pre_called": self._clean_numeric(row["pre_called"]),
                    "pre_connected": self._clean_numeric(row["pre_connected"]),
                    "post_called": self._clean_numeric(row["post_called"]),
                    "post_connected": self._clean_numeric(row["post_connected"]),
                }

                if is_cc_level:
                    by_cc.append(rec)
                if is_team_level and team not in by_team:
                    by_team[team] = rec
                if is_channel_level and team in ("小计", None) and channel not in by_channel:
                    by_channel[channel] = rec

            # 总计行
            total_rows = df[df["team"].isna() & df["channel"].astype(str).str.strip().isin(["MKT", "转介绍"])]
            summary = {}
            all_rows = df[df["cc_name"].isna() & df["team"].isna()]
            # 总体汇总（所有渠道之和）
            summary = {
                "total_trial_classes": sum(
                    self._clean_numeric(r["trial_classes"]) or 0
                    for _, r in df[df["cc_name"].isna() & df["team"].astype(str).str.strip().isin(["小计"])].iterrows()
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

            records = []
            by_cc: dict = {}
            by_team: dict = {}
            by_lead_type: dict = {}

            for _, row in df.iterrows():
                team = self._normalize_team(str(row["team"]).strip()) if pd.notna(row["team"]) else "THCC"
                cc = str(row["cc_name"]).strip() if pd.notna(row["cc_name"]) else None
                if not team:
                    continue

                pre_called = int(self._clean_numeric(row["pre_called"]) or 0)
                pre_connected = int(self._clean_numeric(row["pre_connected"]) or 0)
                pre_2h = int(self._clean_numeric(row["pre_connected_2h"]) or 0)
                att = int(self._clean_numeric(row["attended"]) or 0)
                lead_type = str(row["lead_type"]).strip() if pd.notna(row["lead_type"]) else "未知"

                # 末次时间字段："-"为占位符
                last_connect = str(row["last_connect_time"]).strip()
                last_call = str(row["last_call_time"]).strip()

                rec = {
                    "class_id": str(row["class_id"]) if pd.notna(row["class_id"]) else None,
                    "student_id": int(row["student_id"]) if pd.notna(row["student_id"]) else None,
                    "class_time": str(row["class_time_raw"])[:19] if pd.notna(row["class_time_raw"]) else None,
                    "team": team,
                    "cc_name": cc,
                    "lead_grade": self._clean_numeric(row["lead_grade"]),
                    "is_new_lead": str(row["is_new_lead"]).strip() if pd.notna(row["is_new_lead"]) else None,
                    "lead_type": lead_type,
                    "channel_l3": str(row["channel_l3"]).strip() if pd.notna(row["channel_l3"]) else None,
                    "channel_l4": str(row["channel_l4"]).strip() if pd.notna(row["channel_l4"]) else None,
                    "last_connect_time": None if last_connect in ("-", "nan", "") else last_connect,
                    "last_call_time": None if last_call in ("-", "nan", "") else last_call,
                    "pre_called": pre_called,
                    "pre_connected": pre_connected,
                    "pre_connected_2h": pre_2h,
                    "attended": att,
                }
                records.append(rec)

                # by_cc 聚合
                if cc:
                    if cc not in by_cc:
                        by_cc[cc] = {"team": team, "total_classes": 0, "pre_class_call": 0,
                                     "pre_class_connect": 0, "pre_class_2h_connect": 0, "attended": 0}
                    by_cc[cc]["total_classes"] += 1
                    by_cc[cc]["pre_class_call"] += pre_called
                    by_cc[cc]["pre_class_connect"] += pre_connected
                    by_cc[cc]["pre_class_2h_connect"] += pre_2h
                    by_cc[cc]["attended"] += att

                # by_team 聚合
                if team not in by_team:
                    by_team[team] = {"total_classes": 0, "pre_class_call": 0,
                                     "pre_class_connect": 0, "pre_class_2h_connect": 0, "attended": 0}
                by_team[team]["total_classes"] += 1
                by_team[team]["pre_class_call"] += pre_called
                by_team[team]["pre_class_connect"] += pre_connected
                by_team[team]["pre_class_2h_connect"] += pre_2h
                by_team[team]["attended"] += att

                # by_lead_type 聚合
                if lead_type not in by_lead_type:
                    by_lead_type[lead_type] = {"total_classes": 0, "pre_class_call": 0,
                                               "pre_class_connect": 0, "pre_class_2h_connect": 0, "attended": 0}
                by_lead_type[lead_type]["total_classes"] += 1
                by_lead_type[lead_type]["pre_class_call"] += pre_called
                by_lead_type[lead_type]["pre_class_connect"] += pre_connected
                by_lead_type[lead_type]["pre_class_2h_connect"] += pre_2h
                by_lead_type[lead_type]["attended"] += att

            # 计算比率
            def _calc_rates(d: dict):
                total = d.get("total_classes", 0)
                if total > 0:
                    d["call_rate"] = round(d["pre_class_call"] / total, 4)
                    d["connect_rate"] = round(d["pre_class_connect"] / total, 4)
                    d["connect_2h_rate"] = round(d["pre_class_2h_connect"] / total, 4)
                    d["attendance_rate"] = round(d["attended"] / total, 4)

            for v in by_cc.values():
                _calc_rates(v)
            for v in by_team.values():
                _calc_rates(v)
            for v in by_lead_type.values():
                _calc_rates(v)

            n = len(records)
            summary = {
                "total_records": n,
                "total_pre_called": sum(r["pre_called"] for r in records),
                "total_pre_connected": sum(r["pre_connected"] for r in records),
                "total_attended": sum(r["attended"] for r in records),
                "overall_call_rate": round(sum(r["pre_called"] for r in records) / n, 4) if n else 0,
                "overall_connect_rate": round(sum(r["pre_connected"] for r in records) / n, 4) if n else 0,
                "overall_attendance_rate": round(sum(r["attended"] for r in records) / n, 4) if n else 0,
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
