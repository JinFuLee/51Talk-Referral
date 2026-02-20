"""
C 类 Cohort 数据加载器 — 6 个数据源
C1: BI-cohort模型_CC触达率_M-1
C2: BI-cohort模型_CC参与率_M-1
C3: BI-cohort模型_CC打卡率_M-1
C4: BI-cohort模型_CC帶新系數_M-1
C5: BI-cohort模型_CC帶貨比_M-1
C6: BI-cohort模型_CCcohort明细表_M-1
"""
from pathlib import Path
from typing import Optional
import logging

from .base import BaseLoader

logger = logging.getLogger(__name__)


class CohortLoader(BaseLoader):
    """C 类 Cohort 数据加载器"""

    # Cohort 指标源目录映射
    METRIC_SOURCES = {
        "reach_rate": ("BI-cohort模型_CC触达率_M-1", "触达率"),
        "participation_rate": ("BI-cohort模型_CC参与率_M-1", "参与率"),
        "checkin_rate": ("BI-cohort模型_CC打卡率_M-1", "打卡率"),
        "referral_coefficient": ("BI-cohort模型_CC帶新系數_M-1", "帶新系數"),
        "conversion_ratio": ("BI-cohort模型_CC帶貨比_M-1", "帶貨比"),
    }

    def __init__(self, input_dir: Path):
        super().__init__(input_dir)

    def load_all(self) -> dict:
        """加载所有 C 类数据源，单源失败不影响其他源"""
        result = {}

        for metric_key, (subdir, _metric_name) in self.METRIC_SOURCES.items():
            try:
                result[metric_key] = self._load_cohort_metric(subdir, metric_key)
            except Exception as e:
                logger.error(f"C cohort metric [{metric_key}] 加载失败: {e}")
                result[metric_key] = {}

        try:
            result["cohort_detail"] = self._load_c6_cohort_detail()
        except Exception as e:
            logger.error(f"C6 cohort_detail 加载失败: {e}")
            result["cohort_detail"] = {}

        return result

    def _load_cohort_metric(self, subdir: str, metric_name: str) -> dict:
        """
        通用 Cohort 指标加载器（C1-C5）
        结构统一：前3列(月份/海外大区/小组) + 第4-15列(第N个月指标值)
        合并单元格用前向填充处理
        """
        import pandas as pd

        path = self._find_latest_file(subdir)
        if not path:
            logger.warning(f"Cohort metric [{metric_name}]: 数据文件未找到 ({subdir})")
            return {}

        # header=None 读取，自行处理表头
        df_raw = self._read_xlsx_pandas(path, sheet_name=0, header=None)
        if df_raw.empty:
            return {}

        # 找到实际数据起始行：跳过全为 nan 的行，以及表头行
        # 通常第1行是大标题，第2行是列名，第3行起是数据
        # 检查第2行是否像列名（含月份/大区等关键词）
        header_row_idx = 0
        for i in range(min(5, len(df_raw))):
            row_vals = [str(v).strip() for v in df_raw.iloc[i].tolist()]
            # 找到包含"月份"或"海外大区"或数字月份标题的行
            if any("月份" in v or "海外大区" in v or "大区" in v or "小组" in v for v in row_vals):
                header_row_idx = i
                break

        header = df_raw.iloc[header_row_idx].tolist()
        col_names = [str(h).strip() if str(h).strip() not in ("nan", "") else f"col_{i}" for i, h in enumerate(header)]

        df = df_raw.iloc[header_row_idx + 1:].copy()
        df.columns = col_names
        df = df.reset_index(drop=True)

        # 前向填充合并单元格（前3列）
        fill_cols = col_names[:3]
        df = self._ffill_merged(df, fill_cols)

        by_team = []
        by_month = []
        month_accum: dict = {}

        for _, row in df.iterrows():
            # 跳过全空行
            vals_str = [str(v).strip() for v in row.values]
            if all(v in ("nan", "", "None") for v in vals_str):
                continue

            month_raw = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else None
            region = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else None
            group = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None

            if not month_raw or month_raw in ("nan", "月份", "col_0"):
                continue

            # 月份格式清洗
            month = self._clean_month(month_raw)
            if not month:
                continue

            # 读取第4-15列（第1-12个月的指标值）
            month_vals = {}
            for m_idx in range(1, 13):
                col_pos = 2 + m_idx  # 0-based: col[3]=第1个月, col[14]=第12个月
                val = row.iloc[col_pos] if col_pos < len(row) else None
                month_vals[f"m{m_idx}"] = self._clean_numeric(val)

            record = {
                "月份": month,
                "海外大区": region,
                "小组": group,
                **month_vals,
            }
            by_team.append(record)

            # 按月份聚合（仅取小计行或合并为月度汇总）
            if group in ("小计", "总计", None) or (region in ("小计", "总计")):
                if month not in month_accum:
                    month_accum[month] = {
                        "月份": month,
                        **{f"m{i}": [] for i in range(1, 13)},
                    }
                for m_idx in range(1, 13):
                    v = month_vals.get(f"m{m_idx}")
                    if v is not None:
                        month_accum[month][f"m{m_idx}"].append(v)

        # 按月聚合求平均
        for month, data in month_accum.items():
            avg_record = {"月份": month}
            for m_idx in range(1, 13):
                vals_list = data.get(f"m{m_idx}", [])
                avg_record[f"m{m_idx}"] = (sum(vals_list) / len(vals_list)) if vals_list else None
            by_month.append(avg_record)

        by_month.sort(key=lambda x: x["月份"])

        return {
            "by_team": by_team,
            "by_month": by_month,
        }

    def _clean_month(self, raw: str) -> Optional[str]:
        """清洗月份字符串 → YYYY-MM 格式"""
        s = raw.strip()
        # 已是 YYYY-MM 格式
        if len(s) == 7 and s[4] == "-":
            return s
        # YYYYMM 数字格式
        if len(s) == 6 and s.isdigit():
            return f"{s[:4]}-{s[4:6]}"
        # 可能含中文"年月"
        import re
        m = re.match(r"(\d{4}).*?(\d{1,2})", s)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}"
        # 浮点数形式（pandas 读 Excel 日期序号）
        try:
            from datetime import datetime, timedelta
            serial = float(s)
            if 40000 < serial < 60000:
                base = datetime(1899, 12, 30)
                dt = base + timedelta(days=int(serial))
                return dt.strftime("%Y-%m")
        except ValueError:
            pass
        return None

    # ── C6: CCcohort 明细表 ────────────────────────────────────────────
    def _load_c6_cohort_detail(self) -> dict:
        """
        C6: BI-cohort模型_CCcohort明细表_M-1
        Sheet: 转介绍cohort明细表
        8806行×30+列，含月份/大区/学员id/当前小组/当前CC/第1-12月是否有效/触达/带新注册数
        带新注册数列有 "-" 字符串需处理
        """
        import pandas as pd

        path = self._find_latest_file("BI-cohort模型_CCcohort明细表_M-1")
        if not path:
            logger.warning("C6: cohort明细表文件未找到")
            return {}

        df = self._read_xlsx_pandas(path, sheet_name="转介绍cohort明细表", header=0)
        if df.empty:
            return {}

        df.columns = [str(c).strip() for c in df.columns]

        # 前向填充合并单元格（月份/大区可能合并）
        fill_cols = [c for c in df.columns[:4] if c in df.columns]
        df = self._ffill_merged(df, fill_cols)

        records = []
        by_cc: dict = {}
        by_team: dict = {}

        for _, row in df.iterrows():
            month_raw = str(row.get("月份", "")).strip() if pd.notna(row.get("月份", None)) else None
            if not month_raw or month_raw in ("nan", "月份"):
                continue

            month = self._clean_month(month_raw)
            region = str(row.get("海外大区", "")).strip() if pd.notna(row.get("海外大区", None)) else None
            student_id = str(row.get("学员id", "")).strip() if pd.notna(row.get("学员id", None)) else None
            group = str(row.get("当前小组", "")).strip() if pd.notna(row.get("当前小组", None)) else None
            cc = str(row.get("当前CC", "")).strip() if pd.notna(row.get("当前CC", None)) else None

            if not student_id or student_id == "nan":
                continue

            # 读取第1-12个月的有效/触达/带新注册数
            valid_months = {}
            reach_months = {}
            new_reg_months = {}

            for m in range(1, 13):
                valid_col = f"第{m}个月是否有效"
                reach_col = f"第{m}个月是否触达"
                new_reg_col = f"第{m}个月带新注册数"

                valid_months[f"m{m}"] = self._clean_numeric(row.get(valid_col, None))
                reach_months[f"m{m}"] = self._clean_numeric(row.get(reach_col, None))
                # 带新注册数有 "-" 字符串
                new_reg_raw = row.get(new_reg_col, None)
                new_reg_months[f"m{m}"] = self._clean_numeric(new_reg_raw)  # "-" 会被 clean_numeric 转 None

            rec = {
                "月份": month,
                "海外大区": region,
                "学员id": student_id,
                "当前小组": group,
                "当前CC": cc,
                "是否有效": valid_months,
                "是否触达": reach_months,
                "带新注册数": new_reg_months,
            }
            records.append(rec)

            # by_cc 聚合
            if cc and cc != "nan":
                if cc not in by_cc:
                    by_cc[cc] = {
                        "CC": cc,
                        "团队": group,
                        "月份": month,
                        "学员数": 0,
                        "有效学员数": 0,
                        "触达学员数": 0,
                        "带新注册总数": 0,
                    }
                by_cc[cc]["学员数"] += 1
                # 统计第1个月有效/触达
                if valid_months.get("m1") == 1:
                    by_cc[cc]["有效学员数"] += 1
                if reach_months.get("m1") == 1:
                    by_cc[cc]["触达学员数"] += 1
                new_m1 = new_reg_months.get("m1") or 0
                by_cc[cc]["带新注册总数"] += new_m1

            # by_team 聚合
            if group and group != "nan":
                if group not in by_team:
                    by_team[group] = {
                        "团队": group,
                        "学员数": 0,
                        "有效学员数": 0,
                        "触达学员数": 0,
                        "带新注册总数": 0,
                    }
                by_team[group]["学员数"] += 1
                if valid_months.get("m1") == 1:
                    by_team[group]["有效学员数"] += 1
                if reach_months.get("m1") == 1:
                    by_team[group]["触达学员数"] += 1
                new_m1 = new_reg_months.get("m1") or 0
                by_team[group]["带新注册总数"] += new_m1

        return {
            "records": records,
            "by_cc": by_cc,
            "by_team": by_team,
            "total_students": len(records),
        }
