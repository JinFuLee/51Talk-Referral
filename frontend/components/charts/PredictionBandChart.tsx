"use client";

import useSWR from "swr";
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
import { swrFetcher } from "@/lib/api";

/** Shape returned by GET /api/analysis/prediction (adapted by _adapt_prediction) */
interface PredictionApiResponse {
  eom_registrations?: number;
  eom_payments?: number;
  eom_revenue?: number;
  model_used?: string;
  confidence?: number;
  daily_series?: Array<{ date: string; value: number }>;
}

interface PredictionBandChartProps {
  data?: PredictionBand[];
  valueLabel?: string;
}

export function PredictionBandChart({
  data: propData,
  valueLabel = "预测收入",
}: PredictionBandChartProps) {
  const { data: apiData, isLoading, error } = useSWR(
    propData ? null : "/api/analysis/prediction",
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: CHART_HEIGHT.md }}>
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700" style={{ height: CHART_HEIGHT.md }}>
        预测数据加载失败
      </div>
    );
  }

  // Backend returns PredictionApiResponse directly at top level (not nested under .data.forecast)
  const apiResponse = apiData as PredictionApiResponse | undefined;

  // Use prop data if provided, else map daily_series from API response
  let resolvedData: PredictionBand[] = [];
  if (propData && propData.length > 0) {
    resolvedData = propData;
  } else if (apiResponse?.daily_series && apiResponse.daily_series.length > 0) {
    const confidence = apiResponse.confidence ?? 0.1;
    resolvedData = apiResponse.daily_series.map((pt) => ({
      date: pt.date,
      value: pt.value,
      lower: pt.value * (1 - confidence),
      upper: pt.value * (1 + confidence),
    }));
  }

  if (resolvedData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500" style={{ height: CHART_HEIGHT.md }}>
        暂无预测数据（daily_series 为空）
      </div>
    );
  }

  const chartData = resolvedData.map((d) => ({
    date: d.date,
    value: d.value,
    band: [d.lower, d.upper] as [number, number],
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="预测置信区间图">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis tickLine={false} axisLine={false} dataKey="date" tick={{ fontSize: CHART_FONT_SIZE.md }} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: CHART_FONT_SIZE.md }}
          />
          <Tooltip
            formatter={(v: number | number[]) =>
              Array.isArray(v)
                ? [`${v[0].toLocaleString()} – ${v[1].toLocaleString()}`, "置信区间"]
                : [v.toLocaleString(), valueLabel]
            }
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
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
