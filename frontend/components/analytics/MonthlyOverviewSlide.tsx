'use client';

import { useLocale } from 'next-intl';
import { formatRate, formatUSD, formatValue } from '@/lib/utils';
import type { MonthlyOverview } from '@/lib/types/report';

// ── I18N ──────────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '月度总览',
    subtitle: '目标 / 完成 / BM 效率 / GAP',
    metrics: {
      registrations: '注册数',
      appointments: '预约数',
      attendance: '出席数',
      payments: '付费数',
      revenue_usd: '业绩',
      asp: '客单价',
      appt_rate: '预约率（注册→预约）',
      attend_rate: '出席率（预约→出席）',
      paid_rate: '出席付费率（出席→付费）',
      appt_to_pay_rate: '预约付费率（预约→付费）',
      reg_to_pay_rate: '注册付费率（注册→付费）',
      checkin_rate: '打卡率',
      cc_contact_rate: 'CC触达率',
      ss_contact_rate: 'SS触达率',
      lp_contact_rate: 'LP触达率',
      participation_rate: '参与率',
    } as Record<string, string>,
    target: '月目标',
    actual: '当前',
    bmEff: 'BM效率',
    gap: 'GAP',
    dailyAvg: '达标日均',
    paceAvg: '追进日均',
    noData: '暂无数据',
    noDataDesc: '请上传本月 Excel 数据源',
    ahead: '领先',
    behind: '落后',
  },
  en: {
    title: 'Monthly Overview',
    subtitle: 'Target / Actual / BM Efficiency / GAP',
    metrics: {
      registrations: 'Registrations',
      appointments: 'Appointments',
      attendance: 'Attendance',
      payments: 'Payments',
      revenue_usd: 'Revenue',
      asp: 'ASP',
      appt_rate: 'Appt Rate (Reg→Appt)',
      attend_rate: 'Attend Rate (Appt→Attend)',
      paid_rate: 'Paid Rate (Attend→Pay)',
      appt_to_pay_rate: 'Appt→Pay Rate',
      reg_to_pay_rate: 'Conv Rate (Reg→Pay)',
      checkin_rate: 'Check-in Rate',
      cc_contact_rate: 'CC Contact Rate',
      ss_contact_rate: 'SS Contact Rate',
      lp_contact_rate: 'LP Contact Rate',
      participation_rate: 'Participation Rate',
    } as Record<string, string>,
    target: 'Target',
    actual: 'Actual',
    bmEff: 'BM Eff',
    gap: 'GAP',
    dailyAvg: 'Daily (Target)',
    paceAvg: 'Daily (Pace)',
    noData: 'No data available',
    noDataDesc: "Please upload this month's Excel data source",
    ahead: 'Ahead',
    behind: 'Behind',
  },
} as const;

type Lang = keyof typeof I18N;

// 率类指标（0-1 小数，需用 formatRate）
const RATE_METRICS = new Set([
  'appt_rate',
  'attend_rate',
  'paid_rate',
  'appt_to_pay_rate',
  'reg_to_pay_rate',
  'checkin_rate',
  'cc_contact_rate',
  'ss_contact_rate',
  'lp_contact_rate',
  'participation_rate',
]);
// 金额类指标
const MONEY_METRICS = new Set(['revenue_usd', 'asp']);

function fmtVal(key: string, val: number | null | undefined): string {
  if (val == null) return '—';
  if (RATE_METRICS.has(key)) return formatRate(val);
  if (MONEY_METRICS.has(key)) return formatUSD(val);
  return formatValue(val, false);
}

function gapColor(gap: number | null | undefined): string {
  if (gap == null) return 'text-[var(--text-muted)]';
  if (gap >= 0) return 'text-emerald-800 font-semibold';
  if (gap >= -0.05) return 'text-amber-800 font-semibold';
  return 'text-red-700 font-semibold';
}

/** 效率列颜色
 *  量类：≥100% 已达标(绿) / ≥BM% 领先(绿) / <BM% 落后(红)
 *  率类：≥100% 达标(绿) / ≥95% 接近(黄) / <95% 落后(红) — 不用 BM 阈值
 */
function bmEffColor(eff: number | null | undefined, bmPct: number, isRate = false): string {
  if (eff == null || eff === 0) return 'text-[var(--text-muted)]';
  if (eff >= 1.0) return 'text-emerald-800 font-semibold';
  if (isRate) {
    // 率类：纯粹看达成率离 100% 多远
    if (eff >= 0.95) return 'text-amber-800 font-semibold';
    return 'text-red-700 font-semibold';
  }
  // 量类：BM 进度阈值
  if (eff >= bmPct) return 'text-emerald-800 font-semibold';
  return 'text-red-700 font-semibold';
}

interface Props {
  data: MonthlyOverview | null | undefined;
}

const DISPLAY_METRICS = [
  'registrations',
  'appointments',
  'attendance',
  'payments',
  'revenue_usd',
  'asp',
  'appt_rate',
  'attend_rate',
  'paid_rate',
  'appt_to_pay_rate',
  'reg_to_pay_rate',
  'checkin_rate',
  'cc_contact_rate',
  'ss_contact_rate',
  'lp_contact_rate',
  'participation_rate',
];

export function MonthlyOverviewSlide({ data }: Props) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N['zh'];

  if (!data) {
    return (
      <div className="card-base p-5 flex flex-col justify-center items-center gap-2 min-h-[280px]">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{t.noData}</p>
        <p className="text-xs text-[var(--text-muted)]">{t.noDataDesc}</p>
      </div>
    );
  }

  const rows = DISPLAY_METRICS.filter((k) => data.targets[k] != null || data.actuals[k] != null);

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-display">{t.title}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
      </div>

      {/* 表格 */}
      <div className="overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th slide-th-left">
                {locale === 'zh' || locale === 'zh-TW'
                  ? '指标'
                  : locale === 'th'
                    ? 'ตัวชี้วัด'
                    : 'Metric'}
              </th>
              <th className="slide-th slide-th-right">{t.target}</th>
              <th className="slide-th slide-th-right">{t.actual}</th>
              <th className="slide-th slide-th-right">{t.bmEff}</th>
              <th className="slide-th slide-th-right">{t.gap}</th>
              <th className="slide-th slide-th-right">{t.dailyAvg}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((key, i) => {
              const target = data.targets[key];
              const actual = data.actuals[key];
              const eff = data.bm_efficiency[key];
              const gap = data.gap[key];
              const dailyAvg = data.remaining_daily_avg[key];
              const isRate = RATE_METRICS.has(key);

              return (
                <tr key={key} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-medium text-[var(--text-primary)]">
                    {t.metrics[key] ?? key}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                    {fmtVal(key, target)}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                    {fmtVal(key, actual)}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    <span className={bmEffColor(eff, data.bm_pct, isRate)}>
                      {eff != null && eff !== 0 ? formatRate(eff) : '—'}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    <span className={gapColor(gap)}>
                      {gap != null
                        ? isRate
                          ? `${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}pp`
                          : `${gap >= 0 ? '+' : ''}${formatRate(gap)}`
                        : '—'}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                    {dailyAvg != null && dailyAvg !== 0 ? fmtVal(key, dailyAvg) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* BM 进度角标 */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
        <span className="text-[10px] text-[var(--text-muted)]">BM = {formatRate(data.bm_pct)}</span>
        <span className="text-[10px] text-[var(--text-muted)]">
          数量指标：BM效率 ≥ BM% = 领先进度 · 效率指标：达成率 = 实际/目标，GAP = pp差
        </span>
      </div>
    </div>
  );
}
