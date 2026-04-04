'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';

const I18N = {
  zh: {
    title: '净业绩拆解',
    subtitle: '各渠道人均业绩 / 注册均价',
    section: '渠道分析',
    col_channel: '渠道',
    col_revenue: '总业绩',
    col_share: '金额占比',
    col_per_capita: '人均业绩',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无净业绩归因数据',
    no_data_hint: '请上传本月 Excel 数据源后自动刷新',
    footnote: '人均业绩 = 总业绩 ÷ 付费人数（由后端计算）',
    insight: (topChannel: string, topRevenue: string, lowChannel: string, lowRevenue: string) =>
      `人均最高：${topChannel} ${topRevenue}，人均最低：${lowChannel} ${lowRevenue}`,
  },
  'zh-TW': {
    title: '淨業績拆解',
    subtitle: '各渠道人均業績 / 注冊均價',
    section: '渠道分析',
    col_channel: '渠道',
    col_revenue: '總業績',
    col_share: '金額占比',
    col_per_capita: '人均業績',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無淨業績歸因資料',
    no_data_hint: '請上傳本月 Excel 資料來源後自動重新整理',
    footnote: '人均業績 = 總業績 ÷ 付費人數（由後端計算）',
    insight: (topChannel: string, topRevenue: string, lowChannel: string, lowRevenue: string) =>
      `人均最高：${topChannel} ${topRevenue}，人均最低：${lowChannel} ${lowRevenue}`,
  },
  en: {
    title: 'Net Revenue Attribution',
    subtitle: 'Per-capita revenue / Avg revenue per registration by channel',
    section: 'Channel Analysis',
    col_channel: 'Channel',
    col_revenue: 'Total Revenue',
    col_share: 'Revenue Share',
    col_per_capita: 'Per Capita',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: 'No net attribution data',
    no_data_hint: "Please upload this month's Excel data source to refresh",
    footnote: 'Per Capita = Total Revenue ÷ Paying Users (calculated by backend)',
    insight: (topChannel: string, topRevenue: string, lowChannel: string, lowRevenue: string) =>
      `Highest per capita: ${topChannel} ${topRevenue}, Lowest: ${lowChannel} ${lowRevenue}`,
  },
  th: {
    title: 'การแยกรายได้สุทธิ',
    subtitle: 'รายได้ต่อหัว / รายได้เฉลี่ยต่อการลงทะเบียนตามช่องทาง',
    section: 'การวิเคราะห์ช่องทาง',
    col_channel: 'ช่องทาง',
    col_revenue: 'รายได้รวม',
    col_share: 'สัดส่วนรายได้',
    col_per_capita: 'รายได้ต่อหัว',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูลการระบุแหล่งที่มาของรายได้สุทธิ',
    no_data_hint: 'กรุณาอัปโหลดข้อมูล Excel ประจำเดือนเพื่อรีเฟรช',
    footnote: 'รายได้ต่อหัว = รายได้รวม ÷ จำนวนผู้ชำระเงิน (คำนวณโดย Backend)',
    insight: (topChannel: string, topRevenue: string, lowChannel: string, lowRevenue: string) =>
      `สูงสุดต่อหัว: ${topChannel} ${topRevenue}, ต่ำสุด: ${lowChannel} ${lowRevenue}`,
  },
} as const;
type Locale = keyof typeof I18N;

export function NetAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelAttribution[]>(
    '/api/channel/attribution'
  );
  const channels = data ?? [];

  // 一句话结论：人均业绩最高渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const withCap = channels.filter((c) => (c.per_capita ?? 0) > 0);
    if (!withCap.length) return undefined;
    const top = withCap.reduce((a, b) => ((a.per_capita ?? 0) > (b.per_capita ?? 0) ? a : b));
    const low = withCap.reduce((a, b) => ((a.per_capita ?? 0) < (b.per_capita ?? 0) ? a : b));
    return t.insight(
      top.channel,
      formatRevenue(top.per_capita ?? 0),
      low.channel,
      formatRevenue(low.per_capita ?? 0)
    );
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
            <p className="text-base font-semibold text-[var(--color-danger)]">{t.loading_failed}</p>
            <p className="text-sm text-[var(--text-muted)]">{t.check_backend}</p>
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
          <p className="text-base font-medium">{t.no_data}</p>
          <p className="text-sm">{t.no_data_hint}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t.col_channel}</th>
                <th className="slide-th slide-th-left">{t.col_revenue}</th>
                <th className="slide-th slide-th-left">{t.col_share}</th>
                <th className="slide-th slide-th-left">{t.col_per_capita}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {c.channel}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {formatRevenue(c.revenue)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                    {formatRate(c.share)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-semibold text-action-accent">
                    {formatRevenue(c.per_capita)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 px-4 text-xs text-[var(--text-muted)]">{t.footnote}</p>
        </div>
      )}
    </SlideShell>
  );
}
