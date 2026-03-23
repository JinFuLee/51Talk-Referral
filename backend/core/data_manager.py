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
        "expected_rows_range": (1, 5),
        "critical_columns": [
            "统计日期", "转介绍注册数", "预约数", "出席数",
            "转介绍付费数", "总带新付费金额USD",
        ],
        "system_consumed_columns": 18,
        "total_columns": 18,
    },
    {
        "id": "enclosure_cc",
        "name": "转介绍中台检测_围场过程数据_byCC(D2)",
        "pattern": "*围场过程数据*byCC*.xlsx",
        "expected_rows_range": (100, 2000),
        "critical_columns": [
            "统计日期", "围场", "转介绍参与率",
            "带新系数", "CC触达率", "当月有效打卡率",
        ],
        "system_consumed_columns": 18,
        "total_columns": 25,
    },
    {
        "id": "detail",
        "name": "转介绍中台检测_明细(D3)",
        "pattern": "*明细*.xlsx",
        "expected_rows_range": (50, 5000),
        "critical_columns": [
            "统计日期", "有效打卡", "围场", "转介绍注册数", "转介绍付费数",
        ],
        "system_consumed_columns": 19,
        "total_columns": 19,
    },
    {
        "id": "students",
        "name": "已付费学员转介绍围场明细(D4)",
        "pattern": "*已付费学员转介绍围场明细*.xlsx",
        "expected_rows_range": (100, 50000),
        "critical_columns": [
            "学员id", "生命周期", "当月推荐注册人数",
            "本月推荐付费数", "本月打卡天数",
        ],
        "system_consumed_columns": 28,
        "total_columns": 59,
    },
    {
        "id": "high_potential",
        "name": "转介绍中台监测_高潜学员(D5)",
        "pattern": "*高潜学员*.xlsx",
        "expected_rows_range": (10, 1000),
        "critical_columns": ["统计日期", "总带新人数", "出席数", "转介绍付费数"],
        "system_consumed_columns": 14,
        "total_columns": 14,
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
                new_cache[key] = self._filter_thai_only(loader.load())
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

    # ── 泰国数据过滤 ───────────────────────────────────────────────────────────

    _TEAM_COLUMNS = ("last_cc_group_name", "last_ss_group_name", "last_lp_group_name")

    @classmethod
    def _filter_thai_only(cls, df: pd.DataFrame) -> pd.DataFrame:
        """过滤 DataFrame，仅保留 TH- 前缀的团队行。

        - 有团队列（last_cc/ss/lp_group_name）→ OR 过滤，保留任一列以 TH- 开头的行
        - 无团队列 → 原样返回（如 targets、学员维度数据源）
        """
        if df.empty:
            return df

        team_cols = [c for c in cls._TEAM_COLUMNS if c in df.columns]
        if not team_cols:
            return df

        # 对多个团队列取 OR：行中任一团队列以 TH（大小写不敏感）开头则保留
        # null/空值行同样保留（可能是跨团队公共数据，不代表非泰国）
        mask = pd.Series(False, index=df.index)
        for col in team_cols:
            s = df[col].astype(str).str.strip().str.upper()
            th_mask = s.str.startswith("TH")
            null_mask = df[col].isna() | (s == "") | (s == "NAN")
            mask = mask | th_mask | null_mask

        before = len(df)
        filtered = df[mask].copy()
        excluded = before - len(filtered)
        if excluded > 0:
            logger.info(
                f"  _filter_thai_only: 排除非 TH- 行 {excluded} 条（含列: {team_cols}）"
            )
        return filtered

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
        """数据源全空时向 ops 群推送告警 — 已禁用自动推送（2026-03-23）
        原因：不应未经用户许可自动向正式群发消息。
        改为仅日志记录，需要时手动查看。
        """
        logger.warning("所有数据源 (D1-D5) 为空 — 告警仅记录日志，不自动推送群消息")
        return

        # ── 以下为原自动推送逻辑，已禁用 ──
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
                f"## ⚠ แจ้งเตือนแหล่งข้อมูล\n"
                f"## 数据源告警\n\n"
                f"แหล่งข้อมูลทั้งหมด (D1-D5) **ว่างเปล่า**\n"
                f"所有数据源 (D1-D5) **为空**\n\n"
                f"- สาเหตุ: ไฟล์ Excel หายไปหรือชื่อ Sheet เปลี่ยน\n"
                f"- 原因：Excel 文件缺失或 Sheet 名变更\n"
                f"- การดำเนินการ: ตรวจสอบ DATA_SOURCE_DIR แล้วดาวน์โหลดใหม่\n"
                f"- 操作：检查 DATA_SOURCE_DIR 并重新下载\n\n"
                f"> {now_str}"
            )

            title = "แจ้งเตือนข้อมูล / 数据告警"
            payload = json.dumps(
                {"msgtype": "markdown", "markdown": {"title": title, "text": md}}
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
        """返回 5 个数据文件的详细健康状态"""
        import re
        from datetime import datetime, timedelta

        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        statuses = []

        for meta in _DATA_SOURCE_META:
            src_id = meta["id"]
            pattern = meta["pattern"]
            name = meta["name"]
            expected_min, expected_max = meta.get("expected_rows_range", (None, None))
            critical_cols: list[str] = meta.get("critical_columns", [])
            total_cols: int | None = meta.get("total_columns")
            sys_consumed: int | None = meta.get("system_consumed_columns")

            # 找匹配文件
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

            # 缓存读取（加锁保护）
            row_count: int | None = None
            cached_df: pd.DataFrame | None = None
            with self._lock:
                if not self._dirty and src_id in self._cache:
                    cached = self._cache[src_id]
                    if isinstance(cached, pd.DataFrame):
                        row_count = len(cached)
                        cached_df = cached

            # 日期 & 新鲜度
            data_date: str | None = None
            days_behind: int | None = None
            freshness_tier = "missing"
            is_fresh = False

            if latest:
                m = re.search(r"(\d{8})", latest.name)
                if m:
                    try:
                        file_date = datetime.strptime(m.group(1), "%Y%m%d").date()
                        data_date = file_date.isoformat()
                        days_behind = (today - file_date).days
                        is_fresh = (
                            file_date.year == today.year
                            and file_date.month == today.month
                        )

                        if file_date == today:
                            freshness_tier = "today"
                        elif file_date == yesterday:
                            freshness_tier = "yesterday"
                        elif days_behind <= 3:
                            freshness_tier = "recent"
                        else:
                            freshness_tier = "stale"
                    except ValueError:
                        freshness_tier = "stale"
                else:
                    freshness_tier = "stale"

            # 行数异常
            row_anomaly = "unknown"
            if (
                row_count is not None
                and expected_min is not None
                and expected_max is not None
            ):
                if row_count < expected_min:
                    row_anomaly = "low"
                elif row_count > expected_max:
                    row_anomaly = "high"
                else:
                    row_anomaly = "ok"

            # 字段利用率
            columns_present: int | None = None
            completeness_rate: float | None = None
            utilization_rate: float | None = None

            if cached_df is not None and total_cols:
                real_cols = [
                    c for c in cached_df.columns
                    if not str(c).startswith("Unnamed:")
                ]
                columns_present = len(real_cols)
                completeness_rate = round(min(columns_present / total_cols, 1.0), 3)

            if total_cols and sys_consumed:
                utilization_rate = round(sys_consumed / total_cols, 3)

            # 核心字段完整性
            critical_cols_present: int | None = None
            critical_completeness: float | None = None

            if critical_cols and cached_df is not None:
                df_col_set = {str(c).strip().lower() for c in cached_df.columns}
                present = sum(
                    1 for col in critical_cols
                    if col.strip().lower() in df_col_set
                )
                critical_cols_present = present
                critical_completeness = round(present / len(critical_cols), 3)

            statuses.append(
                DataSourceStatus(
                    id=src_id,
                    name=name,
                    has_file=latest is not None,
                    latest_file=latest.name if latest else None,
                    row_count=row_count,
                    is_fresh=is_fresh,
                    data_date=data_date,
                    freshness_tier=freshness_tier,
                    days_behind=days_behind,
                    expected_rows_min=expected_min,
                    expected_rows_max=expected_max,
                    row_anomaly=row_anomaly,
                    total_columns=total_cols,
                    columns_present=columns_present,
                    completeness_rate=completeness_rate,
                    system_consumed_columns=sys_consumed,
                    utilization_rate=utilization_rate,
                    critical_columns_total=(
                        len(critical_cols) if critical_cols else None
                    ),
                    critical_columns_present=critical_cols_present,
                    critical_completeness_rate=critical_completeness,
                )
            )

        return statuses
