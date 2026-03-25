'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import { formatRate } from '@/lib/utils';

interface IncentiveGroup {
  reward_status: string;
  student_count: number;
  avg_referral_registrations: number | null;
  avg_referral_payments: number | null;
  avg_new_coefficient: number | null;
  total_referral_registrations: number | null;
  total_referral_payments: number | null;
  avg_historical_coding: number | null;
}

interface IncentiveResponse {
  groups: IncentiveGroup[];
}

function safeNum(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—';
  return v.toFixed(decimals);
}

export default function IncentiveTrackingPage() {
  const { data, isLoading, error } = useSWR<IncentiveResponse>(
    '/api/analysis/incentive-effect',
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
    return <EmptyState title="数据加载失败" description="无法获取激励追踪数据，请检查后端服务" />;
  }

  const groups = data?.groups ?? [];

  if (groups.length === 0) {
    return (
      <EmptyState
        title="暂无激励数据"
        description="推荐奖励领取状态字段为空，上传含该字段的数据后自动识别"
      />
    );
  }

  // 按学员数降序排列
  const sorted = [...groups].sort((a, b) => (b.student_count ?? 0) - (a.student_count ?? 0));

  // 图表数据：各组付费数对比
  const chartData = sorted.map((g) => ({
    name: g.reward_status.length > 12 ? g.reward_status.slice(0, 12) + '…' : g.reward_status,
    学员数: g.student_count ?? 0,
    平均付费数: Number(safeNum(g.avg_referral_payments)) || 0,
    总付费数: g.total_referral_payments ?? 0,
  }));

  const totalStudents = sorted.reduce((sum, g) => sum + (g.student_count ?? 0), 0);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">激励追踪</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          按奖励领取状态分组 · 转介绍产出对比
        </p>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">奖励状态分组</p>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{sorted.length}</p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">总学员数</p>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {totalStudents.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">总推荐付费</p>
            <p className="text-3xl font-bold text-green-600">
              {sorted
                .reduce((sum, g) => sum + (g.total_referral_payments ?? 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </Card>
      </div>

      {/* 各组付费数条形图 */}
      <Card title="各奖励状态组 — 总推荐付费数">
        <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 40)}>
          <BarChart data={chartData} layout="vertical" barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--shadow-medium)',
                fontSize: '12px',
              }}
              cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
            />
            <Bar
              dataKey="总付费数"
              fill="var(--chart-4-hex)"
              radius={[0, 4, 4, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 明细表格 */}
      <Card title="分组明细">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-left">奖励状态</th>
                <th className="slide-th text-right">学员数</th>
                <th className="slide-th text-right">占比</th>
                <th className="slide-th text-right">均注册数</th>
                <th className="slide-th text-right">均付费数</th>
                <th className="slide-th text-right">总付费数</th>
                <th className="slide-th text-right">
                  <span className="inline-flex items-center gap-1 group relative cursor-default">
                    均历史转码
                    <span
                      className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                      title="平均历史转码次数，衡量激励是否触达高活跃群体"
                    >
                      ⓘ
                    </span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                      平均历史转码次数，高转码=高活跃，验证激励有效性
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g, i) => (
                <tr
                  key={g.reward_status}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td font-medium">{g.reward_status}</td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {(g.student_count ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                    {totalStudents > 0 ? formatRate((g.student_count ?? 0) / totalStudents) : '—'}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {safeNum(g.avg_referral_registrations)}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-semibold">
                    {safeNum(g.avg_referral_payments)}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-semibold text-green-600">
                    {(g.total_referral_payments ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {g.avg_historical_coding != null ? g.avg_historical_coding.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
