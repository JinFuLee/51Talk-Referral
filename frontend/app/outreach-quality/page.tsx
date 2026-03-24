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

interface OutreachQualityRow {
  enclosure: string | null;
  cc_group: string | null;
  cc_connected: number | null;
  ss_connected: number | null;
  lp_connected: number | null;
  effective_checkin: number | null;
  referral_registrations: number | null;
  referral_payments: number | null;
  referral_revenue_usd: number | null;
  students: number | null;
}

interface OutreachQualitySummary {
  summary: OutreachQualityRow;
  by_enclosure: OutreachQualityRow[];
}

function safeRate(connected: number | null, students: number | null): string {
  if (!connected || !students || students === 0) return '—';
  return `${((connected / students) * 100).toFixed(1)}%`;
}

function safeNum(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString();
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function OutreachQualityPage() {
  const { data, isLoading, error } = useSWR<OutreachQualitySummary>(
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
    return <EmptyState title="数据加载失败" description="无法获取接通质量数据，请检查后端服务" />;
  }

  const summary = data?.summary;
  const byEnclosure = data?.by_enclosure ?? [];

  if (!summary && byEnclosure.length === 0) {
    return (
      <EmptyState title="暂无接通质量数据" description="请上传包含 D3 明细表的数据文件后刷新" />
    );
  }

  // 构造围场接通条形图数据
  const chartData = byEnclosure
    .filter((r) => r.enclosure)
    .map((r) => ({
      name: r.enclosure ?? '—',
      CC接通: r.cc_connected ?? 0,
      SS接通: r.ss_connected ?? 0,
      LP接通: r.lp_connected ?? 0,
    }));

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">接通质量分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          CC / SS / LP 三角色接通数 · 有效打卡 · 转介绍产出
        </p>
      </div>

      {/* 全量汇总卡片 */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard
            label="CC 接通数"
            value={safeNum(summary.cc_connected)}
            sub={`接通率 ${safeRate(summary.cc_connected, summary.students)}`}
          />
          <SummaryCard
            label="SS 接通数"
            value={safeNum(summary.ss_connected)}
            sub={`接通率 ${safeRate(summary.ss_connected, summary.students)}`}
          />
          <SummaryCard
            label="LP 接通数"
            value={safeNum(summary.lp_connected)}
            sub={`接通率 ${safeRate(summary.lp_connected, summary.students)}`}
          />
          <SummaryCard label="有效打卡" value={safeNum(summary.effective_checkin)} />
          <SummaryCard label="转介绍注册" value={safeNum(summary.referral_registrations)} />
          <SummaryCard
            label="转介绍付费"
            value={safeNum(summary.referral_payments)}
            sub={`$${safeNum(summary.referral_revenue_usd)}`}
          />
        </div>
      )}

      {/* 按围场接通条形图 */}
      {chartData.length > 0 && (
        <Card title="各围场接通数分布">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="CC接通" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="SS接通" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="LP接通" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 按围场明细表 */}
      <Card title="围场明细">
        {byEnclosure.length === 0 ? (
          <EmptyState title="暂无围场数据" description="上传数据后自动刷新" />
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
                  <th className="slide-th text-right">注册</th>
                  <th className="slide-th text-right">付费</th>
                  <th className="slide-th text-right">业绩 USD</th>
                </tr>
              </thead>
              <tbody>
                {byEnclosure.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td font-medium">{r.enclosure ?? '—'}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(r.students)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(r.cc_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-blue-600 font-medium">
                      {safeRate(r.cc_connected, r.students)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(r.ss_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(r.lp_connected)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(r.effective_checkin)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(r.referral_registrations)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {safeNum(r.referral_payments)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-green-600 font-medium">
                      ${safeNum(r.referral_revenue_usd)}
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
