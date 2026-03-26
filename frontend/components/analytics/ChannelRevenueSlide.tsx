'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelRevenue, ChannelRevenueRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N = {
  zh: {
    title: '渠道业绩 MoM 对比',
    subtitle: '各渠道上月 / 本月 / 增量 / 增量% / 核心驱动 / 判断',
    section: '渠道对比',
    channel: '渠道',
    lastMonth: '上月',
    thisMonth: '本月',
    delta: '增量',
    deltaPct: '增量%',
    driver: '核心驱动',
    judgment: '判断',
    totalRow: '合计',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
    empty: '暂无渠道 MoM 对比数据',
    emptyHint: '请上传本月 Excel 数据源后自动刷新',
  },
  en: {
    title: 'Channel Revenue MoM',
    subtitle: 'Channel × Last Mo. / This Mo. / Δ / Δ% / Driver / Judgment',
    section: 'Channel Comparison',
    channel: 'Channel',
    lastMonth: 'Last Mo.',
    thisMonth: 'This Mo.',
    delta: 'Δ',
    deltaPct: 'Δ%',
    driver: 'Key Driver',
    judgment: 'Judg.',
    totalRow: 'Total',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
    empty: 'No channel MoM data',
    emptyHint: 'Upload monthly Excel data to refresh',
  },
} as const;

type DailyReportSlice = { blocks: { channel_revenue: ChannelRevenue } };

function JudgmentBadge({ judgment }: { judgment: '↑' | '↓' | '→' }) {
  const color =
    judgment === '↑'
      ? 'text-emerald-700 font-bold'
      : judgment === '↓'
        ? 'text-red-600 font-bold'
        : 'text-[var(--text-muted)]';
  return <span className={`text-base ${color}`}>{judgment}</span>;
}

export function ChannelRevenueSlide({ slideNumber, totalSlides }: SlideProps) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];

  const { data, isLoading, error, mutate } = useSWR<ChannelRevenue>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.channel_revenue)
  );
  const rows: ChannelRevenueRow[] = data?.rows ?? [];

  const totalLastMonth = rows.reduce((s, r) => s + r.last_month_revenue, 0);
  const totalThisMonth = rows.reduce((s, r) => s + r.this_month_revenue, 0);
  const totalDelta = totalThisMonth - totalLastMonth;
  const totalDeltaPct = totalLastMonth > 0 ? totalDelta / totalLastMonth : 0;

  const insight = (() => {
    if (!rows.length) return undefined;
    const top = rows.reduce((a, b) =>
      Math.abs(a.delta_revenue) > Math.abs(b.delta_revenue) ? a : b
    );
    const sign = top.delta_revenue > 0 ? '+' : '';
    return `${top.channel} 增量最大（${sign}${formatRevenue(top.delta_revenue)}，${sign}${formatRate(top.delta_pct)}）：${top.driver_text}`;
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
                <th className="slide-th slide-th-left">{t.channel}</th>
                <th className="slide-th slide-th-right">{t.lastMonth}</th>
                <th className="slide-th slide-th-right">{t.thisMonth}</th>
                <th className="slide-th slide-th-right">{t.delta}</th>
                <th className="slide-th slide-th-right">{t.deltaPct}</th>
                <th className="slide-th slide-th-left" style={{ minWidth: '180px' }}>
                  {t.driver}
                </th>
                <th className="slide-th slide-th-center">{t.judgment}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
                    {row.channel}
                  </td>
                  <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {formatRevenue(row.last_month_revenue)}
                  </td>
                  <td className="px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                    {formatRevenue(row.this_month_revenue)}
                  </td>
                  <td
                    className={`px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold ${row.delta_revenue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                  >
                    {row.delta_revenue >= 0 ? '+' : ''}
                    {formatRevenue(row.delta_revenue)}
                  </td>
                  <td
                    className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${row.delta_pct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                  >
                    {row.delta_pct >= 0 ? '+' : ''}
                    {formatRate(row.delta_pct)}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--text-secondary)] leading-snug">
                    {row.driver_text}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <JudgmentBadge judgment={row.judgment} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-3 py-2 text-xs">{t.totalRow}</td>
                <td className="px-3 py-2 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalLastMonth)}
                </td>
                <td className="px-3 py-2 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalThisMonth)}
                </td>
                <td
                  className={`px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold ${totalDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                >
                  {totalDelta >= 0 ? '+' : ''}
                  {formatRevenue(totalDelta)}
                </td>
                <td
                  className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${totalDeltaPct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                >
                  {totalDeltaPct >= 0 ? '+' : ''}
                  {formatRate(totalDeltaPct)}
                </td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
