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
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface DailyKPIChartProps {
  data: DailyKPIPoint[];
}

interface TooltipPayload {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.name)} style={{ color: entry.color }} className="mt-0.5">
          {entry.name}:{" "}
          <span className="font-medium">
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

const COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--success))",
  "hsl(var(--chart-amber))",
  "hsl(var(--destructive))",
];

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

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="日KPI趋势图">
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <filter id="shadow" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.1" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis tickLine={false} axisLine={false} dataKey="date" tick={{ fontSize: CHART_FONT_SIZE.md }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: CHART_FONT_SIZE.md }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
        {metrics.map((m, i) => (
          <Line
            key={m}
            type="monotone"
            dataKey={m}
            name={m}
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
