"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatRate } from "@/lib/utils";

interface TeamDataItem {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

interface TeamCompareChartProps {
  teams: TeamDataItem[];
}

export function TeamCompareChart({ teams }: TeamCompareChartProps) {
  if (teams.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        暂无团队数据
      </div>
    );
  }

  const chartData = teams.map((t) => ({
    name: t.cc_name,
    参与率: Math.round(t.participation_rate * 100),
    注册数: t.registrations,
    付费数: t.payments,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-400 mb-3">参与率对比（%）</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              unit="%"
              width={36}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "参与率"]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="参与率" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs text-slate-400 mb-3">注册数 vs 付费数对比</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="注册数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="付费数" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
