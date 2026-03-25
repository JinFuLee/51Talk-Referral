'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import type { EnclosureCCMetrics } from '@/lib/types/enclosure';
import type { EnclosureBenchmarkRow } from '@/lib/types/cross-analysis';
import type { EnclosureSSMetrics, EnclosureLPMetrics } from '@/lib/types/enclosure-ss-lp';

/* ── 常量 ──────────────────────────────────────────────────── */

type TabKey = 'all' | 'cc' | 'ss' | 'lp';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部汇总' },
  { key: 'cc', label: 'CC 前端' },
  { key: 'ss', label: 'SS 后端' },
  { key: 'lp', label: 'LP 服务' },
];

const ENCLOSURE_FILTERS = [
  { label: '全部', value: '' },
  { label: '0~30天', value: '0-30' },
  { label: '31~60天', value: '31-60' },
  { label: '61~90天', value: '61-90' },
  { label: '91~180天', value: '91-180' },
  { label: '181天+', value: '181+' },
];

/* ── 工具函数 ───────────────────────────────────────────────── */

function metricColor(value: number | null | undefined, thresholds: [number, number]) {
  if (value === null || value === undefined) return 'text-[var(--text-muted)]';
  if (value >= thresholds[1]) return 'text-green-600 font-semibold';
  if (value >= thresholds[0]) return 'text-yellow-600';
  return 'text-red-500';
}

function safe(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return '—';
  return decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
}

