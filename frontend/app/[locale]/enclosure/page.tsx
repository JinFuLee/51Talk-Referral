'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

/* ── i18n ───────────────────────────────────────────────────── */

import { formatRate, metricColor, fmtEnc } from '@/lib/utils';
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
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import { SegmentedTabs } from '@/components/ui/PageTabs';
import { BrandDot } from '@/components/ui/BrandDot';

/* ── 常量 ──────────────────────────────────────────────────── */

type TabKey = 'all' | 'cc' | 'ss' | 'lp';

const ENCLOSURE_FILTER_VALUES = [
  '',
  '0M',
  '1M',
  '2M',
  '3M',
  '4M',
  '5M',
  '6M',
  '7M',
  '8M',
  '9M',
  '10M',
  '11M',
  '12M',
  '12M+',
];

const ENCLOSURE_FILTER_LABELS: Record<string, string> = {
  '': '',
  '0M': 'M0（0~30）',
  '1M': 'M1（31~60）',
  '2M': 'M2（61~90）',
  '3M': 'M3（91~120）',
  '4M': 'M4（121~150）',
  '5M': 'M5（151~180）',
  '6M': 'M6（181~210）',
  '7M': 'M7（211~240）',
  '8M': 'M8（241~270）',
  '9M': 'M9（271~300）',
  '10M': 'M10（301~330）',
  '11M': 'M11（331~360）',
  '12M': 'M12（361~390）',
  '12M+': 'M12+（391+）',
};

/* ── 工具函数 ───────────────────────────────────────────────── */

