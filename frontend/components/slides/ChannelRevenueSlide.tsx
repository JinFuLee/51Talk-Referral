'use client';

import { useLocale } from 'next-intl';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue, formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelAttribution, SlideProps } from '@/lib/presentation/types';
import { CHART_PALETTE } from '@/lib/chart-palette';

const I18N = {
  zh: {
    title: '渠道金额贡献图',
    subtitle: '各渠道人均金额 / 总金额 / 占比',
    section: '渠道分析',
    col_channel: '渠道',
    col_per_capita: '人均金额',
    col_total: '总金额',
    col_share: '占比',
    col_grand_total: '合计',
    tooltip_label: '金额',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无渠道金额数据',
    no_data_hint: '请上传本月 Excel 数据源后自动刷新',
    insight: (topChannel: string, topShare: number, total: string) =>
      `${topChannel} 贡献最大（${topShare}%），总业绩 ${total}`,
  },
  'zh-TW': {
    title: '渠道金額貢獻圖',
    subtitle: '各渠道人均金額 / 總金額 / 占比',
    section: '渠道分析',
    col_channel: '渠道',
    col_per_capita: '人均金額',
    col_total: '總金額',
    col_share: '占比',
    col_grand_total: '合計',
    tooltip_label: '金額',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無渠道金額資料',
    no_data_hint: '請上傳本月 Excel 資料來源後自動重新整理',
    insight: (topChannel: string, topShare: number, total: string) =>
      `${topChannel} 貢獻最大（${topShare}%），總業績 ${total}`,
  },
  en: {
    title: 'Channel Revenue Contribution',
    subtitle: 'Per-capita revenue / Total revenue / Share by channel',
    section: 'Channel Analysis',
    col_channel: 'Channel',
    col_per_capita: 'Per Capita',
    col_total: 'Total Revenue',
    col_share: 'Share',
    col_grand_total: 'Total',
    tooltip_label: 'Revenue',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: 'No channel revenue data',
    no_data_hint: "Please upload this month's Excel data source to refresh",
    insight: (topChannel: string, topShare: number, total: string) =>
      `${topChannel} is the top contributor (${topShare}%), total revenue ${total}`,
  },
  th: {
    title: 'กราฟการมีส่วนร่วมของรายได้ตามช่องทาง',
    subtitle: 'รายได้ต่อหัว / รายได้รวม / สัดส่วนตามช่องทาง',
    section: 'การวิเคราะห์ช่องทาง',
    col_channel: 'ช่องทาง',
    col_per_capita: 'รายได้ต่อหัว',
    col_total: 'รายได้รวม',
    col_share: 'สัดส่วน',
    col_grand_total: 'รวม',
    tooltip_label: 'รายได้',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูลรายได้ตามช่องทาง',
    no_data_hint: 'กรุณาอัปโหลดข้อมูล Excel ประจำเดือนเพื่อรีเฟรช',
    insight: (topChannel: string, topShare: number, total: string) =>
      `${topChannel} มีส่วนร่วมสูงสุด (${topShare}%), รายได้รวม ${total}`,
  },
} as const;
type Locale = keyof typeof I18N;

const COLORS = CHART_PALETTE.series;

export function ChannelRevenueSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelAttribution[]>(
    '/api/channel/attribution'
  );
  const channels = data ?? [];
  const totalAmount = channels.reduce((s, c) => s + (c.revenue ?? 0), 0);

  const pieData = channels.map((c) => ({
    name: c.channel,
    value: c.revenue,
  }));

  // 一句话结论
  const insight = (() => {
    if (!channels.length) return undefined;
    const top = channels.reduce((a, b) => (a.revenue > b.revenue ? a : b));
    const topShare = Math.round(top.share * 100);
    return t.insight(top.channel, topShare, formatRevenue(totalAmount));
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t.title}
      subtitle={t.subtitle}
      section={t.section}
      knowledgeChapter="chapter-1"
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
        <div className="flex gap-8 h-full items-center">
          {/* Pie Chart */}
          <div className="flex-shrink-0 w-72 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatRevenue(value), t.tooltip_label]}
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md, 10px)',
                    boxShadow: 'var(--shadow-medium)',
                    fontSize: '12px',
                  }}
                  cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
                />
                <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t.col_channel}</th>
                  <th className="slide-th slide-th-left">{t.col_per_capita}</th>
                  <th className="slide-th slide-th-left">{t.col_total}</th>
                  <th className="slide-th slide-th-left">{t.col_share}</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => (
                  <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      {c.channel}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-action-accent font-semibold">
                      {formatRevenue(c.per_capita ?? 0)}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                      {formatRevenue(c.revenue)}
                    </td>
                    <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {formatRate(c.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="slide-tfoot-row">
                  <td className="px-2 py-1 text-xs">{t.col_grand_total}</td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                    —
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {formatRevenue(totalAmount)}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
