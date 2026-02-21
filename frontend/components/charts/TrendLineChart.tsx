"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Label,
} from "recharts";
import type { TrendPeakValley } from "@/lib/types";

interface TrendDataPoint {
  [key: string]: string | number | undefined;
}

type TrendRawInput =
  | TrendDataPoint[]
  | Array<Record<string, unknown>>
  | Record<string, unknown>
  | { series: Array<Record<string, unknown>> }
  | undefined;

interface TrendLineChartProps {
  /** Array of data points (preferred) */
  data?: TrendRawInput;
  xKey?: string;
  yKey?: string;
  title?: string;
  targetValue?: number;
  barKeys?: string[];
  lineKeys?: string[];
  peak?: TrendPeakValley;
  valley?: TrendPeakValley;
}

/** Normalise raw API TrendData (has .series[]) or TrendPoint[] into a flat array */
function normaliseData(raw: TrendRawInput): TrendDataPoint[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const out: TrendDataPoint = {};
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === "string" || typeof v === "number" || v === undefined) {
          out[k] = v;
        } else {
          out[k] = String(v);
        }
      }
      return out;
    });
  }
  // Backend TrendData shape: { series: [...] }
  const maybeObj = raw as Record<string, unknown>;
  if (Array.isArray(maybeObj.series)) {
    return normaliseData(maybeObj.series as Array<Record<string, unknown>>);
  }
  return [];
}

export function TrendLineChart({
  data: rawData,
  xKey = "date",
  yKey = "payments",
  title,
  targetValue,
  barKeys = [],
  lineKeys,
  peak,
  valley,
}: TrendLineChartProps) {
  const data = normaliseData(rawData);
  const resolvedLineKeys = lineKeys ?? [yKey];

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="colorBar0" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="colorBar1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id="colorBar2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {targetValue !== undefined && (
            <ReferenceLine
              y={targetValue}
              stroke="hsl(var(--destructive))"
              strokeDasharray="4 4"
              label={{ value: "目标", fill: "hsl(var(--destructive))", fontSize: 11 }}
            />
          )}

          {barKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`url(#colorBar${i % 3})`}
              radius={[4, 4, 0, 0]}
            />
          ))}

          {resolvedLineKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={["hsl(var(--destructive))", "hsl(var(--chart-4))", "hsl(var(--chart-1))"][i % 3]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}

          {peak && (
            <ReferenceDot x={peak.date} y={peak.value} r={6} fill="hsl(var(--success))" stroke="hsl(var(--background))" strokeWidth={2}>
              <Label value={`峰值: ${peak.value}`} position="top" fontSize={11} fill="hsl(var(--success))" />
            </ReferenceDot>
          )}

          {valley && (
            <ReferenceDot x={valley.date} y={valley.value} r={6} fill="hsl(var(--destructive))" stroke="hsl(var(--background))" strokeWidth={2}>
              <Label value={`谷底: ${valley.value}`} position="bottom" fontSize={11} fill="hsl(var(--destructive))" />
            </ReferenceDot>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
