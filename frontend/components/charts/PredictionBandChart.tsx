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
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

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
  data,
  valueLabel = "预测收入",
}: PredictionBandChartProps) {
  const isMock = !data || data.length === 0;
  const resolvedData = isMock ? MOCK_DATA : data;

  // Recharts Area for confidence band: encode as [lower, upper]
  const chartData = resolvedData.map((d) => ({
    date: d.date,
    value: d.value,
    band: [d.lower, d.upper] as [number, number],
  }));

  return (
    <div>
      {isMock && (
        <div className="text-xs text-amber-500 text-center mb-1 font-medium">
          演示数据，非实际预测
        </div>
      )}
    <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="预测置信区间图">
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: CHART_FONT_SIZE.md }} />
        <YAxis
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: CHART_FONT_SIZE.md }}
        />
        <Tooltip
          formatter={(v: number | number[]) =>
            Array.isArray(v)
              ? [`${v[0].toLocaleString()} – ${v[1].toLocaleString()}`, "置信区间"]
              : [v.toLocaleString(), valueLabel]
          }
        />
        <Legend wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
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
    </div>
  );
}
