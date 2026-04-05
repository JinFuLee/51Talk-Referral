'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ExpiryAlertSummary, ExpiryAlertItem } from '@/lib/types/enclosure-ss-lp';

/* ── 紧急度分层颜色 ──────────────────────────────────────── */

function urgencyLevel(days: number | null): 'urgent' | 'warning' | 'watch' {
  if (days === null) return 'watch';
  if (days <= 7) return 'urgent';
  if (days <= 14) return 'warning';
  return 'watch';
}

/* ── 摘要卡片区 ──────────────────────────────────────────── */

function SummaryCards({ summary, t }: { summary: ExpiryAlertSummary; t: (key: string, params?: any) => string }) {
  const URGENCY_CONFIG = {
    urgent: {
      label: t('urgent'),
      sub: t('urgentRange'),
      bg: 'bg-danger-surface border-danger-token',
      text: 'text-danger-token',
      count: 'text-danger-token',
      badge: 'bg-danger-surface text-danger-token',
    },
    warning: {
      label: t('warning'),
      sub: t('warningRange'),
      bg: 'bg-warning-surface border-warning-token',
      text: 'text-warning-token',
      count: 'text-warning-token',
      badge: 'bg-warning-surface text-warning-token',
    },
    watch: {
      label: t('watch'),
      sub: t('watchRange'),
      bg: 'bg-success-surface border-success-token',
      text: 'text-success-token',
      count: 'text-success-token',
      badge: 'bg-success-surface text-success-token',
    },
  } as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(['urgent', 'warning', 'watch'] as const).map((level) => {
        const cfg = URGENCY_CONFIG[level];
        const count =
          level === 'urgent'
            ? summary.urgent_count
            : level === 'warning'
              ? summary.warning_count
              : summary.watch_count;
        return (
          <div key={level} className={`rounded-lg border p-4 flex flex-col gap-1 ${cfg.bg}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.sub}
              </span>
            </div>
            <div className={`text-3xl font-bold font-mono tabular-nums ${cfg.count}`}>
              {(count ?? 0).toLocaleString()}
            </div>
            <div className={`text-xs ${cfg.text} opacity-70`}>{t('cardSuffix')}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 失联天数颜色 ──────────────────────────────────────────── */

function contactDaysBadge(days: number | null, daysUnit: string, noContact: string) {
  if (days === null) return <span className="text-muted-token">{noContact}</span>;
  if (days <= 7)
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-success-surface text-success-token">
        {days}
        {daysUnit}
      </span>
    );
  if (days <= 14)
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-warning-surface text-warning-token">
        {days}
        {daysUnit}
      </span>
    );
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-danger-surface text-danger-token">
      {days}
      {daysUnit}
    </span>
  );
}

/* ── 到期预警表格 ──────────────────────────────────────────── */

function ExpiryTable({ items, t }: { items: ExpiryAlertItem[]; t: (key: string, params?: any) => string }) {
  if (items.length === 0) {
    return <EmptyState title={t('emptyTable')} description={t('emptyTableDesc')} />;
  }

  const URGENCY_CONFIG = {
    urgent: { badge: 'bg-danger-surface text-danger-token' },
    warning: { badge: 'bg-warning-surface text-warning-token' },
    watch: { badge: 'bg-success-surface text-success-token' },
  } as const;

  const RISK_BADGE: Record<string, string> = {
    high: 'bg-danger-surface text-danger-token',
    medium: 'bg-orange-100 text-orange-700',
    low: 'bg-success-surface text-success-token',
  };
  const RISK_LABEL: Record<string, string> = {
    high: t('riskHigh'),
    medium: t('riskMedium'),
    low: t('riskLow'),
  };

  const sorted = [...items].sort((a, b) => (a.days_to_expiry ?? 999) - (b.days_to_expiry ?? 999));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="slide-thead-row">
            <th className="slide-th slide-th-left py-2 px-2">{t('colRisk')}</th>
            <th className="slide-th slide-th-left py-2 px-2">{t('colStudentId')}</th>
            <th className="slide-th slide-th-left py-2 px-2">{t('colEnclosure')}</th>
            <th className="slide-th slide-th-left py-2 px-2">{t('colCC')}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t('colDaysLeft')}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t('colContactDays')}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t('colCards')}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t('colMonthlyReg')}</th>
            <th className="slide-th slide-th-right py-2 px-2">{t('colMonthlyPay')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => {
            const level = urgencyLevel(item.days_to_expiry);
            const cfg = URGENCY_CONFIG[level];
            const rl = item.risk_level ?? 'low';
            return (
              <tr
                key={`${item.stdt_id}-${i}`}
                className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
              >
                <td className="slide-td py-1.5 px-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${RISK_BADGE[rl] ?? ''}`}
                  >
                    {RISK_LABEL[rl] ?? '—'}
                  </span>
                </td>
                <td className="slide-td py-1.5 px-2 font-mono">{item.stdt_id}</td>
                <td className="slide-td py-1.5 px-2 text-secondary-token">
                  {item.enclosure ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 font-medium">{item.cc_name ?? '—'}</td>
                <td className="slide-td py-1.5 px-2 text-right">
                  {item.days_to_expiry !== null ? (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${cfg.badge}`}
                    >
                      {item.days_to_expiry}
                      {t('daysUnit')}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="slide-td py-1.5 px-2 text-right">
                  {contactDaysBadge(item.days_since_last_contact ?? null, t('daysUnit'), t('noContact'))}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.current_cards ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.monthly_referral_registrations ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.monthly_referral_payments ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 主页面 ───────────────────────────────────────────────── */

export default function ExpiryAlertPage() {
  usePageDimensions({ country: true, enclosure: true, team: true });
  const t = useTranslations('expiryAlertPage');

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    mutate: mutateSummary,
  } = useFilteredSWR<ExpiryAlertSummary>('/api/students/expiry-alert/summary');

  const {
    data: items,
    isLoading: itemsLoading,
    error: itemsError,
    mutate: mutateItems,
  } = useFilteredSWR<ExpiryAlertItem[]>('/api/students/expiry-alert?days=30');

  const isLoading = summaryLoading || itemsLoading;
  const error = summaryError || itemsError;
  function handleRetry() {
    void mutateSummary();
    void mutateItems();
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t('pageTitle')}</h1>
        <p className="text-sm text-secondary-token mt-1">{t('pageSubtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState
          title={t('loadError')}
          description={t('loadErrorDesc')}
          action={{ label: t('retry'), onClick: handleRetry }}
        />
      ) : (
        <>
          {summary && <SummaryCards summary={summary} t={t} />}

          <Card title={t('cardTitle', { total: summary?.total ?? 0 })}>
            <ExpiryTable items={items ?? []} t={t} />
          </Card>
        </>
      )}
    </div>
  );
}
