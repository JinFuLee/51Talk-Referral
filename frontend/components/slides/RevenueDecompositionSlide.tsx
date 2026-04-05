'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { SlideProps } from '@/lib/presentation/types';

const I18N = {
  zh: {
    title: '渠道业绩拆解',
    subtitle: '各渠道注册 → 付费 → 金额 → 占比',
    section: '渠道分析',
    col_channel: '渠道',
    col_registrations: '注册数',
    col_payments: '付费数',
    col_revenue: '付费金额',
    col_share_pct: '金额占比',
    col_share_bar: '占比',
    col_total: '合计',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无渠道业绩数据，请上传本月 Excel 数据源',
    insight: (topChannel: string, topRevenue: string, topShare: number | null, total: string) =>
      `合计 ${total}；最大渠道：${topChannel}${topShare !== null ? ` 占 ${topShare}%` : ''}（${topRevenue}）`,
  },
  'zh-TW': {
    title: '渠道業績拆解',
    subtitle: '各渠道注冊 → 付費 → 金額 → 占比',
    section: '渠道分析',
    col_channel: '渠道',
    col_registrations: '注冊數',
    col_payments: '付費數',
    col_revenue: '付費金額',
    col_share_pct: '金額占比',
    col_share_bar: '占比',
    col_total: '合計',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無渠道業績資料，請上傳本月 Excel 資料來源',
    insight: (topChannel: string, topRevenue: string, topShare: number | null, total: string) =>
      `合計 ${total}；最大渠道：${topChannel}${topShare !== null ? ` 占 ${topShare}%` : ''}（${topRevenue}）`,
  },
  en: {
    title: 'Channel Revenue Breakdown',
    subtitle: 'Channel: Registrations → Payments → Revenue → Share',
    section: 'Channel Analysis',
    col_channel: 'Channel',
    col_registrations: 'Registrations',
    col_payments: 'Payments',
    col_revenue: 'Revenue',
    col_share_pct: 'Revenue Share',
    col_share_bar: 'Share',
    col_total: 'Total',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: "No channel revenue data. Please upload this month's Excel data source",
    insight: (topChannel: string, topRevenue: string, topShare: number | null, total: string) =>
      `Total ${total}; Top channel: ${topChannel}${topShare !== null ? ` (${topShare}%)` : ''} — ${topRevenue}`,
  },
  th: {
    title: 'การแยกรายได้ตามช่องทาง',
    subtitle: 'ช่องทาง: ลงทะเบียน → ชำระเงิน → รายได้ → สัดส่วน',
    section: 'การวิเคราะห์ช่องทาง',
    col_channel: 'ช่องทาง',
    col_registrations: 'ลงทะเบียน',
    col_payments: 'ชำระเงิน',
    col_revenue: 'รายได้',
    col_share_pct: 'สัดส่วนรายได้',
    col_share_bar: 'สัดส่วน',
    col_total: 'รวม',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูลรายได้ตามช่องทาง กรุณาอัปโหลดข้อมูล Excel ประจำเดือน',
    insight: (topChannel: string, topRevenue: string, topShare: number | null, total: string) =>
      `รวม ${total}; ช่องทางอันดับ 1: ${topChannel}${topShare !== null ? ` (${topShare}%)` : ''} — ${topRevenue}`,
  },
} as const;
type Locale = keyof typeof I18N;

// 对齐 /api/channel 真实返回
interface ChannelRow {
  channel: string;
  registrations: number | null;
  appointments: number | null;
  attendance: number | null;
  payments: number | null;
  revenue_usd: number | null;
  share_pct: number | null;
}

export function RevenueDecompositionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelRow[]>('/api/channel');
  const channels = data ?? [];

  const totalRevenue = channels.reduce((s, c) => s + (c.revenue_usd ?? 0), 0);

  // 一句话结论：总业绩 & 最大渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => ((a.revenue_usd ?? 0) > (b.revenue_usd ?? 0) ? a : b));
    const topShare = top.share_pct !== null ? Math.round(top.share_pct * 100) : null;
    return t.insight(
      top.channel,
      formatRevenue(top.revenue_usd ?? 0),
      topShare,
      formatRevenue(totalRevenue)
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
            <p className="text-base font-semibold text-danger-token">{t.loading_failed}</p>
            <p className="text-sm text-muted-token">{t.check_backend}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-default-token text-secondary-token hover:bg-subtle transition-colors"
            >
              {t.retry}
            </button>
          </div>
        </div>
      ) : channels.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-token">{t.no_data}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t.col_channel}</th>
                <th className="slide-th slide-th-left">{t.col_registrations}</th>
                <th className="slide-th slide-th-left">{t.col_payments}</th>
                <th className="slide-th slide-th-left">{t.col_revenue}</th>
                <th className="slide-th slide-th-left">{t.col_share_pct}</th>
                <th className="slide-th slide-th-left">{t.col_share_bar}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => {
                const rev = c.revenue_usd ?? 0;
                const share = c.share_pct ?? 0;
                return (
                  <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-1.5 text-xs font-semibold text-primary-token">
                      {c.channel}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {(c.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {(c.payments ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums font-medium text-primary-token">
                      {formatRevenue(rev)}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums text-secondary-token">
                      {formatRate(share)}
                    </td>
                    <td className="px-3 py-1.5 w-28">
                      <div className="w-full bg-subtle rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, share * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-3 py-1.5 text-xs">{t.col_total}</td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.registrations ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.payments ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">
                  {formatRevenue(totalRevenue)}
                </td>
                <td className="px-3 py-1.5 text-xs text-right font-mono tabular-nums">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
