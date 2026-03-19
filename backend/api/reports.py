"""
报告文件 API 端点
列表、读取内容、下载、最新报告、AI 报告生成
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .dependencies import get_service

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

OUTPUT_DIR = PROJECT_ROOT / "output"
AI_REPORTS_DIR = PROJECT_ROOT / "output" / "reports"

router = APIRouter()


# ── Pydantic 模型 ──────────────────────────────────────────────────────────────


class GenerateReportRequest(BaseModel):
    force_run: bool = False  # 是否强制重算分析数据（忽略缓存）


def _iter_ai_report_files() -> list[dict[str, Any]]:
    """扫描 output/reports/ 目录下的 AI 生成报告文件"""
    reports = []
    if not AI_REPORTS_DIR.exists():
        return reports
    import re

    for f in sorted(AI_REPORTS_DIR.iterdir(), reverse=True):
        if not f.is_file() or not f.name.endswith(".md"):
            continue
        # 尝试从文件名提取日期 YYYY-MM-DD
        date_str = None
        m = re.search(r"(\d{4}-\d{2}-\d{2})", f.name)
        if m:
            date_str = m.group(1)
        reports.append(
            {
                "filename": f.name,
                "report_type": "ai",
                "date": date_str,
                "size_bytes": f.stat().st_size,
                "path": str(f),
            }
        )
    return reports


def _iter_report_files() -> list[dict[str, Any]]:
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


# ── AI 报告端点 ────────────────────────────────────────────────────────────────


@router.post("/generate", summary="触发 AI 报告生成")
def generate_report(
    req: GenerateReportRequest,
    svc=Depends(get_service),
) -> dict[str, Any]:
    """
    触发 AI 报告生成。
    整合规则引擎分析 + Gemini AI 洞察，生成完整 Markdown 报告并保存到 output/reports/。

    Returns:
        {status, report: {report_path, markdown, generated_at, ai_commentary, model_used, has_ai}}
    """
    try:
        from backend.core.ai_report_generator import AIReportGenerator

        gen = AIReportGenerator(svc)
        report = gen.generate_report(force_run=req.force_run)
        return {"status": "ok", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"报告生成失败: {e}")


@router.get("/ai/latest", summary="获取最新 AI 生成报告")
def get_latest_ai_report() -> dict[str, Any]:
    """返回最近一份 AI 生成报告的元信息 + 内容"""
    files = _iter_ai_report_files()
    if not files:
        raise HTTPException(status_code=404, detail="暂无 AI 生成报告")
    latest = files[0]
    try:
        content = Path(latest["path"]).read_text(encoding="utf-8")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {**latest, "content": content}


@router.get("/ai/list", summary="列出所有 AI 生成报告")
def list_ai_reports() -> list[dict[str, Any]]:
    """列出 output/reports/ 下所有 AI 生成报告文件名+日期"""
    return _iter_ai_report_files()


# ── 原有端点 ───────────────────────────────────────────────────────────────────


@router.get("/list", summary="列出所有报告文件")
def list_reports() -> list[dict[str, Any]]:
    """扫描 output/ 目录，返回报告文件列表"""
    return _iter_report_files()


@router.get("/latest", summary="获取最新 ops/exec 报告路径")
def get_latest() -> dict[str, Any]:
    """返回最新 ops 和 exec 报告的路径"""
    all_reports = _iter_report_files()
    latest_ops = next((r for r in all_reports if r["report_type"] == "ops"), None)
    latest_exec = next((r for r in all_reports if r["report_type"] == "exec"), None)
    return {
        "ops": latest_ops,
        "exec": latest_exec,
    }


@router.get("/download/{filename}", summary="下载指定报告文件")
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


@router.get("/{report_type}/{date}", summary="读取指定报告内容")
def get_report_content(report_type: str, date: str) -> dict[str, Any]:
    """读取指定类型和日期的报告内容（report_type: ops|exec，date: YYYYMMDD）"""
    if report_type not in ("ops", "exec"):
        raise HTTPException(status_code=400, detail="report_type 必须为 ops 或 exec")

    # 在 output/ 中查找匹配文件
    if not OUTPUT_DIR.exists():
        raise HTTPException(status_code=404, detail="output 目录不存在")

    candidates = [
        f
        for f in OUTPUT_DIR.iterdir()
        if f.is_file() and date in f.name and f"_{report_type}" in f.name
    ]
    if not candidates:
        # 宽松匹配：type 关键字在文件名中
        candidates = [
            f
            for f in OUTPUT_DIR.iterdir()
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
