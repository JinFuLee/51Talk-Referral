"""ChartPanel widget for rendering terminal charts via plotext."""
from __future__ import annotations

from typing import TYPE_CHECKING

from textual.app import ComposeResult
from textual.containers import ScrollableContainer
from textual.widgets import Static

try:
    from textual_plotext import PlotextPlot
    HAS_PLOTEXT = True
except ImportError:
    HAS_PLOTEXT = False

if TYPE_CHECKING:
    pass


class _PlaceholderChart(Static):
    """Fallback when textual-plotext is not installed."""

    DEFAULT_CSS = """
    _PlaceholderChart {
        content-align: center middle;
        color: $text-muted;
        height: 1fr;
    }
    """

    def render(self):
        from rich.text import Text
        return Text(
            "📊 图表区域\n— AI 分析后自动显示 —\n\n(需要 textual-plotext)",
            justify="center",
            style="dim",
        )


class ChartPanel(ScrollableContainer):
    """
    Right-side chart panel that renders data from ChartData events.

    Supports:
    - Line charts  (chart_type="line")
    - Bar charts   (chart_type="bar")
    - Scatter plots (chart_type="scatter")
    - Placeholder when no data is available
    - Clear and redraw
    """

    DEFAULT_CSS = """
    ChartPanel {
        background: $surface-darken-1;
        border: solid $accent;
        border-title-align: left;
        overflow-y: auto;
        height: 1fr;
    }
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._plot: "PlotextPlot | None" = None
        self.border_title = "📊 图表"

    def compose(self) -> ComposeResult:
        if HAS_PLOTEXT:
            plot = PlotextPlot()
            self._plot = plot
            # Show placeholder text before first render
            plot.plt.title("图表区域 - AI 分析后自动显示")
            plot.plt.xlabel("")
            plot.plt.ylabel("")
            yield plot
        else:
            yield _PlaceholderChart()

    def render_chart(self, chart_data) -> None:
        """
        Render a chart from ChartData.

        chart_data fields:
            chart_type: "line" | "bar" | "scatter"
            title: str
            data: {labels: [...], datasets: [{label: str, values: [...]}]}
        """
        if not HAS_PLOTEXT or self._plot is None:
            return

        plt = self._plot.plt
        plt.clear_data()
        plt.clear_color()
        plt.title(chart_data.title)

        labels = chart_data.data.get("labels", [])
        datasets = chart_data.data.get("datasets", [])

        if not datasets:
            plt.title(f"{chart_data.title} (无数据)")
            self._plot.refresh()
            return

        chart_type = chart_data.chart_type

        for ds in datasets:
            values = ds.get("values", [])
            label = ds.get("label", "")

            if chart_type == "bar":
                if labels:
                    plt.bar(labels, values, label=label)
                else:
                    plt.bar(values, label=label)
            elif chart_type == "scatter":
                if labels and len(labels) == len(values):
                    try:
                        x_numeric = [float(v) for v in labels]
                        plt.scatter(x_numeric, values, label=label)
                    except (ValueError, TypeError):
                        plt.scatter(list(range(len(values))), values, label=label)
                else:
                    plt.scatter(list(range(len(values))), values, label=label)
            else:
                # Default: line chart
                if labels and len(labels) == len(values):
                    try:
                        x_numeric = [float(v) for v in labels]
                        plt.plot(x_numeric, values, label=label)
                    except (ValueError, TypeError):
                        plt.plot(list(range(len(values))), values, label=label)
                else:
                    plt.plot(list(range(len(values))), values, label=label)

        self._plot.refresh()

    def clear_chart(self) -> None:
        """Reset the chart to placeholder state."""
        if not HAS_PLOTEXT or self._plot is None:
            return
        plt = self._plot.plt
        plt.clear_data()
        plt.clear_color()
        plt.title("图表区域 - AI 分析后自动显示")
        self._plot.refresh()
