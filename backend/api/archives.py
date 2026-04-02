"""归档 API — 历史月份数据归档管理

Endpoints:
  GET /api/archives/months          — 扫描 data/archives/ 返回可用月份列表
  GET /api/archives/{month}/status  — 返回指定月份归档完整性（读 _meta.json）
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# 归档根目录（相对项目根）
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ARCHIVE_BASE = _PROJECT_ROOT / "data" / "archives"


class ArchiveMonthStatus(BaseModel):
    """单月归档完整性信息"""
    month: str
    archived_at: str | None = None
    source: str | None = None
    data_date: str | None = None
    file_count: int | None = None
    notes: str | None = None
    completeness: dict | None = None
    complete_count: int = 0
    total_count: int = 0
    completeness_rate: float = 0.0


@router.get("/archives/months", summary="获取可用归档月份列表")
def list_archive_months() -> list[str]:
    """扫描 data/archives/ 目录，返回已归档的月份列表（格式 YYYYMM，升序排列）。

    Returns:
        月份字符串列表，如 ["202601", "202602", "202603"]
    """
    if not _ARCHIVE_BASE.exists():
        return []

    months = sorted(
        d.name
        for d in _ARCHIVE_BASE.iterdir()
        if d.is_dir() and d.name.isdigit() and len(d.name) == 6
    )
    logger.debug("archives/months: 发现 %d 个归档月份", len(months))
    return months


@router.get("/archives/{month}/status", summary="获取指定月份归档完整性")
def get_archive_status(month: str) -> ArchiveMonthStatus:
    """返回指定月份的归档完整性信息（从 _meta.json 读取）。

    Args:
        month: YYYYMM 格式，如 202603

    Returns:
        ArchiveMonthStatus 包含文件数、各数据源完整性等信息。

    Raises:
        404: 归档目录或 _meta.json 不存在。
    """
    if len(month) != 6 or not month.isdigit():
        raise HTTPException(
            status_code=400,
            detail=f"月份格式不合法: {month}（应为 YYYYMM）",
        )

    archive_dir = _ARCHIVE_BASE / month
    if not archive_dir.exists():
        raise HTTPException(status_code=404, detail=f"归档月份不存在: {month}")

    meta_path = archive_dir / "_meta.json"
    if not meta_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"归档元数据文件不存在: {month}/_meta.json",
        )

    try:
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.error("读取归档 meta 失败 %s: %s", meta_path, e)
        raise HTTPException(status_code=500, detail=f"读取归档元数据失败: {e}") from e

    completeness: dict = meta.get("completeness", {})
    complete_count = sum(1 for v in completeness.values() if v is True)
    total_count = len(completeness)
    completeness_rate = (complete_count / total_count) if total_count > 0 else 0.0

    return ArchiveMonthStatus(
        month=meta.get("month", month),
        archived_at=meta.get("archived_at"),
        source=meta.get("source"),
        data_date=meta.get("data_date"),
        file_count=meta.get("file_count"),
        notes=meta.get("notes"),
        completeness=completeness,
        complete_count=complete_count,
        total_count=total_count,
        completeness_rate=round(completeness_rate, 4),
    )
