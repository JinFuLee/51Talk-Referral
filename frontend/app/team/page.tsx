"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { TeamSummaryCard } from "@/components/team/TeamSummaryCard";

interface TeamMember {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
  checkin_rate?: number;
  cc_reach_rate?: number;
}

interface TeamSummaryResponse {
  teams: TeamMember[];
}

export default function TeamPage() {
  const { data, isLoading, error } = useSWR<TeamSummaryResponse>(
    "/api/team/summary",
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取团队数据，请检查后端服务"
      />
    );
  }

  const teams = Array.isArray(data) ? data : (data?.teams ?? []);

  const chartData = teams.map((t) => ({
    name: t.cc_name,
    注册: t.registrations,
    付费: t.payments,
    学员: t.students,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">团队汇总</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">各 CC 学员数 · 参与率 · 注册 · 付费对比</p>
      </div>

      {/* 团队汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? (
          <div className="col-span-full">
            <EmptyState title="暂无团队数据" description="上传数据文件后自动刷新" />
          </div>
        ) : (
          teams.map((t) => (
            <TeamSummaryCard
              key={t.cc_name}
              cc_name={t.cc_name}
              cc_group={t.cc_group}
              students={t.students}
              participation_rate={t.participation_rate}
              registrations={t.registrations}
              payments={t.payments}
              revenue_usd={t.revenue_usd ?? 0}
              checkin_rate={t.checkin_rate}
              cc_reach_rate={t.cc_reach_rate}
            />
          ))
        )}
      </div>

      {/* 团队对比柱状图 */}
      {chartData.length > 0 && (
        <Card title="团队注册 vs 付费对比">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="注册" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="付费" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