function safeRate(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return formatRate(v);
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-yellow-100 text-yellow-700'
      : rank === 2
        ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-[var(--text-muted)]';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-subtle)] rounded-lg p-1 w-fit">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === t.key
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── CC Tab 内容 ──────────────────────────────────────────── */

interface EnclosureResponse {
  data: EnclosureCCMetrics[];
}

interface CCRankingItem {
  cc_name: string;
  cc_group: string;
  participation_rate: number;
  cargo_ratio: number;
  registrations: number;
  payments: number;
}

interface CCRankingResponse {
  rankings: CCRankingItem[];
}

function CCTabContent({
  filter,
  onFilterChange,
}: {
  filter: string;
  onFilterChange: (v: string) => void;
}) {
  const apiUrl = filter
    ? `/api/enclosure?enclosure=${encodeURIComponent(filter)}`
    : '/api/enclosure';
  const {
    data: enclosureData,
    isLoading: e1,
    error: err1,
  } = useSWR<EnclosureResponse>(apiUrl, swrFetcher);
  const {
    data: rankingData,
    isLoading: e2,
    error: err2,
  } = useSWR<CCRankingResponse>('/api/enclosure/ranking', swrFetcher);
  const { data: benchmarkData } = useSWR<EnclosureBenchmarkRow[]>(
    '/api/enclosure-health/benchmark',
    swrFetcher
  );

  if (e1 || e2) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (err1 || err2) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        <p>数据加载失败</p>
        <p className="text-xs mt-1">{(err1 ?? err2)?.message ?? '请检查后端服务是否正常运行'}</p>
      </div>
    );
  }

  const rows = Array.isArray(enclosureData) ? enclosureData : (enclosureData?.data ?? []);
  const rankings = Array.isArray(rankingData) ? rankingData : (rankingData?.rankings ?? []);

  return (
    <div className="space-y-3">
      {/* 围场筛选器 */}
      <div className="flex flex-wrap gap-2">
        {ENCLOSURE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f.value
                ? 'bg-navy-500 text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 围场×CC 表格 */}
      <Card title="围场 × CC 矩阵">
        {rows.length === 0 ? (
          <EmptyState title="暂无围场数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-1.5 px-2">围场段</th>
                  <th className="slide-th slide-th-left py-1.5 px-2">CC</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">有效学员</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">参与率</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">带新系数</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">带货比</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">打卡率</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">注册数</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">SS触达率</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">LP触达率</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">付费数</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">业绩(USD)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1 px-2 text-[var(--text-secondary)]">
                      {r.enclosure}
                    </td>
                    <td className="slide-td py-1 px-2 font-medium">{r.cc_name}</td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.students ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {formatRate(r.participation_rate)}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.new_coefficient ?? 0).toFixed(2)}
                    </td>
                    <td
                      className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.cargo_ratio, [0.05, 0.1])}`}
                    >
                      {formatRate(r.cargo_ratio)}
                    </td>
                    <td
                      className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                    >
                      {formatRate(r.checkin_rate)}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.registrations ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.ss_reach_rate ?? 0, [0.3, 0.5])}`}
                    >
                      {formatRate(r.ss_reach_rate ?? 0)}
                    </td>
                    <td
                      className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.lp_reach_rate ?? 0, [0.3, 0.5])}`}
                    >
                      {formatRate(r.lp_reach_rate ?? 0)}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.payments ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      ${(r.revenue_usd ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 围场段漏斗对比 */}
      <Card title="围场段漏斗对比（注册→付费转化率）">
        {!benchmarkData || benchmarkData.length === 0 ? (
          <EmptyState title="暂无漏斗对比数据" description="上传围场数据后自动生成" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={benchmarkData.map((b) => ({
                name: b.segment,
                参与率: Math.round(b.participation * 100),
                转化率: Math.round(b.conversion * 100),
                触达率: Math.round(b.reach * 100),
              }))}
              margin={{ top: 8, right: 12, bottom: 20, left: 0 }}
              barCategoryGap="30%"
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                unit="%"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`]}
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="参与率" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="转化率" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="触达率" fill="#a855f7" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* CC 排名表格 */}
      <Card title="CC 排名（按参与率）">
        {rankings.length === 0 ? (
          <EmptyState title="暂无排名数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-1.5 px-2">排名</th>
                  <th className="slide-th slide-th-left py-1.5 px-2">CC</th>
                  <th className="slide-th slide-th-left py-1.5 px-2">组别</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">参与率</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">带货比</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">注册数</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">付费数</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr
                    key={`${r.cc_name}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1 px-2 font-medium">{r.cc_name}</td>
                    <td className="slide-td py-1 px-2 text-[var(--text-secondary)]">
                      {r.cc_group}
                    </td>
                    <td
                      className={`slide-td py-1 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {formatRate(r.participation_rate)}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {formatRate(r.cargo_ratio)}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1 px-2 text-right font-mono tabular-nums">
                      {(r.payments ?? 0).toLocaleString()}
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

/* ── SS Tab 内容 ──────────────────────────────────────────── */

function SSTabContent() {
  const {
    data: ssData,
    isLoading,
    error,
  } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title="数据加载失败" description="请检查后端服务是否正常运行" />;
  }

  const rows = ssData ?? [];
  const sorted = [...rows]
    .filter((r) => r.ss_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  const byEnclosure = rows.reduce<
    Record<string, { registrations: number; payments: number; students: number }>
  >((acc, r) => {
    const key = r.enclosure;
    if (!acc[key]) acc[key] = { registrations: 0, payments: 0, students: 0 };
    acc[key].registrations += r.registrations ?? 0;
    acc[key].payments += r.payments ?? 0;
    acc[key].students += r.students ?? 0;
    return acc;
  }, {});
  const enclosureSummary = Object.entries(byEnclosure).sort(
    (a, b) => b[1].registrations - a[1].registrations
  );

  return (
    <div className="space-y-3">
      <Card title="SS 排名（按注册数降序）">
        {sorted.length === 0 ? (
          <EmptyState title="暂无 SS 数据" description="上传围场数据后自动生成" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">排名</th>
                  <th className="slide-th slide-th-left py-2 px-2">姓名</th>
                  <th className="slide-th slide-th-left py-2 px-2">组别</th>
                  <th className="slide-th slide-th-right py-2 px-2">学员数</th>
                  <th className="slide-th slide-th-right py-2 px-2">参与率</th>
                  <th className="slide-th slide-th-right py-2 px-2">打卡率</th>
                  <th className="slide-th slide-th-right py-2 px-2">触达率</th>
                  <th className="slide-th slide-th-right py-2 px-2">注册数</th>
                  <th className="slide-th slide-th-right py-2 px-2">付费数</th>
                  <th className="slide-th slide-th-right py-2 px-2">业绩(USD)</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={`${r.ss_name}-${r.enclosure}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.ss_name ?? '—'}</td>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {r.ss_group ?? '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.students)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {safeRate(r.participation_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.checkin_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.ss_reach_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.ss_reach_rate)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.registrations)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.payments)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="SS 围场分布汇总">
        {enclosureSummary.length === 0 ? (
          <EmptyState title="暂无围场汇总数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">围场段</th>
                  <th className="slide-th slide-th-right py-2 px-2">学员数</th>
                  <th className="slide-th slide-th-right py-2 px-2">注册数</th>
                  <th className="slide-th slide-th-right py-2 px-2">付费数</th>
                </tr>
              </thead>
              <tbody>
                {enclosureSummary.map(([enc, data], i) => (
                  <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">{enc}</td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.students ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.payments ?? 0).toLocaleString()}
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

/* ── LP Tab 内容 ──────────────────────────────────────────── */

function LPTabContent() {
  const {
    data: lpData,
    isLoading,
    error,
  } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title="数据加载失败" description="请检查后端服务是否正常运行" />;
  }

  const rows = lpData ?? [];
  const sorted = [...rows]
    .filter((r) => r.lp_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  const byEnclosure = rows.reduce<
    Record<string, { registrations: number; payments: number; students: number }>
  >((acc, r) => {
    const key = r.enclosure;
    if (!acc[key]) acc[key] = { registrations: 0, payments: 0, students: 0 };
    acc[key].registrations += r.registrations ?? 0;
    acc[key].payments += r.payments ?? 0;
    acc[key].students += r.students ?? 0;
    return acc;
  }, {});
  const enclosureSummary = Object.entries(byEnclosure).sort(
    (a, b) => b[1].registrations - a[1].registrations
  );

  return (
    <div className="space-y-3">
      <Card title="LP 排名（按注册数降序）">
        {sorted.length === 0 ? (
          <EmptyState title="暂无 LP 数据" description="上传围场数据后自动生成" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">排名</th>
                  <th className="slide-th slide-th-left py-2 px-2">姓名</th>
                  <th className="slide-th slide-th-left py-2 px-2">组别</th>
                  <th className="slide-th slide-th-right py-2 px-2">学员数</th>
                  <th className="slide-th slide-th-right py-2 px-2">参与率</th>
                  <th className="slide-th slide-th-right py-2 px-2">打卡率</th>
                  <th className="slide-th slide-th-right py-2 px-2">触达率</th>
                  <th className="slide-th slide-th-right py-2 px-2">注册数</th>
                  <th className="slide-th slide-th-right py-2 px-2">付费数</th>
                  <th className="slide-th slide-th-right py-2 px-2">业绩(USD)</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={`${r.lp_name}-${r.enclosure}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.lp_name ?? '—'}</td>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                      {r.lp_group ?? '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.students)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {safeRate(r.participation_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.checkin_rate)}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.lp_reach_rate, [0.3, 0.5])}`}
                    >
                      {safeRate(r.lp_reach_rate)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.registrations)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {safe(r.payments)}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="LP 围场分布汇总">
        {enclosureSummary.length === 0 ? (
          <EmptyState title="暂无围场汇总数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">围场段</th>
                  <th className="slide-th slide-th-right py-2 px-2">学员数</th>
                  <th className="slide-th slide-th-right py-2 px-2">注册数</th>
                  <th className="slide-th slide-th-right py-2 px-2">付费数</th>
                </tr>
              </thead>
              <tbody>
                {enclosureSummary.map(([enc, data], i) => (
                  <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">{enc}</td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.students ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(data.payments ?? 0).toLocaleString()}
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

/* ── 全部汇总 Tab ─────────────────────────────────────────── */

function AllTabContent() {
  const { data: ccData } = useSWR<EnclosureResponse>('/api/enclosure', swrFetcher);
  const { data: ssData } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);
  const { data: lpData } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);

  const ccRows = Array.isArray(ccData) ? ccData : (ccData?.data ?? []);
  const ssRows = ssData ?? [];
  const lpRows = lpData ?? [];

  const ccTotal = { students: 0, registrations: 0, payments: 0, revenue: 0 };
  ccRows.forEach((r) => {
    ccTotal.students += r.students ?? 0;
    ccTotal.registrations += r.registrations ?? 0;
    ccTotal.payments += r.payments ?? 0;
    ccTotal.revenue += r.revenue_usd ?? 0;
  });

  const ssTotal = { students: 0, registrations: 0, payments: 0, revenue: 0 };
  ssRows.forEach((r) => {
    ssTotal.students += r.students ?? 0;
    ssTotal.registrations += r.registrations ?? 0;
    ssTotal.payments += r.payments ?? 0;
    ssTotal.revenue += r.revenue_usd ?? 0;
  });

  const lpTotal = { students: 0, registrations: 0, payments: 0, revenue: 0 };
  lpRows.forEach((r) => {
    lpTotal.students += r.students ?? 0;
    lpTotal.registrations += r.registrations ?? 0;
    lpTotal.payments += r.payments ?? 0;
    lpTotal.revenue += r.revenue_usd ?? 0;
  });

  const summaryItems = [
    { role: 'CC 前端', color: 'border-navy-400', ...ccTotal },
    { role: 'SS 后端', color: 'border-green-500', ...ssTotal },
    { role: 'LP 服务', color: 'border-purple-500', ...lpTotal },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryItems.map((item) => (
          <div
            key={item.role}
            className={`bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] border-l-4 ${item.color} p-4 space-y-2`}
          >
            <div className="text-sm font-semibold text-[var(--text-primary)]">{item.role}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[var(--text-muted)]">有效学员</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  {(item.students ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">注册数</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  {(item.registrations ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">付费数</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  {(item.payments ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">业绩(USD)</div>
                <div className="font-mono font-semibold text-[var(--text-primary)]">
                  ${(item.revenue ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 主页面内部（需要 useSearchParams） ───────────────────── */

function EnclosurePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const [ccFilter, setCcFilter] = useState('');

  function handleTabChange(t: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    router.replace(`/enclosure?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">围场分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          围场分段 × 三岗矩阵 · CC / SS / LP 全维度视图
        </p>
      </div>

      <TabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === 'all' && <AllTabContent />}
      {activeTab === 'cc' && <CCTabContent filter={ccFilter} onFilterChange={setCcFilter} />}
      {activeTab === 'ss' && <SSTabContent />}
      {activeTab === 'lp' && <LPTabContent />}
    </div>
  );
}

/* ── 导出（Suspense 包裹 useSearchParams） ────────────────── */

export default function EnclosurePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <EnclosurePageInner />
    </Suspense>
  );
}
