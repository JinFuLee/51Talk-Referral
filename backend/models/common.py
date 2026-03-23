"""通用数据模型"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class DataSourceStatus(BaseModel):
    id: str
    name: str
    has_file: bool
    latest_file: str | None = None
    row_count: int | None = None
    is_fresh: bool = False
    # 日期 & 新鲜度
    data_date: str | None = None
    freshness_tier: Literal[
        "today", "yesterday", "recent", "stale", "missing"
    ] = "missing"
    days_behind: int | None = None
    # 行数异常
    expected_rows_min: int | None = None
    expected_rows_max: int | None = None
    row_anomaly: Literal["low", "high", "ok", "unknown"] = "unknown"
    # 字段利用率（双层）
    total_columns: int | None = None
    columns_present: int | None = None
    completeness_rate: float | None = None
    system_consumed_columns: int | None = None
    utilization_rate: float | None = None
    # 核心字段完整性
    critical_columns_total: int | None = None
    critical_columns_present: int | None = None
    critical_completeness_rate: float | None = None


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
