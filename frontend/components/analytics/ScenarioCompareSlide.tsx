'use client';

import { formatRate, formatUSD, formatValue } from '@/lib/utils';
import type { ScenarioAnalysis } from '@/lib/types/report';

// ── I18N ──────────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '效率推演',
    subtitle: '当前效率 vs 目标效率 · 增量影响',
    scenario: '推演场景',
    currentRate: '当前率',
    targetRate: '目标率',
    impactReg: '影响注册',
    impactPay: '影响付费',
    impactRev: '影响业绩',
    channel: '口径',
    noData: '暂无推演数据',
    noDataDesc: '需要漏斗基础数据和月度目标配置',
    totalImpact: '合计潜在增收',
  },
  en: {
    title: 'Scenario Analysis',
    subtitle: 'Current vs Target efficiency · Incremental impact',
    scenario: 'Scenario',
    currentRate: 'Current',
    targetRate: 'Target',
    impactReg: 'Impact (Reg)',
    impactPay: 'Impact (Pay)',
    impactRev: 'Impact (Rev)',
    channel: 'Channel',
    noData: 'No scenario data',
    noDataDesc: 'Requires funnel data and monthly target configuration',
    totalImpact: 'Total potential uplift',
  },
} as const;

type Lang = keyof typeof I18N;

interface Props {
  data: ScenarioAnalysis | null | undefined;
  lang: Lang;
}

export function ScenarioCompareSlide({ data, lang }: Props) {
  const t = I18N[lang];
  const scenarios = data?.scenarios ?? [];

  const totalImpactRev = scenarios.reduce((s, sc) => s + (sc.impact_revenue ?? 0), 0);

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-display">{t.title}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
      </div>

      {/* 空态 */}
      {scenarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{t.noData}</p>
          <p className="text-xs text-[var(--text-muted)]">{t.noDataDesc}</p>
        </div>
      ) : (
        <>
          {/* 表格 */}
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t.scenario}</th>
                  {scenarios.some((s) => s.channel) && (
                    <th className="slide-th slide-th-left">{t.channel}</th>
                  )}
                  <th className="slide-th slide-th-right">{t.currentRate}</th>
                  <th className="slide-th slide-th-right">{t.targetRate}</th>
                  <th className="slide-th slide-th-right">{t.impactReg}</th>
                  <th className="slide-th slide-th-right">{t.impactPay}</th>
                  <th className="slide-th slide-th-right">{t.impactRev}</th>
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
                      <td className="slide-td font-medium text-[var(--text-primary)]">{sc.name}</td>
                      {scenarios.some((s) => s.channel) && (
                        <td className="slide-td text-[var(--text-muted)]">{sc.channel ?? '—'}</td>
                      )}
                      <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                        {formatRate(sc.current_rate)}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        <span
                          className={
                            rateDelta >= 0
                              ? 'text-emerald-800 font-semibold'
                              : 'text-red-700 font-semibold'
                          }
                        >
                          {formatRate(sc.target_rate)}
                        </span>
                        {rateDelta !== 0 && (
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">
                            ({rateDelta >= 0 ? '+' : ''}
                            {(rateDelta * 100).toFixed(1)}pp)
                          </span>
                        )}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {sc.impact_registrations != null
                          ? `+${sc.impact_registrations.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {sc.impact_payments != null
                          ? `+${sc.impact_payments.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums text-emerald-800 font-semibold">
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
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)]">{t.totalImpact}</span>
              <span className="text-sm font-bold text-emerald-800 font-mono">
                +{formatUSD(totalImpactRev)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
