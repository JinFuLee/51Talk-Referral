'use client';

import { useLocale } from 'next-intl';
import { formatRate, formatUSD, formatValue } from '@/lib/utils';
import type { ScenarioAnalysis } from '@/lib/types/report';
import { useLabel, SCENARIO_NAME_LABELS } from '@/lib/label-maps';

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
  'zh-TW': {
    title: '效率推演',
    subtitle: '當前效率 vs 目標效率 · 增量影響',
    scenario: '推演場景',
    currentRate: '當前率',
    targetRate: '目標率',
    impactReg: '影響註冊',
    impactPay: '影響付費',
    impactRev: '影響業績',
    channel: '口徑',
    noData: '暫無推演資料',
    noDataDesc: '需要漏斗基礎資料和月度目標配置',
    totalImpact: '合計潛在增收',
  },
  th: {
    title: 'การวิเคราะห์สถานการณ์',
    subtitle: 'ประสิทธิภาพปัจจุบัน vs เป้าหมาย · ผลกระทบส่วนเพิ่ม',
    scenario: 'สถานการณ์',
    currentRate: 'ปัจจุบัน',
    targetRate: 'เป้าหมาย',
    impactReg: 'ผลต่อลงทะเบียน',
    impactPay: 'ผลต่อชำระ',
    impactRev: 'ผลต่อรายได้',
    channel: 'ช่องทาง',
    noData: 'ไม่มีข้อมูลสถานการณ์',
    noDataDesc: 'ต้องการข้อมูล funnel และการกำหนดเป้าประจำเดือน',
    totalImpact: 'รวมศักยภาพรายได้เพิ่ม',
  },
} as const;

type Lang = keyof typeof I18N;

interface Props {
  data: ScenarioAnalysis | null | undefined;
}

export function ScenarioCompareSlide({ data }: Props) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const label = useLabel();
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
                      <td className="slide-td font-medium text-[var(--text-primary)]">
                        {label(SCENARIO_NAME_LABELS, sc.name)}
                      </td>
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
                              ? 'text-[var(--color-success)] font-semibold'
                              : 'text-[var(--color-danger)] font-semibold'
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
                      <td className="slide-td text-right font-mono tabular-nums text-[var(--color-success)] font-semibold">
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
              <span className="text-sm font-bold text-[var(--color-success)] font-mono">
                +{formatUSD(totalImpactRev)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
