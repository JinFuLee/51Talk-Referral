'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EnclosureSSMetrics, EnclosureLPMetrics } from '@/lib/types/enclosure-ss-lp';

/* ── 工具函数 ───────────────────────────────────────────────── */

function metricColor(value: number | null, thresholds: [number, number]) {
  if (value === null) return 'text-[var(--text-muted)]';
  if (value >= thresholds[1]) return 'text-green-600 font-semibold';
  if (value >= thresholds[0]) return 'text-yellow-600';
  return 'text-red-500';
}

function safe(v: number | null, decimals = 0): string {
  if (v === null || v === undefined) return '—';
  return decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
}

function safeRate(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return formatRate(v);
}

/* ── 排名徽章 ─────────────────────────────────────────────── */

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

/* ── SS 排名表格 ──────────────────────────────────────────── */

function SSRankingTable({ rows }: { rows: EnclosureSSMetrics[] }) {
  const sorted = [...rows]
    .filter((r) => r.ss_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  if (sorted.length === 0) {
    return <EmptyState title="暂无 SS 数据" description="上传围场数据后自动生成" />;
  }

  return (
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
                {r.revenue_usd !== null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── SS 围场分布汇总 ───────────────────────────────────────── */

function SSEnclosureSummary({ rows }: { rows: EnclosureSSMetrics[] }) {
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

  const summary = Object.entries(byEnclosure).sort(
    (a, b) => b[1].registrations - a[1].registrations
  );

  if (summary.length === 0) {
    return <EmptyState title="暂无围场汇总数据" description="上传数据后自动刷新" />;
  }

  return (
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
          {summary.map(([enc, data], i) => (
            <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
              <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">{enc}</td>
              <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                {data.students.toLocaleString()}
              </td>
              <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                {data.registrations.toLocaleString()}
              </td>
              <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                {data.payments.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── LP 排名表格 ──────────────────────────────────────────── */

function LPRankingTable({ rows }: { rows: EnclosureLPMetrics[] }) {
  const sorted = [...rows]
    .filter((r) => r.lp_name)
    .sort((a, b) => (b.registrations ?? 0) - (a.registrations ?? 0));

  if (sorted.length === 0) {
    return <EmptyState title="暂无 LP 数据" description="上传围场数据后自动生成" />;
  }

  return (
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
                {r.revenue_usd !== null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── LP 围场分布汇总 ───────────────────────────────────────── */

function LPEnclosureSummary({ rows }: { rows: EnclosureLPMetrics[] }) {
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

  const summary = Object.entries(byEnclosure).sort(
    (a, b) => b[1].registrations - a[1].registrations
  );

  if (summary.length === 0) {
    return <EmptyState title="暂无围场汇总数据" description="上传数据后自动刷新" />;
  }

  return (
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
          {summary.map(([enc, data], i) => (
            <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
              <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">{enc}</td>
              <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                {data.students.toLocaleString()}
              </td>
              <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                {data.registrations.toLocaleString()}
              </td>
              <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                {data.payments.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tab 组件 ─────────────────────────────────────────────── */

type TabKey = 'SS' | 'LP';

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-subtle)] rounded-lg p-1 w-fit">
      {(['SS', 'LP'] as TabKey[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === t
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t} {t === 'SS' ? '后端销售' : '后端服务'}
        </button>
      ))}
    </div>
  );
}

/* ── 主页面 ───────────────────────────────────────────────── */

export default function SSLPMatrixPage() {
  const [tab, setTab] = useState<TabKey>('SS');

  const {
    data: ssData,
    isLoading: ssLoading,
    error: ssError,
  } = useSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', swrFetcher);
  const {
    data: lpData,
    isLoading: lpLoading,
    error: lpError,
  } = useSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', swrFetcher);

  const isLoading = tab === 'SS' ? ssLoading : lpLoading;
  const error = tab === 'SS' ? ssError : lpError;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">SS / LP 矩阵</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          后端销售 (SS) 与后端服务 (LP) 围场分布与指标排名
        </p>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState
          title="数据加载失败"
          description="请检查后端服务是否正常运行，或数据源是否已上传"
        />
      ) : tab === 'SS' ? (
        <>
          <Card title="SS 排名（按注册数降序）">
            <SSRankingTable rows={ssData ?? []} />
          </Card>
          <Card title="SS 围场分布汇总">
            <SSEnclosureSummary rows={ssData ?? []} />
          </Card>
        </>
      ) : (
        <>
          <Card title="LP 排名（按注册数降序）">
            <LPRankingTable rows={lpData ?? []} />
          </Card>
          <Card title="LP 围场分布汇总">
            <LPEnclosureSummary rows={lpData ?? []} />
          </Card>
        </>
      )}
    </div>
  );
}
