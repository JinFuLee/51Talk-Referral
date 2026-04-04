import { useLocale } from 'next-intl';
import { formatRate } from '@/lib/utils';
import type { ScenarioResult } from '@/lib/types/funnel';

const I18N = {
  zh: {
    empty: '暂无场景推演数据',
    colStage: '环节',
    colCurrentRate: '当前转化率',
    colScenarioRate: '场景转化率',
    colImpactReg: '影响注册',
    colImpactPay: '影响付费',
    colImpactRev: '影响业绩',
  },
  'zh-TW': {
    empty: '暫無場景推演資料',
    colStage: '環節',
    colCurrentRate: '當前轉化率',
    colScenarioRate: '場景轉化率',
    colImpactReg: '影響註冊',
    colImpactPay: '影響付費',
    colImpactRev: '影響業績',
  },
  en: {
    empty: 'No scenario data',
    colStage: 'Stage',
    colCurrentRate: 'Current Rate',
    colScenarioRate: 'Scenario Rate',
    colImpactReg: 'Impact (Reg)',
    colImpactPay: 'Impact (Pay)',
    colImpactRev: 'Impact (Revenue)',
  },
  th: {
    empty: 'ไม่มีข้อมูลสถานการณ์',
    colStage: 'ขั้นตอน',
    colCurrentRate: 'อัตราปัจจุบัน',
    colScenarioRate: 'อัตราสถานการณ์',
    colImpactReg: 'ผลกระทบ (ลงทะเบียน)',
    colImpactPay: 'ผลกระทบ (ชำระ)',
    colImpactRev: 'ผลกระทบ (รายได้)',
  },
} as const;

interface ScenarioTableProps {
  stages: ScenarioResult[];
}

export function ScenarioTable({ stages }: ScenarioTableProps) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  if (stages.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">{t.empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t.colStage}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colCurrentRate}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colScenarioRate}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colImpactReg}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colImpactPay}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colImpactRev}</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.stage} className="even:bg-[var(--bg-subtle)]">
              <td className="py-1 px-2 text-xs font-medium text-[var(--text-primary)]">
                {s.stage}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {formatRate(s.current_rate)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-medium text-action-accent">
                {formatRate(s.scenario_rate)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                +{(s.impact_registrations ?? 0).toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                +{(s.impact_payments ?? 0).toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-[var(--color-success)]">
                +${(s.impact_revenue ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
