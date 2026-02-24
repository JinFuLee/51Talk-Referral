"use client";

import { useState, useMemo, useCallback } from "react";
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
import { swrFetcher } from "@/lib/api";

interface DecayPoint {
  month: string;
  reach_rate?: number;
  participation_rate?: number;
  checkin_rate?: number; // 拟合值
  checkin_rate_actual?: number; // 实测值
  referral_ratio?: number;
  referral_coefficient?: number;
}

interface CohortDecayChartProps {
  data?: DecayPoint[];
}

const LINES = [
  { key: "reach_rate", label: "触达率", color: "hsl(var(--chart-4))", dashed: false },
  { key: "participation_rate", label: "参与率", color: "hsl(var(--success))", dashed: false },
  { key: "checkin_rate_actual", label: "打卡率(实测)", color: "hsl(var(--chart-amber))", dashed: false },
  { key: "checkin_rate", label: "打卡率(拟合)", color: "hsl(var(--chart-amber))", dashed: true },
  { key: "referral_ratio", label: "带货比", color: "hsl(var(--chart-rose))", dashed: false },
  { key: "referral_coefficient", label: "带新系数", color: "hsl(var(--chart-indigo))", dashed: false },
];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function CohortDecayChart({ data: propData }: CohortDecayChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const { data: apiData, isLoading, error } = useSWR(
    propData ? null : "/api/analysis/cohort-decay",
    swrFetcher
  );

  const handleLegendClick = useCallback((e: { dataKey?: string | number | ((obj: object) => void) }) => {
    if (!e.dataKey || typeof e.dataKey !== "string") return;
    const key = e.dataKey;
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const data: DecayPoint[] = useMemo(
    () => propData ?? apiData?.data ?? [],
    [propData, apiData]
  );

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

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis tickLine={false} axisLine={false} dataKey="month" tick={{ fontSize: CHART_FONT_SIZE.md }} />
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
        {LINES.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color}
            strokeWidth={2}
            strokeDasharray={l.dashed ? "5 5" : undefined}
            dot={{ r: l.dashed ? 0 : 3 }}
            activeDot={{ r: 5 }}
            hide={hiddenKeys.has(l.label)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
