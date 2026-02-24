"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
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
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

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
    "/api/analysis/time-interval",
    swrFetcher
  );

  const hasData = data?.histogram && data.histogram.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-12 text-red-400 text-sm">
        数据加载失败
      </div>
    );
  }

  if (!hasData || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
        <p className="text-sm font-medium text-slate-600 mb-1">注册付费时间间隔数据暂未就绪</p>
        <p className="text-xs text-slate-400">请先运行分析以生成 time-interval 统计</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        注册 → 付费天数分布 · 共 {data.total_records} 条记录
      </p>

      <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="注册付费天数分布直方图">
        <BarChart
          data={data.histogram}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis tickLine={false} axisLine={false} dataKey="bucket"
            tick={{ fontSize: CHART_FONT_SIZE.md }}
            interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: CHART_FONT_SIZE.md }}
            allowDecimals={false}
            label={{ value: "学员数", angle: -90, position: "insideLeft", fontSize: CHART_FONT_SIZE.md, fill: "hsl(var(--muted-foreground))" }} />
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
          { label: "平均天数", value: `${data.avg_days} 天` },
          { label: "中位天数", value: `${data.median_days} 天` },
          { label: "P90 天数", value: `${data.p90_days} 天` },
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
