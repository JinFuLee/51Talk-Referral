"use client";

import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Spinner } from "@/components/ui/Spinner";

interface HistogramBucket {
  bucket: string;
  count: number;
  percentage: number;
}

interface TimeIntervalResponse {
  histogram: HistogramBucket[];
  avg_days: number;
  median_days: number;
  p90_days: number;
  total_records: number;
}

const MOCK: TimeIntervalResponse = {
  histogram: [
    { bucket: "0-3天", count: 42, percentage: 28.2 },
    { bucket: "4-7天", count: 38, percentage: 25.5 },
    { bucket: "8-14天", count: 35, percentage: 23.5 },
    { bucket: "15-30天", count: 22, percentage: 14.8 },
    { bucket: "31+天", count: 12, percentage: 8.1 },
  ],
  avg_days: 9.3,
  median_days: 6,
  p90_days: 28,
  total_records: 149,
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: HistogramBucket }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-600 mt-1">学员数: <span className="font-bold">{d.count}</span></p>
      <p className="text-slate-500">占比: {d.percentage}%</p>
    </div>
  );
}

export function TimeIntervalHistogram() {
  const { data, isLoading, error } = useSWR<TimeIntervalResponse>(
    "time-interval",
    () => fetch("/api/analysis/time-interval").then((r) => r.json())
  );

  const resp: TimeIntervalResponse =
    data?.histogram && data.histogram.length > 0 ? data : MOCK;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-12 text-slate-400 text-sm">
        数据加载失败，显示示例数据
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        注册 → 付费天数分布 · 共 {resp.total_records} 条记录
      </p>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={resp.histogram}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            allowDecimals={false}
            label={{ value: "学员数", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            name="学员数"
            fill="hsl(var(--success))"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "平均天数", value: `${resp.avg_days} 天` },
          { label: "中位天数", value: `${resp.median_days} 天` },
          { label: "P90 天数", value: `${resp.p90_days} 天` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-50 rounded-lg px-3 py-2 text-center"
          >
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className="text-base font-bold text-slate-700 mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
