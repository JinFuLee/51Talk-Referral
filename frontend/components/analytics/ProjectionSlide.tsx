'use client';

import { useTranslations } from 'next-intl';
import { formatRate, formatUSD, formatValue } from '@/lib/utils';
import type { Projection } from '@/lib/types/report';
const MONEY_KEYS = new Set(['projected_revenue_usd', 'revenue_usd']);

function projFmt(key: string, val: number | null | undefined): string {
  if (val == null) return '—';
  if (MONEY_KEYS.has(key) || key.includes('revenue')) return formatUSD(val);
  if (key.includes('asp')) return formatUSD(val);
  return formatValue(Math.round(val), false);
}

interface Props {
  data: Projection | null | undefined;
  bm_pct: number;
}

export function ProjectionSlide({ data, bm_pct }: Props) {
  const t = useTranslations('ProjectionSlide');

  if (!data) {
    return (
      <div className="card-base p-5 flex flex-col justify-center items-center gap-2 min-h-[280px]">
        <p className="text-sm font-medium text-secondary-token">{t('noData')}</p>
        <p className="text-xs text-muted-token">{t('noDataDesc')}</p>
      </div>
    );
  }

  const revGap = data.revenue_gap_to_target;
  const isAhead = (revGap ?? 0) >= 0;

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-primary-token font-display">{t('title')}</h3>
        <p className="text-xs text-muted-token mt-0.5">{t('subtitle')}</p>
      </div>

      {/* 预测值卡片组 */}
      <div className="overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th slide-th-left">{t('metric')}</th>
              <th className="slide-th slide-th-right">{t('projectedValue')}</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(t.raw('projections')) ? (t.raw('projections') as Array<{key: string; label: string}>) : []).map(({ key, label }, i) => {
              const val = data[key as keyof Projection] as number | null | undefined;
              const isMoney = MONEY_KEYS.has(key) || key.includes('revenue');
              return (
                <tr key={key} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-medium text-primary-token">{label}</td>
                  <td
                    className={`slide-td text-right font-mono tabular-nums font-semibold ${isMoney ? 'text-accent-token' : 'text-primary-token'}`}
                  >
                    {projFmt(key, val)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 业绩缺口徽章 */}
      {revGap != null && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 ${
            isAhead
              ? 'bg-success-surface border border-success-token'
              : 'bg-danger-surface border border-danger-token'
          }`}
        >
          <span className="text-xs font-semibold text-secondary-token">{t('revenueGap')}</span>
          <div className="text-right">
            <span
              className={`text-sm font-bold font-mono ${isAhead ? 'text-success-token' : 'text-danger-token'}`}
            >
              {isAhead ? '+' : ''}
              {formatUSD(revGap)}
            </span>
            <p
              className={`text-[10px] mt-0.5 ${isAhead ? 'text-success-token' : 'text-danger-token'}`}
            >
              {isAhead ? t('ahead') : t('behind')}
            </p>
          </div>
        </div>
      )}

      {/* ASP 敏感性 */}
      {data.asp_sensitivity_per_dollar != null && (
        <div className="flex items-center justify-between pt-2 border-t border-subtle-token">
          <div>
            <p className="text-xs font-semibold text-muted-token">{t('aspSensitivity')}</p>
            <p className="text-[10px] text-muted-token">{t('aspSensDesc')}</p>
          </div>
          <span className="text-sm font-bold text-warning-token font-mono">
            -{formatUSD(Math.abs(data.asp_sensitivity_per_dollar))}
          </span>
        </div>
      )}

      {/* 当前日均 */}
      {data.current_daily_avg && Object.keys(data.current_daily_avg).length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-subtle-token">
          {['registrations', 'payments', 'revenue_usd'].map((key) => {
            const val = data.current_daily_avg[key];
            return (
              <div key={key} className="text-center">
                <p className="text-[10px] text-muted-token">{t(`dailyMetrics.${key}`) ?? key}</p>
                <p className="text-xs font-bold font-mono text-primary-token">
                  {key.includes('revenue')
                    ? formatUSD(val)
                    : val != null
                      ? Math.round(val).toLocaleString()
                      : '—'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
