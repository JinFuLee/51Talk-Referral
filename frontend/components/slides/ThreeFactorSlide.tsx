'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ChannelFactor, SlideProps } from '@/lib/presentation/types';

const I18N = {
  zh: {
    title: '渠道三因素对标',
    subtitle: '各渠道 × 预期 / 实际 / 差距 × 预约因子 / 出席因子 / 付费因子',
    section: '渠道分析',
    col_channel: '渠道',
    col_volume: '单量',
    col_three_factor: '三因素',
    col_expected: '预期',
    col_actual: '实际',
    col_gap: '差距',
    col_appt: '预约',
    col_show: '出席',
    col_pay: '付费',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无三因素数据',
    no_data_hint: '请上传本月 Excel 数据源后自动刷新',
    footnote: '三因素 = 实际达成率 / 目标达成率。≥100% 超目标，<90% 严重落后',
    insight_single: (channel: string, avg: string) => `${channel} 三因素平均 ${avg}%`,
    insight_multi: (worst: string, worstAvg: string, warn: string, best: string, bestAvg: string) =>
      `三因素最弱：${worst} ${worstAvg}%${warn}，最强：${best} ${bestAvg}%`,
  },
  'zh-TW': {
    title: '渠道三因素對標',
    subtitle: '各渠道 × 預期 / 實際 / 差距 × 預約因子 / 出席因子 / 付費因子',
    section: '渠道分析',
    col_channel: '渠道',
    col_volume: '單量',
    col_three_factor: '三因素',
    col_expected: '預期',
    col_actual: '實際',
    col_gap: '差距',
    col_appt: '預約',
    col_show: '出席',
    col_pay: '付費',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無三因素資料',
    no_data_hint: '請上傳本月 Excel 資料來源後自動重新整理',
    footnote: '三因素 = 實際達成率 / 目標達成率。≥100% 超目標，<90% 嚴重落後',
    insight_single: (channel: string, avg: string) => `${channel} 三因素平均 ${avg}%`,
    insight_multi: (worst: string, worstAvg: string, warn: string, best: string, bestAvg: string) =>
      `三因素最弱：${worst} ${worstAvg}%${warn}，最強：${best} ${bestAvg}%`,
  },
  en: {
    title: 'Channel Three-Factor Benchmark',
    subtitle: 'Channel × Expected / Actual / Gap × Appt Factor / Show Factor / Pay Factor',
    section: 'Channel Analysis',
    col_channel: 'Channel',
    col_volume: 'Volume',
    col_three_factor: 'Three Factors',
    col_expected: 'Expected',
    col_actual: 'Actual',
    col_gap: 'Gap',
    col_appt: 'Appt',
    col_show: 'Show',
    col_pay: 'Pay',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: 'No three-factor data',
    no_data_hint: "Please upload this month's Excel data source to refresh",
    footnote:
      'Three-Factor = Actual Rate / Target Rate. ≥100% exceeds target, <90% critically behind',
    insight_single: (channel: string, avg: string) => `${channel} three-factor avg ${avg}%`,
    insight_multi: (worst: string, worstAvg: string, warn: string, best: string, bestAvg: string) =>
      `Weakest: ${worst} ${worstAvg}%${warn}, Strongest: ${best} ${bestAvg}%`,
  },
  th: {
    title: 'เกณฑ์มาตรฐานสามปัจจัยของช่องทาง',
    subtitle: 'ช่องทาง × คาดการณ์ / จริง / ส่วนต่าง × ปัจจัยนัด / ปัจจัยเข้าร่วม / ปัจจัยชำระ',
    section: 'การวิเคราะห์ช่องทาง',
    col_channel: 'ช่องทาง',
    col_volume: 'ปริมาณ',
    col_three_factor: 'สามปัจจัย',
    col_expected: 'คาดการณ์',
    col_actual: 'จริง',
    col_gap: 'ส่วนต่าง',
    col_appt: 'นัด',
    col_show: 'เข้าร่วม',
    col_pay: 'ชำระ',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูลสามปัจจัย',
    no_data_hint: 'กรุณาอัปโหลดข้อมูล Excel ประจำเดือนเพื่อรีเฟรช',
    footnote: 'สามปัจจัย = อัตราจริง / อัตราเป้าหมาย ≥100% เกินเป้า, <90% ล้าหลังอย่างรุนแรง',
    insight_single: (channel: string, avg: string) => `${channel} ค่าเฉลี่ยสามปัจจัย ${avg}%`,
    insight_multi: (worst: string, worstAvg: string, warn: string, best: string, bestAvg: string) =>
      `อ่อนแอที่สุด: ${worst} ${worstAvg}%${warn}, แข็งแกร่งที่สุด: ${best} ${bestAvg}%`,
  },
} as const;
type Locale = keyof typeof I18N;

