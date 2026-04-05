'use client';

import { useTranslations } from 'next-intl';
import { formatRate, formatUSD, formatValue } from '@/lib/utils';
import type { ScenarioAnalysis } from '@/lib/types/report';
import { useLabel, SCENARIO_NAME_LABELS } from '@/lib/label-maps';
interface Props {
  data: ScenarioAnalysis | null | undefined;
}

export function ScenarioCompareSlide({ data }: Props) {
  const t = useTranslations('ScenarioCompareSlide');
  const label = useLabel();
  const scenarios = data?.scenarios ?? [];

  const totalImpactRev = scenarios.reduce((s, sc) => s + (sc.impact_revenue ?? 0), 0);

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-primary-token font-display">{t('title')}</h3>
        <p className="text-xs text-muted-token mt-0.5">{t('subtitle')}</p>
      </div>

      {/* 空态 */}
      {scenarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm font-medium text-secondary-token">{t('noData')}</p>
          <p className="text-xs text-muted-token">{t('noDataDesc')}</p>
        </div>
      ) : (
        <>
          {/* 表格 */}
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t('scenario')}</th>
                  {scenarios.some((s) => s.channel) && (
                    <th className="slide-th slide-th-left">{t('channel')}</th>
                  )}
                  <th className="slide-th slide-th-right">{t('currentRate')}</th>
                  <th className="slide-th slide-th-right">{t('targetRate')}</th>
                  <th className="slide-th slide-th-right">{t('impactReg')}</th>
                  <th className="slide-th slide-th-right">{t('impactPay')}</th>
                  <th className="slide-th slide-th-right">{t('impactRev')}</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc, i) => {
                  const rateDelta = (sc.target_rate ?? 0) - (sc.current_rate ?? 0);
                  return (
                    <tr
                      key={`${sc.name}-${i}`}
                      className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                    >
                      <td className="slide-td font-medium text-primary-token">
                        {label(SCENARIO_NAME_LABELS, sc.name)}
                      </td>
                      {scenarios.some((s) => s.channel) && (
                        <td className="slide-td text-muted-token">{sc.channel ?? '—'}</td>
                      )}
                      <td className="slide-td text-right font-mono tabular-nums text-muted-token">
                        {formatRate(sc.current_rate)}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        <span
                          className={
                            rateDelta >= 0
                              ? 'text-success-token font-semibold'
                              : 'text-danger-token font-semibold'
                          }
                        >
                          {formatRate(sc.target_rate)}
                        </span>
                        {rateDelta !== 0 && (
                          <span className="text-[10px] text-muted-token ml-1">
                            ({rateDelta >= 0 ? '+' : ''}
                            {(rateDelta * 100).toFixed(1)}pp)
                          </span>
                        )}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums text-secondary-token">
                        {sc.impact_registrations != null
                          ? `+${sc.impact_registrations.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums text-secondary-token">
                        {sc.impact_payments != null
                          ? `+${sc.impact_payments.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums text-success-token font-semibold">
                        {sc.impact_revenue != null ? `+${formatUSD(sc.impact_revenue)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 汇总行 */}
          {totalImpactRev > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-subtle-token">
              <span className="text-xs text-muted-token">{t('totalImpact')}</span>
              <span className="text-sm font-bold text-success-token font-mono">
                +{formatUSD(totalImpactRev)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
