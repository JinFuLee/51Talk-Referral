"""
backend/api/utils.py
API 层通用工具函数。

单一版本 safe_div：分母为 0 或 None 时返回 0.0。
其他 API 路由中的工具函数均从此模块导入，避免多处变体。
"""
from __future__ import annotations

from typing import Any


def safe_div(numerator: Any, denominator: Any) -> float:
    """安全除法，除数为 0 或 None 时返回 0.0。

    参数可以是任意数值类型（int / float / None），内部统一转换。
    """
    try:
        if denominator is None or denominator == 0:
            return 0.0
        return (numerator or 0) / denominator
    except (TypeError, ZeroDivisionError):
        return 0.0
