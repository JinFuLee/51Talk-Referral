"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

export interface ChannelRevenueEntry {
  channel: string;
  revenue_usd: number;
  revenue_thb: number;
  percentage: number;
}

interface ChannelRevenueWaterfallProps {
  channels: ChannelRevenueEntry[];
  total_usd: number;
}

const CHANNEL_COLOR_MAP: Record<string, string> = {
  转介绍: "hsl(var(--chart-4))",   // indigo-500
  市场: "hsl(var(--success))",     // emerald-500
  宽口径: "#f59e0b",   // amber-500
  cc窄口径: "#f43f5e", // rose-500
  ss窄口径: "#0ea5e9", // sky-500
  lp窄口径: "hsl(var(--chart-4))", // violet-500
};

const FALLBACK_COLORS = [
  "hsl(var(--chart-4))", "hsl(var(--success))", "#f59e0b", "#f43f5e", "#0ea5e9", "hsl(var(--chart-4))", "#f97316",
];

function getColor(channel: string, idx: number): string {
  const lower = channel.toLowerCase();
  for (const [key, color] of Object.entries(CHANNEL_COLOR_MAP)) {
    if (lower.includes(key.toLowerCase())) return color;
  }
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function formatUSDShort(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toFixed(0)}`;
}

interface ChartRow {
  label: string;
  revenue_usd: number;
  percentage: number;
  isTotal: boolean;
  colorIdx: number;
}

interface TooltipPayloadEntry {
  payload: ChartRow;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{item.label}</p>
      <p className="text-slate-600">
        收入:{" "}
        <span className="font-medium text-indigo-600">
          {formatRevenue(item.revenue_usd)}
        </span>
      </p>
      {!item.isTotal && (
        <p className="text-slate-500 mt-0.5">
          占比: <span className="font-medium">{item.percentage.toFixed(1)}%</span>
        </p>
      )}
    </div>
  );
}

export function ChannelRevenueWaterfall({
  channels,
  total_usd,
}: ChannelRevenueWaterfallProps) {
  if (!channels.length) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-slate-400">
        暂无渠道收入数据
      </div>
    );
  }

  const chartData: ChartRow[] = [
    {
      label: "合计",
      revenue_usd: total_usd,
      percentage: 100,
      isTotal: true,
      colorIdx: -1,
    },
    ...channels.map((ch, idx) => ({
      label: ch.channel,
      revenue_usd: ch.revenue_usd,
      percentage: ch.percentage,
      isTotal: false,
      colorIdx: idx,
    })),
  ];

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-bold text-slate-800">
          {formatRevenue(total_usd)}
        </span>
        <span className="text-xs text-slate-400">
          渠道总收入 · {channels.length} 个渠道
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(320, (channels.length + 1) * 90) }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 28, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatUSDShort}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue_usd" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="revenue_usd"
                  position="top"
                  formatter={formatUSDShort}
                  style={{ fontSize: 10, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                {chartData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={
                      entry.isTotal
                        ? "hsl(var(--muted-foreground))"
                        : getColor(entry.label, entry.colorIdx)
                    }
                    opacity={entry.isTotal ? 0.65 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel detail table */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-3 gap-x-2 text-xs text-slate-400 font-medium mb-1.5 px-1">
          <span>渠道</span>
          <span className="text-right">收入</span>
          <span className="text-right">占比</span>
        </div>
        <div className="space-y-1">
          {channels.map((ch, idx) => (
            <div
              key={idx}
              className="grid grid-cols-3 gap-x-2 text-xs px-1 py-0.5 rounded hover:bg-slate-50"
            >
              <span className="flex items-center gap-1.5 truncate text-slate-600">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColor(ch.channel, idx) }}
                />
                {ch.channel}
              </span>
              <span className="text-right font-medium text-slate-700">
                {formatRevenue(ch.revenue_usd)}
              </span>
              <span className="text-right text-slate-500">
                {ch.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
