"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface AttributionPieChartProps {
  data: Record<string, unknown>;
}

interface Factor {
  factor: string;
  contribution: number;
  label?: string;
}

const COLORS = ["hsl(var(--chart-2))", "hsl(var(--success))", "hsl(var(--chart-amber))", "hsl(var(--destructive))", "hsl(var(--chart-4))", "hsl(var(--chart-1))"];

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
    <ResponsiveContainer width="100%" height={CHART_HEIGHT.md} aria-label="归因分析饼图">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v}%`, "贡献度"]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
