"""��卡模块共享常量与工具函数

checkin.py 和 checkin_roi.py 共用的映射、类型转换函数集中在此，
消除重复定义，保证两处修改同步生效。
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd

# ── 围场 M 标签映射 ─────────────────────────────────────────────��─────────────

M_MAP: dict[str, str] = {
    "0~30": "M0",
    "31~60": "M1",
    "61~90": "M2",
    "91~120": "M3",
    "121~150": "M4",
    "151~180": "M5",
    "6M": "M6",
    "7M": "M7",
    "8M": "M8",
    "9M": "M9",
    "10M": "M10",
    "11M": "M11",
    "12M": "M12",
    "12M+": "M12+",
    # 旧数据兼容
    "M6+": "M6+",
    "181+": "M6+",
    # 生命周期列格式（D4 使用 0M/1M/2M... 格式）
    "0M": "M0",
    "1M": "M1",
    "2M": "M2",
    "3M": "M3",
    "4M": "M4",
    "5M": "M5",
}

# 围场段 → 天数映射
M_TO_DAYS: dict[str, tuple[int, int]] = {
    "0~30": (0, 30),
    "31~60": (31, 60),
    "61~90": (61, 90),
    "91~120": (91, 120),
    "121~150": (121, 150),
    "151~180": (151, 180),
    "6M": (181, 210),
    "7M": (211, 240),
    "8M": (241, 270),
    "9M": (271, 300),
    "10M": (301, 330),
    "11M": (331, 360),
    "12M": (361, 390),
    "12M+": (391, 9999),
    "M6+": (181, 9999),  # 旧数据兼容
}

# D4 学员 ID 候选列（按优先级）
D4_STUDENT_ID_CANDIDATES = ("学员id", "stdt_id")


# ── 类型安全工具函数 ──────────────────────────────────────────────────────────


def safe(val: Any) -> float | None:
    """安全转 float，None / NaN / 无法转换 → None。"""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        f = float(val)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def safe_str(val: Any) -> str:
    """安全转字符串，None / NaN → 空字符串。"""
    if val is None:
        return ""
    try:
        if pd.isna(val):
            return ""
    except (TypeError, ValueError):
        pass
    return str(val).strip()


def safe_int(val: Any, default: int = 0) -> int:
    """安全转 int，失败返回 default。"""
    f = safe(val)
    return int(f) if f is not None else default


def m_label_to_index(m_label: str) -> int:
    """M0→0, M1→1, ... M12→12, M12+→13, M6+→6"""
    s = m_label.lstrip("M")
    if s.endswith("+"):
        try:
            base = int(s.rstrip("+"))
            return base + 1 if base == 12 else base
        except ValueError:
            return 99
    try:
        return int(s)
    except ValueError:
        return 99


def find_d4_id_col(df: pd.DataFrame) -> str | None:
    """在 DataFrame 中查找 D4 学员 ID 列。"""
    for c in D4_STUDENT_ID_CANDIDATES:
        if c in df.columns:
            return c
    return None
