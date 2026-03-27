'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelThreeFactor, ChannelThreeFactorRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N = {
  zh: {
    title: '渠道三因素分解',
    subtitle: '各渠道量贡献 / 率贡献 / 价贡献（Laspeyres / LMDI 自动切换）',
    section: '三因素分析',
    channel: '渠道',
    method: '方法',
    volDelta: '量贡献',
    convDelta: '率贡献',
    priceDelta: '价贡献',
    residual: '残差',
    actualDelta: '实际增量',
    laspLabel: 'Lasp.',
    lmdiLabel: 'LMDI',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
    empty: '暂无三因素分解数据',
    emptyHint: '请上传本月 Excel 数据源后自动刷新',
  },
  en: {
    title: 'Channel Three-Factor Decomposition',
    subtitle: 'Volume / Conv Rate / Price per channel (Laspeyres / LMDI auto-switch)',
    section: 'Three-Factor Analysis',
    channel: 'Channel',
    method: 'Method',
    volDelta: 'Volume Δ',
    convDelta: 'Conv Δ',
    priceDelta: 'Price Δ',
    residual: 'Residual',
    actualDelta: 'Actual Δ',
    laspLabel: 'Lasp.',
    lmdiLabel: 'LMDI',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
    empty: 'No three-factor data',
    emptyHint: 'Upload monthly Excel data to refresh',
  },
};

type DailyReportSlice = { blocks: { channel_three_factor: ChannelThreeFactor } };

function DeltaCell({ value }: { value: number | null | undefined }) {
  if (value == null)
    return <td className="px-2 py-1.5 text-xs text-right text-[var(--text-muted)]">—</td>;
  const color =
    value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-600' : 'text-[var(--text-muted)]';
  return (
    <td className={`px-2 py-1.5 text-xs text-right font-mono tabular-nums font-semibold ${color}`}>
      {value > 0 ? '+' : ''}
      {formatRevenue(value)}
    </td>
  );
}

function ChannelRow({
  row,
  index,
  t,
}: {
  row: ChannelThreeFactorRow;
  index: number;
  t: (typeof I18N)['zh'];
}) {
  const isLMDI = row.display_method === 'lmdi';
  const d = isLMDI ? row.lmdi : row.laspeyres;

  const volDelta = isLMDI ? row.lmdi.vol_lmdi : row.laspeyres.vol_delta;
  const convDelta = isLMDI ? row.lmdi.conv_lmdi : row.laspeyres.conv_delta;
  const priceDelta = isLMDI ? row.lmdi.price_lmdi : row.laspeyres.price_delta;

  return (
    <tr className={index % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
      <td className="px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">{row.channel}</td>
      <td className="px-2 py-2 text-center">
        <span
          className={`inline-block px-1.5 py-0.5 text-xs rounded font-medium ${
            isLMDI
              ? 'bg-amber-50 text-amber-700'
              : 'bg-[var(--color-accent-surface)] text-[var(--brand-p2)]'
          }`}
        >
          {isLMDI ? t.lmdiLabel : t.laspLabel}
        </span>
      </td>
      <DeltaCell value={volDelta} />
      <DeltaCell value={convDelta} />
      <DeltaCell value={priceDelta} />
      {!isLMDI && <DeltaCell value={d.residual} />}
      {isLMDI && <td className="px-2 py-1.5 text-xs text-right text-[var(--text-muted)]">—</td>}
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">
        {formatRevenue(d.actual_delta)}
      </td>
    </tr>
  );
}

export function ChannelThreeFactorSlide({ slideNumber, totalSlides }: SlideProps) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];

  const { data, isLoading, error, mutate } = useSWR<ChannelThreeFactor>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.channel_three_factor)
  );
  const channels: ChannelThreeFactorRow[] = data?.channels ?? [];

  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => {
      const aDelta = a.display_method === 'lmdi' ? a.lmdi.actual_delta : a.laspeyres.actual_delta;
      const bDelta = b.display_method === 'lmdi' ? b.lmdi.actual_delta : b.laspeyres.actual_delta;
      return Math.abs(aDelta) > Math.abs(bDelta) ? a : b;
    });
    const delta =
      top.display_method === 'lmdi' ? top.lmdi.actual_delta : top.laspeyres.actual_delta;
    const sign = delta > 0 ? '+' : '';
    return `${top.channel} 实际增量最大（${sign}${formatRevenue(delta)}）`;
  })();

  // 统计哪些渠道使用 LMDI（用于说明）
  const lmdiCount = channels.filter((c) => c.display_method === 'lmdi').length;

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
      ) : channels.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">{t.empty}</p>
          <p className="text-sm">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 h-full">
          {/* 方法说明 */}
          {lmdiCount > 0 && (
            <div className="flex-shrink-0 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
              {lmdiCount} 个渠道残差率 &gt; 3%，已自动切换为 LMDI 分解（零残差）
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t.channel}</th>
                  <th className="slide-th slide-th-center">{t.method}</th>
                  <th className="slide-th slide-th-right">{t.volDelta}</th>
                  <th className="slide-th slide-th-right">{t.convDelta}</th>
                  <th className="slide-th slide-th-right">{t.priceDelta}</th>
                  <th className="slide-th slide-th-right">{t.residual}</th>
                  <th className="slide-th slide-th-right">{t.actualDelta}</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((row, i) => (
                  <ChannelRow key={row.channel} row={row} index={i} t={t} />
                ))}
              </tbody>
            </table>
          </div>

          {/* 图例说明 */}
          <div className="flex-shrink-0 flex gap-4 text-xs text-[var(--text-muted)] px-1">
            <span>
              <span className="inline-block w-2 h-2 rounded-sm bg-[var(--color-accent-surface)] mr-1" />
              Lasp. = Laspeyres 加法分解（残差率 ≤ 3%）
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-sm bg-amber-100 mr-1" />
              LMDI = 对数分解（残差率 &gt; 3%，零残差）
            </span>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
