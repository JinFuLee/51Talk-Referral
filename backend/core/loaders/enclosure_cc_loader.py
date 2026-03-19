"""D2 围场过程数据 byCC Loader"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class EnclosureCCLoader(BaseLoader):
    """加载 D2 围场过程数据（987行×25列），过滤有效围场"""

    SHEET_NAME = "转介绍中台检测_围场过程数据_byCC"
    FILE_PATTERN = "*围场过程数据*byCC*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        if file_path is None:
            logger.warning("D2 围场过程数据文件未找到")
            return pd.DataFrame()

        df = self._read_xlsx_pandas(file_path, sheet_name=self.SHEET_NAME)
        if df.empty:
            logger.warning(f"D2 围场过程数据为空: {file_path.name}")
            return df

        # 规范化列名
        df.columns = [str(c).strip().replace("\n", " ") for c in df.columns]

        # 日期列映射
        if "day" in df.columns and "统计日期" not in df.columns:
            df = df.rename(columns={"day": "统计日期"})

        # 过滤有效围场
        if "是否有效" in df.columns:
            df = df[df["是否有效"].astype(str).str.strip() == "是"].copy()
            logger.info(f"D2 有效围场过滤后: {len(df)} 行")

        logger.info(f"D2 加载成功: {len(df)} 行, {file_path.name}")
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
