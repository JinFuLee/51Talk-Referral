"""ChatPanel widget for displaying conversation history with streaming support."""
import json
from typing import Optional

from rich.text import Text
from rich.panel import Panel
from rich.markdown import Markdown
from rich.syntax import Syntax
from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import RichLog, Static
from textual.containers import ScrollableContainer
from textual.reactive import reactive


class MessageBubble(Static):
    """A single message bubble in the chat."""

    DEFAULT_CSS = """
    MessageBubble {
        margin: 0 1;
        padding: 0;
    }
    MessageBubble.user {
        color: $text;
        text-align: right;
    }
    MessageBubble.ai {
        color: $text;
        text-align: left;
    }
    MessageBubble.system {
        color: $warning;
        text-align: left;
    }
    MessageBubble.tool-call {
        color: $warning-darken-2;
        text-align: left;
    }
    MessageBubble.tool-result {
        color: $success-darken-2;
        text-align: left;
    }
    MessageBubble.tool-result.error {
        color: $error;
    }
    """

    def __init__(self, content: str, role: str, **kwargs):
        super().__init__(**kwargs)
        self._content = content
        self._role = role
        self.add_class(role)

    def render(self) -> Text:
        if self._role == "user":
            return Text(f"👤 {self._content}", style="bold cyan", justify="right")
        elif self._role == "system":
            return Text(self._content, style="dim yellow", justify="left")
        elif self._role == "tool-call":
            return Text(self._content, style="bold yellow", justify="left")
        elif self._role == "tool-result":
            return Text(self._content, style="dim green", justify="left")
        else:
            return Text(self._content, style="green", justify="left")


class ChatPanel(ScrollableContainer):
    """
    Scrollable chat panel showing conversation history.

    Supports:
    - User messages (right-aligned, cyan)
    - AI streaming responses (left-aligned, green)
    - Tool call indicators (yellow)
    - Tool results with collapsible JSON
    - System messages (dim yellow)
    - Auto-scroll to bottom
    """

    DEFAULT_CSS = """
    ChatPanel {
        background: $surface;
        border: solid $accent;
        border-title-align: left;
        padding: 0 1;
        overflow-y: auto;
        height: 1fr;
    }
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._current_ai_log: Optional[RichLog] = None
        self._current_ai_text: str = ""
        self.border_title = "💬 对话"

    def compose(self) -> ComposeResult:
        # Empty initially; messages added dynamically
        return iter([])

    def add_system_message(self, content: str) -> None:
        """Add a system/welcome message."""
        msg = Static(
            Text(content, style="bold yellow"),
            classes="system-message",
        )
        self.mount(msg)
        self.scroll_end(animate=False)

    def add_user_message(self, content: str) -> None:
        """Add a user message bubble."""
        # Finalize any in-progress AI message
        self._finalize_ai_message()

        label = Static(
            Text(f"👤 你: {content}", style="bold cyan", justify="right"),
            classes="user-message",
        )
        self.mount(label)
        self.scroll_end(animate=False)

    def start_ai_message(self) -> None:
        """Prepare a new streaming AI message container."""
        self._finalize_ai_message()
        self._current_ai_text = ""
        self._current_ai_log = RichLog(
            highlight=False,
            markup=True,
            wrap=True,
            classes="ai-log",
        )
        self._current_ai_log.styles.border = ("solid", "green")
        self._current_ai_log.styles.padding = (0, 1)
        self._current_ai_log.styles.margin = (0, 0, 1, 0)
        self.mount(self._current_ai_log)
        self.scroll_end(animate=False)

    def append_ai_text(self, text: str) -> None:
        """Append streaming text to the current AI message."""
        if self._current_ai_log is None:
            self.start_ai_message()

        self._current_ai_text += text
        # Re-render the whole block with markdown for clean output
        if self._current_ai_log is not None:
            self._current_ai_log.clear()
            try:
                self._current_ai_log.write(
                    Markdown(f"🤖 AI: {self._current_ai_text}")
                )
            except Exception:
                self._current_ai_log.write(
                    Text(f"🤖 AI: {self._current_ai_text}", style="green")
                )
        self.scroll_end(animate=False)

    def _finalize_ai_message(self) -> None:
        """Seal the current AI streaming message."""
        self._current_ai_log = None
        self._current_ai_text = ""

    def show_tool_call(self, tool_name: str, tool_input: dict) -> None:
        """Display a tool call indicator."""
        self._finalize_ai_message()
        try:
            input_preview = json.dumps(tool_input, ensure_ascii=False, indent=2)
            if len(input_preview) > 200:
                input_preview = input_preview[:200] + "..."
        except Exception:
            input_preview = str(tool_input)

        label = Static(
            Text(
                f"🔧 调用工具: {tool_name}\n   参数: {input_preview}",
                style="bold yellow",
            ),
            classes="tool-call-message",
        )
        self.mount(label)
        self.scroll_end(animate=False)

    def show_tool_result(self, tool_name: str, result: str, is_error: bool = False) -> None:
        """Display a tool result (collapsed JSON)."""
        style = "bold red" if is_error else "dim green"
        prefix = "❌ 工具错误" if is_error else "✅ 工具结果"

        # Truncate long results
        display_result = result
        if len(result) > 300:
            display_result = result[:300] + "\n... (截断)"

        label = Static(
            Text(f"{prefix} [{tool_name}]:\n{display_result}", style=style),
            classes="tool-result-message",
        )
        self.mount(label)
        self.scroll_end(animate=False)

    def show_error(self, error_msg: str) -> None:
        """Display an error message in the chat."""
        self._finalize_ai_message()
        label = Static(
            Text(f"⚠️ 错误: {error_msg}", style="bold red"),
            classes="error-message",
        )
        self.mount(label)
        self.scroll_end(animate=False)

    def clear_chat(self) -> None:
        """Remove all messages and reset state."""
        self._finalize_ai_message()
        self.remove_children()
