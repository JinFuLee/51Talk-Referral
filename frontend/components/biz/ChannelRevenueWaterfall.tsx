"use client";

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
import { formatRevenue } from "@/lib/utils";

export interface ChannelRevenueItem {
  channel: string;
  revenue_usd: number;
  revenue_thb: number;
  percentage: number;
}

interface ChannelRevenueWaterfallProps {
  channels: ChannelRevenueItem[];
  total_usd: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  转介绍: "#3b82f6",
  市场: "#10b981",
  宽口径: "#f59e0b",
  "cc窄口径": "#8b5cf6",
  "ss窄口径": "#06b6d4",
  "lp窄口径": "#f97316",
};

function getChannelColor(channel: string, idx: number): string {
  const key = channel.toLowerCase();
  for (const [k, color] of Object.entries(CHANNEL_COLORS)) {
    if (key.includes(k.toLowerCase())) return color;
  }
  const fallbacks = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];
  return fallbacks[idx % fallbacks.length];
}

function formatUSDShort(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toFixed(0)}`;
}

interface ChartDataItem {
  label: string;
  channel: string;
  revenue_usd: number;
  percentage: number;
  isTotal: boolean;
  colorIdx: number;
}

interface TooltipPayloadEntry {
  payload: ChartDataItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{item.label}</p>
      <p className="text-slate-600">
        收入:{" "}
        <span className="font-medium text-blue-600">
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

  // Build chart data: individual channels + total bar at start
  const chartData: ChartDataItem[] = [
    {
      label: "总收入",
      channel: "_total",
      revenue_usd: total_usd,
      percentage: 100,
      isTotal: true,
      colorIdx: -1,
    },
    ...channels.map((ch, idx) => ({
      label: ch.channel,
      channel: ch.channel,
      revenue_usd: ch.revenue_usd,
      percentage: ch.percentage,
      isTotal: false,
      colorIdx: idx,
    })),
  ];

  return (
    <div>
      {/* Summary */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-bold text-slate-800">
          {formatRevenue(total_usd)}
        </span>
        <span className="text-xs text-slate-400">
          渠道总收入 · {channels.length} 个渠道
        </span>
      </div>

      {/* Waterfall bar chart */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(320, (channels.length + 1) * 80) }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={chartData}
              margin={{ top: 24, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatUSDShort}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue_usd" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="revenue_usd"
                  position="top"
                  formatter={formatUSDShort}
                  style={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                />
                {chartData.map((entry) => (
                  <Cell
                    key={entry.channel}
                    fill={
                      entry.isTotal
                        ? "#94a3b8"
                        : getChannelColor(entry.channel, entry.colorIdx)
                    }
                    opacity={entry.isTotal ? 0.7 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel table */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-3 gap-x-2 text-xs text-slate-400 font-medium mb-1.5 px-1">
          <span>渠道</span>
          <span className="text-right">收入 (USD · THB)</span>
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
                  style={{
                    backgroundColor: getChannelColor(ch.channel, idx),
                  }}
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
