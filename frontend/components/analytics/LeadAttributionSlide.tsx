'use client';

import React from 'react';
import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { LeadAttribution, LeadAttributionRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    section: string;
    channel: string;
    reg: string;
    regShare: string;
    apptRate: string;
    attendRate: string;
    paidRate: string;
    regToPayRate: string;
    payments: string;
    payShare: string;
    revenue: string;
    revShare: string;
    total: string;
    error: string;
    errorHint: string;
    retry: string;
    empty: string;
    emptyHint: string;
  }
> = {
  zh: {
    title: '线索归因分析',
    subtitle: '4 口径 × 注册/占比/预约率/出席率/付费率/注册→付费率/付费数/占比/业绩/占比',
    section: '渠道分析',
    channel: '渠道',
    reg: '注册数',
    regShare: '注册%',
    apptRate: '预约率',
    attendRate: '出席率',
    paidRate: '付费率',
    regToPayRate: '注册→付费',
    payments: '付费数',
    payShare: '付费%',
    revenue: '业绩',
    revShare: '业绩%',
    total: '合计',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
    empty: '暂无线索归因数据',
    emptyHint: '请上传本月 Excel 数据源后自动刷新',
  },
  'zh-TW': {
    title: '線索歸因分析',
    subtitle: '4 口徑 × 註冊/占比/預約率/出席率/付費率/註冊→付費率/付費數/占比/業績/占比',
    section: '渠道分析',
    channel: '渠道',
    reg: '註冊數',
    regShare: '註冊%',
    apptRate: '預約率',
    attendRate: '出席率',
    paidRate: '付費率',
    regToPayRate: '註冊→付費',
    payments: '付費數',
    payShare: '付費%',
    revenue: '業績',
    revShare: '業績%',
    total: '合計',
    error: '資料載入失敗',
    errorHint: '請檢查後端服務是否正常運行',
    retry: '重試',
    empty: '暫無線索歸因資料',
    emptyHint: '請上傳本月 Excel 資料源後自動刷新',
  },
  en: {
    title: 'Lead Attribution',
    subtitle: '4 Channels × Reg/Share/ApptR/AttendR/PaidR/Reg→Pay/Payments/Share/Revenue/Share',
    section: 'Channel Analysis',
    channel: 'Channel',
    reg: 'Reg.',
    regShare: 'Reg%',
    apptRate: 'Appt R.',
    attendRate: 'Attend R.',
    paidRate: 'Paid R.',
    regToPayRate: 'Reg→Pay',
    payments: 'Payments',
    payShare: 'Pay%',
    revenue: 'Revenue',
    revShare: 'Rev%',
    total: 'Total',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
    empty: 'No lead attribution data',
    emptyHint: 'Upload monthly Excel data to refresh',
  },
  th: {
    title: 'การวิเคราะห์แหล่งที่มาของลูกค้า',
    subtitle:
      '4 ช่องทาง × ลงทะเบียน/สัดส่วน/นัดหมาย/เข้าร่วม/ชำระ/ลงทะเบียน→ชำระ/ชำระ/สัดส่วน/รายได้/สัดส่วน',
    section: 'การวิเคราะห์ช่องทาง',
    channel: 'ช่องทาง',
    reg: 'ลงทะเบียน',
    regShare: 'ลงทะเบียน%',
    apptRate: 'อัตรานัดหมาย',
    attendRate: 'อัตราเข้าร่วม',
    paidRate: 'อัตราชำระ',
    regToPayRate: 'ลง→ชำระ',
    payments: 'ชำระ',
    payShare: 'ชำระ%',
    revenue: 'รายได้',
    revShare: 'รายได้%',
    total: 'รวม',
    error: 'โหลดข้อมูลล้มเหลว',
    errorHint: 'กรุณาตรวจสอบบริการแบ็กเอนด์',
    retry: 'ลองใหม่',
    empty: 'ไม่มีข้อมูลการวิเคราะห์',
    emptyHint: 'กรุณาอัปโหลดไฟล์ Excel ประจำเดือน',
  },
};

type DailyReportSlice = { blocks: { lead_attribution: LeadAttribution } };

function RateCell({ value }: { value: number }) {
  const color =
    value >= 0.5 ? 'text-emerald-700' : value >= 0.3 ? 'text-amber-700' : 'text-red-600';
  return (
    <td className={`px-2 py-1.5 text-xs text-right font-mono tabular-nums ${color}`}>
      {formatRate(value)}
    </td>
  );
}

function AttributionRow({
  row,
  index,
  t,
  isTotalRow = false,
}: {
  row: LeadAttributionRow;
  index: number;
  t: (typeof I18N)['zh'];
  isTotalRow?: boolean;
}) {
  const rowClass = isTotalRow
    ? 'slide-tfoot-row'
    : index % 2 === 0
      ? 'slide-row-even'
      : 'slide-row-odd';

  return (
    <tr className={rowClass}>
      <td className="px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]">
        {isTotalRow ? t.total : row.channel}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
        {(row.registrations ?? 0).toLocaleString()}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
        {formatRate(row.reg_share)}
      </td>
      <RateCell value={row.appt_rate} />
      <RateCell value={row.attend_rate} />
      <RateCell value={row.paid_rate} />
      <RateCell value={row.reg_to_pay_rate} />
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
        {(row.payments ?? 0).toLocaleString()}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
        {formatRate(row.payment_share)}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
        {formatRevenue(row.revenue_usd)}
      </td>
      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
        {formatRate(row.revenue_share)}
      </td>
    </tr>
  );
}

export function LeadAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale();
  const t = I18N[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useSWR<LeadAttribution>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.lead_attribution)
  );
  const rows: LeadAttributionRow[] = data?.rows ?? [];
  const total = data?.total;

  const insight = (() => {
    if (!rows.length) return undefined;
    const topRev = rows.reduce((a, b) => (a.revenue_usd > b.revenue_usd ? a : b));
    return `${topRev.channel} 业绩贡献最高（${formatRate(topRev.revenue_share)}），注册→付费率 ${formatRate(topRev.reg_to_pay_rate)}`;
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
                <th className="slide-th slide-th-right">{t.reg}</th>
                <th className="slide-th slide-th-right">{t.regShare}</th>
                <th className="slide-th slide-th-right">{t.apptRate}</th>
                <th className="slide-th slide-th-right">{t.attendRate}</th>
                <th className="slide-th slide-th-right">{t.paidRate}</th>
                <th className="slide-th slide-th-right">{t.regToPayRate}</th>
                <th className="slide-th slide-th-right">{t.payments}</th>
                <th className="slide-th slide-th-right">{t.payShare}</th>
                <th className="slide-th slide-th-right">{t.revenue}</th>
                <th className="slide-th slide-th-right">{t.revShare}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <AttributionRow key={row.channel} row={row} index={i} t={t} />
              ))}
            </tbody>
            {total && (
              <tfoot>
                <AttributionRow row={total} index={0} t={t} isTotalRow />
              </tfoot>
            )}
          </table>
        </div>
      )}
    </SlideShell>
  );
}
