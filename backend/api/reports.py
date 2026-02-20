"""
报告文件 API 端点
列表、读取内容、下载、最新报告
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

OUTPUT_DIR = PROJECT_ROOT / "output"

router = APIRouter()

_service: Any = None


def set_service(service: Any) -> None:
    global _service
    _service = service


def _iter_report_files():
    """扫描 output/ 目录下的报告文件，返回元信息列表"""
    reports = []
    if not OUTPUT_DIR.exists():
        return reports
    for f in sorted(OUTPUT_DIR.iterdir(), reverse=True):
        if not f.is_file():
            continue
        name = f.name
        # 判断报告类型：ops / exec
        if "_ops_" in name or name.endswith("_ops.md"):
            report_type = "ops"
        elif "_exec_" in name or name.endswith("_exec.md"):
            report_type = "exec"
        else:
            report_type = "unknown"

        # 尝试从文件名提取日期 YYYYMMDD
        date_str = None
        import re
        m = re.search(r"(\d{8})", name)
        if m:
            date_str = m.group(1)

        reports.append(
            {
                "filename": name,
                "report_type": report_type,
                "date": date_str,
                "size_bytes": f.stat().st_size,
                "path": str(f),
            }
        )
    return reports


@router.get("/list")
def list_reports() -> list[dict[str, Any]]:
    """扫描 output/ 目录，返回报告文件列表"""
    return _iter_report_files()


@router.get("/latest")
def get_latest() -> dict[str, Any]:
    """返回最新 ops 和 exec 报告的路径"""
    all_reports = _iter_report_files()
    latest_ops = next((r for r in all_reports if r["report_type"] == "ops"), None)
    latest_exec = next((r for r in all_reports if r["report_type"] == "exec"), None)
    return {
        "ops": latest_ops,
        "exec": latest_exec,
    }


@router.get("/download/{filename}")
def download_report(filename: str) -> FileResponse:
    """下载指定报告文件"""
    # 防止路径穿越
    safe_name = Path(filename).name
    file_path = OUTPUT_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"文件不存在: {safe_name}")
    return FileResponse(
        path=str(file_path),
        filename=safe_name,
        media_type="application/octet-stream",
    )


@router.get("/{report_type}/{date}")
def get_report_content(report_type: str, date: str) -> dict[str, Any]:
    """读取指定类型和日期的报告内容（report_type: ops|exec，date: YYYYMMDD）"""
    if report_type not in ("ops", "exec"):
        raise HTTPException(status_code=400, detail="report_type 必须为 ops 或 exec")

    # 在 output/ 中查找匹配文件
    if not OUTPUT_DIR.exists():
        raise HTTPException(status_code=404, detail="output 目录不存在")

    candidates = [
        f for f in OUTPUT_DIR.iterdir()
        if f.is_file() and date in f.name and f"_{report_type}" in f.name
    ]
    if not candidates:
        # 宽松匹配：type 关键字在文件名中
        candidates = [
            f for f in OUTPUT_DIR.iterdir()
            if f.is_file() and date in f.name and report_type in f.name
        ]

    if not candidates:
        raise HTTPException(
            status_code=404,
            detail=f"未找到 {report_type}/{date} 报告",
        )

    target = sorted(candidates, key=lambda f: f.stat().st_mtime, reverse=True)[0]
    try:
        content = target.read_text(encoding="utf-8")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "filename": target.name,
        "report_type": report_type,
        "date": date,
        "content": content,
    }
