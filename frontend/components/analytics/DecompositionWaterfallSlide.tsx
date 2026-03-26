'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { Decomposition } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N = {
  zh: {
    title: '增量分解瀑布图',
    subtitle: '量贡献 / 率贡献 / 价贡献 / 残差（Laspeyres / LMDI 自动切换）',
    section: '增量分析',
    volDelta: '量贡献',
    convDelta: '率贡献',
    priceDelta: '价贡献',
    residual: '残差',
    baseLine: '上月业绩',
    currentLine: '本月业绩',
    lmdiNote: '残差率 > 3%，已自动切换至 LMDI 分解（零残差）',
    laspNote: 'Laspeyres 加法分解',
    residualPct: '残差率',
    actualDelta: '实际总增量',
    basePeriod: '基期',
    currentPeriod: '当期',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
    empty: '暂无分解数据',
    emptyHint: '请上传本月 Excel 数据源后自动刷新',
    usd: '金额 (USD)',
  },
  en: {
    title: 'Revenue Decomposition Waterfall',
    subtitle: 'Vol / Conv / Price / Residual (Laspeyres / LMDI auto-switch)',
    section: 'Incremental Analysis',
    volDelta: 'Volume',
    convDelta: 'Conv Rate',
    priceDelta: 'Price',
    residual: 'Residual',
    baseLine: 'Last Mo.',
    currentLine: 'This Mo.',
    lmdiNote: 'Residual > 3%, switched to LMDI (zero residual)',
    laspNote: 'Laspeyres Additive Decomposition',
    residualPct: 'Residual %',
    actualDelta: 'Actual Δ',
    basePeriod: 'Base',
    currentPeriod: 'Current',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
    empty: 'No decomposition data',
    emptyHint: 'Upload monthly Excel data to refresh',
    usd: 'USD',
  },
} as const;

type DailyReportSlice = { blocks: { decomposition: Decomposition } };

// 瀑布图数据构建
function buildWaterfallData(
  decomp: Decomposition,
  t: (typeof I18N)['zh']
): Array<{ name: string; value: number; base: number; color: string }> {
  const isLMDI = decomp.display_method === 'lmdi';
  const baseRev = decomp.base_period.revenue_usd;

  const volVal = isLMDI ? decomp.lmdi.vol_lmdi : decomp.laspeyres.vol_delta;
  const convVal = isLMDI ? decomp.lmdi.conv_lmdi : decomp.laspeyres.conv_delta;
  const priceVal = isLMDI ? decomp.lmdi.price_lmdi : decomp.laspeyres.price_delta;
  const residualVal = isLMDI ? null : decomp.laspeyres.residual;

  const entries = [
    { name: t.volDelta, value: volVal, color: CHART_PALETTE.c4 },
    { name: t.convDelta, value: convVal, color: CHART_PALETTE.c2 },
    { name: t.priceDelta, value: priceVal, color: CHART_PALETTE.c3 },
    ...(residualVal !== null && Math.abs(residualVal) > 0.01
      ? [{ name: t.residual, value: residualVal, color: CHART_PALETTE.neutral }]
      : []),
  ];

  // 计算每个柱子的堆叠基底
  let running = baseRev;
  return entries.map((e) => {
    const base = e.value >= 0 ? running : running + e.value;
    running += e.value;
    return { ...e, base };
  });
}

