"""D3 明细数据 Loader"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class DetailLoader(BaseLoader):
    """加载 D3 明细数据（561行×19列）"""

    SHEET_NAME = "转介绍中台检测_明细"
    FILE_PATTERN = "*明细*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        self.last_loaded_file = file_path
        if file_path is None:
            logger.warning("D3 明细数据文件未找到")
            return pd.DataFrame()

        df = self._read_xlsx_pandas(file_path, sheet_name=self.SHEET_NAME)
        if df.empty:
            logger.warning(f"D3 明细数据为空: {file_path.name}")
            return df

        # 规范化列名
        df.columns = [str(c).strip().replace("\n", " ") for c in df.columns]
        if "day" in df.columns and "统计日期" not in df.columns:
            df = df.rename(columns={"day": "统计日期"})

        logger.info(f"D3 加载成功: {len(df)} 行, {file_path.name}")
        return df

    def _find_file(self) -> Path | None:
        # 明细文件需排除围场过程数据文件、围场明细、学员相关文件
        matches = sorted(
            [
                f
                for f in self.input_dir.glob(self.FILE_PATTERN)
                if not f.name.startswith(".")
                and "围场过程" not in f.name
                and "付费学员" not in f.name
                and "围场明细" not in f.name
                and "学员" not in f.name
            ],
            key=lambda p: p.name,
            reverse=True,
        )
        return matches[0] if matches else None
