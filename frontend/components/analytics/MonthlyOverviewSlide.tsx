'use client';

import { useTranslations } from 'next-intl';
import { formatRate, formatUSD, formatValue } from '@/lib/utils';
import type { MonthlyOverview } from '@/lib/types/report';
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
  if (gap == null) return 'text-muted-token';
  if (gap >= 0) return 'text-success-token font-semibold';
  if (gap >= -0.05) return 'text-warning-token font-semibold';
  return 'text-danger-token font-semibold';
}

/** 效率列颜色
 * 量类：≥100% 已达标(绿) / ≥BM% 领先(绿) / <BM% 落后(红)
 * 率类：≥100% 达标(绿) / ≥95% 接近(黄) / <95% 落后(红) — 不用 BM 阈值
 */
function bmEffColor(eff: number | null | undefined, bmPct: number, isRate = false): string {
  if (eff == null || eff === 0) return 'text-muted-token';
  if (eff >= 1.0) return 'text-success-token font-semibold';
  if (isRate) {
    // 率类：纯粹看达成率离 100% 多远
    if (eff >= 0.95) return 'text-warning-token font-semibold';
    return 'text-danger-token font-semibold';
  }
  // 量类：BM 进度阈值
  if (eff >= bmPct) return 'text-success-token font-semibold';
  return 'text-danger-token font-semibold';
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
  const t = useTranslations('MonthlyOverviewSlide');

  if (!data) {
    return (
      <div className="card-base p-5 flex flex-col justify-center items-center gap-2 min-h-[280px]">
        <p className="text-sm font-medium text-secondary-token">{t('noData')}</p>
        <p className="text-xs text-muted-token">{t('noDataDesc')}</p>
      </div>
    );
  }

  const rows = DISPLAY_METRICS.filter((k) => data.targets[k] != null || data.actuals[k] != null);

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-primary-token font-display">{t('title')}</h3>
        <p className="text-xs text-muted-token mt-0.5">{t('subtitle')}</p>
      </div>

      {/* 表格 */}
      <div className="overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th slide-th-left">{t('metricLabel')}</th>
              <th className="slide-th slide-th-right">{t('target')}</th>
              <th className="slide-th slide-th-right">{t('actual')}</th>
              <th className="slide-th slide-th-right">{t('bmEff')}</th>
              <th className="slide-th slide-th-right">{t('gap')}</th>
              <th className="slide-th slide-th-right">{t('dailyAvg')}</th>
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
                  <td className="slide-td font-medium text-primary-token">
                    {t(`metrics.${key}`) ?? key}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-muted-token">
                    {fmtVal(key, target)}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-semibold text-primary-token">
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
                  <td className="slide-td text-right font-mono tabular-nums text-muted-token">
                    {dailyAvg != null && dailyAvg !== 0 ? fmtVal(key, dailyAvg) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* BM 进度角标 */}
      <div className="flex items-center justify-between pt-1 border-t border-subtle-token">
        <span className="text-[10px] text-muted-token">BM = {formatRate(data.bm_pct)}</span>
        <span className="text-[10px] text-muted-token">{t('bmFootnote')}</span>
      </div>
    </div>
  );
}
