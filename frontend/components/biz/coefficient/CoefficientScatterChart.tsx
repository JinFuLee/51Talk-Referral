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
  ReferenceLine,
} from "recharts";

interface CoefficientLine {
  cohort: string;
  series: { month: number; value: number }[];
}

const PALETTE = [
  "hsl(var(--chart-4))",
  "hsl(var(--success))",
  "hsl(var(--chart-amber))",
  "hsl(var(--chart-rose))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-pink))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-lime))",
  "hsl(var(--chart-orange))",
];

interface CoefficientScatterChartProps {
  chartData: Record<string, number | string>[];
  lines: CoefficientLine[];
  visibleCohorts: Set<string>;
  goldenMonth: number | null;
}

export default function CoefficientScatterChart({
  chartData,
  lines,
  visibleCohorts,
  goldenMonth,
}: CoefficientScatterChartProps) {
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-destructive">暂无数据</div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => v.toFixed(2)}
        />
        <Tooltip
          formatter={(v: number, name: string) => [v.toFixed(3), name]}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {goldenMonth !== null && (
          <ReferenceLine
            x={`M${goldenMonth}`}
            stroke="hsl(var(--warning))"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{
              value: `黄金M${goldenMonth}`,
              fill: "hsl(var(--warning))",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
        )}
        {lines.map((l, idx) =>
          visibleCohorts.has(l.cohort) ? (
            <Line
              key={l.cohort}
              type="monotone"
              dataKey={l.cohort}
              name={l.cohort}
              stroke={PALETTE[idx % PALETTE.length]}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ) : null
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
