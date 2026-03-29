"""数据源管理 API — 5 个转介绍中台监测文件状态管理"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager
from backend.models.filters import UnifiedFilter, parse_filters

router = APIRouter()


@router.get("/status", summary="查询 5 个数据文件状态（含新鲜度）")
def get_datasource_status(
    request: Request,
    filters: UnifiedFilter = Depends(parse_filters),
    dm: DataManager = Depends(get_data_manager),
) -> list[dict[str, Any]]:
    """返回 D1-D5 数据文件的存在性与当月新鲜度"""
    statuses = dm.get_status()
    return [s.model_dump() for s in statuses]


@router.post("/refresh", summary="清空数据缓存并重新加载")
def refresh_data(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> dict[str, Any]:
    """清空 DataManager 缓存，下次请求时重新读取 Excel 文件"""
    dm.invalidate()
    # 立即重新加载
    data = dm.load_all()
    summary = {}
    import pandas as pd

    for key, val in data.items():
        if isinstance(val, pd.DataFrame):
            summary[key] = len(val)
        elif isinstance(val, dict):
            summary[key] = f"{len(val)} keys"

    return {"status": "ok", "reloaded": summary}
