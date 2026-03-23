"""DataManager — 统一数据加载管理，含缓存与状态查询"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

import pandas as pd

from backend.core.loaders import (
    DetailLoader,
    EnclosureCCLoader,
    HighPotentialLoader,
    ResultLoader,
    StudentLoader,
    TargetLoader,
)
from backend.models.common import DataSourceStatus

logger = logging.getLogger(__name__)

# 5 个数据源定义（用于状态查询）
_DATA_SOURCE_META = [
    {
        "id": "result",
        "name": "转介绍中台检测_结果数据(D1)",
        "pattern": "*结果数据*.xlsx",
    },
    {
        "id": "enclosure_cc",
        "name": "转介绍中台检测_围场过程数据_byCC(D2)",
        "pattern": "*围场过程数据*byCC*.xlsx",
    },
    {
        "id": "detail",
        "name": "转介绍中台检测_明细(D3)",
        "pattern": "*明细*.xlsx",
    },
    {
        "id": "students",
        "name": "已付费学员转介绍围场明细(D4)",
        "pattern": "*已付费学员转介绍围场明细*.xlsx",
    },
    {
        "id": "high_potential",
        "name": "转介绍中台监测_高潜学员(D5)",
        "pattern": "*高潜学员*.xlsx",
    },
]


class DataManager:
    """统一加载并缓存 D1-D5 + 规划目标"""

    def __init__(self, data_dir: str, target_file: str | None = None) -> None:
        self.data_dir = Path(data_dir)
        self.target_file = Path(target_file) if target_file else None
        self._cache: dict[str, Any] = {}
        self._dirty = True
        self._lock = threading.RLock()
        self._loaded_files: dict[str, Path | None] = {}

    def load_all(self) -> dict[str, Any]:
        with self._lock:
            if not self._dirty and self._cache:
                return self._cache

            logger.info("DataManager: 开始加载全部数据源...")

            loaders = {
                "result": ResultLoader(self.data_dir),
                "enclosure_cc": EnclosureCCLoader(self.data_dir),
                "detail": DetailLoader(self.data_dir),
                "students": StudentLoader(self.data_dir),
                "high_potential": HighPotentialLoader(self.data_dir),
            }

            new_cache: dict[str, Any] = {}
            new_loaded_files: dict[str, Path | None] = {}

            for key, loader in loaders.items():
                new_cache[key] = loader.load()
                new_loaded_files[key] = loader.last_loaded_file

            new_cache["targets"] = (
                TargetLoader(self.target_file).load() if self.target_file else {}
            )

            self._cache = new_cache
            self._loaded_files = new_loaded_files
            self._dirty = False

            # 输出摘要
            for key, val in self._cache.items():
                if isinstance(val, pd.DataFrame):
                    logger.info(f"  {key}: {len(val)} 行")
                elif isinstance(val, dict):
                    logger.info(f"  {key}: {len(val)} 个目标键")

            return self._cache

    def get(self, key: str) -> Any:
        """获取指定数据集（懒加载）"""
        with self._lock:
            if self._dirty or key not in self._cache:
                self.load_all()
            return self._cache.get(key)

    def invalidate(self) -> None:
        """清空缓存，下次请求时重新加载"""
        with self._lock:
            self._dirty = True
            self._cache = {}
            logger.info("DataManager: 缓存已清空")

    def get_loaded_files(self) -> dict[str, Path | None]:
        """返回当前已加载文件路径的副本（线程安全）"""
        with self._lock:
            return dict(self._loaded_files)

    def get_status(self) -> list[DataSourceStatus]:
        """返回 5 个数据文件的存在性与新鲜度状态"""
        import re
        from datetime import datetime

        today = datetime.now().date()
        statuses = []

        for meta in _DATA_SOURCE_META:
            src_id = meta["id"]
            pattern = meta["pattern"]
            name = meta["name"]

            # 找匹配文件（排除明细中的围场过程和付费学员文件）
            if src_id == "detail":
                files = [
                    f
                    for f in self.data_dir.glob(pattern)
                    if not f.name.startswith(".")
                    and "围场过程" not in f.name
                    and "付费学员" not in f.name
                ]
            else:
                files = [
                    f for f in self.data_dir.glob(pattern) if not f.name.startswith(".")
                ]

            files = sorted(files, key=lambda p: p.name, reverse=True)
            latest = files[0] if files else None
            row_count = None

            # 尝试从缓存获取行数（避免重复加载）
            if not self._dirty and src_id in self._cache:
                cached = self._cache[src_id]
                if isinstance(cached, pd.DataFrame):
                    row_count = len(cached)

            is_fresh = False
            if latest:
                m = re.search(r"(\d{8})", latest.name)
                if m:
                    try:
                        file_date = datetime.strptime(m.group(1), "%Y%m%d").date()
                        is_fresh = (
                            file_date.year == today.year
                            and file_date.month == today.month
                        )
                    except ValueError:
                        pass

            statuses.append(
                DataSourceStatus(
                    id=src_id,
                    name=name,
                    has_file=latest is not None,
                    latest_file=latest.name if latest else None,
                    row_count=row_count,
                    is_fresh=is_fresh,
                )
            )

        return statuses
