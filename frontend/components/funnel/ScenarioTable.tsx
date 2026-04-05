import { useTranslations } from 'next-intl';
import { formatRate } from '@/lib/utils';
import type { ScenarioResult } from '@/lib/types/funnel';
interface ScenarioTableProps {
  stages: ScenarioResult[];
}

export function ScenarioTable({ stages }: ScenarioTableProps) {
  const t = useTranslations('ScenarioTable');
  if (stages.length === 0) {
    return <p className="text-sm text-muted-token text-center py-6">{t('empty')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t('colStage')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colCurrentRate')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colScenarioRate')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colImpactReg')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colImpactPay')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colImpactRev')}</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.stage} className="even:bg-subtle">
              <td className="py-1 px-2 text-xs font-medium text-primary-token">{s.stage}</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                {formatRate(s.current_rate)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-medium text-action-accent">
                {formatRate(s.scenario_rate)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-primary-token">
                +{(s.impact_registrations ?? 0).toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-primary-token">
                +{(s.impact_payments ?? 0).toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-success-token">
                +${(s.impact_revenue ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
