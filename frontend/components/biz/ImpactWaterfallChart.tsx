"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { ImpactChainData, ImpactChainItem } from "@/lib/types";
import { formatRevenue } from "@/lib/utils";

interface ImpactWaterfallChartProps {
  data: ImpactChainData;
}

function getBarColor(lostUsd: number): string {
  if (lostUsd > 10000) return "hsl(var(--destructive))"; // red
  if (lostUsd > 5000) return "hsl(var(--chart-orange))";  // orange
  return "#eab308";                       // yellow
}

function formatUSDShort(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toFixed(0)}`;
}

interface ChartItem {
  label: string;
  metric: string;
  lost_usd: number;
  isTotal: boolean;
  chain?: ImpactChainItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartItem }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{item.label}</p>
      <p className="text-slate-600">
        损失: <span className="font-medium text-destructive">{formatRevenue(item.lost_usd)}</span>
      </p>
      {item.chain && (
        <div className="mt-2 border-t border-slate-100 pt-2 space-y-1">
          <p className="text-slate-500">当前 {(item.chain.actual * 100).toFixed(1)}% · 目标 {(item.chain.target * 100).toFixed(1)}% · 缺口 {(item.chain.gap * 100).toFixed(1)}%</p>
          {item.chain.impact_steps.map((step) => (
            <p key={step.label} className="text-slate-500">
              {step.label}: <span className="text-slate-700">{step.value > 1 ? step.value.toFixed(0) : (step.value * 100).toFixed(1) + "%"}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImpactWaterfallChart({ data }: ImpactWaterfallChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const chartData: ChartItem[] = data.chains.map((chain) => {
    // Prefer lost_revenue_usd step, then top-level field, then default 0
    const stepValue = chain.impact_steps.find((s) => s.step === "lost_revenue_usd")?.value;
    const lostUsd = stepValue ?? chain.lost_revenue_usd ?? 0;
    return {
      label: chain.label,
      metric: chain.metric,
      lost_usd: Math.abs(lostUsd),
      isTotal: false,
      chain,
    };
  });

  // Add total bar
  chartData.push({
    label: "总损失",
    metric: "_total",
    lost_usd: data.total_lost_revenue_usd,
    isTotal: true,
  });

  const selectedChain = data.chains.find((c) => c.metric === selectedMetric);

  return (
    <div>
      {/* Chart — horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 480 }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 24, right: 16, left: 8, bottom: 4 }}
              onClick={(e) => {
                if (e?.activePayload?.[0]) {
                  const item = e.activePayload[0].payload as ChartItem;
                  if (!item.isTotal) {
                    setSelectedMetric((prev) => (prev === item.metric ? null : item.metric));
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false} />
              <YAxis tickFormatter={formatUSDShort}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="lost_usd" radius={[4, 4, 0, 0]} cursor="pointer">
                <LabelList
                  dataKey="lost_usd"
                  position="top"
                  formatter={formatUSDShort}
                  style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                {chartData.map((entry) => (
                  <Cell
                    key={entry.metric}
                    fill={
                      entry.isTotal
                        ? "hsl(var(--muted-foreground))"
                        : entry.metric === selectedMetric
                        ? "hsl(var(--primary))"
                        : getBarColor(entry.lost_usd)
                    }
                    opacity={selectedMetric && entry.metric !== selectedMetric && !entry.isTotal ? 0.5 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-destructive" /> &gt;$10k 高损失</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-orange-500" /> $5k–$10k 中损失</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-500" /> &lt;=$5k 低损失</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-slate-400" /> 总损失</span>
      </div>
      <p className="text-xs text-slate-400 mt-1">点击柱子查看详情</p>

      {/* Detail panel for selected metric */}
      {selectedChain && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">{selectedChain.label} — 影响分解</p>
            <button
              onClick={() => setSelectedMetric(null)}
              aria-label="关闭详情面板"
              className="text-xs text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              关闭 ×
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs mb-3">
            <div className="bg-white rounded p-2 border border-slate-100">
              <p className="text-slate-400">当前值</p>
              <p className="font-semibold text-slate-700 text-base mt-0.5">{(selectedChain.actual * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded p-2 border border-slate-100">
              <p className="text-slate-400">目标值</p>
              <p className="font-semibold text-slate-700 text-base mt-0.5">{(selectedChain.target * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded p-2 border border-red-100">
              <p className="text-slate-400">缺口</p>
              <p className="font-semibold text-destructive text-base mt-0.5">{(selectedChain.gap * 100).toFixed(1)}%</p>
            </div>
          </div>
          {selectedChain.impact_steps.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-medium">影响路径</p>
              {selectedChain.impact_steps.map((step) => (
                <div key={step.label} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-600">{step.label}</span>
                  <span className="font-medium text-slate-700">
                    {step.value > 1 ? step.value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : `${(step.value * 100).toFixed(1)}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
