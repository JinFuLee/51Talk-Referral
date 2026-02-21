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
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey={regLabel} fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
        <Bar dataKey={paidLabel} fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
        {data.some((d) => d.revenue !== undefined) && (
          <Bar dataKey={revenueLabel} fill="#f59e0b" radius={[3, 3, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
