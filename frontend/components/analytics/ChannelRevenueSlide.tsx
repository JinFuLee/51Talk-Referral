'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { swrFetcher } from '@/lib/api';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelRevenue, ChannelRevenueRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    section: string;
    channel: string;
    lastMonth: string;
    thisMonth: string;
    delta: string;
    deltaPct: string;
    driver: string;
    judgment: string;
    totalRow: string;
    error: string;
    errorHint: string;
    retry: string;
    empty: string;
    emptyHint: string;
    insightLargest: string;
  }
> = {
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
    insightLargest: '增量最大',
  },
  'zh-TW': {
    title: '渠道業績 MoM 對比',
    subtitle: '各渠道上月 / 本月 / 增量 / 增量% / 核心驅動 / 判斷',
    section: '渠道對比',
    channel: '渠道',
    lastMonth: '上月',
    thisMonth: '本月',
    delta: '增量',
    deltaPct: '增量%',
    driver: '核心驅動',
    judgment: '判斷',
    totalRow: '合計',
    error: '資料載入失敗',
    errorHint: '請檢查後端服務是否正常運行',
    retry: '重試',
    empty: '暫無渠道 MoM 對比資料',
    emptyHint: '請上傳本月 Excel 資料源後自動刷新',
    insightLargest: '增量最大',
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
    insightLargest: 'largest delta',
  },
  th: {
    title: 'การเปรียบเทียบรายได้ MoM ตามช่องทาง',
    subtitle: 'ช่องทาง × เดือนก่อน / เดือนนี้ / Δ / Δ% / ตัวขับเคลื่อน / การตัดสิน',
    section: 'การเปรียบเทียบช่องทาง',
    channel: 'ช่องทาง',
    lastMonth: 'เดือนก่อน',
    thisMonth: 'เดือนนี้',
    delta: 'Δ',
    deltaPct: 'Δ%',
    driver: 'ตัวขับเคลื่อนหลัก',
    judgment: 'การตัดสิน',
    totalRow: 'รวม',
    error: 'โหลดข้อมูลล้มเหลว',
    errorHint: 'กรุณาตรวจสอบบริการแบ็กเอนด์',
    retry: 'ลองใหม่',
    empty: 'ไม่มีข้อมูล MoM ของช่องทาง',
    emptyHint: 'กรุณาอัปโหลดไฟล์ Excel ประจำเดือน',
    insightLargest: 'Δมากที่สุด',
  },
};

type DailyReportSlice = { blocks: { channel_revenue: ChannelRevenue } };

function JudgmentBadge({ judgment }: { judgment: '↑' | '↓' | '→' }) {
  const color =
    judgment === '↑'
      ? 'text-success-token font-bold'
      : judgment === '↓'
        ? 'text-danger-token font-bold'
        : 'text-muted-token';
  return <span className={`text-base ${color}`}>{judgment}</span>;
}

export function ChannelRevenueSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale();
  const t = I18N[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelRevenue>('/api/report/daily', {
    fetcher: (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.channel_revenue),
  });
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
    return `${top.channel} ${t.insightLargest}（${sign}${formatRevenue(top.delta_revenue)}，${sign}${formatRate(top.delta_pct)}）：${top.driver_text}`;
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
      {isLoading ? (
        <div className="flex items-center justify-center h-full px-4">
          <SkeletonChart className="h-4/5 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-danger-token">{t.error}</p>
            <p className="text-sm text-muted-token">{t.errorHint}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-default-token text-secondary-token hover:bg-subtle transition-colors"
            >
              {t.retry}
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-muted-token">
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
                  <td className="px-3 py-2 text-xs font-semibold text-primary-token">
                    {row.channel}
                  </td>
                  <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                    {formatRevenue(row.last_month_revenue)}
                  </td>
                  <td className="px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold text-primary-token">
                    {formatRevenue(row.this_month_revenue)}
                  </td>
                  <td
                    className={`px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold ${row.delta_revenue >= 0 ? 'text-success-token' : 'text-danger-token'}`}
                  >
                    {row.delta_revenue >= 0 ? '+' : ''}
                    {formatRevenue(row.delta_revenue)}
                  </td>
                  <td
                    className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${row.delta_pct >= 0 ? 'text-success-token' : 'text-danger-token'}`}
                  >
                    {row.delta_pct >= 0 ? '+' : ''}
                    {formatRate(row.delta_pct)}
                  </td>
                  <td className="px-3 py-2 text-xs text-secondary-token leading-snug">
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
                  className={`px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold ${totalDelta >= 0 ? 'text-success-token' : 'text-danger-token'}`}
                >
                  {totalDelta >= 0 ? '+' : ''}
                  {formatRevenue(totalDelta)}
                </td>
                <td
                  className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${totalDeltaPct >= 0 ? 'text-success-token' : 'text-danger-token'}`}
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
