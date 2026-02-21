"""
terminal/agent.py
TerminalAgent — AI Agent 核心循环。

事件类型（AsyncGenerator yield）：
  TextDelta   — Claude 的文本回复片段（流式）
  ToolCall    — Claude 决定调用某个工具
  ToolResult  — 工具执行结果
  ChartData   — 如果工具结果含时序/数组数据，自动生成图表事件
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Union

import anthropic

from terminal.config import BACKEND_URL, MAX_TOKENS, MODEL_NAME, SYSTEM_PROMPT, get_api_key
from terminal.tools import (
    claude_tools_format,
    execute_tool,
    fetch_openapi_spec,
    openapi_to_claude_tools,
    _tools_meta_map,
)

logger = logging.getLogger(__name__)

# 最多保留的对话轮数（用户 + 助手各算一条，所以 40 = 20 轮）
_MAX_HISTORY_MESSAGES = 40


# ── 事件数据类 ─────────────────────────────────────────────────────────────────

@dataclass
class TextDelta:
    text: str


@dataclass
class ToolCall:
    name: str
    input: dict[str, Any]


@dataclass
class ToolResult:
    name: str
    result: str
    is_error: bool = False


@dataclass
class ChartData:
    chart_type: str          # "line" | "bar" | "scatter"
    title: str
    data: dict[str, Any]     # {labels: [...], datasets: [{label, values}]}


AgentEvent = Union[TextDelta, ToolCall, ToolResult, ChartData]


# ── ChartData 检测工具 ─────────────────────────────────────────────────────────

def _detect_chart(tool_name: str, result_json: str) -> ChartData | None:
    """
    检测工具返回结果是否包含可视化数据，若是则构造 ChartData。
    支持：时序列表、数组数值列表、含 labels/values/data 字段的 dict。
    """
    try:
        data = json.loads(result_json)
    except (json.JSONDecodeError, TypeError):
        return None

    # 情况1：结果是列表，且每个元素含 date/week/month 等时间字段 + 数值字段
    if isinstance(data, list) and len(data) >= 2:
        first = data[0] if isinstance(data[0], dict) else None
        if first:
            time_keys = {"date", "week", "month", "period", "day", "label"}
            found_time = next((k for k in first if k in time_keys), None)
            num_keys = [k for k, v in first.items() if isinstance(v, (int, float)) and k != found_time]
            if found_time and num_keys:
                labels = [str(row.get(found_time, i)) for i, row in enumerate(data)]
                datasets = [
                    {"label": k, "values": [row.get(k, 0) for row in data]}
                    for k in num_keys[:5]  # 最多 5 个系列
                ]
                return ChartData(
                    chart_type="line",
                    title=_tool_to_title(tool_name),
                    data={"labels": labels, "datasets": datasets},
                )

    # 情况2：结果是 dict，含 "labels"/"values"/"data"/"series" 等标准字段
    if isinstance(data, dict):
        # 兼容 {labels, values} 或 {labels, datasets}
        if "labels" in data and ("values" in data or "datasets" in data):
            chart_type = "bar" if "bar" in tool_name else "line"
            datasets = data.get("datasets") or [{"label": "数值", "values": data.get("values", [])}]
            return ChartData(
                chart_type=chart_type,
                title=_tool_to_title(tool_name),
                data={"labels": data["labels"], "datasets": datasets},
            )
        # 兼容 {data: [{name, value}]} 饼图/柱状
        if "data" in data and isinstance(data["data"], list):
            items = data["data"]
            if items and isinstance(items[0], dict) and "name" in items[0] and "value" in items[0]:
                return ChartData(
                    chart_type="bar",
                    title=_tool_to_title(tool_name),
                    data={
                        "labels": [str(i.get("name", "")) for i in items],
                        "datasets": [{"label": "数值", "values": [i.get("value", 0) for i in items]}],
                    },
                )

    return None


def _tool_to_title(tool_name: str) -> str:
    """将 tool_name 转换为可读标题（snake_case → 空格分隔）"""
    parts = tool_name.replace("get_api_analysis_", "").replace("_", " ").strip()
    return parts.title() if parts else tool_name


# ── TerminalAgent ──────────────────────────────────────────────────────────────

class TerminalAgent:
    """
    AI Agent 核心：
      - 维护 Anthropic client 和对话历史
      - 动态加载后端 OpenAPI 工具
      - 支持流式 text + tool_use 多轮循环
      - 自动检测图表数据并 yield ChartData
    """

    def __init__(
        self,
        backend_url: str = BACKEND_URL,
        model: str = MODEL_NAME,
        max_tokens: int = MAX_TOKENS,
    ) -> None:
        self.backend_url = backend_url
        self.model = model
        self.max_tokens = max_tokens
        self._client: anthropic.AsyncAnthropic | None = None
        self._tools_raw: list[dict[str, Any]] = []      # 含 _method/_path 的完整列表
        self._claude_tools: list[dict[str, Any]] = []   # 传给 Claude 的格式（无内部字段）
        self._tools_meta: dict[str, dict[str, str]] = {}
        self._messages: list[dict[str, Any]] = []
        self._initialized = False

    # ── 初始化 ─────────────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        """启动时获取 OpenAPI spec 并生成工具定义，初始化 Anthropic client。"""
        api_key = get_api_key()
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

        try:
            spec = await fetch_openapi_spec(self.backend_url)
            self._tools_raw = openapi_to_claude_tools(spec)
            self._claude_tools = claude_tools_format(self._tools_raw)
            self._tools_meta = _tools_meta_map(self._tools_raw)
            logger.info(f"已加载 {len(self._claude_tools)} 个 API 工具")
        except Exception as exc:
            logger.warning(f"无法加载 OpenAPI spec，工具列表为空: {exc}")
            self._tools_raw = []
            self._claude_tools = []
            self._tools_meta = {}

        self._initialized = True

    # ── 对话主循环 ─────────────────────────────────────────────────────────────

    async def chat(
        self, user_message: str
    ) -> AsyncGenerator[AgentEvent, None]:
        """
        发送用户消息，以流式事件 yield 回复。

        事件顺序示例：
          TextDelta("正在查询...") → ToolCall("get_api_analysis_summary", {...})
          → ToolResult("get_api_analysis_summary", "...json...")
          → ChartData(...)  [可选]
          → TextDelta("根据数据，今日业绩...")
        """
        if not self._initialized:
            await self.initialize()

        # 追加用户消息
        self._messages.append({"role": "user", "content": user_message})
        self._trim_history()

        # tool_use 循环（Claude 可能连续调用多个工具）
        while True:
            # 构建请求参数
            kwargs: dict[str, Any] = {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "system": SYSTEM_PROMPT,
                "messages": self._messages,
            }
            if self._claude_tools:
                kwargs["tools"] = self._claude_tools

            # 流式调用
            collected_text = ""
            tool_uses: list[dict[str, Any]] = []

            async with self._client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    event_type = type(event).__name__

                    # 文本流 + tool_use input 流（合并处理两种 delta 类型）
                    if event_type == "RawContentBlockDeltaEvent":
                        delta = getattr(event, "delta", None)
                        if delta:
                            delta_type = getattr(delta, "type", "")
                            if delta_type == "text_delta":
                                chunk = delta.text
                                collected_text += chunk
                                yield TextDelta(text=chunk)
                            elif delta_type == "input_json_delta":
                                if tool_uses:
                                    tool_uses[-1]["input_raw"] += delta.partial_json

                    # tool_use block 开始（收集 id/name）
                    elif event_type == "RawContentBlockStartEvent":
                        block = getattr(event, "content_block", None)
                        if block and getattr(block, "type", "") == "tool_use":
                            tool_uses.append(
                                {"id": block.id, "name": block.name, "input_raw": ""}
                            )

                # 在 async with 内获取完整 message 对象（stream 仍然有效）
                final_message = await stream.get_final_message()
                stop_reason = final_message.stop_reason

                # 将助手回复加入历史
                assistant_content: list[Any] = []
                if collected_text:
                    assistant_content.append({"type": "text", "text": collected_text})

                # 解析 tool_use blocks（从 final_message 更可靠）
                tool_use_blocks = [
                    b for b in final_message.content if b.type == "tool_use"
                ]

            for b in tool_use_blocks:
                assistant_content.append(
                    {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input}
                )

            if assistant_content:
                self._messages.append({"role": "assistant", "content": assistant_content})

            # 如果没有 tool_use，退出循环
            if stop_reason != "tool_use" or not tool_use_blocks:
                break

            # 执行所有工具，收集结果
            tool_results: list[dict[str, Any]] = []
            for b in tool_use_blocks:
                yield ToolCall(name=b.name, input=b.input)

                result_str = await execute_tool(
                    tool_name=b.name,
                    tool_input=b.input,
                    backend_url=self.backend_url,
                    tools_meta=self._tools_meta,
                )

                # 判断是否出错
                is_error = False
                try:
                    parsed = json.loads(result_str)
                    if isinstance(parsed, dict) and "error" in parsed:
                        is_error = True
                except Exception:
                    pass

                yield ToolResult(name=b.name, result=result_str, is_error=is_error)

                # 检测图表数据
                if not is_error:
                    chart = _detect_chart(b.name, result_str)
                    if chart:
                        yield chart

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": b.id,
                        "content": result_str,
                        "is_error": is_error,
                    }
                )

            # 将工具结果作为用户消息发回（Claude 规范要求）
            self._messages.append({"role": "user", "content": tool_results})

    # ── 历史管理 ───────────────────────────────────────────────────────────────

    def _trim_history(self) -> None:
        """保持最近 N 条消息，防止 context 过长。"""
        if len(self._messages) > _MAX_HISTORY_MESSAGES:
            # 保留最新的 N 条，同时确保第一条是 user 消息
            self._messages = self._messages[-_MAX_HISTORY_MESSAGES:]
            # 确保历史以 user 消息开始（Claude 要求）
            while self._messages and self._messages[0]["role"] != "user":
                self._messages.pop(0)

    def clear_history(self) -> None:
        """清空对话历史"""
        self._messages.clear()

    @property
    def tool_count(self) -> int:
        return len(self._claude_tools)

    @property
    def is_ready(self) -> bool:
        return self._initialized
