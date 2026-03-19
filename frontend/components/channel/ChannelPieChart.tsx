"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

interface ChannelPieEntry {
  channel: string;
  revenue_usd: number;
}

interface ChannelPieChartProps {
  channels: ChannelPieEntry[];
  height?: number;
}

const CHANNEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export function ChannelPieChart({ channels, height = 240 }: ChannelPieChartProps) {
  if (channels.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">暂无渠道数据</p>
    );
  }

  const pieData = channels.map((c) => ({
    name: c.channel,
    value: c.revenue_usd,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={85}
          innerRadius={45}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {pieData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(val: number) => [formatRevenue(val), "业绩"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 12, color: "#475569" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
