"""
共享工具函数：从 analysis_engine_v2.py 提取（原 1-70 行）
"""

from __future__ import annotations

import json
import math
from typing import Any, Optional


def _safe_div(numerator, denominator) -> Optional[float]:
    """安全除法：分母为 0 或 None 返回 None"""
    if denominator is None or denominator == 0:
        return None
    if numerator is None:
        return None
    return numerator / denominator


def _safe_pct(numerator, denominator) -> Optional[float]:
    """安全百分比 (0~1 小数)"""
    result = _safe_div(numerator, denominator)
    return round(result, 4) if result is not None else None


def _norm_cc(name: str) -> str:
    """标准化 CC 姓名：lowercase + strip，用于跨表匹配"""
    if not name:
        return ""
    return str(name).lower().strip()


def _is_json_serializable(v) -> bool:
    try:
        json.dumps(v)
        return True
    except (TypeError, ValueError):
        return False


def _clean_for_json(obj) -> Any:
    """递归清洗，确保 JSON 可序列化"""
    if obj is None:
        return None
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (int, str, bool)):
        return obj
    if isinstance(obj, dict):
        return {str(k): _clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean_for_json(i) for i in obj]
    # numpy / pandas 类型退出
    try:
        return float(obj)
    except (TypeError, ValueError):
        pass
    return str(obj)
