"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface RetentionPoint {
  month_age: number;
  valid_rate: number | null;
  valid_count: number;
  total: number;
}

interface RetentionCurveChartProps {
  data: RetentionPoint[];
}

function findSteepestDrop(data: RetentionPoint[]): number | null {
  let maxDrop = 0;
  let steepestMonth: number | null = null;
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].valid_rate;
    const curr = data[i].valid_rate;
    if (prev != null && curr != null) {
      const drop = prev - curr;
      if (drop > maxDrop) {
        maxDrop = drop;
        steepestMonth = data[i].month_age;
      }
    }
  }
  return steepestMonth;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: RetentionPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-slate-700">M{pt.month_age}</p>
      <p className="text-emerald-600">有效留存率: {pt.valid_rate != null ? `${(pt.valid_rate * 100).toFixed(1)}%` : "—"}</p>
      <p className="text-slate-500">有效 / 总计: {pt.valid_count} / {pt.total}</p>
    </div>
  );
}

export function RetentionCurveChart({ data }: RetentionCurveChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: `M${d.month_age}`,
    rate_pct: d.valid_rate != null ? d.valid_rate : null,
  }));

  const steepestMonth = findSteepestDrop(data);

  return (
    <div className="space-y-3">
      {steepestMonth && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 inline-block">
          M{steepestMonth} 留存率下降最快（建议在此月龄前加强维护干预）
        </p>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
          />
          <YAxis
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            domain={[0, 1]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => value === "rate_pct" ? "有效留存率" : value}
          />

          {/* 50% reference line */}
          <ReferenceLine
            y={0.5}
            stroke="#94a3b8"
            strokeDasharray="4 2"
            label={{ value: "50%", position: "right", fill: "#94a3b8", fontSize: 10 }}
          />
          {/* 25% reference line */}
          <ReferenceLine
            y={0.25}
            stroke="#fca5a5"
            strokeDasharray="4 2"
            label={{ value: "25%", position: "right", fill: "#fca5a5", fontSize: 10 }}
          />

          {steepestMonth && (
            <ReferenceLine
              x={`M${steepestMonth}`}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: "干预点", fill: "#f59e0b", fontSize: 10, position: "top" }}
            />
          )}

          <Line
            type="monotone"
            dataKey="rate_pct"
            name="rate_pct"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#6366f1" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
