"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AttributionPieChartProps {
  data: Record<string, unknown>;
}

interface Factor {
  factor: string;
  contribution: number;
  label?: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function extractFactors(data: Record<string, unknown>): Factor[] {
  const factors = data.factors;
  if (Array.isArray(factors)) return factors as Factor[];
  return [];
}

export function AttributionPieChart({ data }: AttributionPieChartProps) {
  const factors = extractFactors(data);

  if (factors.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        暂无归因数据
      </div>
    );
  }

  const pieData = factors.map((f) => ({
    name: f.label ?? f.factor,
    value: Math.round(f.contribution * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={90}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}%`}
          labelLine={false}
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v}%`, "贡献度"]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
