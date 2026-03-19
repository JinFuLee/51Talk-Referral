"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { FunnelStage } from "@/lib/types/funnel";

interface ConversionRateBarProps {
  stages: FunnelStage[];
  height?: number;
}

const RATE_PAIRS = [
  { key: "注册预约率", from: "注册", to: "预约" },
  { key: "预约出席率", from: "预约", to: "出席" },
  { key: "出席付费率", from: "出席", to: "付费" },
] as const;

function gapColor(gap: number | undefined) {
  if (gap === undefined) return "#94a3b8";
  if (gap > 0) return "#10b981";
  if (gap < 0) return "#ef4444";
  return "#94a3b8";
}

export function ConversionRateBar({ stages, height = 240 }: ConversionRateBarProps) {
  const stageMap = Object.fromEntries(stages.map((s) => [s.name, s]));

  const chartData = RATE_PAIRS.map(({ key, from, to }) => {
    const fromStage = stageMap[from];
    const toStage = stageMap[to];
    const actual =
      fromStage && toStage && fromStage.actual > 0
        ? Number(((toStage.actual / fromStage.actual) * 100).toFixed(1))
        : 0;
    // Use target_rate from the destination stage if available
    const target =
      toStage?.target_rate != null
        ? Number((toStage.target_rate * 100).toFixed(1))
        : null;
    const gap = target != null ? actual - target : undefined;
    return { name: key, actual, target, gap };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: "#64748b" }}
          domain={[0, "auto"]}
        />
        <Tooltip
          formatter={(v: number, name: string) => [`${v}%`, name === "actual" ? "实际" : "目标"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="actual" name="actual" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={gapColor(entry.gap)} />
          ))}
        </Bar>
        {/* Target markers as reference lines per category would need custom shape;
            instead render target as a second bar with low opacity */}
        <Bar dataKey="target" name="target" radius={[4, 4, 0, 0]} fill="#3b82f6" opacity={0.25} />
      </BarChart>
    </ResponsiveContainer>
  );
}
