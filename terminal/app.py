"""Main Textual application for the ref-ops-engine terminal AI assistant."""
from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import Footer, Header, Input

from terminal.widgets.chat import ChatPanel
from terminal.widgets.chart import ChartPanel

if TYPE_CHECKING:
    from terminal.agent import ChartData, TerminalAgent, TextDelta, ToolCall, ToolResult


class TerminalAIApp(App):
    """ref-ops-engine 终端 AI 助手（分屏：左 70% 对话 / 右 30% 图表）"""

    CSS = """
    Screen {
        background: $background;
    }

    #main-container {
        layout: horizontal;
        height: 1fr;
    }

    #chat-section {
        width: 70%;
        layout: vertical;
        height: 100%;
    }

    #chart-section {
        width: 30%;
        border-left: solid $accent;
        height: 100%;
    }

    #input-box {
        dock: bottom;
        height: 3;
        border: solid $accent-darken-2;
        background: $surface;
        margin: 0;
    }

    /* Responsive: hide chart on narrow terminals */
    @media (max-width: 80) {
        #chart-section {
            display: none;
        }
        #chat-section {
            width: 100%;
        }
    }
    """

    BINDINGS = [
        Binding("ctrl+c", "quit", "退出", priority=True),
        Binding("ctrl+l", "clear_chat", "清屏"),
        Binding("ctrl+r", "toggle_chart", "切换图表"),
    ]

    TITLE = "ref-ops-engine AI 助手"
    SUB_TITLE = "51Talk 泰国转介绍运营分析"

    def __init__(self):
        super().__init__()
        self.agent: "TerminalAgent | None" = None
        self._responding = False

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        with Horizontal(id="main-container"):
            with Vertical(id="chat-section"):
                yield ChatPanel(id="chat")
                yield Input(
                    placeholder="输入消息... (Ctrl+C 退出 | Ctrl+L 清屏)",
                    id="input-box",
                )
            yield ChartPanel(id="chart-section")
        yield Footer()

    async def on_mount(self) -> None:
        """Initialize the agent and show welcome message on startup."""
        chat = self.query_one("#chat", ChatPanel)

        # Lazy import to allow startup even if agent.py not yet complete
        try:
            from terminal.agent import TerminalAgent

            self.agent = TerminalAgent()
            await self.agent.initialize()
            status = "🤖 ref-ops-engine AI 助手已就绪"
        except Exception as exc:
            status = f"⚠️ Agent 初始化失败: {exc}\n仍可使用界面，但 AI 功能不可用"

        chat.add_system_message(
            f"{status}\n\n"
            "可以问我任何运营数据问题，例如：\n"
            "  • 本月注册数多少？\n"
            "  • 分析打卡率下降原因\n"
            "  • 如果转化率提升 5% 会怎样？\n\n"
            "快捷键：Ctrl+L 清屏 | Ctrl+R 切换图表 | Ctrl+C 退出"
        )

        # Focus input after mount
        self.query_one("#input-box", Input).focus()

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        """Handle user message submission."""
        message = event.value.strip()
        if not message:
            return

        if self._responding:
            return  # Ignore new input while streaming

        event.input.value = ""
        chat = self.query_one("#chat", ChatPanel)
        chart = self.query_one("#chart-section", ChartPanel)

        chat.add_user_message(message)

        if self.agent is None:
            chat.show_error("Agent 未初始化，请重启应用")
            return

        self._responding = True
        self.run_worker(
            self._stream_response(message, chat, chart),
            exclusive=False,
            thread=False,
        )

    async def _stream_response(
        self,
        message: str,
        chat: ChatPanel,
        chart: ChartPanel,
    ) -> None:
        """Stream agent response events into the chat and chart panels."""
        try:
            # Import here to allow graceful degradation
            from terminal.agent import ChartData, TextDelta, ToolCall, ToolResult

            ai_started = False

            async for ev in self.agent.chat(message):
                if isinstance(ev, TextDelta):
                    if not ai_started:
                        chat.start_ai_message()
                        ai_started = True
                    chat.append_ai_text(ev.text)

                elif isinstance(ev, ToolCall):
                    # Finalize current AI bubble before showing tool call
                    if ai_started:
                        ai_started = False
                        chat._finalize_ai_message()
                    chat.show_tool_call(ev.name, ev.input)

                elif isinstance(ev, ToolResult):
                    chat.show_tool_result(ev.name, ev.result, ev.is_error)

                elif isinstance(ev, ChartData):
                    chart.render_chart(ev)

        except Exception as exc:
            chat.show_error(str(exc))
        finally:
            self._responding = False
            # Re-focus input
            self.query_one("#input-box", Input).focus()

    # ---------- Actions ----------

    def action_quit(self) -> None:
        """Exit the application."""
        self.exit()

    def action_clear_chat(self) -> None:
        """Clear all chat messages."""
        self.query_one("#chat", ChatPanel).clear_chat()
        self.query_one("#chart-section", ChartPanel).clear_chart()

    def action_toggle_chart(self) -> None:
        """Show or hide the chart panel."""
        chart = self.query_one("#chart-section", ChartPanel)
        if chart.display:
            chart.display = False
            self.query_one("#chat-section").styles.width = "100%"
        else:
            chart.display = True
            self.query_one("#chat-section").styles.width = "70%"
