"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_FONT_SIZE } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DecayPoint {
  month: string;
  reach_rate?: number;
  participation_rate?: number;
  checkin_rate?: number;
  referral_ratio?: number;
}

interface CohortDecayChartProps {
  data?: DecayPoint[];
}

const LINES = [
  { key: "reach_rate", label: "触达率", color: "hsl(var(--chart-4))" },
  { key: "participation_rate", label: "参与率", color: "hsl(var(--success))" },
  { key: "checkin_rate", label: "打卡率", color: "hsl(var(--chart-amber))" },
  { key: "referral_ratio", label: "带货比", color: "hsl(var(--chart-rose))" },
];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function CohortDecayChart({ data: propData }: CohortDecayChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const { data: apiData, isLoading, error } = useSWR(
    propData ? null : "/api/analysis/cohort-decay",
    fetcher
  );

  const handleLegendClick = (e: { dataKey?: string | number | ((obj: object) => void) }) => {
    if (!e.dataKey || typeof e.dataKey !== "string") return;
    const key = e.dataKey;
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
        Cohort 衰减数据加载失败，请稍后重试
      </div>
    );
  }

  const data: DecayPoint[] = propData ?? apiData?.data ?? [];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: CHART_FONT_SIZE.md }} />
        <YAxis tickFormatter={pct} tick={{ fontSize: CHART_FONT_SIZE.md }} domain={[0, 1]} />
        <Tooltip formatter={(v: number) => pct(v)} />
        <Legend
          wrapperStyle={{ fontSize: CHART_FONT_SIZE.md }}
          onClick={handleLegendClick}
          formatter={(value: string) => (
            <span style={{ opacity: hiddenKeys.has(value) ? 0.35 : 1, cursor: "pointer" }}>
              {value}
            </span>
          )}
        />
        {LINES.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            hide={hiddenKeys.has(l.label)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
