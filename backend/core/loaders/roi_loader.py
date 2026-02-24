"""
B 类 ROI 数据加载器 — 1 个数据源
B1: 中台_转介绍ROI测算数据模型_M-1
"""
from pathlib import Path
from typing import Optional, TYPE_CHECKING
import logging

from .base import BaseLoader

if TYPE_CHECKING:
    from backend.core.project_config import ProjectConfig

logger = logging.getLogger(__name__)


class ROILoader(BaseLoader):
    """B 类 ROI 数据加载器（新版，使用 pandas）"""

    def __init__(self, input_dir: Path, project_config: Optional["ProjectConfig"] = None) -> None:
        super().__init__(input_dir, project_config)

    def load_all(self) -> dict:
        """加载所有 B 类数据源"""
        try:
            res = self._load_b1_roi_model()
            if not res:
                return {"is_estimated": True, "data_source": "none"}
            res["is_estimated"] = False
            res["data_source"] = "real_b1"
            return res
        except Exception as e:
            logger.error(f"B1 roi_model 加载失败: {e}")
            return {"is_estimated": True, "data_source": "error"}

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

        向量化策略：用 str.contains 在 DataFrame 层面查找关键词行，
        保留原有 positional 索引逻辑（结构依赖行位置，无法用 groupby 替代）
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

        # 向量化搜索关键词行：将每行合并为字符串，用 str.contains 找目标行
        row_strings = df.apply(
            lambda row: " ".join(str(v) for v in row.values), axis=1
        )

        card_matches = row_strings[row_strings.str.contains("转介绍次卡", na=False)]
        cash_matches = row_strings[row_strings.str.contains("转介绍现金", na=False)]

        # 数据在标题下一行
        if not card_matches.empty:
            card_data_idx = card_matches.index[0] + 1
            if card_data_idx < len(df):
                summary["次卡"] = _extract_row(df.iloc[card_data_idx])

        if not cash_matches.empty:
            cash_data_idx = cash_matches.index[0] + 1
            if cash_data_idx < len(df):
                summary["现金"] = _extract_row(df.iloc[cash_data_idx])

        # 汇总总值（向量化）
        revenues = [v.get("实际营收") for v in summary.values() if v.get("实际营收") is not None]
        costs = [v.get("实际成本") for v in summary.values() if v.get("实际成本") is not None]
        total_revenue = sum(revenues) if revenues else None
        total_cost = sum(costs) if costs else None

        summary["_total"] = {
            "实际营收": total_revenue,
            "实际成本": total_cost,
            "实际ROI": (total_revenue / total_cost) if total_cost and total_cost != 0 else None,
        }

        return summary

    def _load_cost_list(self, path: Path) -> list:
        """转介绍成本list sheet — 18行×8列，合并单元格前向填充（向量化）"""
        import pandas as pd

        df = self._read_xlsx_pandas(path, sheet_name="转介绍成本list", header=0)
        if df.empty:
            return []

        df.columns = [str(c).strip() for c in df.columns]

        # 前向填充合并单元格（前几列）
        fill_cols = df.columns[:4].tolist()
        df = self._ffill_merged(df, fill_cols)

        # 向量化过滤：第0列非空且不是标题行
        reward_type_col = df.columns[0]
        df["_reward_type"] = df.iloc[:, 0].apply(
            lambda v: str(v).strip() if pd.notna(v) else None
        )
        df = df[
            df["_reward_type"].notna()
            & ~df["_reward_type"].isin(["nan", "奖励类型"])
        ].copy()

        if df.empty:
            return []

        # 向量化构建记录
        records = []
        for col_idx, field in enumerate([
            ("_reward_type", "奖励类型", None),
        ]):
            pass  # 下面统一处理

        # 用向量化方式构建所有字段
        result_df = pd.DataFrame({
            "奖励类型": df["_reward_type"],
            "内外场激励": df.iloc[:, 1].apply(lambda v: str(v).strip() if pd.notna(v) else None),
            "激励详情": df.iloc[:, 2].apply(lambda v: str(v).strip() if pd.notna(v) else None),
            "推荐动作": df.iloc[:, 3].apply(lambda v: str(v).strip() if pd.notna(v) else None),
            "推荐规则描述": df.iloc[:, 4].apply(lambda v: str(v).strip() if pd.notna(v) else None),
            "赠送数": self._clean_numeric_vec(df.iloc[:, 5]) if df.shape[1] > 5 else None,
            "成本单价USD": self._clean_numeric_vec(df.iloc[:, 6]) if df.shape[1] > 6 else None,
            "成本USD": self._clean_numeric_vec(df.iloc[:, 7]) if df.shape[1] > 7 else None,
        })

        return result_df.to_dict("records")

    def _load_cost_rules(self, path: Path) -> list:
        """转介绍详细规则 sheet — 10行×10列，推荐分类×人数分段（向量化）"""
        import pandas as pd

        df = self._read_xlsx_pandas(path, sheet_name="转介绍详细规则", header=0)
        if df.empty:
            return []

        df.columns = [str(c).strip() for c in df.columns]

        # 向量化过滤：第0列非空且不为 "nan"
        df["_category"] = df.iloc[:, 0].apply(
            lambda v: str(v).strip() if pd.notna(v) else None
        )
        df = df[df["_category"].notna() & (df["_category"] != "nan")].copy()

        if df.empty:
            return []

        # 向量化构建记录：推荐分类 + 其余列（数值清洗）
        result_df = pd.DataFrame({"推荐分类": df["_category"]})
        for col in df.columns[1:]:
            if col == "_category":
                continue
            result_df[col] = self._clean_numeric_vec(df[col])

        return result_df.to_dict("records")

    def _load_regions(self, path: Path) -> list:
        """地区 sheet — 9行×2列，辅助枚举（向量化）"""
        import pandas as pd

        df = self._read_xlsx_pandas(path, sheet_name="地区", header=0)
        if df.empty:
            return []

        df.columns = [str(c).strip() for c in df.columns]

        if df.shape[1] < 2:
            return []

        # 向量化提取第2列，过滤无效值
        vals = df.iloc[:, 1].apply(
            lambda v: str(v).strip() if pd.notna(v) else None
        )
        regions = vals[
            vals.notna()
            & ~vals.isin(["nan", "勿动", ""])
        ].tolist()

        return regions
