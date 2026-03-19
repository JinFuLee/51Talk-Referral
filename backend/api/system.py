from __future__ import annotations

import contextlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/system", tags=["system"])

LOG_FILE = Path("output/error-log.jsonl")


def _parse_jsonl(text: str) -> list[dict]:
    """解析 JSONL 文本，跳过无效行。"""
    result = []
    for line in text.strip().split("\n"):
        if not line.strip():
            continue
        with contextlib.suppress(json.JSONDecodeError):
            result.append(json.loads(line))
    return result


@router.post("/error-log", summary="上报前端错误日志")
async def receive_error_log(request: Request) -> dict[str, Any]:
    """接收前端错误日志条目，追加写入 output/error-log.jsonl。

    去重策略：同一 fingerprint 24h 内仅保留首条（减少日志膨胀）。
    """
    body = await request.json()
    entries = body.get("entries", [])
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    # 读取已有指纹用于 24h 去重
    existing_fps: set[str] = set()
    if LOG_FILE.exists():
        for row in _parse_jsonl(LOG_FILE.read_text(encoding="utf-8")):
            existing_fps.add(row.get("fingerprint", ""))

    written = 0
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        for entry in entries:
            fp = entry.get("fingerprint", "")
            if fp and fp in existing_fps:
                continue
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            existing_fps.add(fp)
            written += 1

    deduped = len(entries) - written
    return {
        "received": len(entries),
        "written": written,
        "deduplicated": deduped,
    }


@router.get("/error-log", summary="查询前端错误日志")
def get_error_log(limit: int = 50) -> dict[str, Any]:
    """读取最近 N 条前端错误日志记录"""
    if not LOG_FILE.exists():
        return {"entries": [], "total": 0}
    all_entries = _parse_jsonl(LOG_FILE.read_text(encoding="utf-8"))
    return {"entries": all_entries[-limit:], "total": len(all_entries)}


@router.get("/error-log/summary", summary="崩溃日志聚合摘要（供 Claude 消费）")
def get_error_summary() -> dict[str, Any]:
    """按 fingerprint 聚合崩溃日志，返回修复优先级排序的结构化摘要。

    输出格式专为 Claude Code 消费设计：
    - 按出现频次降序
    - 包含 source_file（直接定位源码）
    - 包含 message + stack 前 5 行（理解根因）
    """
    if not LOG_FILE.exists():
        return {"bugs": [], "total_crashes": 0, "unique_bugs": 0}

    entries = _parse_jsonl(LOG_FILE.read_text(encoding="utf-8"))

    # 按 fingerprint 聚合
    fp_counter: Counter[str] = Counter()
    fp_first: dict[str, dict] = {}
    for entry in entries:
        fp = entry.get("fingerprint", entry.get("message", "unknown"))
        fp_counter[fp] += 1
        if fp not in fp_first:
            fp_first[fp] = entry

    bugs = []
    for fp, count in fp_counter.most_common():
        first = fp_first[fp]
        stack_lines = (first.get("stack") or "").split("\n")[:5]
        bugs.append({
            "fingerprint": fp,
            "count": count,
            "type": first.get("type"),
            "message": first.get("message"),
            "source_file": first.get("source_file"),
            "page": first.get("page"),
            "stack_preview": "\n".join(stack_lines),
            "first_seen": first.get("ts"),
        })

    return {
        "bugs": bugs,
        "total_crashes": len(entries),
        "unique_bugs": len(bugs),
    }


@router.delete("/error-log", summary="清空前端错误日志")
def clear_error_log() -> dict[str, Any]:
    """删除 output/error-log.jsonl 文件"""
    if LOG_FILE.exists():
        LOG_FILE.unlink()
    return {"cleared": True}