function GapBadge({ gap }: { gap: number }) {
  const isPositive = gap >= 0;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
        isPositive
          ? 'text-green-700 bg-green-50'
          : gap >= -5
            ? 'text-yellow-700 bg-yellow-50'
            : 'text-red-700 bg-red-50'
      }`}
    >
      {isPositive ? '+' : ''}
      {gap}
    </span>
  );
}

function FactorBadge({ value }: { value: number }) {
  const color =
    value >= 1
      ? 'text-green-700 bg-green-50'
      : value >= 0.9
        ? 'text-yellow-700 bg-yellow-50'
        : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {formatRate(value)}
    </span>
  );
}

export function ThreeFactorSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<ChannelFactor[]>(
    '/api/channel/three-factor'
  );
  const channels = data ?? [];

  // 一句话结论：找三因素最弱渠道
  const insight = (() => {
    if (!channels.length) return undefined;
    const scored = channels.map((c) => ({
      channel: c.channel,
      avg: ((c.appt_factor ?? 0) + (c.show_factor ?? 0) + (c.pay_factor ?? 0)) / 3,
    }));
    const worst = scored.reduce((a, b) => (a.avg < b.avg ? a : b));
    const best = scored.reduce((a, b) => (a.avg > b.avg ? a : b));
    const worstAvg = (worst.avg * 100).toFixed(0);
    if (worst.channel === best.channel) {
      return t.insight_single(worst.channel, worstAvg);
    }
    return t.insight_multi(
      worst.channel,
      worstAvg,
      worst.avg < 0.9 ? ' ⚠' : '',
      best.channel,
      (best.avg * 100).toFixed(0)
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
                <th className="slide-th slide-th-left" rowSpan={2}>
                  {t.col_channel}
                </th>
                <th className="slide-th slide-th-center" colSpan={3}>
                  {t.col_volume}
                </th>
                <th className="slide-th slide-th-center" colSpan={3}>
                  {t.col_three_factor}
                </th>
              </tr>
              <tr className="slide-thead-row">
                <th className="slide-th-sub slide-th-right">{t.col_expected}</th>
                <th className="slide-th-sub slide-th-right">{t.col_actual}</th>
                <th className="slide-th-sub slide-th-right">{t.col_gap}</th>
                <th className="slide-th-sub slide-th-right">{t.col_appt}</th>
                <th className="slide-th-sub slide-th-right">{t.col_show}</th>
                <th className="slide-th-sub slide-th-right">{t.col_pay}</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-semibold text-[var(--text-primary)]">{c.channel}</td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {(c.expected_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {(c.actual_volume ?? 0).toLocaleString()}
                  </td>
                  <td className="slide-td text-right">
                    <GapBadge gap={c.gap ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.appt_factor ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.show_factor ?? 0} />
                  </td>
                  <td className="slide-td text-right">
                    <FactorBadge value={c.pay_factor ?? 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 px-4 text-xs text-[var(--text-muted)]">{t.footnote}</p>
        </div>
      )}
    </SlideShell>
  );
}
