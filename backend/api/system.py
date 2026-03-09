from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/system", tags=["system"])

LOG_FILE = Path("output/error-log.jsonl")


@router.post("/error-log", summary="上报前端错误日志")
async def receive_error_log(request: Request) -> dict[str, Any]:
    """接收前端错误日志条目，追加写入 output/error-log.jsonl"""
    body = await request.json()
    entries = body.get("entries", [])
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return {"received": len(entries)}


@router.get("/error-log", summary="查询前端错误日志")
def get_error_log(limit: int = 50) -> dict[str, Any]:
    """读取最近 N 条前端错误日志记录"""
    if not LOG_FILE.exists():
        return {"entries": [], "total": 0}
    lines = LOG_FILE.read_text(encoding="utf-8").strip().split("\n")
    entries = [json.loads(l) for l in lines[-limit:] if l.strip()]
    return {"entries": entries, "total": len(lines)}


@router.delete("/error-log", summary="清空前端错误日志")
def clear_error_log() -> dict[str, Any]:
    """删除 output/error-log.jsonl 文件"""
    if LOG_FILE.exists():
        LOG_FILE.unlink()
    return {"cleared": True}
