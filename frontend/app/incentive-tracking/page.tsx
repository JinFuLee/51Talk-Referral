'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface IncentiveEffectData {
  has_reward: { count: number; avg_registrations: number; avg_payments: number };
  no_reward: { count: number; avg_registrations: number; avg_payments: number };
  lift_pct: { registrations: number; payments: number };
}

function liftColor(pct: number): string {
  if (pct > 0) return 'text-green-600';
  if (pct < 0) return 'text-red-500';
  return 'text-[var(--text-secondary)]';
}

function liftPrefix(pct: number): string {
  return pct >= 0 ? '+' : '';
}

export default function IncentiveTrackingPage() {
  const { data, isLoading, error } = useSWR<IncentiveEffectData>(
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

  if (!data) {
    return <EmptyState title="暂无激励数据" description="上传数据文件后自动识别激励效果" />;
  }

  const { has_reward, no_reward, lift_pct } = data;

  const comparisonData = [
    {
      name: '平均注册数',
      领奖学员: Number(has_reward.avg_registrations.toFixed(2)),
      未领奖学员: Number(no_reward.avg_registrations.toFixed(2)),
    },
    {
      name: '平均付费数',
      领奖学员: Number(has_reward.avg_payments.toFixed(2)),
      未领奖学员: Number(no_reward.avg_payments.toFixed(2)),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">激励追踪</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          领奖 vs 未领奖学员对比 · 激励 Lift 效果量化
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card title="">
          <div className="pt-1 text-center py-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">注册数提升 (Lift)</p>
            <p className={`text-4xl font-bold ${liftColor(lift_pct.registrations)}`}>
              {liftPrefix(lift_pct.registrations)}
              {lift_pct.registrations.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              领奖学员相对未领奖学员的注册数提升比例
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="pt-1 text-center py-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">付费数提升 (Lift)</p>
            <p className={`text-4xl font-bold ${liftColor(lift_pct.payments)}`}>
              {liftPrefix(lift_pct.payments)}
              {lift_pct.payments.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              领奖学员相对未领奖学员的付费数提升比例
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: '领奖学员',
            group: has_reward,
            accent: 'text-green-600',
            badge: 'bg-green-100 text-green-700',
          },
          {
            label: '未领奖学员',
            group: no_reward,
            accent: 'text-[var(--text-secondary)]',
            badge: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
          },
        ].map(({ label, group, accent, badge }) => (
          <Card key={label} title="">
            <div className="pt-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold px-2 py-0.5 rounded ${badge}`}>
                  {label}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  共 {group.count.toLocaleString()} 人
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">平均注册数</p>
                  <p className={`text-2xl font-bold ${accent}`}>
                    {group.avg_registrations.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">平均付费数</p>
                  <p className={`text-2xl font-bold ${accent}`}>{group.avg_payments.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="领奖 vs 未领奖对比">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comparisonData} barCategoryGap="40%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="领奖学员" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="未领奖学员" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="指标对比明细">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-left">指标</th>
                <th className="slide-th text-right">领奖学员</th>
                <th className="slide-th text-right">未领奖学员</th>
                <th className="slide-th text-right">Lift</th>
              </tr>
            </thead>
            <tbody>
              <tr className="even:bg-[var(--bg-subtle)]">
                <td className="slide-td font-medium">学员数</td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {has_reward.count.toLocaleString()}
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {no_reward.count.toLocaleString()}
                </td>
                <td className="slide-td text-right text-[var(--text-muted)]">—</td>
              </tr>
              <tr className="even:bg-[var(--bg-subtle)]">
                <td className="slide-td font-medium">平均注册数</td>
                <td className="slide-td text-right font-mono tabular-nums font-semibold text-green-600">
                  {has_reward.avg_registrations.toFixed(2)}
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {no_reward.avg_registrations.toFixed(2)}
                </td>
                <td
                  className={`slide-td text-right font-mono tabular-nums font-medium ${liftColor(lift_pct.registrations)}`}
                >
                  {liftPrefix(lift_pct.registrations)}
                  {lift_pct.registrations.toFixed(1)}%
                </td>
              </tr>
              <tr className="even:bg-[var(--bg-subtle)]">
                <td className="slide-td font-medium">平均付费数</td>
                <td className="slide-td text-right font-mono tabular-nums font-semibold text-green-600">
                  {has_reward.avg_payments.toFixed(2)}
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {no_reward.avg_payments.toFixed(2)}
                </td>
                <td
                  className={`slide-td text-right font-mono tabular-nums font-medium ${liftColor(lift_pct.payments)}`}
                >
                  {liftPrefix(lift_pct.payments)}
                  {lift_pct.payments.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
