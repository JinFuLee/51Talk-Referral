"""D2 围场过程数据 byCC Loader"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from .base import BaseLoader, sort_files_by_date

logger = logging.getLogger(__name__)


class EnclosureCCLoader(BaseLoader):
    """加载 D2 围场过程数据（987行×25列），过滤有效围场"""

    SHEET_NAME = "转介绍中台检测_围场过程数据_byCC"
    FILE_PATTERN = "*围场过程数据*byCC*.xlsx"

    def load(self) -> pd.DataFrame:
        file_path = self._find_file()
        self.last_loaded_file = file_path
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

        # 标记有效围场（保留全部行，不过滤）
        # 非有效围场（已付费非有效/未付费非有效）的业绩是真实收入，必须纳入 SUM 指标
        # 过程指标（参与率/打卡率/触达率/带新系数）仅对有效围场求均值
        if "是否有效" in df.columns:
            df["_is_active"] = df["是否有效"].astype(str).str.strip() == "是"
            active_count = df["_is_active"].sum()
            total_count = len(df)
            logger.info(
                f"D2 围场标记: {active_count} 行有效 / {total_count} 行总计"
                f"（保留全部行，非有效围场参与 SUM 指标计算）"
            )
        else:
            df["_is_active"] = True  # 无 是否有效 列时全部视为有效

        logger.info(f"D2 加载成功: {len(df)} 行, {file_path.name}")
        return df

    def _find_file(self) -> Path | None:
        matches = sort_files_by_date(
            [
                f
                for f in self.input_dir.glob(self.FILE_PATTERN)
                if not f.name.startswith(".") and "副本" not in f.name
            ],
        )
        return matches[0] if matches else None
