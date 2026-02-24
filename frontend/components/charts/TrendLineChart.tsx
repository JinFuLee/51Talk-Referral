"use client";

import { useMemo, memo } from "react";
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
import { ResponsiveChartContainer } from "@/components/ui/ResponsiveChartContainer";
import type { TrendPeakValley } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

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
  compareData?: TrendRawInput;
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

const CustomTooltip = ({ active, payload, label, lineKeys }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-sm">
        <p className="font-medium text-slate-800 mb-2">{label}</p>
        <div className="space-y-1.5">
          {lineKeys.map((key: string) => {
            const primaryItem = payload.find((p: any) => p.dataKey === key);
            const compareItem = payload.find((p: any) => p.dataKey === `compare_${key}`);
            
            if (!primaryItem && !compareItem) return null;

            const val1 = primaryItem ? Number(primaryItem.value) : 0;
            const val2 = compareItem ? Number(compareItem.value) : 0;
            const diff = val1 - val2;
            const diffPct = val2 !== 0 ? ((diff / val2) * 100).toFixed(1) + "%" : "—";
            const isPositive = diff >= 0;

            return (
              <div key={key} className="flex flex-col border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-500 font-medium text-xs mb-0.5">{key}</span>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-800 font-semibold">{val1.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">本期</span></span>
                    {compareItem && (
                      <span className="text-slate-400">{val2.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">上期</span></span>
                    )}
                  </div>
                  {compareItem && (
                    <span className={`text-xs font-semibold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                      {isPositive ? "+" : ""}{diff.toLocaleString()} ({isPositive ? "+" : ""}{diffPct})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

function TrendLineChartInner({
  data: rawData,
  compareData: rawCompareData,
  xKey = "date",
  yKey = "payments",
  title,
  targetValue,
  barKeys = [],
  lineKeys,
  peak,
  valley,
}: TrendLineChartProps) {
  const primaryData = useMemo(() => normaliseData(rawData), [rawData]);
  const compData = useMemo(() => normaliseData(rawCompareData), [rawCompareData]);
  const resolvedLineKeys = lineKeys ?? [yKey];

  // Merge data for comparison
  const mergedData = useMemo(() => {
    return primaryData.map((pt, i) => {
      const out = { ...pt };
      if (compData[i]) {
        for (const k of Object.keys(compData[i])) {
          if (k !== xKey) {
            out[`compare_${k}`] = compData[i][k];
          }
        }
      }
      return out;
    });
  }, [primaryData, compData, xKey]);

  if (!mergedData || mergedData.length === 0) {
    return <EmptyState title="暂无趋势数据" />;
  }

  const LINE_COLORS = ["hsl(var(--destructive))", "hsl(var(--chart-4))", "hsl(var(--chart-1))"];

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <ResponsiveChartContainer minHeight={CHART_HEIGHT.md} compactThreshold={550}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="趋势折线图">
          <ComposedChart data={mergedData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
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
                <stop offset="5%" stopColor="hsl(var(--chart-amber))" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="hsl(var(--chart-amber))" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: CHART_FONT_SIZE.md }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: CHART_FONT_SIZE.md }} axisLine={false} tickLine={false} />
            
            <Tooltip content={<CustomTooltip lineKeys={resolvedLineKeys} />} />
            
            <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />

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
                name={key}
              />
            ))}

            {/* Primary Lines */}
            {resolvedLineKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={`${key}${compData.length > 0 ? " (本期)" : ""}`}
                stroke={LINE_COLORS[i % 3]}
                strokeWidth={2}
                dot={{ r: 3, fill: LINE_COLORS[i % 3] }}
                activeDot={{ r: 5 }}
              />
            ))}

            {/* Compare Lines */}
            {compData.length > 0 && resolvedLineKeys.map((key, i) => (
              <Line
                key={`compare_${key}`}
                type="monotone"
                dataKey={`compare_${key}`}
                name={`${key} (上期)`}
                stroke={LINE_COLORS[i % 3]}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
                opacity={0.4}
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
      </ResponsiveChartContainer>
    </div>
  );
}

export const TrendLineChart = memo(TrendLineChartInner);
