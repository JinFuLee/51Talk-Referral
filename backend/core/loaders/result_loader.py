"""D1 结果数据 Loader — 转介绍中台检测_结果数据"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)

# D1 期望列名（18列）
EXPECTED_COLS = [
    "统计日期",
    "区域",
    "转介绍注册数",
    "预约数",
    "出席数",
    "转介绍付费数",
    "客单价",
    "总带新付费金额USD",
    "注册预约率",
    "预约出席率",
    "出席付费率",
    "注册转化率",
    "转介绍基础业绩单量标",
    "转介绍基础业绩标USD",
    "转介绍基础业绩客单价标USD",
    "区域单量达成率",
    "区域业绩达成率",
    "区域转介绍客单价达成率",
]


class ResultLoader(BaseLoader):
    """加载 D1 结果数据（2行×18列）"""

    SHEET_NAME = "转介绍中台检测_结果数据"
    FILE_PATTERN = "*结果数据*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        if file_path is None:
            logger.warning("D1 结果数据文件未找到")
            return pd.DataFrame(columns=EXPECTED_COLS)

        df = self._read_xlsx_pandas(file_path, sheet_name=self.SHEET_NAME)
        if df.empty:
            logger.warning(f"D1 结果数据为空: {file_path.name}")
            return df

        # 规范化列名（strip + 日期列统一）
        df.columns = [str(c).strip().replace("\n", " ") for c in df.columns]
        # 将 day 列映射为 统计日期（兼容两种命名）
        if "day" in df.columns and "统计日期" not in df.columns:
            df = df.rename(columns={"day": "统计日期"})

        logger.info(f"D1 加载成功: {len(df)} 行, {file_path.name}")
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
