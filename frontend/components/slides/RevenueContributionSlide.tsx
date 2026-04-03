'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';

const I18N = {
  zh: {
    title: '渠道业绩贡献',
    subtitle: '各渠道注册数 / 付费金额 / 占比',
    section: '渠道分析',
    col_channel: '渠道',
    col_revenue: '付费金额',
    col_share: '金额占比',
    col_per_capita: '人均金额',
    total: '合计',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无渠道归因数据',
    no_data_hint: '请上传本月 Excel 数据源后自动刷新',
    insight: (channel: string, share: number, rev: string, total: string) =>
      `最大贡献：${channel} 占 ${share}%（${rev}），合计 ${total}`,
  },
  'zh-TW': {
    title: '渠道業績貢獻',
    subtitle: '各渠道註冊數 / 付費金額 / 佔比',
    section: '渠道分析',
    col_channel: '渠道',
    col_revenue: '付費金額',
    col_share: '金額佔比',
    col_per_capita: '人均金額',
    total: '合計',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無渠道歸因資料',
    no_data_hint: '請上傳本月 Excel 資料來源後自動重新整理',
    insight: (channel: string, share: number, rev: string, total: string) =>
      `最大貢獻：${channel} 佔 ${share}%（${rev}），合計 ${total}`,
  },
  en: {
    title: 'Channel Revenue Contribution',
    subtitle: 'Registrations / Revenue / Share by channel',
    section: 'Channel Analysis',
    col_channel: 'Channel',
    col_revenue: 'Revenue',
    col_share: 'Share',
    col_per_capita: 'Per Capita',
    total: 'Total',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: 'No channel attribution data available',
    no_data_hint: "Please upload this month's Excel data source to refresh",
    insight: (channel: string, share: number, rev: string, total: string) =>
      `Top contributor: ${channel} at ${share}% (${rev}), total ${total}`,
  },
  th: {
    title: 'การมีส่วนร่วมของรายได้ตามช่องทาง',
    subtitle: 'การลงทะเบียน / รายได้ / สัดส่วนแต่ละช่องทาง',
    section: 'การวิเคราะห์ช่องทาง',
    col_channel: 'ช่องทาง',
    col_revenue: 'รายได้',
    col_share: 'สัดส่วน',
    col_per_capita: 'รายได้ต่อคน',
    total: 'รวม',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูลการระบุแหล่งที่มาของช่องทาง',
    no_data_hint: 'กรุณาอัปโหลดข้อมูล Excel ประจำเดือนเพื่อรีเฟรช',
    insight: (channel: string, share: number, rev: string, total: string) =>
      `ผู้มีส่วนร่วมสูงสุด: ${channel} ${share}% (${rev}), รวม ${total}`,
  },
} as const;
type Locale = keyof typeof I18N;

export function RevenueContributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelAttribution[]>(
    '/api/channel/attribution'
  );
  const channels = data ?? [];
  const totalAmount = channels.reduce((s, c) => s + (c.revenue ?? 0), 0);

  // 一句话结论：最大贡献渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => (a.revenue > b.revenue ? a : b));
    const topShare = Math.round(top.share * 100);
    return t.insight(top.channel, topShare, formatRevenue(top.revenue), formatRevenue(totalAmount));
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
            <p className="text-base font-semibold text-red-600">{t.loading_failed}</p>
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
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-action-accent font-semibold">
                    {formatRevenue(c.per_capita)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-2 py-1 text-xs">{t.total}</td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalAmount)}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                  100%
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
