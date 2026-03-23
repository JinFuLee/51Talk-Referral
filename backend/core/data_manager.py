"""DataManager — 统一数据加载管理，含缓存与状态查询"""

from __future__ import annotations

import logging
import threading
import time
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

# 数据源空态告警节流（每小时最多 1 次，避免 reload 循环刷屏）
_last_empty_alert_ts: float = 0.0
_ALERT_THROTTLE_SECONDS = 3600

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

            # 数据源全空检查（D1-D5，排除 targets 字典）
            d1_to_d5 = {
                k: v for k, v in new_cache.items()
                if k != "targets" and isinstance(v, pd.DataFrame)
            }
            if d1_to_d5 and all(df.empty for df in d1_to_d5.values()):
                logger.warning("所有数据源为空（D1-D5），可能数据文件缺失或格式变更")
                self._alert_empty_data()

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

    def _alert_empty_data(self) -> None:
        """数据源全空时向 ops 群推送告警，节流：每小时最多 1 次"""
        global _last_empty_alert_ts

        now_ts = time.time()
        if now_ts - _last_empty_alert_ts < _ALERT_THROTTLE_SECONDS:
            logger.debug("数据源空态告警已节流，跳过推送")
            return

        try:
            import base64
            import hashlib
            import hmac
            import json
            import urllib.parse
            import urllib.request
            from datetime import datetime

            key_dir = Path(__file__).resolve().parent.parent.parent / "key"
            channels_path = key_dir / "dingtalk-channels.json"
            if not channels_path.exists():
                logger.debug("dingtalk-channels.json 不存在，跳过告警推送")
                return

            with open(channels_path) as f:
                data = json.load(f)

            ops = data.get("channels", {}).get("ops")
            if not ops or not ops.get("enabled"):
                logger.debug("ops 频道未启用，跳过告警推送")
                return

            # 加签
            webhook: str = ops["webhook"]
            secret: str = ops["secret"]
            ts = str(int(now_ts * 1000))
            sign_str = f"{ts}\n{secret}"
            hmac_code = hmac.new(
                secret.encode(), sign_str.encode(), digestmod=hashlib.sha256
            ).digest()
            sign = urllib.parse.quote_plus(base64.b64encode(hmac_code).decode())
            url = f"{webhook}&timestamp={ts}&sign={sign}"

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            md = (
                "## ⚠ Data Source Alert\n\n"
                "All data sources (D1-D5) are **empty**.\n\n"
                "- Possible: Excel files missing or sheet name changed\n"
                "- Action: Check `DATA_SOURCE_DIR` and re-download from BI\n\n"
                f"> {now_str}"
            )

            payload = json.dumps(
                {"msgtype": "markdown", "markdown": {"title": "Data Alert", "text": md}}
            ).encode()
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=5)

            _last_empty_alert_ts = now_ts
            logger.info("数据源空态告警已推送到 ops 群")
        except Exception as e:
            logger.warning(f"数据源空态告警推送失败: {e}")

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
