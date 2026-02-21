"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import OutreachGapTooltip from "./OutreachGapTooltip";

interface CCGap {
  cc_name: string;
  total: number;
  called: number;
  not_called: number;
  coverage_rate: number;
  gap_vs_target: number;
}

interface OutreachGapBarChartProps {
  by_cc: CCGap[];
  target_rate: number;
}

export default function OutreachGapBarChart({ by_cc, target_rate }: OutreachGapBarChartProps) {
  const chartData = by_cc.map((cc) => ({
    ...cc,
    pct: Math.round(cc.coverage_rate * 100),
  }));
  const targetPct = Math.round(target_rate * 100);

  return (
    <Card title="CC 外呼覆盖率 vs 目标（85%）">
      {by_cc.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">暂无 CC 粒度数据</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(400, by_cc.length * 72) }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="cc_name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<OutreachGapTooltip />} />
                <ReferenceLine
                  y={targetPct}
                  stroke="hsl(var(--chart-2))"
                  strokeDasharray="4 4"
                  label={{
                    value: `目标 ${targetPct}%`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "hsl(var(--chart-2))",
                  }}
                />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="pct"
                    position="top"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontSize: 10, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.cc_name}
                      fill={
                        entry.gap_vs_target > 0.1
                          ? "hsl(var(--destructive))"
                          : entry.gap_vs_target > 0
                          ? "hsl(var(--chart-orange))"
                          : "hsl(var(--success))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-500" /> 缺口 &gt;10%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-orange-500" /> 缺口 1–10%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-500" /> 达标
        </span>
      </div>
    </Card>
  );
}
