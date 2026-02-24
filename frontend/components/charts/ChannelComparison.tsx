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
import { ChannelStat } from "@/lib/types";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface ChannelComparisonProps {
  data: ChannelStat[];
  lang?: "zh" | "th";
}

export function ChannelComparison({ data, lang = "zh" }: ChannelComparisonProps) {
  const regLabel = lang === "zh" ? "注册" : "ลงทะเบียน";
  const paidLabel = lang === "zh" ? "付费" : "ชำระ";
  const revenueLabel = lang === "zh" ? "金额" : "ยอด";

  const chartData = data.map((d) => ({
    name: d.label,
    [regLabel]: d.registrations,
    [paidLabel]: d.payments,
    ...(d.revenue !== undefined ? { [revenueLabel]: Math.round(d.revenue) } : {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="渠道对比柱状图">
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis tickLine={false} axisLine={false} dataKey="name" tick={{ fontSize: CHART_FONT_SIZE.md }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: CHART_FONT_SIZE.md }} />
        <Tooltip />
        <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
        <Bar dataKey={regLabel} fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
        <Bar dataKey={paidLabel} fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
        {data.some((d) => d.revenue !== undefined) && (
          <Bar dataKey={revenueLabel} fill="hsl(var(--chart-amber))" radius={[3, 3, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
