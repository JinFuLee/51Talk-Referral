"""
FastAPI 依赖注入：统一 service 获取
所有路由通过 Depends(get_service) 获取 AnalysisService 单例，
取代原来每个文件都有的 global _service + set_service() 反模式。
"""
from __future__ import annotations

from fastapi import Request

from services.analysis_service import AnalysisService


def get_service(request: Request) -> AnalysisService:
    """从 app.state 获取 AnalysisService 单例"""
    return request.app.state.service
