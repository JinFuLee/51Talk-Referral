"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyKPIPoint } from "@/lib/types";

interface DailyKPIChartProps {
  data: DailyKPIPoint[];
}

export function DailyKPIChart({ data }: DailyKPIChartProps) {
  // Group by metric into a date-keyed map
  const metrics = Array.from(new Set(data.map((d) => d.metric)));
  const byDate: Record<string, Record<string, unknown>> = {};
  for (const pt of data) {
    if (!byDate[pt.date]) byDate[pt.date] = { date: pt.date };
    byDate[pt.date][pt.metric] = pt.value;
  }
  const chartData = Object.values(byDate).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  const COLORS = ["hsl(var(--chart-2))", "hsl(var(--success))", "#f59e0b", "hsl(var(--destructive))"];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <filter id="shadow" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.1" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {metrics.map((m, i) => (
          <Line
            key={m}
            type="monotone"
            dataKey={m}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
