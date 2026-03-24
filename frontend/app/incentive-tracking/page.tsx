'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface IncentiveGroup {
  count: number;
  avg_registrations: number;
  avg_payments: number;
}

interface IncentiveLift {
  registrations_lift: number;
  payments_lift: number;
}

interface IncentiveEffect {
  has_reward_group: IncentiveGroup;
  no_reward_group: IncentiveGroup;
  lift: IncentiveLift;
}

function LiftBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isPositive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

function GroupCard({
  title,
  group,
  accent,
}: {
  title: string;
  group: IncentiveGroup;
  accent: string;
}) {
  return (
    <div className={`bg-[var(--bg-surface)] border-2 ${accent} rounded-xl p-6 flex-1`}>
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">{title}</h3>
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {group.count.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">学员数</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center bg-[var(--bg-subtle)] rounded-lg p-3">
            <p className="text-xl font-bold text-blue-600">{group.avg_registrations.toFixed(2)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">人均注册</p>
          </div>
          <div className="text-center bg-[var(--bg-subtle)] rounded-lg p-3">
            <p className="text-xl font-bold text-purple-600">{group.avg_payments.toFixed(2)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">人均付费</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IncentiveTrackingPage() {
  const { data, isLoading, error } = useSWR<IncentiveEffect>(
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
    return <EmptyState title="数据加载失败" description="无法获取激励效果数据，请检查后端服务" />;
  }

  if (!data) {
    return <EmptyState title="暂无激励数据" description="请上传包含激励信息的数据文件后刷新" />;
  }

  const { has_reward_group, no_reward_group, lift } = data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">激励追踪</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          领奖组 vs 未领奖组对比 · 激励效果量化
        </p>
      </div>

      {/* 提升徽章 */}
      <div className="bg-[var(--bg-subtle)] rounded-xl p-4 flex flex-wrap gap-6 items-center">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">注册提升</p>
          <LiftBadge value={lift.registrations_lift} />
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">付费提升</p>
          <LiftBadge value={lift.payments_lift} />
        </div>
        <p className="text-xs text-[var(--text-secondary)] flex-1">
          领奖组相较未领奖组的人均产出提升幅度
        </p>
      </div>

      {/* 双组对比 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <GroupCard
          title="领奖组（已领取激励）"
          group={has_reward_group}
          accent="border-green-400"
        />
        <GroupCard
          title="未领奖组（未领取激励）"
          group={no_reward_group}
          accent="border-[var(--border-default)]"
        />
      </div>

      {/* 对比表格 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-left">指标</th>
              <th className="slide-th text-right">领奖组</th>
              <th className="slide-th text-right">未领奖组</th>
              <th className="slide-th text-right">提升幅度</th>
            </tr>
          </thead>
          <tbody>
            <tr className="slide-row-even">
              <td className="slide-td font-medium">学员数</td>
              <td className="slide-td text-right font-mono tabular-nums">
                {has_reward_group.count.toLocaleString()}
              </td>
              <td className="slide-td text-right font-mono tabular-nums">
                {no_reward_group.count.toLocaleString()}
              </td>
              <td className="slide-td text-right">—</td>
            </tr>
            <tr className="slide-row-odd">
              <td className="slide-td font-medium">人均注册</td>
              <td className="slide-td text-right font-mono tabular-nums text-blue-600 font-semibold">
                {has_reward_group.avg_registrations.toFixed(2)}
              </td>
              <td className="slide-td text-right font-mono tabular-nums">
                {no_reward_group.avg_registrations.toFixed(2)}
              </td>
              <td className="slide-td text-right">
                <LiftBadge value={lift.registrations_lift} />
              </td>
            </tr>
            <tr className="slide-row-even">
              <td className="slide-td font-medium">人均付费</td>
              <td className="slide-td text-right font-mono tabular-nums text-purple-600 font-semibold">
                {has_reward_group.avg_payments.toFixed(2)}
              </td>
              <td className="slide-td text-right font-mono tabular-nums">
                {no_reward_group.avg_payments.toFixed(2)}
              </td>
              <td className="slide-td text-right">
                <LiftBadge value={lift.payments_lift} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
