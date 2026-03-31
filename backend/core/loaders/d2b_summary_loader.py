"""D2b 围场过程数据 byCC 汇总 Loader"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader, sort_files_by_date

logger = logging.getLogger(__name__)


class D2bSummaryLoader(BaseLoader):
    """加载 D2b 围场过程数据汇总（byCC副本，仅1行7列）"""

    FILE_PATTERN = "*围场过程数据*byCC副本*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        self.last_loaded_file = file_path
        if file_path is None:
            logger.warning("D2b 围场过程数据汇总文件未找到")
            return pd.DataFrame()

        # 尝试首个 sheet，不限定 sheet 名
        df = self._read_xlsx_pandas(file_path, sheet_name=0)
        if df.empty:
            logger.warning(f"D2b 围场过程数据汇总为空: {file_path.name}")
            return df

        # 规范化列名
        df.columns = [str(c).strip().replace("\n", " ") for c in df.columns]

        # 日期列映射
        if "day" in df.columns and "统计日期" not in df.columns:
            df = df.rename(columns={"day": "统计日期"})

        logger.info(f"D2b 汇总加载成功: {len(df)} 行, {file_path.name}")
        return df

    def _find_file(self) -> Path | None:
        matches = sort_files_by_date(
            [
                f
                for f in self.input_dir.glob(self.FILE_PATTERN)
                if not f.name.startswith(".")
            ],
        )
        return matches[0] if matches else None
