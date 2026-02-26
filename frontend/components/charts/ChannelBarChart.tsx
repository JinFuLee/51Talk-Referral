"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";
import type { ChannelComparisonData } from "@/lib/types";

interface ChannelBarChartProps {
  data: ChannelComparisonData;
}

interface ChannelStat {
  channel: string;
  label?: string;
  registrations: number;
  payments: number;
  revenue_usd?: number;
  conversion_rate?: number;
}

function extractChannels(data: ChannelComparisonData): ChannelStat[] {
  if (Array.isArray(data.channels)) return data.channels;
  return [];
}

export function ChannelBarChart({ data }: ChannelBarChartProps) {
  const stats = extractChannels(data).map((s) => ({
    name: s.label ?? s.channel,
    注册: s.registrations,
    付费: s.payments,
    收入USD: s.revenue_usd ?? 0,
  }));

  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        暂无渠道数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="渠道注册付费对比">
      <BarChart data={stats} margin={{ top: 8, right: 40, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis tickLine={false} axisLine={false} dataKey="name" tick={{ fontSize: CHART_FONT_SIZE.md }} />
        {/* Left Y axis for counts */}
        <YAxis tickLine={false} axisLine={false} yAxisId="left"
          tick={{ fontSize: CHART_FONT_SIZE.md }}
          label={{ value: "人数", angle: -90, position: "insideLeft", fontSize: CHART_FONT_SIZE.sm }} />
        {/* Right Y axis for revenue */}
        <YAxis tickLine={false} axisLine={false} yAxisId="right"
          orientation="right"
          tick={{ fontSize: CHART_FONT_SIZE.md }}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          label={{ value: "收入($)", angle: 90, position: "insideRight", fontSize: CHART_FONT_SIZE.sm }}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === "收入USD") return [`$${value.toLocaleString()}`, name];
            return [value.toLocaleString(), name];
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
        <Bar yAxisId="left" dataKey="注册" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="付费" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="收入USD" fill="hsl(var(--chart-amber))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
