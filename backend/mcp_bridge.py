"""
MCP stdio bridge — 将 FastAPI 后端 API 暴露为 Claude Code 可调用的 MCP 工具。

用法（由 Claude Code 自动管理）：
    python3 backend/mcp_bridge.py

前置条件：
    后端服务运行中（默认 http://localhost:8000）
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

# 将项目根目录加入 sys.path，使 terminal/ 包可被导入
_PROJECT_ROOT = Path(__file__).parent.parent.resolve()
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from terminal.tools import (
    _tools_meta_map,
    execute_tool,
    fetch_openapi_spec,
    openapi_to_claude_tools,
)

# ── 配置 ─────────────────────────────────────────────────────────────────────
BACKEND_URL = "http://localhost:8000"

# ── 全局缓存（首次 list_tools 时填充）────────────────────────────────────────
_tools_cache: list[dict[str, Any]] | None = None
_tools_meta_cache: dict[str, dict[str, str]] | None = None

server = Server("ref-ops-engine")


async def _ensure_tools_loaded() -> tuple[list[dict[str, Any]], dict[str, dict[str, str]]]:
    """确保工具列表已从后端加载并缓存；后端不可达时抛出友好异常。"""
    global _tools_cache, _tools_meta_cache
    if _tools_cache is None:
        try:
            spec = await fetch_openapi_spec(BACKEND_URL)
        except Exception as exc:
            raise RuntimeError(
                f"无法连接后端 {BACKEND_URL}，请先启动后端服务。"
                f" 错误: {type(exc).__name__}: {exc}"
            ) from exc
        _tools_cache = openapi_to_claude_tools(spec)
        _tools_meta_cache = _tools_meta_map(_tools_cache)
    return _tools_cache, _tools_meta_cache  # type: ignore[return-value]


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """返回所有后端 API 端点对应的 MCP Tool 列表。"""
    tools_raw, _ = await _ensure_tools_loaded()
    result: list[Tool] = []
    for t in tools_raw:
        # 去掉内部元数据字段，只保留 MCP 标准字段
        result.append(
            Tool(
                name=t["name"],
                description=t["description"],
                inputSchema=t["input_schema"],
            )
        )
    return result


@server.call_tool()
async def handle_call_tool(tool_name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """执行指定工具，转发到 FastAPI 后端并返回结果。"""
    _, tools_meta = await _ensure_tools_loaded()
    result_str = await execute_tool(
        tool_name=tool_name,
        tool_input=arguments,
        backend_url=BACKEND_URL,
        tools_meta=tools_meta,
    )
    return [TextContent(type="text", text=result_str)]


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
