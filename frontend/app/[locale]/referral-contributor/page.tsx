'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

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
import { formatRate, fmtEnc } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';

/* ── 类型定义 ─────────────────────────────────────────────── */

interface ContributorRow {
  stdt_id: string;
  enclosure: string;
  cc_new_count: number;
  ss_new_count: number;
  lp_new_count: number;
  wide_new_count: number;
  cc_paid_count: number;
  ss_paid_count: number;
  lp_paid_count: number;
  wide_paid_count: number;
  total_new: number;
  total_paid: number;
  conversion_rate: number;
  historical_coding_count: number;
}

interface ReferralContributorResponse {
  total_contributors: number;
  top_contributors: ContributorRow[];
}

/* ── 工具函数 ─────────────────────────────────────────────── */

type SortKey = keyof ContributorRow;

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—';
  if (decimals > 0) return v.toFixed(decimals);
  return v.toLocaleString();
}

function pct(v: number | null | undefined): string {
  return formatRate(v);
}

/* ── 主页面 ─────────────────────────────────────────────── */

export default function ReferralContributorPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });
  const locale = useLocale();
  const t = useTranslations('referralContributor');
  const { data, isLoading, error, mutate } = useFilteredSWR<ReferralContributorResponse>(
    '/api/analysis/referral-contributor'
  );

  const [sortKey, setSortKey] = useState<SortKey>('total_new');
  const [sortAsc, setSortAsc] = useState(false);
  const { exportCSV } = useExport();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t('loadFailed')}
        description={t('loadFailedDesc')}
        action={{ label: t('retry'), onClick: () => mutate() }}
      />
    );
  }

  const contributors = data?.top_contributors ?? [];

  if (contributors.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />;
  }

  /* 汇总计算 */
  const totalNew = contributors.reduce((s, r) => s + r.total_new, 0);
  const totalPaid = contributors.reduce((s, r) => s + r.total_paid, 0);
  const ccNew = contributors.reduce((s, r) => s + r.cc_new_count, 0);
  const ssNew = contributors.reduce((s, r) => s + r.ss_new_count, 0);
  const lpNew = contributors.reduce((s, r) => s + r.lp_new_count, 0);
  const wideNew = contributors.reduce((s, r) => s + r.wide_new_count, 0);
  const ccPaid = contributors.reduce((s, r) => s + r.cc_paid_count, 0);
  const ssPaid = contributors.reduce((s, r) => s + r.ss_paid_count, 0);
  const lpPaid = contributors.reduce((s, r) => s + r.lp_paid_count, 0);
  const widePaid = contributors.reduce((s, r) => s + r.wide_paid_count, 0);

  /* 渠道条形图数据 */
  const channelChartData = [
    { channel: t('chCCNarrow'), [t('barNew')]: ccNew, [t('barPaid')]: ccPaid },
    { channel: t('chSSNarrow'), [t('barNew')]: ssNew, [t('barPaid')]: ssPaid },
    { channel: t('chLPNarrow'), [t('barNew')]: lpNew, [t('barPaid')]: lpPaid },
    { channel: t('chWide'), [t('barNew')]: wideNew, [t('barPaid')]: widePaid },
  ];

  /* 排序 */
  const sorted = [...contributors].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-muted-token ml-0.5">⇅</span>;
    return <span className="text-primary-token ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    exportCSV(
      sorted as unknown as Record<string, unknown>[],
      [
        { key: 'stdt_id', label: t('exportStudentId') },
        { key: 'enclosure', label: t('exportEnclosure') },
        { key: 'cc_new_count', label: t('exportCCNew') },
        { key: 'ss_new_count', label: t('exportSSNew') },
        { key: 'lp_new_count', label: t('exportLPNew') },
        { key: 'wide_new_count', label: t('exportWideNew') },
        { key: 'total_new', label: t('exportTotalNew') },
        { key: 'cc_paid_count', label: t('exportCCPaid') },
        { key: 'ss_paid_count', label: t('exportSSPaid') },
        { key: 'lp_paid_count', label: t('exportLPPaid') },
        { key: 'wide_paid_count', label: t('exportWidePaid') },
        { key: 'total_paid', label: t('exportTotalPaid') },
        { key: 'conversion_rate', label: t('exportConvRate') },
        { key: 'historical_coding_count', label: t('exportHistCoding') },
      ],
      `转介绍贡献_${today}`
    );
  }

  return (
    <div className="space-y-3">
      {/* 页头 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="text-sm text-secondary-token mt-1">{t('pageSubtitle')}</p>
          <p className="text-xs text-muted-token mt-0.5">{t('pageDesc')}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-muted-token mb-1">{t('totalContributors')}</p>
            <p className="text-3xl font-bold text-primary-token">
              {(data?.total_contributors ?? contributors.length).toLocaleString()}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-muted-token mb-1">{t('totalPaid')}</p>
            <p className="text-3xl font-bold text-success-token">{totalPaid.toLocaleString()}</p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-muted-token mb-1">{t('totalNew')}</p>
            <p className="text-3xl font-bold text-action-accent">{totalNew.toLocaleString()}</p>
            <p className="text-xs text-muted-token mt-1">
              {t('overallConv')} {totalNew > 0 ? formatRate(totalPaid / totalNew) : '—'}
            </p>
          </div>
        </Card>
      </div>

      {/* 渠道汇总条形图 */}
      <Card title={t('chartTitle')}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={channelChartData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
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
              dataKey={t('barNew')}
              fill="var(--chart-2-hex)"
              radius={[3, 3, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
            <Bar
              dataKey={t('barPaid')}
              fill="var(--chart-4-hex)"
              radius={[3, 3, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* TOP 推荐者排行表 */}
      <Card
        title={`${t('rankTableTitle')} ${(data?.total_contributors ?? contributors.length).toLocaleString()} ${t('rankTableMid')} ${sorted.length} ${t('rankTableSuffix')}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">{t('colRank')}</th>
                <th className="slide-th text-left">{t('colStudentId')}</th>
                <th
                  className="slide-th text-center cursor-pointer select-none"
                  onClick={() => handleSort('enclosure')}
                >
                  {t('colEnclosure')}
                  {sortIcon('enclosure')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('cc_new_count')}
                >
                  {t('colCCNew')}
                  {sortIcon('cc_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('ss_new_count')}
                >
                  {t('colSSNew')}
                  {sortIcon('ss_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('lp_new_count')}
                >
                  {t('colLPNew')}
                  {sortIcon('lp_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('wide_new_count')}
                >
                  {t('colWideNew')}
                  {sortIcon('wide_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_new')}
                >
                  {t('colTotalNew')}
                  {sortIcon('total_new')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_paid')}
                >
                  {t('colTotalPaid')}
                  {sortIcon('total_paid')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('conversion_rate')}
                >
                  {t('colConvRate')}
                  {sortIcon('conversion_rate')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('historical_coding_count')}
                >
                  {t('colHistCoding')}
                  {sortIcon('historical_coding_count')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.stdt_id} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td text-center text-muted-token font-mono">{i + 1}</td>
                  <td className="slide-td font-mono text-xs text-secondary-token">{r.stdt_id}</td>
                  <td className="slide-td text-center">
                    <span className="text-xs bg-subtle text-secondary-token px-1.5 py-0.5 rounded">
                      {fmtEnc(r.enclosure)}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.cc_new_count > 0 ? (
                      <span className="text-action-accent font-semibold">{r.cc_new_count}</span>
                    ) : (
                      <span className="text-muted-token">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.ss_new_count > 0 ? (
                      <span className="text-accent-token font-semibold">{r.ss_new_count}</span>
                    ) : (
                      <span className="text-muted-token">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.lp_new_count > 0 ? (
                      <span className="text-orange-600 font-semibold">{r.lp_new_count}</span>
                    ) : (
                      <span className="text-muted-token">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.wide_new_count > 0 ? (
                      <span className="text-cyan-600 font-semibold">{r.wide_new_count}</span>
                    ) : (
                      <span className="text-muted-token">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-bold text-primary-token">
                    {r.total_new}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-bold text-success-token">
                    {r.total_paid > 0 ? (
                      r.total_paid
                    ) : (
                      <span className="text-muted-token font-normal">0</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    <span
                      className={
                        r.conversion_rate >= 0.3
                          ? 'text-success-token font-semibold'
                          : r.conversion_rate > 0
                            ? 'text-warning-token'
                            : 'text-muted-token'
                      }
                    >
                      {pct(r.conversion_rate)}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-secondary-token">
                    {fmt(r.historical_coding_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-token mt-2 px-1">{t('tableFooter')}</p>
      </Card>
    </div>
  );
}
