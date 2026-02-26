"""
健康检查 + i18n 端点
"""
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter()

VERSION = "9.0.0"


@router.get("/health")
def health_check() -> dict[str, Any]:
    """服务健康检查"""
    return {"status": "ok", "version": VERSION}


@router.get("/i18n/{lang}")
def get_i18n(lang: str) -> dict[str, Any]:
    """返回指定语言的翻译字典（lang: zh / th）"""
    try:
        from core.i18n import TRANSLATIONS
    except ImportError:
        raise HTTPException(status_code=500, detail="i18n 模块导入失败")

    if lang not in TRANSLATIONS:
        raise HTTPException(
            status_code=404,
            detail=f"不支持的语言: {lang}，可用: {list(TRANSLATIONS.keys())}",
        )
    return TRANSLATIONS[lang]
