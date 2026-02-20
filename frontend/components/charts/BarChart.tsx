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

interface BarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  refLineValue?: number;
}

export function BarChart({ data, xKey, yKey, title, color = "#3b82f6", refLineValue }: BarChartProps) {
  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <RechartsBarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {refLineValue !== undefined && (
            <ReferenceLine
              y={refLineValue}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: "目标", fill: "#ef4444", fontSize: 11 }}
            />
          )}
          <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
