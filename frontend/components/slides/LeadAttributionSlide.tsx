'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelFunnel, SlideProps } from '@/lib/presentation/types';

const I18N = {
  zh: {
    title: '各渠道学员漏斗',
    subtitle: 'CC窄 / SS窄 / LP窄 / 宽口 × 注册 → 预约 → 出席 → 付费',
    section: '渠道分析',
    col_channel: '渠道',
    col_reg: '注册数',
    col_appt: '预约数',
    col_attend: '出席数',
    col_paid: '付费数',
    total: '合计',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无渠道漏斗数据',
    no_data_hint: '请上传本月 Excel 数据源后自动刷新',
    insight: (totalReg: number, totalPaid: number, topChannel: string, topPaid: number) =>
      `合计 ${totalReg.toLocaleString()} 注册，${totalPaid.toLocaleString()} 付费；付费最多：${topChannel} ${topPaid.toLocaleString()} 人`,
  },
  'zh-TW': {
    title: '各渠道學員漏斗',
    subtitle: 'CC窄 / SS窄 / LP窄 / 寬口 × 註冊 → 預約 → 出席 → 付費',
    section: '渠道分析',
    col_channel: '渠道',
    col_reg: '註冊數',
    col_appt: '預約數',
    col_attend: '出席數',
    col_paid: '付費數',
    total: '合計',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無渠道漏斗資料',
    no_data_hint: '請上傳本月 Excel 資料來源後自動重新整理',
    insight: (totalReg: number, totalPaid: number, topChannel: string, topPaid: number) =>
      `合計 ${totalReg.toLocaleString()} 註冊，${totalPaid.toLocaleString()} 付費；付費最多：${topChannel} ${topPaid.toLocaleString()} 人`,
  },
  en: {
    title: 'Channel Lead Funnel',
    subtitle: 'CC Narrow / SS Narrow / LP Narrow / Wide × Reg → Appt → Attend → Paid',
    section: 'Channel Analysis',
    col_channel: 'Channel',
    col_reg: 'Registrations',
    col_appt: 'Appointments',
    col_attend: 'Attendance',
    col_paid: 'Payments',
    total: 'Total',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: 'No channel funnel data available',
    no_data_hint: "Please upload this month's Excel data source to refresh",
    insight: (totalReg: number, totalPaid: number, topChannel: string, topPaid: number) =>
      `Total ${totalReg.toLocaleString()} registrations, ${totalPaid.toLocaleString()} payments; top channel: ${topChannel} ${topPaid.toLocaleString()} pax`,
  },
  th: {
    title: 'Funnel ลูกค้าแต่ละช่องทาง',
    subtitle: 'CC แคบ / SS แคบ / LP แคบ / กว้าง × ลงทะเบียน → นัด → เข้าร่วม → ชำระเงิน',
    section: 'การวิเคราะห์ช่องทาง',
    col_channel: 'ช่องทาง',
    col_reg: 'การลงทะเบียน',
    col_appt: 'การนัดหมาย',
    col_attend: 'การเข้าร่วม',
    col_paid: 'การชำระเงิน',
    total: 'รวม',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูล Funnel ช่องทาง',
    no_data_hint: 'กรุณาอัปโหลดข้อมูล Excel ประจำเดือนเพื่อรีเฟรช',
    insight: (totalReg: number, totalPaid: number, topChannel: string, topPaid: number) =>
      `รวม ${totalReg.toLocaleString()} ลงทะเบียน, ${totalPaid.toLocaleString()} ชำระเงิน; ช่องทางสูงสุด: ${topChannel} ${topPaid.toLocaleString()} คน`,
  },
} as const;
type Locale = keyof typeof I18N;

export function LeadAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelFunnel[]>('/api/channel');
  const channels = data ?? [];

  // 一句话结论：总注册 & 付费
  const insight = (() => {
    if (!channels.length) return undefined;
    const totalReg = channels.reduce((s, c) => s + (c.registrations ?? 0), 0);
    const totalPaid = channels.reduce((s, c) => s + (c.payments ?? 0), 0);
    const topPaid = channels.reduce((a, b) => ((a.payments ?? 0) > (b.payments ?? 0) ? a : b));
    return t.insight(totalReg, totalPaid, topPaid.channel, topPaid.payments ?? 0);
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
                <th className="slide-th slide-th-left">{t.col_reg}</th>
                <th className="slide-th slide-th-left">{t.col_appt}</th>
                <th className="slide-th slide-th-left">{t.col_attend}</th>
                <th className="slide-th slide-th-left">{t.col_paid}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {c.channel}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.registrations ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.appointments ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.attendance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                    {(c.payments ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="slide-tfoot-row">
                <td className="px-2 py-1 text-xs">{t.total}</td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.registrations ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.appointments ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.attendance ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs text-right font-mono tabular-nums">
                  {channels.reduce((s, c) => s + (c.payments ?? 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
