"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

// ── Types ───────────────────────────────────────────────────────────────────

interface CCRecord {
  channel?: string;
  team?: string;
  cc_name?: string;
  trial_classes?: number;
  attended?: number;
  pre_call_rate?: number;
  pre_connect_rate?: number;
  pre_effective_rate?: number;
  post_call_rate?: number;
  post_connect_rate?: number;
  post_effective_rate?: number;
  pre_called?: number;
  pre_connected?: number;
  post_called?: number;
  post_connected?: number;
}

interface ChannelSummary {
  pre_call_rate?: number;
  pre_connect_rate?: number;
  pre_effective_rate?: number;
  post_call_rate?: number;
  post_connect_rate?: number;
  post_effective_rate?: number;
}

interface CompareData {
  by_cc: CCRecord[];
  by_team: CCRecord[];
  by_channel: Record<string, ChannelSummary>;
  summary: ChannelSummary;
}

interface PrePostCompareChartProps {
  data: CompareData | null;
  isLoading: boolean;
  error: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const METRICS = [
  { key: "call_rate", label: "拨打率", preKey: "pre_call_rate", postKey: "post_call_rate" },
  { key: "connect_rate", label: "接通率", preKey: "pre_connect_rate", postKey: "post_connect_rate" },
  { key: "effective_rate", label: "有效接通率", preKey: "pre_effective_rate", postKey: "post_effective_rate" },
];

const CHANNELS = ["全部", "市场", "转介绍"];

function pct(v: number | undefined): number {
  return Math.round((v ?? 0) * 1000) / 10;
}

function buildGroupedData(
  source: ChannelSummary | Record<string, ChannelSummary>,
  channelTab: string
): Array<{ metric: string; 课前: number; 课后: number }> {
  let record: ChannelSummary;
  if (channelTab === "全部") {
    record = source as ChannelSummary;
  } else {
    record = (source as Record<string, ChannelSummary>)[channelTab] ?? {};
  }
  return METRICS.map((m) => ({
    metric: m.label,
    课前: pct(record[m.preKey as keyof ChannelSummary]),
    课后: pct(record[m.postKey as keyof ChannelSummary]),
  }));
}

// ── Scatter dot ──────────────────────────────────────────────────────────────

interface DotPayload {
  cc_name?: string;
  x: number;
  y: number;
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: DotPayload }) => {
  const { cx = 0, cy = 0, payload } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#6366f1" fillOpacity={0.7} stroke="#fff" strokeWidth={1} />
      {payload?.cc_name && (
        <text x={cx + 7} y={cy + 4} fontSize={9} fill="#64748b">
          {payload.cc_name}
        </text>
      )}
    </g>
  );
};

// ── Component ────────────────────────────────────────────────────────────────

export function PrePostCompareChart({ data, isLoading, error }: PrePostCompareChartProps) {
  const [channelTab, setChannelTab] = useState<string>("全部");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        数据加载失败: {error}。请先运行分析后刷新。
      </div>
    );
  }

  if (!data) return null;

  // Grouped bar data
  const summarySource = channelTab === "全部" ? data.summary : data.by_channel;
  const groupedData = buildGroupedData(summarySource, channelTab);

  // Scatter: CC 个人级 — pre_effective_rate vs post_effective_rate
  const scatterData = (data.by_cc ?? [])
    .filter((r) => r.pre_effective_rate != null && r.post_effective_rate != null)
    .map((r) => ({
      x: pct(r.pre_effective_rate),
      y: pct(r.post_effective_rate),
      cc_name: r.cc_name,
    }));

  const maxPct = Math.max(100, ...scatterData.map((d) => Math.max(d.x, d.y)));

  return (
    <div className="space-y-4">
      {/* Channel tabs */}
      <div className="flex gap-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setChannelTab(ch)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              channelTab === ch
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Grouped bar chart */}
      <Card title="课前 vs 课后跟进效率对比（%）">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={groupedData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              unit="%"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="课前" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={40} />
            <Bar dataKey="课后" fill="#818cf8" radius={[3, 3, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* CC scatter */}
      <Card title="CC 个人级：课前有效率 vs 课后有效率（%）">
        {scatterData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 12, right: 12, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                dataKey="x"
                name="课前有效率"
                unit="%"
                domain={[0, maxPct]}
                label={{ value: "课前有效率 (%)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#94a3b8" }}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="课后有效率"
                unit="%"
                domain={[0, maxPct]}
                label={{ value: "课后有效率 (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#94a3b8" }}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as DotPayload;
                  return (
                    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 space-y-1">
                      <p className="font-semibold">{d.cc_name ?? "CC"}</p>
                      <p>课前有效率: {d.x}%</p>
                      <p>课后有效率: {d.y}%</p>
                    </div>
                  );
                }}
              />
              {/* 45° reference line (y = x) */}
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: maxPct, y: maxPct },
                ]}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                label={{ value: "1:1", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
              />
              <Scatter data={scatterData} shape={<CustomDot />} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            暂无 CC 个人级数据
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">
          对角线上方 = 课后有效率高于课前；对角线下方 = 课前有效率高于课后
        </p>
      </Card>

      {/* CC detail table */}
      <Card title="CC 详细数据">
        {data.by_cc.length > 0 ? (
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  {["CC", "渠道", "团队", "课前拨打率", "课前接通率", "课前有效率", "课后拨打率", "课后接通率", "课后有效率"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.by_cc.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{row.cc_name ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{row.channel ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{row.team ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{pct(row.pre_call_rate)}%</td>
                    <td className="px-3 py-2 text-slate-600">{pct(row.pre_connect_rate)}%</td>
                    <td className="px-3 py-2 font-semibold text-indigo-600">{pct(row.pre_effective_rate)}%</td>
                    <td className="px-3 py-2 text-slate-600">{pct(row.post_call_rate)}%</td>
                    <td className="px-3 py-2 text-slate-600">{pct(row.post_connect_rate)}%</td>
                    <td className="px-3 py-2 font-semibold text-purple-600">{pct(row.post_effective_rate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-sm">暂无数据</div>
        )}
      </Card>
    </div>
  );
}
