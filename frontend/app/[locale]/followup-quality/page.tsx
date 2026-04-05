'use client';

import { useState } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRate } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
/* ── 类型定义 ─────────────────────────────────────────────── */

interface FollowupSummary {
  total_students: number;
  high_quality_pct: number;
  low_quality_pct: number;
  suspicious_pct: number;
  avg_lost_days: number;
  lost_contact_count: number;
}

interface FollowupPerson {
  cc_name: string;
  cc_group: string;
  students: number;
  avg_call_duration_sec: number;
  high_quality_count: number;
  low_quality_count: number;
  suspicious_count: number;
  avg_lost_days: number;
  lost_14d_count: number;
  avg_note_delay_days: number;
  total_calls: number;
}

interface FollowupQualityResponse {
  summary: FollowupSummary;
  by_person: FollowupPerson[];
}

/* ── 工具函数 ─────────────────────────────────────────────── */

type SortKey = keyof FollowupPerson;

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—';
  if (decimals > 0) return v.toFixed(decimals);
  return v.toLocaleString();
}

function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pct(v: number | null | undefined): string {
  return formatRate(v);
}

/* ── Tab 按钮 ─────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

/* ── CC 内容 ─────────────────────────────────────────────── */

function CCContent() {
  const locale = useLocale();
  const t = useTranslations('followupQualityPage');

  const { data, isLoading, error, mutate } = useFilteredSWR<FollowupQualityResponse>(
    '/api/analysis/followup-quality',
    undefined,
    { role: 'cc' }
  );

  const [sortKey, setSortKey] = useState<SortKey>('students');
  const [sortAsc, setSortAsc] = useState(false);

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
        title={t('loadError')}
        description={t('loadErrorDesc')}
        action={{ label: t('retry'), onClick: () => mutate() }}
      />
    );
  }

  const persons = data?.by_person ?? [];
  const summary = data?.summary;

  if (persons.length === 0) {
    return <EmptyState title={t('noData')} description={t('noDataDesc')} />;
  }

  const sorted = [...persons].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
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

  return (
    <div className="space-y-3">
      {/* 汇总卡片 */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-muted-token mb-1">{t('highQualityPct')}</p>
              <p className="text-3xl font-bold text-success-token">
                {pct(summary.high_quality_pct)}
              </p>
              <p className="text-xs text-muted-token mt-1">{t('highQualityNote')}</p>
            </div>
          </Card>
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-muted-token mb-1">{t('suspiciousPct')}</p>
              <p className="text-3xl font-bold text-warning-token">{pct(summary.suspicious_pct)}</p>
              <p className="text-xs text-muted-token mt-1">{t('suspiciousNote')}</p>
            </div>
          </Card>
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-muted-token mb-1">{t('lostContact')}</p>
              <p className="text-3xl font-bold text-danger-token">
                {(summary.lost_contact_count ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-token mt-1">
                {t('lostContactNote', { total: summary.total_students ?? 0 })}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* CC 个人明细表 */}
      <Card title={t('tableTitle')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">{t('rank')}</th>
                <th className="slide-th text-left">{t('ccName')}</th>
                <th className="slide-th text-left">{t('group')}</th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('students')}
                >
                  {t('students')}
                  {sortIcon('students')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg_call_duration_sec')}
                >
                  {t('avgDuration')}
                  {sortIcon('avg_call_duration_sec')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('high_quality_count')}
                >
                  {t('highQualityCount')}
                  {sortIcon('high_quality_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('suspicious_count')}
                >
                  {t('suspiciousCount')}
                  {sortIcon('suspicious_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg_lost_days')}
                >
                  {t('avgLostDays')}
                  {sortIcon('avg_lost_days')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('lost_14d_count')}
                >
                  {t('lostOver14')}
                  {sortIcon('lost_14d_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_calls')}
                >
                  {t('totalCalls')}
                  {sortIcon('total_calls')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const highRate = p.students > 0 ? p.high_quality_count / p.students : 0;
                const suspRate = p.students > 0 ? p.suspicious_count / p.students : 0;
                return (
                  <tr key={p.cc_name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td text-center text-muted-token font-mono">{i + 1}</td>
                    <td className="slide-td font-medium">{p.cc_name}</td>
                    <td className="slide-td text-secondary-token text-xs">{p.cc_group}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {(p.students ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {fmtDuration(p.avg_call_duration_sec)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          highRate >= 0.6
                            ? 'text-success-token font-semibold'
                            : highRate >= 0.4
                              ? 'text-warning-token'
                              : 'text-danger-token'
                        }
                      >
                        {p.high_quality_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          suspRate > 0.3
                            ? 'text-danger-token font-semibold'
                            : suspRate > 0.1
                              ? 'text-warning-token'
                              : 'text-secondary-token'
                        }
                      >
                        {p.suspicious_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-secondary-token">
                      {fmt(p.avg_lost_days, 1)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          p.lost_14d_count > 5
                            ? 'text-danger-token font-semibold'
                            : 'text-secondary-token'
                        }
                      >
                        {p.lost_14d_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-muted-token">
                      {(p.total_calls ?? 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-token mt-2 px-1">{t('tableNote')}</p>
      </Card>
    </div>
  );
}

/* ── 主页面 ─────────────────────────────────────────────── */

export default function FollowupQualityPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });

  const locale = useLocale();
  const t = useTranslations('followupQualityPage');

  const [tab, setTab] = useState<TabKey>('cc');

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'cc', label: t('tabCC') },
    { key: 'ss', label: t('tabSS') },
    { key: 'lp', label: t('tabLP') },
  ];

  return (
    <div className="space-y-3">
      {/* 页头 */}
      <div>
        <h1 className="page-title">{t('pageTitle')}</h1>
        <p className="text-sm text-secondary-token mt-1">{t('pageSubtitle')}</p>
        <p className="text-xs text-muted-token mt-0.5">{t('pageNote')}</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 border-b border-default-token">
        {TABS.map((tab_item) => (
          <button
            key={tab_item.key}
            onClick={() => setTab(tab_item.key)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
              tab === tab_item.key
                ? 'bg-surface text-primary-token border border-b-0 border-default-token'
                : 'text-muted-token hover:text-secondary-token',
            ].join(' ')}
          >
            {tab_item.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {tab === 'cc' && <CCContent />}
      {tab === 'ss' && <EmptyState title={t('ssNotConnected')} description={t('ssNotConnectedDesc')} />}
      {tab === 'lp' && <EmptyState title={t('lpNotConnected')} description={t('lpNotConnectedDesc')} />}
    </div>
  );
}
