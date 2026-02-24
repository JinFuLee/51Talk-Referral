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

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: DotPayload;
  activeCc?: string | null;
}

const CustomDot = ({ cx = 0, cy = 0, payload, activeCc }: CustomDotProps) => {
  if (!payload) return null;
  const isHovered = activeCc === payload.cc_name;
  const isDimmed = activeCc !== null && !isHovered;

  return (
    <g className="transition-all duration-300 ease-out origin-center">
      <circle
        cx={cx}
        cy={cy}
        r={isHovered ? 12 : 6}
        fill="hsl(var(--chart-4))"
        fillOpacity={isDimmed ? 0.15 : (isHovered ? 1 : 0.75)}
        stroke={isDimmed ? "transparent" : "hsl(var(--background))"}
        strokeWidth={isHovered ? 2 : 1.5}
        className="transition-all duration-300 ease-out cursor-pointer"
        style={{ filter: isHovered ? "drop-shadow(0px 4px 8px rgba(0,0,0,0.4))" : "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))" }}
      />
    </g>
  );
};

// ── Component ────────────────────────────────────────────────────────────────

export function PrePostCompareChart({ data, isLoading, error }: PrePostCompareChartProps) {
  const [channelTab, setChannelTab] = useState<string>("全部");
  const [activeCc, setActiveCc] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
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
            aria-pressed={channelTab === ch}
            className={`px-3 py-1 text-xs rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              channelTab === ch
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="metric"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false} />
            <YAxis unit="%"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]} />
            <Tooltip
              formatter={(value: number) => [`${value}%`]}
              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="课前" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} maxBarSize={40} />
            <Bar dataKey="课后" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* CC scatter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden group">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 block">CC 个人级：课前有效率 vs 课后有效率（%）</h3>
        
        {/* 微光背景修饰 */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-purple-500/5 to-indigo-500/5 blur-3xl pointer-events-none" />

        {scatterData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart 
              margin={{ top: 12, right: 12, bottom: 20, left: 0 }}
              onMouseLeave={() => setActiveCc(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis type="number"
                dataKey="x"
                name="课前有效率"
                unit="%"
                domain={[0, maxPct]}
                label={{ value: "课前有效率 (%)", position: "insideBottom", offset: -10, fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false} />
              <YAxis type="number"
                dataKey="y"
                name="课后有效率"
                unit="%"
                domain={[0, maxPct]}
                label={{ value: "课后有效率 (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as DotPayload;
                  return (
                    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl p-3 text-sm min-w-[160px] z-50">
                      <p className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                        {d.cc_name ?? "CC"}
                      </p>
                      <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors">
                          <span>课前有效率:</span>
                          <span className="font-medium text-slate-900 dark:text-white">{d.x}%</span>
                        </div>
                        <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1 -mx-1 transition-colors">
                          <span>课后有效率:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{d.y}%</span>
                        </div>
                      </div>
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
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                opacity={0.6}
                label={{ value: "1:1 平衡线", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Scatter 
                data={scatterData} 
                onMouseEnter={(e) => {
                  if (e?.payload) setActiveCc((e.payload as DotPayload).cc_name ?? null);
                }}
                shape={(props: any) => <CustomDot {...props} activeCc={activeCc} />} 
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            暂无 CC 个人级数据
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400 italic">
          <p className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            鼠标悬浮呈现探索视角。对角线上方 = 课后有效率高；下方 = 课前有效率高。
          </p>
        </div>
      </div>
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
                {data.by_cc.map((row) => (
                  <tr key={row.cc_name ?? row.channel} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{row.cc_name ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{row.channel ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{row.team ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{pct(row.pre_call_rate)}%</td>
                    <td className="px-3 py-2 text-slate-600">{pct(row.pre_connect_rate)}%</td>
                    <td className="px-3 py-2 font-semibold text-primary">{pct(row.pre_effective_rate)}%</td>
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
