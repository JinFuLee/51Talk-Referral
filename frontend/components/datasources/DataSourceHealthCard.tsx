'use client';

import type { DataSourceStatus, FreshnessTier, RowAnomalyStatus } from '@/lib/types';

/* ── 新鲜度徽章 ──────────────────────────────────────────────────── */

const FRESHNESS_STYLE: Record<FreshnessTier, string> = {
  today: 'bg-success/10 text-success',
  yesterday: 'bg-success/10 text-success',
  recent: 'bg-warning/10 text-warning',
  stale: 'bg-destructive/10 text-destructive',
  missing: 'bg-destructive/10 text-destructive',
};

function freshnesLabel(tier: FreshnessTier, daysBehind: number | null): string {
  if (tier === 'today') return '当日';
  if (tier === 'yesterday') return '昨日';
  if (tier === 'recent') return '2-3天前';
  if (tier === 'stale') return `${daysBehind ?? '?'}天前`;
  return '缺失';
}

function FreshnessBadge({ tier, daysBehind }: { tier: FreshnessTier; daysBehind: number | null }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${FRESHNESS_STYLE[tier]}`}
    >
      {freshnesLabel(tier, daysBehind)}
    </span>
  );
}

/* ── 行数状态 ────────────────────────────────────────────────────── */

function RowStatus({
  status,
  rowCount,
}: {
  status: RowAnomalyStatus;
  rowCount: number | null | undefined;
}) {
  if (rowCount == null || status === 'unknown') return null;

  if (status === 'ok') {
    return <span className="text-[var(--text-muted)]">{rowCount.toLocaleString()} 行</span>;
  }
  if (status === 'low') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-warning/10 text-warning">
        {rowCount.toLocaleString()} 行 ↓偏少
      </span>
    );
  }
  if (status === 'high') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-destructive/10 text-destructive">
        {rowCount.toLocaleString()} 行 ↑偏多
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
        <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
        <span className="text-[10px] font-medium text-[var(--text-secondary)]">
          {pct != null ? `${pct}%` : '—'}
        </span>
      </div>
      <div className="h-1 rounded-full bg-[var(--border-default)] overflow-hidden">
        {pct != null && (
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(pct, 100)}%`,
              backgroundColor:
                variant === 'primary' ? 'hsl(var(--primary))' : 'var(--n-400, #a3a3a3)',
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── 主卡片 ──────────────────────────────────────────────────────── */

export function DataSourceHealthCard({ source }: { source: DataSourceStatus }) {
  const name = source.name ?? source.name_zh ?? source.id;
  const tag = name.match(/\(D\d\)/)?.[0] ?? '';
  const label = name.replace(/\(D\d\)/, '').trim();

  const tier: FreshnessTier = source.freshness_tier ?? 'missing';

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 text-xs flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          {tag && (
            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wide">
              {tag}
            </span>
          )}
          <span className="font-semibold text-[var(--text-primary)] truncate leading-tight">
            {label || name}
          </span>
        </div>
        <FreshnessBadge tier={tier} daysBehind={source.days_behind} />
      </div>

      {/* 数据日期 */}
      {source.data_date && (
        <div className="text-[var(--text-muted)]">
          数据日期：
          <span className="text-[var(--text-secondary)] font-medium">{source.data_date}</span>
        </div>
      )}

      {/* 行数状态 */}
      <RowStatus status={source.row_anomaly ?? 'unknown'} rowCount={source.row_count} />

      {/* 字段利用率进度条 */}
      {(source.completeness_rate != null || source.utilization_rate != null) && (
        <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
          <UtilizationBar rate={source.completeness_rate} label="字段完整率" variant="primary" />
          <UtilizationBar rate={source.utilization_rate} label="系统消费率" variant="muted" />
        </div>
      )}

      {/* 核心字段 */}
      {source.critical_completeness_rate != null && (
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[var(--text-muted)]">
            核心字段 {source.critical_columns_present ?? '?'}/{source.critical_columns_total ?? '?'}
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
