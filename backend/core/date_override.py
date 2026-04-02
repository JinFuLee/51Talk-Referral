"""日期覆盖工具 — 支持历史月份数据查看（请求级隔离版）

优先级（高→低）：
1. contextvars 请求级覆盖（MonthMiddleware 从 query param ?month= 注入）
2. 环境变量 DATA_MONTH=YYYYMM（进程级，启动时设置）
3. date.today()（真实系统日期）

contextvars 保证同一进程中多个并发请求各自持有独立的月份上下文，
互不干扰。完全向后兼容——6 个已有 get_today() 导入点零修改。

用法:
  # 环境变量模式（进程级）
  DATA_MONTH=202603 uv run uvicorn backend.main:app ...

  # 请求级模式（通过 MonthMiddleware 自动注入）
  GET /api/report/summary?month=202603
"""

from __future__ import annotations

import os
from contextvars import ContextVar
from datetime import date, timedelta

# 请求级月份上下文（None = 使用 env var 或 date.today()）
_request_month: ContextVar[str | None] = ContextVar("request_month", default=None)


def set_request_month(month: str | None) -> None:
    """设置当前请求的月份上下文（由 MonthMiddleware 调用）。

    Args:
        month: "YYYYMM" 格式字符串，None 表示清除（使用后备来源）。
    """
    _request_month.set(month)


def get_today() -> date:
    """返回当前参考日期。

    优先级：contextvars 请求级 > DATA_MONTH 环境变量 > date.today()

    - 任何来源均未设置 → 返回真实 date.today()
    - 来源值为 YYYYMM → 返回该月最后一天（如 202603 → 2026-03-31）

    每次调用动态读取（兼容 uvicorn reload 和 fork）。
    """
    # 1. 请求级 contextvars（优先，并发安全）
    ctx_month = _request_month.get()
    if ctx_month and len(ctx_month) == 6:
        try:
            year = int(ctx_month[:4])
            month = int(ctx_month[4:6])
            if month == 12:
                return date(year + 1, 1, 1) - timedelta(days=1)
            return date(year, month + 1, 1) - timedelta(days=1)
        except (ValueError, OverflowError):
            pass

    # 2. 进程级环境变量（向后兼容）
    data_month = os.environ.get("DATA_MONTH", "")
    if data_month and len(data_month) == 6:
        try:
            year = int(data_month[:4])
            month = int(data_month[4:6])
            if month == 12:
                return date(year + 1, 1, 1) - timedelta(days=1)
            return date(year, month + 1, 1) - timedelta(days=1)
        except (ValueError, OverflowError):
            pass

    # 3. 真实系统日期
    return date.today()


def get_reference_date() -> date:
    """返回 T-1 参考日期（用于数据分析，通常 = get_today() - 1 天）。"""
    return get_today() - timedelta(days=1)


def get_month_key() -> str:
    """返回当前月份键（如 '202603'）。"""
    t = get_today()
    return t.strftime("%Y%m")


def is_override_active() -> bool:
    """返回是否启用了日期覆盖（请求级或进程级任一即为 True）。"""
    return bool(_request_month.get()) or bool(os.environ.get("DATA_MONTH", ""))