// metricColor 已移至 lib/utils.ts 共享

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
      ? 'bg-warning-surface text-warning-token'
      : rank === 2
        ? 'bg-subtle text-secondary-token'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-muted-token';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({
  active,
  onChange,
  t,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  t: (key: string) => string;
}) {
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('tabAll') },
    { key: 'cc', label: t('tabCC') },
    { key: 'ss', label: t('tabSS') },
    { key: 'lp', label: t('tabLP') },
  ];
  return <SegmentedTabs tabs={TABS} active={active} onChange={onChange} />;
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
  t,
}: {
  filter: string;
  onFilterChange: (v: string) => void;
  t: (key: string) => string;
}) {
  const enclosureExtra = filter ? { enclosure: filter } : undefined;
  const {
    data: enclosureData,
    isLoading: e1,
    error: err1,
  } = useFilteredSWR<EnclosureResponse>('/api/enclosure', undefined, enclosureExtra);
  const {
    data: rankingData,
    isLoading: e2,
    error: err2,
  } = useFilteredSWR<CCRankingResponse>('/api/enclosure/ranking', undefined, enclosureExtra);
  const { data: benchmarkData } = useFilteredSWR<EnclosureBenchmarkRow[]>(
    '/api/enclosure-health/benchmark'
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
      <div className="p-8 text-center text-muted-token">
        <p>{t('loadFailed')}</p>
        <p className="text-xs mt-1">{(err1 ?? err2)?.message ?? t('loadFailedDesc')}</p>
      </div>
    );
  }

  const rows = Array.isArray(enclosureData) ? enclosureData : (enclosureData?.data ?? []);
  const rankings = Array.isArray(rankingData) ? rankingData : (rankingData?.rankings ?? []);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* CC matrix table */}
      <Card title={t('cardCCMatrix')}>
        {rows.length === 0 ? (
          <EmptyState title={t('emptyEnclosure')} description={t('emptyEnclosureDesc')} />
        ) : (
          <>
            <p className="text-[10px] text-muted-token mb-2">
              {t('colorHint')}
              <span className="text-success-token font-medium">{t('colorGreen')}</span> ·{' '}
              <span className="text-warning-token font-medium">{t('colorOrange')}</span> ·{' '}
              <span className="text-danger-token font-medium">{t('colorRed')}</span>
              {t('colorSuffix')}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="slide-thead-row">
                    <th className="slide-th slide-th-left py-1.5 px-2">{t('colEnclosure')}</th>
                    <th className="slide-th slide-th-left py-1.5 px-2">{t('colCC')}</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t('colStudents')} <BrandDot tooltip={t('colStudentsTip')} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t('colParticipation')} <BrandDot tooltip={t('colParticipationTip')} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t('colNewCoef')} <BrandDot tooltip={t('colNewCoefTip')} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t('colCargoRatio')} <BrandDot tooltip={t('colCargoRatioTip')} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t('colCheckin')} <BrandDot tooltip={t('colCheckinTip')} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">{t('colRegistrations')}</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t('colSSReach')} <BrandDot tooltip={t('colSSReachTip')} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">
                      {t('colLPReach')} <BrandDot tooltip={t('colLPReachTip')} />
                    </th>
                    <th className="slide-th slide-th-right py-1.5 px-2">付费数</th>
                    <th className="slide-th slide-th-right py-1.5 px-2">业绩(USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                      <td className="slide-td py-1 px-2 text-secondary-token">
                        {fmtEnc(r.enclosure)}
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
          </>
        )}
      </Card>

      {/* Enclosure funnel chart */}
      <Card title={t('cardFunnel')}>
        {!benchmarkData || benchmarkData.length === 0 ? (
          <EmptyState title={t('emptyFunnel')} description={t('emptyFunnelDesc')} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={benchmarkData.map((b) => ({
                name: b.segment,
                [t('chartParticipation')]: Math.round(b.participation * 100),
                [t('chartConversion')]: Math.round(b.conversion * 100),
                [t('chartReach')]: Math.round(b.reach * 100),
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
              <Bar
                dataKey={t('chartParticipation')}
                fill="var(--chart-2-hex)"
                radius={[2, 2, 0, 0]}
              />
              <Bar dataKey={t('chartConversion')} fill="var(--chart-4-hex)" radius={[2, 2, 0, 0]} />
              <Bar dataKey={t('chartReach')} fill="var(--chart-3-hex)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* CC ranking table */}
      <Card title={t('cardCCRank')}>
        {rankings.length === 0 ? (
          <EmptyState title={t('emptyRank')} description={t('emptyRankDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-1.5 px-2">{t('colRank')}</th>
                  <th className="slide-th slide-th-left py-1.5 px-2">{t('colCC')}</th>
                  <th className="slide-th slide-th-left py-1.5 px-2">{t('colGroup')}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t('colParticipation')}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t('colCargoRatio')}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t('colRegistrations')}</th>
                  <th className="slide-th slide-th-right py-1.5 px-2">{t('colPayments')}</th>
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
                    <td className="slide-td py-1 px-2 text-secondary-token">{r.cc_group}</td>
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

function SSTabContent({ filter, t }: { filter: string; t: (key: string) => string }) {
  const enclosureExtra = filter ? { enclosure: filter } : undefined;
  const {
    data: ssData,
    isLoading,
    error,
  } = useFilteredSWR<EnclosureSSMetrics[]>('/api/enclosure-ss', undefined, enclosureExtra);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title={t('loadFailed')} description={t('loadFailedDesc')} />;
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
    <div className="space-y-5 md:space-y-6">
      <Card title={t('cardSSRank')}>
        {sorted.length === 0 ? (
          <EmptyState title={t('emptySS')} description={t('emptySSDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t('colRank')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t('colEnclosure')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t('colName')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t('colGroup')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colStudents')} <BrandDot tooltip={t('colStudentsTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colParticipation')} <BrandDot tooltip={t('colParticipationTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colCheckin')} <BrandDot tooltip={t('colCheckinTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colReach')} <BrandDot tooltip={t('colReachTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colRegistrations')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colPayments')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colRevenue')}</th>
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
                    <td className="slide-td py-1.5 px-2 text-secondary-token">
                      {fmtEnc(r.enclosure)}
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.ss_name ?? '—'}</td>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">
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

      <Card title={t('cardSSEncSum')}>
        {enclosureSummary.length === 0 ? (
          <EmptyState title={t('emptySSSum')} description={t('emptySSDesc2')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t('colEnclosure')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colStudents')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colRegistrations')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colPayments')}</th>
                </tr>
              </thead>
              <tbody>
                {enclosureSummary.map(([enc, data], i) => (
                  <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">{fmtEnc(enc)}</td>
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

function LPTabContent({ filter, t }: { filter: string; t: (key: string) => string }) {
  const enclosureExtra = filter ? { enclosure: filter } : undefined;
  const {
    data: lpData,
    isLoading,
    error,
  } = useFilteredSWR<EnclosureLPMetrics[]>('/api/enclosure-lp', undefined, enclosureExtra);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title={t('loadFailed')} description={t('loadFailedDesc')} />;
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
    <div className="space-y-5 md:space-y-6">
      <Card title={t('cardLPRank')}>
        {sorted.length === 0 ? (
          <EmptyState title={t('emptyLP')} description={t('emptyLPDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t('colRank')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t('colEnclosure')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t('colName')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{t('colGroup')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colStudents')} <BrandDot tooltip={t('colStudentsTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colParticipation')} <BrandDot tooltip={t('colParticipationTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colCheckin')} <BrandDot tooltip={t('colCheckinTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {t('colReach')} <BrandDot tooltip={t('colReachTip')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colRegistrations')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colPayments')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colRevenue')}</th>
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
                    <td className="slide-td py-1.5 px-2 text-secondary-token">
                      {fmtEnc(r.enclosure)}
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.lp_name ?? '—'}</td>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">
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

      <Card title={t('cardLPEncSum')}>
        {enclosureSummary.length === 0 ? (
          <EmptyState title={t('emptySSSum')} description={t('emptySSDesc2')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{t('colEnclosure')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colStudents')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colRegistrations')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{t('colPayments')}</th>
                </tr>
              </thead>
              <tbody>
                {enclosureSummary.map(([enc, data], i) => (
                  <tr key={enc} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">{fmtEnc(enc)}</td>
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

function AllTabContent({ filter, t }: { filter: string; t: (key: string) => string }) {
  const enclosureExtra = filter ? { enclosure: filter } : undefined;
  const { data: ccData } = useFilteredSWR<EnclosureResponse>(
    '/api/enclosure',
    undefined,
    enclosureExtra
  );
  const { data: ssData } = useFilteredSWR<EnclosureSSMetrics[]>(
    '/api/enclosure-ss',
    undefined,
    enclosureExtra
  );
  const { data: lpData } = useFilteredSWR<EnclosureLPMetrics[]>(
    '/api/enclosure-lp',
    undefined,
    enclosureExtra
  );

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
    { role: t('tabCC'), color: 'border-action-accent', ...ccTotal },
    { role: t('tabSS'), color: 'border-success-token', ...ssTotal },
    { role: t('tabLP'), color: 'border-accent-token', ...lpTotal },
  ];

  // 围场效率 insight：按围场段汇总 CC 参与率，找最高/最低
  const enclosureParticipation = ccRows.reduce<Record<string, { rate: number; count: number }>>(
    (acc, r) => {
      if (!r.enclosure) return acc;
      if (!acc[r.enclosure]) acc[r.enclosure] = { rate: 0, count: 0 };
      acc[r.enclosure].rate += r.participation_rate ?? 0;
      acc[r.enclosure].count += 1;
      return acc;
    },
    {}
  );
  const enclosureAvgs = Object.entries(enclosureParticipation)
    .map(([seg, v]) => ({ seg, avg: v.count > 0 ? v.rate / v.count : 0 }))
    .sort((a, b) => b.avg - a.avg);
  const topEnclosure = enclosureAvgs[0];
  const lowEnclosures = enclosureAvgs.filter((e) => e.avg < 0.1 && e.avg > 0);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Enclosure efficiency insight card */}
      {topEnclosure && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-default-token border-l-4 border-l-blue-400 bg-accent-surface px-4 py-3">
          <div className="text-sm font-semibold text-primary-token">{t('insightTitle')}</div>
          <div className="text-xs text-secondary-token">
            <span className="font-medium text-primary-token">{topEnclosure.seg}</span>{' '}
            {t('insightHighest')}
            <span className="font-semibold text-success-token">
              {Math.round(topEnclosure.avg * 100)}%
            </span>
            ）
            {lowEnclosures.length > 0 && (
              <>
                ，{lowEnclosures.map((e) => e.seg).join('、')} {t('insightLow')}
              </>
            )}
            。
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryItems.map((item) => (
          <div
            key={item.role}
            className={`bg-surface rounded-lg border border-default-token border-l-4 ${item.color} p-4 space-y-2`}
          >
            <div className="text-sm font-semibold text-primary-token">{item.role}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-token">{t('colEffStudents')}</div>
                <div className="font-mono font-semibold text-primary-token">
                  {(item.students ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-token">{t('colRegCount')}</div>
                <div className="font-mono font-semibold text-primary-token">
                  {(item.registrations ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-token">{t('colPaidCount')}</div>
                <div className="font-mono font-semibold text-primary-token">
                  {(item.payments ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-token">{t('colRevUSD')}</div>
                <div className="font-mono font-semibold text-primary-token">
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
  const [encFilter, setEncFilter] = useState('');
  const { exportCSV } = useExport();
  const locale = useLocale();
  const t = useTranslations('enclosure');

  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });

  const { data: ccExportData } = useFilteredSWR<EnclosureResponse>('/api/enclosure');
  const { data: ssExportData } = useFilteredSWR<EnclosureSSMetrics[]>('/api/enclosure-ss');
  const { data: lpExportData } = useFilteredSWR<EnclosureLPMetrics[]>('/api/enclosure-lp');

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/enclosure?${params.toString()}`);
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === 'cc' || activeTab === 'all') {
      const rows = Array.isArray(ccExportData) ? ccExportData : (ccExportData?.data ?? []);
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'enclosure', label: t('colEnclosure') },
          { key: 'cc_name', label: t('colCC') },
          { key: 'students', label: t('colStudents') },
          { key: 'participation_rate', label: t('colParticipation') },
          { key: 'new_coefficient', label: t('colNewCoef') },
          { key: 'cargo_ratio', label: t('colCargoRatio') },
          { key: 'checkin_rate', label: t('colCheckin') },
          { key: 'registrations', label: t('colRegistrations') },
          { key: 'payments', label: t('colPayments') },
          { key: 'revenue_usd', label: t('colRevenue') },
        ],
        `enclosure_CC_${today}`
      );
    } else if (activeTab === 'ss') {
      const rows = ssExportData ?? [];
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'enclosure', label: t('colEnclosure') },
          { key: 'ss_name', label: t('colSS') },
          { key: 'students', label: t('colStudents') },
          { key: 'participation_rate', label: t('colParticipation') },
          { key: 'checkin_rate', label: t('colCheckin') },
          { key: 'registrations', label: t('colRegistrations') },
          { key: 'payments', label: t('colPayments') },
          { key: 'revenue_usd', label: t('colRevenue') },
        ],
        `enclosure_SS_${today}`
      );
    } else {
      const rows = lpExportData ?? [];
      exportCSV(
        rows as unknown as Record<string, unknown>[],
        [
          { key: 'enclosure', label: t('colEnclosure') },
          { key: 'lp_name', label: t('colLP') },
          { key: 'students', label: t('colStudents') },
          { key: 'participation_rate', label: t('colParticipation') },
          { key: 'checkin_rate', label: t('colCheckin') },
          { key: 'lp_reach_rate', label: t('colReach') },
          { key: 'registrations', label: t('colRegistrations') },
          { key: 'payments', label: t('colPayments') },
          { key: 'revenue_usd', label: t('colRevenue') },
        ],
        `enclosure_LP_${today}`
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="text-sm text-secondary-token mt-1">{t('pageDesc')}</p>
          <p className="text-sm text-muted-token mt-0.5">{t('pageDesc2')}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <TabBar active={activeTab} onChange={handleTabChange} t={t} />

      {/* Enclosure filter buttons */}
      <div className="flex flex-wrap gap-2">
        {ENCLOSURE_FILTER_VALUES.map((val) => (
          <button
            key={val}
            onClick={() => setEncFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              encFilter === val
                ? 'bg-action-accent text-white'
                : 'bg-subtle text-secondary-token hover:bg-n-200'
            }`}
          >
            {val === '' ? t('filterAll') : ENCLOSURE_FILTER_LABELS[val]}
          </button>
        ))}
      </div>

      {activeTab === 'all' && <AllTabContent filter={encFilter} t={t} />}
      {activeTab === 'cc' && (
        <CCTabContent filter={encFilter} onFilterChange={setEncFilter} t={t} />
      )}
      {activeTab === 'ss' && <SSTabContent filter={encFilter} t={t} />}
      {activeTab === 'lp' && <LPTabContent filter={encFilter} t={t} />}
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
