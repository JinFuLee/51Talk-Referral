"""
B 类 ROI 数据加载器 — 1 个数据源
B1: 中台_转介绍ROI测算数据模型_M-1
"""
from pathlib import Path
import logging

from .base import BaseLoader

logger = logging.getLogger(__name__)


class ROILoader(BaseLoader):
    """B 类 ROI 数据加载器（新版，使用 pandas）"""

    def __init__(self, input_dir: Path):
        super().__init__(input_dir)

    def load_all(self) -> dict:
        """加载所有 B 类数据源"""
        try:
            return self._load_b1_roi_model()
        except Exception as e:
            logger.error(f"B1 roi_model 加载失败: {e}")
            return {}

    # ── B1: 转介绍ROI测算数据模型 ────────────────────────────────────
    def _load_b1_roi_model(self) -> dict:
        """
        B1: 中台_转介绍ROI测算数据模型_M-1
        4 个 Sheet: ROI汇总 / 转介绍成本list / 转介绍详细规则 / 地区
        """
        import pandas as pd

        path = self._find_latest_file("中台_转介绍ROI测算数据模型_M-1")
        if not path:
            logger.warning("B1: ROI 数据文件未找到")
            return {}

        summary = self._load_roi_summary(path)
        cost_list = self._load_cost_list(path)
        cost_rules = self._load_cost_rules(path)
        regions = self._load_regions(path)

        return {
            "summary": summary,
            "cost_list": cost_list,
            "cost_rules": cost_rules,
            "regions": regions,
        }

    def _load_roi_summary(self, path: Path) -> dict:
        """
        ROI汇总 sheet — 实际结构：
        行2: 次卡数据 (col1=地区, col2=目标营收, col3=目标ROI, col4=实际营收, col5=实际成本, col6=实际ROI)
        行8: 现金数据 (同上结构)
        列索引从0开始
        """
        import pandas as pd

        df = self._read_xlsx_pandas(path, sheet_name="ROI汇总", header=None)
        if df.empty:
            return {}

        def _extract_row(row) -> dict:
            return {
                "地区": str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else None,
                "目标营收": self._clean_numeric(row.iloc[2] if len(row) > 2 else None),
                "目标ROI": self._clean_numeric(row.iloc[3] if len(row) > 3 else None),
                "实际营收": self._clean_numeric(row.iloc[4] if len(row) > 4 else None),
                "实际成本": self._clean_numeric(row.iloc[5] if len(row) > 5 else None),
                "实际ROI": self._clean_numeric(row.iloc[6] if len(row) > 6 else None),
            }

        summary = {}

        # 找次卡行（含"次卡"关键词的行下一行）
        card_data_idx = None
        cash_data_idx = None
        for i, row in df.iterrows():
            row_str = " ".join(str(v) for v in row.values)
            if "转介绍次卡" in row_str and card_data_idx is None:
                card_data_idx = i + 1  # 数据在标题下一行
            if "转介绍现金" in row_str and cash_data_idx is None:
                cash_data_idx = i + 1

        if card_data_idx is not None and card_data_idx < len(df):
            summary["次卡"] = _extract_row(df.iloc[card_data_idx])
        if cash_data_idx is not None and cash_data_idx < len(df):
            summary["现金"] = _extract_row(df.iloc[cash_data_idx])

        # 汇总总值
        total_revenue = None
        total_cost = None
        for v in summary.values():
            rev = v.get("实际营收")
            cost = v.get("实际成本")
            if rev is not None:
                total_revenue = (total_revenue or 0) + rev
            if cost is not None:
                total_cost = (total_cost or 0) + cost

        summary["_total"] = {
            "实际营收": total_revenue,
            "实际成本": total_cost,
            "实际ROI": (total_revenue / total_cost) if total_cost and total_cost != 0 else None,
        }

        return summary

    def _load_cost_list(self, path: Path) -> list:
        """转介绍成本list sheet — 18行×8列，合并单元格前向填充"""
        import pandas as pd

        df = self._read_xlsx_pandas(path, sheet_name="转介绍成本list", header=0)
        if df.empty:
            return []

        df.columns = [str(c).strip() for c in df.columns]

        # 前向填充合并单元格（前几列）
        fill_cols = df.columns[:4].tolist()
        df = self._ffill_merged(df, fill_cols)

        records = []
        for _, row in df.iterrows():
            reward_type = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else None
            if not reward_type or reward_type in ("nan", "奖励类型"):
                continue

            records.append({
                "奖励类型": reward_type,
                "内外场激励": str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else None,
                "激励详情": str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None,
                "推荐动作": str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else None,
                "推荐规则描述": str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else None,
                "赠送数": self._clean_numeric(row.iloc[5] if len(row) > 5 else None),
                "成本单价USD": self._clean_numeric(row.iloc[6] if len(row) > 6 else None),
                "成本USD": self._clean_numeric(row.iloc[7] if len(row) > 7 else None),
            })

        return records

    def _load_cost_rules(self, path: Path) -> list:
        """转介绍详细规则 sheet — 10行×10列，推荐分类×人数分段"""
        import pandas as pd

        df = self._read_xlsx_pandas(path, sheet_name="转介绍详细规则", header=0)
        if df.empty:
            return []

        df.columns = [str(c).strip() for c in df.columns]
        records = []

        for _, row in df.iterrows():
            category = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else None
            if not category or category == "nan":
                continue

            record = {"推荐分类": category}
            for col in df.columns[1:]:
                record[col] = self._clean_numeric(row.get(col, None))
            records.append(record)

        return records

    def _load_regions(self, path: Path) -> list:
        """地区 sheet — 9行×2列，辅助枚举"""
        import pandas as pd

        df = self._read_xlsx_pandas(path, sheet_name="地区", header=0)
        if df.empty:
            return []

        df.columns = [str(c).strip() for c in df.columns]
        regions = []

        for _, row in df.iterrows():
            # 地区值在第2列 (col index 1)，第1列是"勿动"标记
            val = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else None
            if val and val not in ("nan", "勿动", ""):
                regions.append(val)

        return regions
