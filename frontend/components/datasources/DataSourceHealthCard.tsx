'use client';

import { useTranslations } from 'next-intl';
import type { DataSourceStatus, FreshnessTier, RowAnomalyStatus } from '@/lib/types';
/* ── 新鲜度徽章 ──────────────────────────────────────────────────── */

const FRESHNESS_STYLE: Record<FreshnessTier, string> = {
  today: 'bg-success/10 text-success',
  yesterday: 'bg-success/10 text-success',
  recent: 'bg-warning/10 text-warning',
  stale: 'bg-destructive/10 text-destructive',
  missing: 'bg-destructive/10 text-destructive',
};

function FreshnessBadge({
  tier,
  daysBehind,
  t,
}: {
  tier: FreshnessTier;
  daysBehind: number | null;
  t: (key: string, params?: any) => string;
}) {
  const label =
    tier === 'today'
      ? t('today')
      : tier === 'yesterday'
        ? t('yesterday')
        : tier === 'recent'
          ? t('recent')
          : tier === 'stale'
            ? t('stale', { d: daysBehind })
            : t('missing');
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${FRESHNESS_STYLE[tier]}`}
    >
      {label}
    </span>
  );
}

/* ── 行数状态 ────────────────────────────────────────────────────── */

function RowStatus({
  status,
  rowCount,
  t,
}: {
  status: RowAnomalyStatus;
  rowCount: number | null | undefined;
  t: (key: string, params?: any) => string;
}) {
  if (rowCount == null || status === 'unknown') return null;

  if (status === 'ok') {
    return (
      <span className="text-muted-token">
        {rowCount.toLocaleString()}
        {t('rowSuffix')}
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-warning/10 text-warning">
        {rowCount.toLocaleString()}
        {t('rowSuffix')} {t('rowLow')}
      </span>
    );
  }
  if (status === 'high') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-destructive/10 text-destructive">
        {rowCount.toLocaleString()}
        {t('rowSuffix')} {t('rowHigh')}
      </span>
    );
  }
  return null;
}

/* ── 进度条 ──────────────────────────────────────────────────────── */

function UtilizationBar({
  rate,
  label,
  variant = 'primary',
}: {
  rate: number | null;
  label: string;
  variant?: 'primary' | 'muted';
}) {
  const pct = rate != null ? Math.round(rate * 100) : null;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-token">{label}</span>
        <span className="text-[10px] font-medium text-secondary-token">
          {pct != null ? `${pct}%` : '—'}
        </span>
      </div>
      <div className="h-1 rounded-full bg-n-200 overflow-hidden">
        {pct != null && (
          <div
            className={`h-full rounded-full transition-all ${
              variant === 'primary' ? 'ds-bar-primary' : 'ds-bar-muted'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}

/* ── 主卡片 ──────────────────────────────────────────────────────── */

export function DataSourceHealthCard({ source }: { source: DataSourceStatus }) {
  const t = useTranslations('DataSourceHealthCard');

  const name = source.name ?? source.name_zh ?? source.id;
  const tag = name.match(/\(D\d\)/)?.[0] ?? '';
  const label = name.replace(/\(D\d\)/, '').trim();

  const tier: FreshnessTier = source.freshness_tier ?? 'missing';

  return (
    <div className="rounded-xl border border-default-token bg-surface p-3 text-xs flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          {tag && (
            <span className="text-[10px] font-bold text-muted-token tracking-wide">{tag}</span>
          )}
          <span className="font-semibold text-primary-token truncate leading-tight">
            {label || name}
          </span>
        </div>
        <FreshnessBadge tier={tier} daysBehind={source.days_behind} t={t} />
      </div>

      {/* 数据日期 */}
      {source.data_date && (
        <div className="text-muted-token">
          {t('dataDate')}
          <span className="text-secondary-token font-medium">{source.data_date}</span>
        </div>
      )}

      {/* 行数状态 */}
      <RowStatus status={source.row_anomaly ?? 'unknown'} rowCount={source.row_count} t={t} />

      {/* 字段利用率进度条 */}
      {(source.completeness_rate != null || source.utilization_rate != null) && (
        <div className="space-y-1.5 pt-1 border-t border-subtle-token">
          <UtilizationBar
            rate={source.completeness_rate}
            label={t('fieldComplete')}
            variant="primary"
          />
          <UtilizationBar rate={source.utilization_rate} label={t('systemUtil')} variant="muted" />
        </div>
      )}

      {/* 核心字段 */}
      {source.critical_completeness_rate != null && (
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-token">
            {t('coreField', { present: source.critical_columns_present ?? '?', total: source.critical_columns_total ?? '?' })}
          </span>
          <span
            className={`font-medium ${
              (source.critical_completeness_rate ?? 0) >= 1 ? 'text-success' : 'text-warning'
            }`}
          >
            {Math.round((source.critical_completeness_rate ?? 0) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
