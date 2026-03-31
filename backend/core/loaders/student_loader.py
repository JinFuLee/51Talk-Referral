"""D4 已付费学员转介绍围场明细 Loader"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader, sort_files_by_date

logger = logging.getLogger(__name__)


class StudentLoader(BaseLoader):
    """加载 D4 已付费学员围场明细（10002行×59列），用 pandas 读取"""

    SHEET_NAME = "已付费学员转介绍围场明细"
    FILE_PATTERN = "*已付费学员转介绍围场明细*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        self.last_loaded_file = file_path
        if file_path is None:
            logger.warning("D4 已付费学员数据文件未找到")
            return pd.DataFrame()

        # D4 体量大，使用 base 类的 _read_xlsx_pandas（含 sheet 名 fallback + Parquet 缓存）
        df = self._read_xlsx_pandas(file_path, sheet_name=self.SHEET_NAME)

        if df.empty:
            return df

        # 列名规范化：strip + 换行替换空格
        df.columns = [str(c).strip().replace("\n", " ") for c in df.columns]

        # 兼容 day 命名
        if "day" in df.columns and "统计日期" not in df.columns:
            df = df.rename(columns={"day": "统计日期"})

        logger.info(f"D4 加载成功: {len(df)} 行, {file_path.name}")
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
