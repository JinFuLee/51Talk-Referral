"use client";

import useSWR from "swr";
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
import { Spinner } from "@/components/ui/Spinner";
import { swrFetcher } from "@/lib/api";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface SeriesPoint {
  date: string;
  cc_headcount?: number;
  cc_present?: number;
  cc_rate?: number;
  ss_headcount?: number;
  ss_present?: number;
  ss_rate?: number;
}

interface Summary {
  cc_headcount: number;
  cc_present: number;
  cc_rate: number;
  ss_headcount: number;
  ss_present: number;
  ss_rate: number;
}

interface ProductivityHistoryData {
  series: SeriesPoint[];
  summary: Summary;
}


function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function formatYAxis(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

export function ProductivityHistoryChart() {
  const { data, isLoading, error } = useSWR<ProductivityHistoryData>(
    "/api/analysis/productivity-history",
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700" style={{ height: CHART_HEIGHT.md }}>
        出勤数据加载失败，请检查后端服务
      </div>
    );
  }

  const { series, summary } = data;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
          <p className="text-xs text-blue-400 font-medium mb-1">CC 前端出勤</p>
          <p className="text-2xl font-bold text-blue-700">{pct(summary.cc_rate)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.cc_present} / {summary.cc_headcount} 人
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4">
          <p className="text-xs text-emerald-500 font-medium mb-1">SS 后端出勤</p>
          <p className="text-2xl font-bold text-emerald-700">{pct(summary.ss_rate)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.ss_present} / {summary.ss_headcount} 人
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="出勤率历史趋势">
        <LineChart data={series} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis tickLine={false} axisLine={false} dataKey="date" tick={{ fontSize: CHART_FONT_SIZE.md }} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={formatYAxis}
            domain={[0, 1]}
            tick={{ fontSize: CHART_FONT_SIZE.md }} />
          <Tooltip
            formatter={(value: number) => pct(value)}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
          <Line
            type="monotone"
            dataKey="cc_rate"
            name="CC 出勤率"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="ss_rate"
            name="SS 出勤率"
            stroke="hsl(var(--success))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
