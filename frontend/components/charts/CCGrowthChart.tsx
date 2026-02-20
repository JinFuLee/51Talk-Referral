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

interface CCGrowthChartProps {
  data: CCGrowthAPIPoint[];
  ccName: string;
}

export function CCGrowthChart({ data, ccName }: CCGrowthChartProps) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">
        {ccName} · {sorted.length} 个数据点
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={sorted}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v, name) => [
              typeof v === "number" ? v.toFixed(2) : v,
              name === "composite_score" ? "综合得分" : String(name),
            ]}
          />
          <Line
            type="monotone"
            dataKey="composite_score"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#3b82f6" }}
            activeDot={{ r: 6 }}
            name="composite_score"
          />
          {sorted.length > 0 && (
            <ReferenceDot
              x={sorted[sorted.length - 1].date}
              y={sorted[sorted.length - 1].composite_score}
              r={6}
              fill="#ef4444"
              stroke="white"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
