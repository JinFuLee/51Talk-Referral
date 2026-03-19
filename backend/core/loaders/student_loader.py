"""D4 已付费学员转介绍围场明细 Loader"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class StudentLoader(BaseLoader):
    """加载 D4 已付费学员围场明细（10002行×59列），用 pandas 读取"""

    SHEET_NAME = "已付费学员转介绍围场明细"
    FILE_PATTERN = "*已付费学员转介绍围场明细*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        if file_path is None:
            logger.warning("D4 已付费学员数据文件未找到")
            return pd.DataFrame()

        # D4 体量大，强制 pandas+openpyxl（性能更优）
        try:
            import warnings

            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore", category=UserWarning, module="openpyxl"
                )
                df = pd.read_excel(
                    file_path,
                    sheet_name=self.SHEET_NAME,
                    engine="openpyxl",
                )
        except Exception as e:
            logger.error(f"D4 读取失败: {e}")
            return pd.DataFrame()

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
