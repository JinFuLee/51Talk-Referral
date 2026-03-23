"""D5 高潜学员 Loader"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class HighPotentialLoader(BaseLoader):
    """加载 D5 高潜学员数据（86行×14列）"""

    SHEET_NAME = "转介绍中台监测_高潜学员"
    FILE_PATTERN = "*高潜学员*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        self.last_loaded_file = file_path
        if file_path is None:
            logger.warning("D5 高潜学员文件未找到")
            return pd.DataFrame()

        df = self._read_xlsx_pandas(file_path, sheet_name=self.SHEET_NAME)
        if df.empty:
            logger.warning(f"D5 高潜学员为空: {file_path.name}")
            return df

        df.columns = [str(c).strip().replace("\n", " ") for c in df.columns]
        if "day" in df.columns and "统计日期" not in df.columns:
            df = df.rename(columns={"day": "统计日期"})

        logger.info(f"D5 加载成功: {len(df)} 行, {file_path.name}")
        return df

    def _find_file(self) -> Path | None:
        matches = sorted(
            [
                f
                for f in self.input_dir.glob(self.FILE_PATTERN)
                if not f.name.startswith(".")
            ],
            key=lambda p: p.name,
            reverse=True,
        )
        return matches[0] if matches else None
