'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
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
import { CHART_PALETTE } from '@/lib/chart-palette';

interface OutreachQualityRow {
  enclosure?: string | null;
  cc_group?: string | null;
  cc_connected?: number | null;
  ss_connected?: number | null;
  lp_connected?: number | null;
  effective_checkin?: number | null;
  referral_registrations?: number | null;
  referral_payments?: number | null;
  referral_revenue_usd?: number | null;
  students?: number | null;
}

interface OutreachQualitySummary {
  summary: OutreachQualityRow;
  by_enclosure: OutreachQualityRow[];
}

function safeRate(numerator?: number | null, denominator?: number | null): string {
  if (!numerator || !denominator || denominator === 0) return '—';
  return formatRate(numerator / denominator);
}

function safeNum(v?: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString();
}

export default function OutreachQualityPage() {
  const { data, isLoading, error, mutate } = useSWR<OutreachQualitySummary>(
    '/api/analysis/outreach-quality',
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
        description="无法获取接通质量数据，请检查后端服务"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const summary = data?.summary ?? {};
  const byEnclosure = data?.by_enclosure ?? [];

  const chartData = byEnclosure.map((row) => ({
    name: row.enclosure ?? '未知',
    CC接通: row.cc_connected ?? 0,
    SS接通: row.ss_connected ?? 0,
    LP接通: row.lp_connected ?? 0,
    有效打卡: row.effective_checkin ?? 0,
  }));

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">接通质量</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          CC / SS / LP 各角色接通数 · 有效打卡 · 转介绍产出
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'CC 接通数', value: summary.cc_connected, students: summary.students },
          { label: 'SS 接通数', value: summary.ss_connected, students: summary.students },
          { label: 'LP 接通数', value: summary.lp_connected, students: summary.students },
          { label: '有效打卡', value: summary.effective_checkin, students: summary.students },
        ].map(({ label, value, students }) => (
          <Card key={label} title="">
            <div className="pt-1">
              <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{safeNum(value)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                接通率 {safeRate(value, students)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card title="">
          <div className="pt-1">
            <p className="text-xs text-[var(--text-muted)] mb-1">转介绍注册数</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {safeNum(summary.referral_registrations)}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="pt-1">
            <p className="text-xs text-[var(--text-muted)] mb-1">转介绍付费数</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {safeNum(summary.referral_payments)}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="pt-1">
            <p className="text-xs text-[var(--text-muted)] mb-1">带新付费金额</p>
            <p className="text-2xl font-bold text-emerald-800">
              {summary.referral_revenue_usd != null
                ? `$${summary.referral_revenue_usd.toLocaleString()}`
                : '—'}
            </p>
          </div>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card title="按围场接通质量">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
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
              <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
              <Bar
                dataKey="CC接通"
                fill={CHART_PALETTE.c1}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="SS接通"
                fill={CHART_PALETTE.c2}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="LP接通"
                fill={CHART_PALETTE.c3}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="有效打卡"
                fill={CHART_PALETTE.c4}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="分围场明细">
        {byEnclosure.length === 0 ? (
          <EmptyState title="暂无分围场数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th text-left">围场</th>
                  <th className="slide-th text-right">学员数</th>
                  <th className="slide-th text-right">CC 接通</th>
                  <th className="slide-th text-right">CC 接通率</th>
                  <th className="slide-th text-right">SS 接通</th>
                  <th className="slide-th text-right">LP 接通</th>
                  <th className="slide-th text-right">有效打卡</th>
                  <th className="slide-th text-right">转介绍注册</th>
                  <th className="slide-th text-right">转介绍付费</th>
                  <th className="slide-th text-right">带新金额 USD</th>
                </tr>
              </thead>
              <tbody>
                {byEnclosure.map((row, i) => (
                  <tr key={i} className="even:bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]">
                    <td className="slide-td font-medium">{row.enclosure ?? '—'}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(row.students)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums font-semibold text-action-accent">
                      {safeNum(row.cc_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {safeRate(row.cc_connected, row.students)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-purple-600">
                      {safeNum(row.ss_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-amber-800">
                      {safeNum(row.lp_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-emerald-800">
                      {safeNum(row.effective_checkin)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(row.referral_registrations)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(row.referral_payments)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-green-600 font-medium">
                      {row.referral_revenue_usd != null
                        ? `$${row.referral_revenue_usd.toLocaleString()}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
