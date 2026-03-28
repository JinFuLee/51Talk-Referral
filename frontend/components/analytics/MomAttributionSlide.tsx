'use client';

import React from 'react';
import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { MomAttribution, MomAttributionRow } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    section: string;
    metric: string;
    lastMonth: string;
    thisMonth: string;
    target: string;
    delta: string;
    deltaPct: string;
    vsTarget: string;
    judgment: string;
    error: string;
    errorHint: string;
    retry: string;
    empty: string;
    emptyHint: string;
  }
> = {
  zh: {
    title: 'MoM 增量归因',
    subtitle: '7 指标 × 上月 / 本月 / 目标 / 增量 / 增量% / vs目标 / 判断',
    section: '环比分析',
    metric: '指标',
    lastMonth: '上月',
    thisMonth: '本月',
    target: '目标',
    delta: '增量',
    deltaPct: '增量%',
    vsTarget: 'vs目标',
    judgment: '判断',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
    empty: '暂无 MoM 归因数据',
    emptyHint: '请上传本月 Excel 数据源后自动刷新',
  },
  'zh-TW': {
    title: 'MoM 增量歸因',
    subtitle: '7 指標 × 上月 / 本月 / 目標 / 增量 / 增量% / vs目標 / 判斷',
    section: '環比分析',
    metric: '指標',
    lastMonth: '上月',
    thisMonth: '本月',
    target: '目標',
    delta: '增量',
    deltaPct: '增量%',
    vsTarget: 'vs目標',
    judgment: '判斷',
    error: '資料載入失敗',
    errorHint: '請檢查後端服務是否正常運行',
    retry: '重試',
    empty: '暫無 MoM 歸因資料',
    emptyHint: '請上傳本月 Excel 資料源後自動刷新',
  },
  en: {
    title: 'MoM Attribution',
    subtitle: '7 Metrics × Last / This / Target / Delta / Delta% / vs Target / Judgment',
    section: 'MoM Analysis',
    metric: 'Metric',
    lastMonth: 'Last Mo.',
    thisMonth: 'This Mo.',
    target: 'Target',
    delta: 'Δ',
    deltaPct: 'Δ%',
    vsTarget: 'vs Target',
    judgment: 'Judg.',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
    empty: 'No MoM attribution data',
    emptyHint: 'Upload monthly Excel data to refresh',
  },
  th: {
    title: 'การวิเคราะห์ MoM',
    subtitle: '7 ตัวชี้วัด × เดือนก่อน / เดือนนี้ / เป้าหมาย / Δ / Δ% / vs เป้า / การตัดสิน',
    section: 'การวิเคราะห์ MoM',
    metric: 'ตัวชี้วัด',
    lastMonth: 'เดือนก่อน',
    thisMonth: 'เดือนนี้',
    target: 'เป้าหมาย',
    delta: 'Δ',
    deltaPct: 'Δ%',
    vsTarget: 'vs เป้า',
    judgment: 'การตัดสิน',
    error: 'โหลดข้อมูลล้มเหลว',
    errorHint: 'กรุณาตรวจสอบบริการแบ็กเอนด์',
    retry: 'ลองใหม่',
    empty: 'ไม่มีข้อมูล MoM',
    emptyHint: 'กรุณาอัปโหลดไฟล์ Excel ประจำเดือน',
  },
};

const METRIC_LABELS: Record<string, { zh: string; 'zh-TW': string; en: string; th: string }> = {
  revenue: { zh: '业绩 (USD)', 'zh-TW': '業績 (USD)', en: 'Revenue', th: 'รายได้ (USD)' },
  registrations: { zh: '注册数', 'zh-TW': '註冊數', en: 'Registrations', th: 'ลงทะเบียน' },
  appointments: { zh: '预约数', 'zh-TW': '預約數', en: 'Appointments', th: 'นัดหมาย' },
  attendance: { zh: '出席数', 'zh-TW': '出席數', en: 'Attendance', th: 'เข้าร่วม' },
  payments: { zh: '付费数', 'zh-TW': '付費數', en: 'Payments', th: 'ชำระ' },
  appt_rate: { zh: '预约率', 'zh-TW': '預約率', en: 'Appt Rate', th: 'อัตรานัดหมาย' },
  attend_rate: { zh: '出席率', 'zh-TW': '出席率', en: 'Attend Rate', th: 'อัตราเข้าร่วม' },
  paid_rate: { zh: '付费率', 'zh-TW': '付費率', en: 'Paid Rate', th: 'อัตราชำระ' },
};

function isRateMetric(metric: string) {
  return metric.endsWith('_rate');
}

function formatMetricValue(metric: string, value: number | null | undefined): string {
  if (value == null) return '—';
  if (isRateMetric(metric)) return formatRate(value);
  if (metric === 'revenue') return formatRevenue(value);
  return value.toLocaleString();
}

function judgmentColor(j: '↑' | '↓' | '→'): string {
  if (j === '↑') return 'text-emerald-700 font-bold';
  if (j === '↓') return 'text-red-600 font-bold';
  return 'text-[var(--text-muted)]';
}

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-emerald-700 font-semibold';
  if (delta < 0) return 'text-red-600 font-semibold';
  return 'text-[var(--text-muted)]';
}

type DailyReportSlice = { blocks: { mom_attribution: MomAttribution } };

export function MomAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale();
  const lang = locale as 'zh' | 'zh-TW' | 'en' | 'th';
  const t = I18N[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useSWR<MomAttribution>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.mom_attribution)
  );
  const rows: MomAttributionRow[] = data?.rows ?? [];

  const insight = (() => {
    if (!rows.length) return undefined;
    const rateRows = rows.filter((r) => isRateMetric(r.metric));
    if (!rateRows.length) return undefined;
    const worst = rateRows.reduce((a, b) => (a.vs_target < b.vs_target ? a : b));
    const label =
      METRIC_LABELS[worst.metric]?.[lang as keyof (typeof METRIC_LABELS)[string]] ?? worst.metric;
    return `${label} vs 目标 ${formatRate(worst.vs_target)}，需重点关注`;
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
                <th className="slide-th slide-th-left">{t.metric}</th>
                <th className="slide-th slide-th-right">{t.lastMonth}</th>
                <th className="slide-th slide-th-right">{t.thisMonth}</th>
                <th className="slide-th slide-th-right">{t.target}</th>
                <th className="slide-th slide-th-right">{t.delta}</th>
                <th className="slide-th slide-th-right">{t.deltaPct}</th>
                <th className="slide-th slide-th-right">{t.vsTarget}</th>
                <th className="slide-th slide-th-center">{t.judgment}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isRate = isRateMetric(row.metric);
                return (
                  <tr key={row.metric} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
                      {METRIC_LABELS[row.metric]?.[lang as keyof (typeof METRIC_LABELS)[string]] ??
                        row.metric}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatMetricValue(row.metric, row.last_month)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                      {formatMetricValue(row.metric, row.this_month)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatMetricValue(row.metric, row.target)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.delta)}`}
                    >
                      {row.delta > 0 ? '+' : ''}
                      {isRate ? formatRate(row.delta) : (row.delta ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.delta_pct)}`}
                    >
                      {row.delta_pct > 0 ? '+' : ''}
                      {formatRate(row.delta_pct)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right font-mono tabular-nums ${deltaColor(row.vs_target)}`}
                    >
                      {row.vs_target > 0 ? '+' : ''}
                      {isRate ? formatRate(row.vs_target) : (row.vs_target ?? 0).toLocaleString()}
                    </td>
                    <td className={`px-3 py-2 text-sm text-center ${judgmentColor(row.judgment)}`}>
                      {row.judgment}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
