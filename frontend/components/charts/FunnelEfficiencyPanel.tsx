"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import useSWR from "swr";
import { Spinner } from "@/components/ui/Spinner";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface CCFunnelRow {
  cc_name: string;
  register_to_reserve?: number;
  reserve_to_attend?: number;
  attend_to_paid?: number;
  overall_conversion?: number;
}

interface FunnelDetailResponse {
  cc_funnel: CCFunnelRow[];
  stages: string[];
}

const BARS = [
  { key: "register_to_reserve", label: "注册→预约", color: "hsl(var(--chart-4))" },
  { key: "reserve_to_attend", label: "预约→出席", color: "hsl(var(--success))" },
  { key: "attend_to_paid", label: "出席→付费", color: "hsl(var(--chart-amber))" },
  { key: "overall_conversion", label: "总转化率", color: "hsl(var(--chart-rose))" },
];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}


export function FunnelEfficiencyPanel() {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const handleLegendClick = (e: { dataKey?: string | number | ((obj: object) => void) }) => {
    if (!e.dataKey || typeof e.dataKey !== 'string') return;
    const key = e.dataKey;
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const { data, isLoading, error } = useSWR<FunnelDetailResponse>(
    "funnel-detail",
    () => fetch("/api/analysis/funnel-detail").then((r) => r.json())
  );

  const rows: CCFunnelRow[] = data?.cc_funnel ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        数据加载失败
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        暂无漏斗分层跟进数据
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        各 CC 漏斗阶段转化率 · 注册→预约→出席→付费
      </p>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.lg} aria-label="各CC漏斗转化率">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis tickLine={false} axisLine={false} dataKey="cc_name"
            tick={{ fontSize: CHART_FONT_SIZE.md }}
            interval={0} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={pct} tick={{ fontSize: CHART_FONT_SIZE.md }} domain={[0, 1]} />
          <Tooltip formatter={(v: number) => pct(v)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }}
            onClick={handleLegendClick}
            formatter={(value: string) => (
              <span style={{ opacity: hiddenKeys.has(value) ? 0.35 : 1, cursor: "pointer" }}>
                {value}
              </span>
            )}
          />
          {BARS.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={b.color}
              radius={[2, 2, 0, 0]}
              maxBarSize={18}
              hide={hiddenKeys.has(b.label)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