export function DecompositionWaterfallSlide({ slideNumber, totalSlides }: SlideProps) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];

  const { data, isLoading, error, mutate } = useSWR<Decomposition>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.decomposition)
  );

  const insight = (() => {
    if (!data) return undefined;
    const isLMDI = data.display_method === 'lmdi';
    const vol = isLMDI ? data.lmdi.vol_lmdi : data.laspeyres.vol_delta;
    const conv = isLMDI ? data.lmdi.conv_lmdi : data.laspeyres.conv_delta;
    const price = isLMDI ? data.lmdi.price_lmdi : data.laspeyres.price_delta;
    const drivers = [
      { name: '量', v: vol },
      { name: '率', v: conv },
      { name: '价', v: price },
    ].sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    const top = drivers[0];
    const sign = top.v > 0 ? '+' : '';
    return `主要驱动：${top.name}贡献 ${sign}${formatRevenue(top.v)}（${isLMDI ? 'LMDI' : 'Laspeyres'} 分解）`;
  })();

  const waterfallData = data ? buildWaterfallData(data, t) : [];
  const baseRev = data?.base_period.revenue_usd ?? 0;
  const currentRev = data?.current_period.revenue_usd ?? 0;
  const isLMDI = data?.display_method === 'lmdi';

  const customTooltipFormatter = (value: number) => [formatRevenue(value), t.usd];

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
      ) : !data ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">{t.empty}</p>
          <p className="text-sm">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="flex gap-6 h-full">
          {/* 瀑布图 */}
          <div className="flex-1 min-w-0">
            {/* 方法标注 */}
            <div className="mb-2">
              <span
                className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                  isLMDI
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-[var(--color-accent-surface)] text-[var(--brand-p2)] border border-[var(--color-accent-subtle)]'
                }`}
              >
                {isLMDI ? `⚠ ${t.lmdiNote}` : t.laspNote}
              </span>
            </div>

            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={waterfallData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_PALETTE.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
                  axisLine={{ stroke: CHART_PALETTE.grid }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: CHART_PALETTE.axisLabel }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={customTooltipFormatter} />
                {/* 透明基座（占位用） */}
                <Bar dataKey="base" stackId="stack" fill="transparent" />
                {/* 实际贡献柱 */}
                <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                {/* 基期参考线 */}
                <ReferenceLine
                  y={baseRev}
                  stroke={CHART_PALETTE.neutral}
                  strokeDasharray="4 4"
                  label={{
                    value: t.baseLine,
                    position: 'insideTopLeft',
                    fill: CHART_PALETTE.axisLabel,
                    fontSize: 10,
                  }}
                />
                {/* 当期参考线 */}
                <ReferenceLine
                  y={currentRev}
                  stroke={CHART_PALETTE.c2}
                  strokeDasharray="4 4"
                  label={{
                    value: t.currentLine,
                    position: 'insideTopRight',
                    fill: CHART_PALETTE.c2,
                    fontSize: 10,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 右侧数据摘要 */}
          <div className="w-52 flex-shrink-0 flex flex-col gap-3 justify-center">
            <div className="rounded-xl border border-[var(--border-default)] p-3 bg-[var(--bg-surface)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.basePeriod}</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {formatRevenue(baseRev)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] p-3 bg-[var(--bg-surface)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.currentPeriod}</p>
              <p className="text-sm font-bold text-[var(--brand-p2)]">
                {formatRevenue(currentRev)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] p-3 bg-[var(--bg-surface)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.actualDelta}</p>
              <p
                className={`text-sm font-bold ${currentRev >= baseRev ? 'text-emerald-700' : 'text-red-600'}`}
              >
                {currentRev >= baseRev ? '+' : ''}
                {formatRevenue(currentRev - baseRev)}
              </p>
            </div>
            {!isLMDI && (
              <div className="rounded-xl border border-[var(--border-default)] p-3 bg-[var(--bg-surface)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">{t.residualPct}</p>
                <p className="text-sm font-semibold text-[var(--text-secondary)]">
                  {formatRate(data.laspeyres.residual_pct)}
                </p>
              </div>
            )}

            {/* 颜色图例 */}
            <div className="space-y-1 pt-1">
              {[
                { color: CHART_PALETTE.c4, label: t.volDelta },
                { color: CHART_PALETTE.c2, label: t.convDelta },
                { color: CHART_PALETTE.c3, label: t.priceDelta },
                ...(!isLMDI ? [{ color: CHART_PALETTE.neutral, label: t.residual }] : []),
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
