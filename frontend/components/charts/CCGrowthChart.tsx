"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { CCGrowthAPIPoint } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface CCGrowthChartProps {
  data: CCGrowthAPIPoint[];
  ccName: string;
  isLoading?: boolean;
}

export function CCGrowthChart({ data, ccName, isLoading }: CCGrowthChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-slate-500 text-sm">
        <Spinner size="sm" /> 加载中…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title="暂无成长数据" description={`${ccName} 尚无历史快照`} />;
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">
        {ccName} · {sorted.length} 个数据点
      </p>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label={`${ccName} 成长曲线`}>
        <LineChart
          data={sorted}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: CHART_FONT_SIZE.md }} />
          <YAxis tick={{ fontSize: CHART_FONT_SIZE.md }} />
          <Tooltip
            formatter={(v, name) => [
              typeof v === "number" ? v.toFixed(2) : v,
              name === "composite_score" ? "综合得分" : String(name),
            ]}
          />
          <Line
            type="monotone"
            dataKey="composite_score"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "hsl(var(--chart-2))" }}
            activeDot={{ r: 6 }}
            name="composite_score"
          />
          {sorted.length > 0 && (
            <ReferenceDot
              x={sorted[sorted.length - 1].date}
              y={sorted[sorted.length - 1].composite_score}
              r={6}
              fill="hsl(var(--destructive))"
              stroke="white"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
