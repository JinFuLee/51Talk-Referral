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
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

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

const MOCK_DATA: ProductivityHistoryData = {
  series: [
    { date: "02-01", cc_headcount: 20, cc_present: 18, cc_rate: 0.9, ss_headcount: 15, ss_present: 14, ss_rate: 0.933 },
    { date: "02-03", cc_headcount: 20, cc_present: 17, cc_rate: 0.85, ss_headcount: 15, ss_present: 13, ss_rate: 0.867 },
    { date: "02-05", cc_headcount: 20, cc_present: 19, cc_rate: 0.95, ss_headcount: 15, ss_present: 15, ss_rate: 1.0 },
    { date: "02-07", cc_headcount: 20, cc_present: 16, cc_rate: 0.8, ss_headcount: 15, ss_present: 12, ss_rate: 0.8 },
    { date: "02-10", cc_headcount: 20, cc_present: 18, cc_rate: 0.9, ss_headcount: 15, ss_present: 14, ss_rate: 0.933 },
    { date: "02-12", cc_headcount: 20, cc_present: 20, cc_rate: 1.0, ss_headcount: 15, ss_present: 15, ss_rate: 1.0 },
    { date: "02-14", cc_headcount: 20, cc_present: 17, cc_rate: 0.85, ss_headcount: 15, ss_present: 13, ss_rate: 0.867 },
    { date: "02-17", cc_headcount: 20, cc_present: 19, cc_rate: 0.95, ss_headcount: 15, ss_present: 14, ss_rate: 0.933 },
    { date: "02-19", cc_headcount: 20, cc_present: 18, cc_rate: 0.9, ss_headcount: 15, ss_present: 15, ss_rate: 1.0 },
    { date: "02-21", cc_headcount: 20, cc_present: 16, cc_rate: 0.8, ss_headcount: 15, ss_present: 12, ss_rate: 0.8 },
  ],
  summary: {
    cc_headcount: 20,
    cc_present: 18,
    cc_rate: 0.9,
    ss_headcount: 15,
    ss_present: 14,
    ss_rate: 0.933,
  },
};

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function formatYAxis(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

export function ProductivityHistoryChart() {
  const { data, isLoading } = useSWR<ProductivityHistoryData>(
    "productivity-history",
    () =>
      fetch("/api/analysis/productivity-history")
        .then((r) => r.json())
        .catch(() => MOCK_DATA),
    { fallbackData: MOCK_DATA }
  );

  const resolved = data ?? MOCK_DATA;
  const { series, summary } = resolved;

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
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={formatYAxis}
              domain={[0, 1]}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => pct(value)}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="cc_rate"
              name="CC 出勤率"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="ss_rate"
              name="SS 出勤率"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
