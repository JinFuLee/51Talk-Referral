"""FastAPI 依赖注入 — DataManager 单例 + 旧版 get_service 兼容"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from fastapi import Request

from backend.core.data_manager import DataManager

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# 数据目录：优先 DATA_SOURCE_DIR 环境变量，fallback 到项目 input/
_DEFAULT_DATA_DIR = str(
    Path(os.getenv("DATA_SOURCE_DIR", str(_PROJECT_ROOT / "input")))
)
_DEFAULT_TARGET_FILE = os.getenv(
    "TARGET_FILE",
    str(
        Path.home()
        / "Downloads"
        / "01_工作数据"
        / "业绩报表"
        / "26年转介绍规划-泰国.xlsx"
    ),
)


@lru_cache(maxsize=1)
def _create_data_manager() -> DataManager:
    target_file = _DEFAULT_TARGET_FILE if Path(_DEFAULT_TARGET_FILE).exists() else None
    return DataManager(data_dir=_DEFAULT_DATA_DIR, target_file=target_file)


def get_data_manager(request: Request) -> DataManager:
    """从 app.state 获取 DataManager 单例，首次创建时初始化"""
    dm = getattr(request.app.state, "data_manager", None)
    if dm is None:
        dm = _create_data_manager()
        request.app.state.data_manager = dm
    return dm


def get_service(request: Request):
    """兼容旧版 reports/config/presentation 的 service 依赖（Phase2 重建保留）"""
    return getattr(request.app.state, "service", None)
