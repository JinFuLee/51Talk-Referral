"use client";

import useSWR from "swr";
import { swrFetcher, formatRate } from "@/lib/utils";
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

interface TeamMember {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
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

  const teams = data?.teams ?? [];

  const chartData = teams.map((t) => ({
    name: t.cc_name,
    注册: t.registrations,
    付费: t.payments,
    学员: t.students,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">团队汇总</h1>
        <p className="text-sm text-slate-500 mt-1">各 CC 学员数 · 参与率 · 注册 · 付费对比</p>
      </div>

      {/* 团队汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? (
          <div className="col-span-full">
            <EmptyState title="暂无团队数据" description="上传数据文件后自动刷新" />
          </div>
        ) : (
          teams.map((t) => (
            <div
              key={t.cc_name}
              className="bg-white rounded-2xl border border-border/40 shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-base font-bold text-slate-900">{t.cc_name}</p>
                  <p className="text-xs text-slate-400">{t.cc_group}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{t.students}</div>
                  <div className="text-xs text-slate-400">有效学员</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-700">{formatRate(t.participation_rate)}</div>
                  <div className="text-[10px] text-slate-400">参与率</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-700">{t.registrations}</div>
                  <div className="text-[10px] text-slate-400">注册数</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-700">{t.payments}</div>
                  <div className="text-[10px] text-slate-400">付费数</div>
                </div>
              </div>
            </div>
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
