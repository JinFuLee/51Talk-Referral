"""
健康检查 + i18n 端点
"""
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(tags=["health"])

VERSION = "9.0.0"

# 模块级 limiter（与 main.py 同 key_func，exempt 标记仅需保持一致即可）
_limiter = Limiter(key_func=get_remote_address)


@router.get("/health", summary="服务健康检查")
@_limiter.exempt
def health_check(request: Request) -> dict[str, Any]:
    """返回服务状态和版本号（不受速率限制）"""
    return {"status": "ok", "version": VERSION}


@router.get("/i18n/{lang}", summary="获取 i18n 翻译字典")
def get_i18n(lang: str) -> dict[str, Any]:
    """返回指定语言的翻译字典（lang: zh / th）"""
    try:
        from core.i18n import TRANSLATIONS
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="i18n 模块导入失败") from exc

    if lang not in TRANSLATIONS:
        raise HTTPException(
            status_code=404,
            detail=f"不支持的语言: {lang}，可用: {list(TRANSLATIONS.keys())}",
        )
    return TRANSLATIONS[lang]
