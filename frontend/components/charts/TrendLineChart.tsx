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
} from "recharts";

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
}: TrendLineChartProps) {
  const data = normaliseData(rawData);
  const resolvedLineKeys = lineKeys ?? [yKey];

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {targetValue !== undefined && (
            <ReferenceLine
              y={targetValue}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: "目标", fill: "#ef4444", fontSize: 11 }}
            />
          )}

          {barKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={["#3b82f6", "#10b981", "#f59e0b"][i % 3]}
              radius={[3, 3, 0, 0]}
              opacity={0.8}
            />
          ))}

          {resolvedLineKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={["#ef4444", "#8b5cf6", "#06b6d4"][i % 3]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
