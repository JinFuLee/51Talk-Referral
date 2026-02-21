"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PredictionBand } from "@/lib/types/analysis";

interface PredictionBandChartProps {
  data?: PredictionBand[];
  valueLabel?: string;
}

const MOCK_DATA: PredictionBand[] = Array.from({ length: 20 }, (_, i) => {
  const base = 400000 + i * 18000;
  const spread = 40000 + i * 2500;
  return {
    date: `2/${i + 1}`,
    value: base,
    lower: base - spread,
    upper: base + spread,
  };
});

export function PredictionBandChart({
  data = MOCK_DATA,
  valueLabel = "预测收入",
}: PredictionBandChartProps) {
  // Recharts Area for confidence band: encode as [lower, upper]
  const chartData = data.map((d) => ({
    date: d.date,
    value: d.value,
    band: [d.lower, d.upper] as [number, number],
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(v: number | number[]) =>
            Array.isArray(v)
              ? [`${v[0].toLocaleString()} – ${v[1].toLocaleString()}`, "置信区间"]
              : [v.toLocaleString(), valueLabel]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="band"
          fill="hsl(var(--chart-4))"
          fillOpacity={0.12}
          stroke="none"
          name="置信区间"
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--chart-4))"
          strokeWidth={2.5}
          dot={false}
          name={valueLabel}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
