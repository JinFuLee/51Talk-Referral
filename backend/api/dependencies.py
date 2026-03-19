"""
FastAPI 依赖注入 — Phase2 重建占位
"""

from __future__ import annotations

from fastapi import Request


def get_service(request: Request):
    """从 app.state 获取 service 单例（Phase2 重建后填充）"""
    return getattr(request.app.state, "service", None)
