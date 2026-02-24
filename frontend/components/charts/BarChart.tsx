"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface BarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  refLineValue?: number;
}

export function BarChart({ data, xKey, yKey, title, color = "hsl(var(--chart-2))", refLineValue }: BarChartProps) {
  if (!data || data.length === 0) {
    return <EmptyState title="暂无数据" />;
  }

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.sm} aria-label={title ?? "柱状图"}>
        <RechartsBarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis tickLine={false} axisLine={false} dataKey={xKey} tick={{ fontSize: CHART_FONT_SIZE.md }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: CHART_FONT_SIZE.md }} />
          <Tooltip />
          {refLineValue !== undefined && (
            <ReferenceLine
              y={refLineValue}
              stroke="hsl(var(--destructive))"
              strokeDasharray="4 4"
              label={{ value: "目标", fill: "hsl(var(--destructive))", fontSize: 11 }}
            />
          )}
          <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
