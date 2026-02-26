"""
历史快照 API 端点
统计、KPI 查询、CC 成长曲线、历史导入、清理
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

router = APIRouter()


def _get_snapshot_store() -> Any:
    """获取 SnapshotStore 进程级单例（project_root 仅首次初始化时生效）"""
    try:
        from core.snapshot_store import SnapshotStore
        return SnapshotStore.get_instance(project_root=PROJECT_ROOT)
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"snapshot_store 模块不可用: {exc}")


@router.get("/stats", summary="快照数据库统计信息")
def get_snapshot_stats() -> dict[str, Any]:
    """返回快照数据库统计信息"""
    store = _get_snapshot_store()
    try:
        return store.get_stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/daily-kpi", summary="查询日级 KPI 快照")
def get_daily_kpi(
    date_from: Optional[str] = Query(default=None, description="起始日期 YYYY-MM-DD"),
    date_to: Optional[str] = Query(default=None, description="结束日期 YYYY-MM-DD"),
    metric: Optional[str] = Query(default=None, description="指标过滤（如 注册、付费）"),
) -> list[dict[str, Any]]:
    """查询日级 KPI 快照"""
    store = _get_snapshot_store()
    try:
        return store.get_daily_kpi(
            date_from=date_from,
            date_to=date_to,
            metric=metric,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/cc-growth/{cc_name}", summary="查询 CC 个人成长曲线")
def get_cc_growth(
    cc_name: str,
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
) -> list[dict[str, Any]]:
    """查询指定 CC 个人成长曲线"""
    store = _get_snapshot_store()
    try:
        return store.get_cc_growth(
            cc_name=cc_name,
            date_from=date_from,
            date_to=date_to,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/import-history", summary="触发历史数据批量导入")
def import_history() -> dict[str, Any]:
    """触发历史数据批量导入"""
    try:
        from core.history_importer import HistoryImporter
        importer = HistoryImporter(project_root=PROJECT_ROOT)
        result = importer.run()
        return {"status": "ok", "result": result}
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"history_importer 模块不可用: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/cleanup", summary="清理旧快照数据")
def cleanup_snapshots(
    days: int = Query(default=90, ge=1, description="清理 N 天前的快照"),
) -> dict[str, Any]:
    """清理旧快照数据"""
    store = _get_snapshot_store()
    try:
        deleted = store.cleanup_old_snapshots(days=days)
        return {"status": "ok", "deleted_rows": deleted, "older_than_days": days}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
