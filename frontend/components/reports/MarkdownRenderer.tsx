"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// Charts removed in refactor — inline Recharts used in pages directly
// TrendLineChart, PieChart, FunnelChart stubs for report rendering
const TrendLineChart = (_props: Record<string, unknown>) => null;
const PieChart = (_props: Record<string, unknown>) => null;
const FunnelChart = (_props: Record<string, unknown>) => null;
type FunnelStage = { name: string; value: number };

// ── Mermaid parsers ───────────────────────────────────────────────────────────

/**
 * Parse xychart-beta blocks.
 * Supports:
 *   x-axis ["label1", "label2", ...]
 *   bar [val1, val2, ...]
 *   line [val1, val2, ...]
 */
function parseXyChart(body: string): {
  labels: string[];
  bars: { key: string; values: number[] }[];
  lines: { key: string; values: number[] }[];
  title: string;
} {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  let labels: string[] = [];
  const bars: { key: string; values: number[] }[] = [];
  const lineData: { key: string; values: number[] }[] = [];
  let title = "";
  let barIdx = 0;
  let lineIdx = 0;

  for (const line of lines) {
    if (line.startsWith("title ")) {
      title = line.slice(6).replace(/^"|"$/g, "");
    } else if (line.startsWith("x-axis")) {
      const match = line.match(/\[(.+)\]/);
      if (match) {
        labels = match[1].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      }
    } else if (line.startsWith("bar")) {
      const match = line.match(/\[(.+)\]/);
      if (match) {
        const values = match[1].split(",").map((s) => parseFloat(s.trim()));
        bars.push({ key: `柱${barIdx > 0 ? barIdx + 1 : ""}`, values });
        barIdx++;
      }
    } else if (line.startsWith("line")) {
      const match = line.match(/\[(.+)\]/);
      if (match) {
        const values = match[1].split(",").map((s) => parseFloat(s.trim()));
        lineData.push({ key: lineIdx === 0 ? "基准线" : `折线${lineIdx + 1}`, values });
        lineIdx++;
      }
    }
  }

  return { labels, bars, lines: lineData, title };
}

function xyChartToProps(body: string) {
  const { labels, bars, lines, title } = parseXyChart(body);

  const data = labels.map((label, i) => {
    const point: Record<string, string | number> = { label };
    bars.forEach((b) => { point[b.key] = b.values[i] ?? 0; });
    lines.forEach((l) => { point[l.key] = l.values[i] ?? 0; });
    return point;
  });

  return {
    data,
    xKey: "label",
    yKey: bars[0]?.key ?? lines[0]?.key ?? "value",
    title: title || undefined,
    barKeys: bars.map((b) => b.key),
    lineKeys: lines.map((l) => l.key),
  };
}

/**
 * Parse pie blocks.
 * Format:
 *   pie title "Some Title"
 *   "Label" : 123
 */
function parsePieChart(body: string): { data: { name: string; value: number }[]; title: string } {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const data: { name: string; value: number }[] = [];
  let title = "";

  for (const line of lines) {
    const titleMatch = line.match(/^(?:pie\s+)?title\s+"?(.+?)"?\s*$/);
    if (titleMatch) {
      title = titleMatch[1];
      continue;
    }
    const dataMatch = line.match(/^"(.+?)"\s*:\s*([\d.]+)/);
    if (dataMatch) {
      data.push({ name: dataMatch[1], value: parseFloat(dataMatch[2]) });
    }
  }

  return { data, title };
}

/**
 * Parse flowchart / graph blocks → FunnelStage[]
 * Extracts node labels with their values from "[Label N]" syntax.
 */
function parseFlowchart(body: string): FunnelStage[] {
  const stages: FunnelStage[] = [];
  const nodePattern = /\["?(.+?)\s+(\d+)"?\]/g;
  let match;

  while ((match = nodePattern.exec(body)) !== null) {
    stages.push({ name: match[1], value: parseInt(match[2], 10) });
  }

  // Fallback: bracket labels without numbers
  if (stages.length === 0) {
    const labelPattern = /\["?([^"\]]+)"?\]/g;
    while ((match = labelPattern.exec(body)) !== null) {
      stages.push({ name: match[1], value: 0 });
    }
  }

  return stages;
}

// ── Code block renderer ───────────────────────────────────────────────────────

interface CodeProps {
  className?: string;
  children?: React.ReactNode;
}

function MermaidBlock({ body }: { body: string }) {
  const trimmed = body.trim();

  if (trimmed.startsWith("xychart-beta")) {
    const props = xyChartToProps(trimmed);
    return (
      <div className="my-4 p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-border/40 shadow-flash transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1">
        <TrendLineChart {...props} />
      </div>
    );
  }

  if (trimmed.startsWith("pie")) {
    const { data, title } = parsePieChart(trimmed);
    return (
      <div className="my-4 p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-border/40 shadow-flash transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1">
        <PieChart data={data} title={title || undefined} />
      </div>
    );
  }

  if (trimmed.startsWith("flowchart") || trimmed.startsWith("graph")) {
    const stages = parseFlowchart(trimmed);
    return (
      <div className="my-4 p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-border/40 shadow-flash transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1">
        <FunnelChart stages={stages} />
      </div>
    );
  }

  // Unknown mermaid — render as code
  return (
    <pre className="my-4 p-4 bg-gray-100 rounded-lg overflow-x-auto text-xs text-gray-700">
      <code>{body}</code>
    </pre>
  );
}

function CodeRenderer({ className, children }: CodeProps) {
  const lang = className?.replace("language-", "") ?? "";
  const raw = String(children ?? "").replace(/\n$/, "");

  if (lang === "mermaid") {
    return <MermaidBlock body={raw} />;
  }

  return (
    <pre className="my-3 p-4 bg-gray-900 rounded-lg overflow-x-auto">
      <code className={`text-xs text-gray-100 ${className ?? ""}`}>{raw}</code>
    </pre>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeRenderer as React.ComponentType<React.HTMLAttributes<HTMLElement>>,
          // Style tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm border-collapse border border-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 px-3 py-2 text-sm text-gray-700">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-gray-50">{children}</tr>
          ),
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-gray-800 mt-5 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-700 mt-4 mb-2">
              {children}
            </h3>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 pl-4 my-3 text-gray-600 italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
