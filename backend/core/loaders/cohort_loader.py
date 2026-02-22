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

        # 向量化：过滤全空行 + 无效月份行
        non_empty_mask = ~df.apply(
            lambda row: all(str(v).strip() in ("nan", "", "None") for v in row.values), axis=1
        )
        month_col = df.iloc[:, 0].apply(lambda v: str(v).strip() if pd.notna(v) else None)
        invalid_months = {"nan", "", "月份", "col_0", None}
        valid_month_mask = non_empty_mask & ~month_col.isin(invalid_months)
        df_valid = df[valid_month_mask].copy()

        if df_valid.empty:
            return {"by_team": [], "by_month": []}

        # 向量化清洗月份
        df_valid["_month"] = df_valid.iloc[:, 0].apply(
            lambda v: self._clean_month(str(v).strip()) if pd.notna(v) else None
        )
        df_valid = df_valid[df_valid["_month"].notna()].copy()

        # 向量化清洗数值列 m1-m12 (col positions 3-14)
        m_col_positions = [2 + m for m in range(1, 13)]  # 3..14
        for m_idx, col_pos in enumerate(m_col_positions, start=1):
            col_name = f"m{m_idx}"
            if col_pos < len(df_valid.columns):
                df_valid[col_name] = df_valid.iloc[:, col_pos].apply(self._clean_numeric)
            else:
                df_valid[col_name] = None

        import math
        region_col = df_valid.columns[1]
        group_col = df_valid.columns[2]

        # 向量化构建 by_team（列操作 + to_dict）
        df_valid["_region"] = df_valid[region_col].apply(
            lambda v: str(v).strip() if pd.notna(v) else None
        )
        df_valid["_group"] = df_valid[group_col].apply(
            lambda v: str(v).strip() if pd.notna(v) else None
        )
        m_cols = [f"m{i}" for i in range(1, 13)]
        by_team_df = df_valid[["_month", "_region", "_group"] + m_cols].copy()
        by_team_df = by_team_df.rename(columns={"_month": "月份", "_region": "海外大区", "_group": "小组"})
        # Replace NaN floats with None in m cols
        by_team_df[m_cols] = by_team_df[m_cols].where(by_team_df[m_cols].notna(), other=None)
        by_team = by_team_df.to_dict("records")

        # 按月聚合（向量化 groupby）
        summary_groups = {"小计", "总计"}
        summary_mask = (
            df_valid["_group"].fillna("").isin(summary_groups | {""}) |
            df_valid["_region"].fillna("").isin(summary_groups)
        )
        df_summary = df_valid[summary_mask].copy()

        by_month = []
        if not df_summary.empty:
            monthly_avg = df_summary.groupby("_month")[m_cols].mean()
            # Replace NaN with None and convert to list of dicts
            monthly_avg = monthly_avg.where(monthly_avg.notna(), other=None)
            monthly_avg.index.name = "月份"
            monthly_avg = monthly_avg.reset_index()
            by_month = monthly_avg.to_dict("records")
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

        # 向量化：过滤无效月份和无效学员id
        month_col_data = df.get("月份", None)
        id_col_data = df.get("学员id", None)

        if month_col_data is None or id_col_data is None:
            return {"records": [], "by_cc": {}, "by_team": {}, "total_students": 0}

        month_str = month_col_data.apply(lambda v: str(v).strip() if pd.notna(v) else None)
        valid_month_mask = month_str.notna() & ~month_str.isin({"nan", "月份"})
        student_str = id_col_data.apply(lambda v: str(v).strip() if pd.notna(v) else None)
        valid_id_mask = student_str.notna() & (student_str != "nan")
        df_valid = df[valid_month_mask & valid_id_mask].copy()

        if df_valid.empty:
            return {"records": [], "by_cc": {}, "by_team": {}, "total_students": 0}

        # 向量化清洗月份、基础字段
        df_valid["_month"] = df_valid["月份"].apply(
            lambda v: self._clean_month(str(v).strip()) if pd.notna(v) else None
        )
        df_valid = df_valid[df_valid["_month"].notna()].copy()

        def _clean_str_col(col: str):
            return df_valid[col].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            ) if col in df_valid.columns else pd.Series([None] * len(df_valid), index=df_valid.index)

        df_valid["_region"] = _clean_str_col("海外大区")
        df_valid["_student_id"] = _clean_str_col("学员id")
        df_valid["_group"] = _clean_str_col("当前小组")
        df_valid["_cc"] = _clean_str_col("当前CC")

        # 向量化清洗所有 36 个月度列（第1-12个月 × 3指标）
        for m in range(1, 13):
            for col_tmpl in [f"第{m}个月是否有效", f"第{m}个月是否触达", f"第{m}个月带新注册数"]:
                if col_tmpl in df_valid.columns:
                    df_valid[f"_clean_{col_tmpl}"] = df_valid[col_tmpl].apply(self._clean_numeric)
                else:
                    df_valid[f"_clean_{col_tmpl}"] = None

        # 构建 records（需要嵌套 dict 结构，用 to_dict 列表推导）
        def _build_c6_record(row):
            valid_months = {f"m{m}": row.get(f"_clean_第{m}个月是否有效") for m in range(1, 13)}
            reach_months = {f"m{m}": row.get(f"_clean_第{m}个月是否触达") for m in range(1, 13)}
            new_reg_months = {f"m{m}": row.get(f"_clean_第{m}个月带新注册数") for m in range(1, 13)}
            return {
                "月份": row["_month"],
                "海外大区": row["_region"],
                "学员id": row["_student_id"],
                "当前小组": row["_group"],
                "当前CC": row["_cc"],
                "是否有效": valid_months,
                "是否触达": reach_months,
                "带新注册数": new_reg_months,
            }

        # 保留 iterrows：输出需要嵌套 dict（是否有效/触达/带新注册数），
        # 36 个数值列已预先向量化清洗，此循环仅做结构装配，无法消除
        records = [_build_c6_record(row) for _, row in df_valid.iterrows()]

        # 向量化聚合 by_cc（groupby 替代逐行累加）
        # m1 列用于统计有效/触达，"-" 已被 clean_numeric 转 None → 0
        valid_m1_key = "_clean_第1个月是否有效"
        reach_m1_key = "_clean_第1个月是否触达"
        new_reg_m1_key = "_clean_第1个月带新注册数"

        cc_col = df_valid["_cc"].fillna("").replace("nan", "")
        df_valid["_cc_key"] = cc_col
        cc_valid = df_valid[df_valid["_cc_key"] != ""].copy()

        by_cc: dict = {}
        if not cc_valid.empty:
            cc_valid["_valid_m1"] = (cc_valid[valid_m1_key] == 1).astype(int)
            cc_valid["_reach_m1"] = (cc_valid[reach_m1_key] == 1).astype(int)
            cc_valid["_new_reg_m1"] = cc_valid[new_reg_m1_key].fillna(0)
            cc_team = cc_valid.groupby("_cc_key").agg(
                团队=("_group", "first"),
                月份=("_month", "first"),
                学员数=("_cc_key", "count"),
                有效学员数=("_valid_m1", "sum"),
                触达学员数=("_reach_m1", "sum"),
                带新注册总数=("_new_reg_m1", "sum"),
            )
            for cc_name, row in cc_team.iterrows():
                by_cc[cc_name] = {
                    "CC": cc_name,
                    "团队": row["团队"],
                    "月份": row["月份"],
                    "学员数": int(row["学员数"]),
                    "有效学员数": int(row["有效学员数"]),
                    "触达学员数": int(row["触达学员数"]),
                    "带新注册总数": float(row["带新注册总数"]),
                }

        # 向量化聚合 by_team
        group_col = df_valid["_group"].fillna("").replace("nan", "")
        df_valid["_group_key"] = group_col
        group_valid = df_valid[df_valid["_group_key"] != ""].copy()

        by_team: dict = {}
        if not group_valid.empty:
            group_valid["_valid_m1"] = (group_valid[valid_m1_key] == 1).astype(int)
            group_valid["_reach_m1"] = (group_valid[reach_m1_key] == 1).astype(int)
            group_valid["_new_reg_m1"] = group_valid[new_reg_m1_key].fillna(0)
            team_agg = group_valid.groupby("_group_key").agg(
                学员数=("_group_key", "count"),
                有效学员数=("_valid_m1", "sum"),
                触达学员数=("_reach_m1", "sum"),
                带新注册总数=("_new_reg_m1", "sum"),
            )
            for team_name, row in team_agg.iterrows():
                by_team[team_name] = {
                    "团队": team_name,
                    "学员数": int(row["学员数"]),
                    "有效学员数": int(row["有效学员数"]),
                    "触达学员数": int(row["触达学员数"]),
                    "带新注册总数": float(row["带新注册总数"]),
                }

        return {
            "records": records,
            "by_cc": by_cc,
            "by_team": by_team,
            "total_students": len(records),
        }
