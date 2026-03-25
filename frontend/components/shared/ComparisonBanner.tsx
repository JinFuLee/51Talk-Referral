'use client';

import { useConfigStore } from '@/lib/stores/config-store';
import { useCompareSummary } from '@/lib/hooks';

const KPI_LABELS: Record<string, string> = {
  registrations: '注册',
  payments: '付费',
  revenue: '收入',
  leads: 'Leads',
};

function formatCompact(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ComparisonBanner() {
  const compareMode = useConfigStore((s) => s.compareMode);
  const { data, isLoading } = useCompareSummary();

  if (compareMode === 'off') return null;

  if (isLoading) {
    return (
      <div className="h-9 bg-[var(--bg-subtle)]/80 border-b border-[var(--border-subtle)] flex items-center justify-center gap-4 px-6">
        <div className="h-3 w-16 rounded bg-[var(--bg-subtle)] animate-pulse" />
        <div className="h-3 w-24 rounded bg-[var(--bg-subtle)] animate-pulse" />
        <div className="h-3 w-24 rounded bg-[var(--bg-subtle)] animate-pulse" />
        <div className="h-3 w-24 rounded bg-[var(--bg-subtle)] animate-pulse" />
        <div className="h-3 w-24 rounded bg-[var(--bg-subtle)] animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  if (!data.available) {
    return (
      <div className="h-9 bg-amber-50/80 border-b border-amber-100 flex items-center justify-center px-6">
        <span className="text-xs text-amber-600">
          ⚠ {data.label}：{data.unavailable_reason ?? '暂无对比数据'}
        </span>
      </div>
    );
  }

  const metricKeys = Object.keys(KPI_LABELS);

  return (
    <div className="h-9 bg-[var(--bg-subtle)]/80 border-b border-[var(--border-subtle)] flex items-center justify-center gap-4 px-6 overflow-x-auto">
      <span className="text-xs font-medium text-[var(--text-secondary)] shrink-0">
        {data.label}
      </span>
      {metricKeys.map((key) => {
        const metric = data.metrics[key];
        if (!metric) return null;

        const pct = metric.change_pct;
        const label = KPI_LABELS[key];

        let dirIcon = '—';
        let colorCls = 'text-[var(--text-muted)]';

        if (pct === null || pct === undefined) {
          dirIcon = '暂无数据';
          colorCls = 'text-[var(--text-muted)]';
        } else if (pct > 0) {
          dirIcon = `▲${Math.abs(pct).toFixed(1)}%`;
          colorCls = 'text-action-text';
        } else if (pct < 0) {
          dirIcon = `▼${Math.abs(pct).toFixed(1)}%`;
          colorCls = 'text-[var(--color-danger)]';
        }

        return (
          <span key={key} className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-[var(--text-secondary)]">{label}</span>
            {metric.compare != null && (
              <span className="text-[var(--text-muted)]">{formatCompact(metric.compare)}→</span>
            )}
            <span className="text-[var(--text-secondary)] font-medium">
              {formatCompact(metric.current)}
            </span>
            <span className={`font-semibold ${colorCls}`}>{dirIcon}</span>
          </span>
        );
      })}
    </div>
  );
}
