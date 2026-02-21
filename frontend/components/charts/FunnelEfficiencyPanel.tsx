"use client";

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
  { key: "register_to_reserve", label: "注册→预约", color: "#6366f1" },
  { key: "reserve_to_attend", label: "预约→出席", color: "#10b981" },
  { key: "attend_to_paid", label: "出席→付费", color: "#f59e0b" },
  { key: "overall_conversion", label: "总转化率", color: "#f43f5e" },
];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

const MOCK: CCFunnelRow[] = [
  { cc_name: "CC-A", register_to_reserve: 0.72, reserve_to_attend: 0.65, attend_to_paid: 0.48, overall_conversion: 0.22 },
  { cc_name: "CC-B", register_to_reserve: 0.68, reserve_to_attend: 0.58, attend_to_paid: 0.40, overall_conversion: 0.16 },
  { cc_name: "CC-C", register_to_reserve: 0.80, reserve_to_attend: 0.70, attend_to_paid: 0.55, overall_conversion: 0.31 },
  { cc_name: "CC-D", register_to_reserve: 0.60, reserve_to_attend: 0.50, attend_to_paid: 0.35, overall_conversion: 0.11 },
];

export function FunnelEfficiencyPanel() {
  const { data, isLoading, error } = useSWR<FunnelDetailResponse>(
    "funnel-detail",
    () => fetch("/api/analysis/funnel-detail").then((r) => r.json())
  );

  const rows: CCFunnelRow[] =
    data?.cc_funnel && data.cc_funnel.length > 0 ? data.cc_funnel : MOCK;

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
        数据加载失败，显示示例数据
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        各 CC 漏斗阶段转化率 · 注册→预约→出席→付费
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={rows}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
          <XAxis
            dataKey="cc_name"
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <YAxis tickFormatter={pct} tick={{ fontSize: 11 }} domain={[0, 1]} />
          <Tooltip formatter={(v: number) => pct(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {BARS.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={b.color}
              radius={[2, 2, 0, 0]}
              maxBarSize={18}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
