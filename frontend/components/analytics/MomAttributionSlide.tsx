'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { MomAttribution, MomAttributionRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N = {
  zh: {
    title: 'MoM 增量归因',
    subtitle: '7 指标 × 上月 / 本月 / 目标 / 增量 / 增量% / vs目标 / 判断',
    section: '环比分析',
    metric: '指标',
    lastMonth: '上月',
    thisMonth: '本月',
    target: '目标',
    delta: '增量',
    deltaPct: '增量%',
    vsTarget: 'vs目标',
    judgment: '判断',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
    empty: '暂无 MoM 归因数据',
    emptyHint: '请上传本月 Excel 数据源后自动刷新',
  },
  en: {
    title: 'MoM Attribution',
    subtitle: '7 Metrics × Last / This / Target / Delta / Delta% / vs Target / Judgment',
    section: 'MoM Analysis',
    metric: 'Metric',
    lastMonth: 'Last Mo.',
    thisMonth: 'This Mo.',
    target: 'Target',
    delta: 'Δ',
    deltaPct: 'Δ%',
    vsTarget: 'vs Target',
    judgment: 'Judg.',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
    empty: 'No MoM attribution data',
    emptyHint: 'Upload monthly Excel data to refresh',
  },
} as const;

const METRIC_LABELS: Record<string, { zh: string; en: string }> = {
  revenue: { zh: '业绩 (USD)', en: 'Revenue' },
  registrations: { zh: '注册数', en: 'Registrations' },
  appointments: { zh: '预约数', en: 'Appointments' },
  attendance: { zh: '出席数', en: 'Attendance' },
  payments: { zh: '付费数', en: 'Payments' },
  appt_rate: { zh: '预约率', en: 'Appt Rate' },
  attend_rate: { zh: '出席率', en: 'Attend Rate' },
  paid_rate: { zh: '付费率', en: 'Paid Rate' },
};

function isRateMetric(metric: string) {
  return metric.endsWith('_rate');
}

function formatMetricValue(metric: string, value: number | null | undefined): string {
  if (value == null) return '—';
  if (isRateMetric(metric)) return formatRate(value);
  if (metric === 'revenue') return formatRevenue(value);
  return value.toLocaleString();
}

function judgmentColor(j: '↑' | '↓' | '→'): string {
  if (j === '↑') return 'text-emerald-700 font-bold';
  if (j === '↓') return 'text-red-600 font-bold';
  return 'text-[var(--text-muted)]';
}

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-emerald-700 font-semibold';
  if (delta < 0) return 'text-red-600 font-semibold';
  return 'text-[var(--text-muted)]';
}

type DailyReportSlice = { blocks: { mom_attribution: MomAttribution } };

export function MomAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];

  const { data, isLoading, error, mutate } = useSWR<MomAttribution>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.mom_attribution)
  );
  const rows: MomAttributionRow[] = data?.rows ?? [];

  const insight = (() => {
    if (!rows.length) return undefined;
    const rateRows = rows.filter((r) => isRateMetric(r.metric));
    if (!rateRows.length) return undefined;
    const worst = rateRows.reduce((a, b) => (a.vs_target < b.vs_target ? a : b));
    const label = METRIC_LABELS[worst.metric]?.[lang] ?? worst.metric;
    return `${label} vs 目标 ${formatRate(worst.vs_target)}，需重点关注`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t.title}
      subtitle={t.subtitle}
      section={t.section}
      insight={insight}
    >
      {/* 语言切换 */}
      <div className="absolute top-6 right-14 flex gap-1">
        {(['zh', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              lang === l
                ? 'border-[var(--brand-p2)] bg-[var(--color-accent-surface)] text-[var(--brand-p2)] font-semibold'
                : 'border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-full px-4">
          <SkeletonChart className="h-4/5 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-red-600">{t.error}</p>
            <p className="text-sm text-[var(--text-muted)]">{t.errorHint}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              {t.retry}
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">{t.empty}</p>
          <p className="text-sm">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t.metric}</th>
                <th className="slide-th slide-th-right">{t.lastMonth}</th>
                <th className="slide-th slide-th-right">{t.thisMonth}</th>
                <th className="slide-th slide-th-right">{t.target}</th>
                <th className="slide-th slide-th-right">{t.delta}</th>
                <th className="slide-th slide-th-right">{t.deltaPct}</th>
                <th className="slide-th slide-th-right">{t.vsTarget}</th>
                <th className="slide-th slide-th-center">{t.judgment}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isRate = isRateMetric(row.metric);
                return (
                  <tr key={row.metric} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
                      {METRIC_LABELS[row.metric]?.[lang] ?? row.metric}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatMetricValue(row.metric, row.last_month)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                      {formatMetricValue(row.metric, row.this_month)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatMetricValue(row.metric, row.target)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.delta)}`}
                    >
                      {row.delta > 0 ? '+' : ''}
                      {isRate ? formatRate(row.delta) : row.delta.toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.delta_pct)}`}
                    >
                      {row.delta_pct > 0 ? '+' : ''}
                      {formatRate(row.delta_pct)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.vs_target)}`}
                    >
                      {row.vs_target > 0 ? '+' : ''}
                      {isRate ? formatRate(row.vs_target) : row.vs_target.toLocaleString()}
                    </td>
                    <td className={`px-3 py-2 text-sm text-center ${judgmentColor(row.judgment)}`}>
                      {row.judgment}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
