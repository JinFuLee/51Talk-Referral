"""通用数据模型"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class DataSourceStatus(BaseModel):
    id: str
    name: str
    has_file: bool
    latest_file: str | None = None
    row_count: int | None = None
    is_fresh: bool = False


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
