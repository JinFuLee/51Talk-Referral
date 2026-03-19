"""规划目标 Loader — 解析 26年转介绍规划-泰国.xlsx"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)

# 目标 sheet
TARGET_SHEET = "202603转介绍业绩目标差距分析"
ANNUAL_SHEET = "26年目标拆解"

# 当前月份标识（用于定位目标行）
TARGET_MONTH_KEYWORD = "202603"


class TargetLoader(BaseLoader):
    """解析规划文件，提取当月漏斗目标 + 年度目标"""

    def __init__(self, target_file: Path | None) -> None:
        # TargetLoader 不需要 input_dir，直接传文件路径
        self._target_file = Path(target_file) if target_file else None

    def load(self) -> dict[str, Any]:
        if self._target_file is None or not self._target_file.exists():
            logger.warning(f"规划目标文件不存在: {self._target_file}")
            return {}

        result: dict[str, Any] = {}

        # 读月度漏斗目标
        try:
            df_monthly = pd.read_excel(
                self._target_file,
                sheet_name=TARGET_SHEET,
                engine="openpyxl",
                header=None,
            )
            result["monthly"] = self._parse_monthly(df_monthly)
        except Exception as e:
            logger.warning(f"月度目标 sheet 读取失败: {e}")

        # 读年度目标
        try:
            df_annual = pd.read_excel(
                self._target_file,
                sheet_name=ANNUAL_SHEET,
                engine="openpyxl",
            )
            result["annual"] = self._parse_annual(df_annual)
        except Exception as e:
            logger.warning(f"年度目标 sheet 读取失败: {e}")

        logger.info(f"规划目标加载成功: keys={list(result.keys())}")
        return result

    def _parse_monthly(self, df: pd.DataFrame) -> dict[str, Any]:
        """从月度漏斗 sheet 提取当月目标行"""
        targets: dict[str, Any] = {}
        try:
            # 找含 TARGET_MONTH_KEYWORD 的行
            for _idx, row in df.iterrows():
                row_str = " ".join(str(v) for v in row.values if pd.notna(v))
                if TARGET_MONTH_KEYWORD in row_str:
                    # 第一行作为 header 行，提取数值
                    header_row = df.iloc[0]
                    for col_idx, header_val in enumerate(header_row):
                        h = str(header_val).strip() if pd.notna(header_val) else ""
                        cell_val = row.iloc[col_idx] if col_idx < len(row) else None
                        if h and cell_val is not None and pd.notna(cell_val):
                            try:
                                targets[h] = float(cell_val)
                            except (ValueError, TypeError):
                                targets[h] = str(cell_val)
                    break
        except Exception as e:
            logger.warning(f"月度目标解析失败: {e}")
        return targets

    def _parse_annual(self, df: pd.DataFrame) -> dict[str, Any]:
        """从年度目标 sheet 提取关键目标指标"""
        targets: dict[str, Any] = {}
        try:
            df.columns = [str(c).strip() for c in df.columns]
            # 取包含 "2026" 且有数字的行
            for _, row in df.iterrows():
                row_dict = {}
                for col, val in row.items():
                    if pd.notna(val):
                        try:
                            row_dict[str(col)] = float(val)
                        except (ValueError, TypeError):
                            row_dict[str(col)] = str(val)
                if row_dict:
                    # 简单追加，消费方按需过滤
                    targets.update(row_dict)
                    break
        except Exception as e:
            logger.warning(f"年度目标解析失败: {e}")
        return targets
