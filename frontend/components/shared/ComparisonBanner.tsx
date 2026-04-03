'use client';

import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { useLocale } from 'next-intl';

const I18N = {
  zh: { noCompareData: '暂无对比数据', noData: '暂无数据' },
  'zh-TW': { noCompareData: '暫無對比數據', noData: '暫無數據' },
  en: { noCompareData: 'No comparison data', noData: 'No data' },
  th: { noCompareData: 'ไม่มีข้อมูลเปรียบเทียบ', noData: 'ไม่มีข้อมูล' },
} as const;
type I18NKey = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as I18NKey) in I18N ? (locale as I18NKey) : 'zh'];
}

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

interface CompareSummaryResponse {
  available: boolean;
  label: string;
  unavailable_reason?: string;
  metrics: Record<
    string,
    { current: number | null; compare: number | null; change_pct: number | null }
  >;
}

export function ComparisonBanner() {
  const hydrated = useStoreHydrated();
  const compareMode = useConfigStore((s) => s.compareMode);
  const { data, isLoading } = useFilteredSWR<CompareSummaryResponse>(
    compareMode !== 'off' ? `/api/report/compare-summary?mode=${compareMode}` : null
  );

  // 水合前 SSR 和客户端首次渲染保持一致（均不显示），避免 React #418 水合错误
  if (!hydrated || compareMode === 'off') return null;

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

  const t = useT();

  if (!data.available) {
    return (
      <div className="h-9 bg-amber-50/80 border-b border-amber-100 flex items-center justify-center px-6">
        <span className="text-xs text-amber-600">
          ⚠ {data.label}：{data.unavailable_reason ?? t.noCompareData}
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
          dirIcon = t.noData;
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
