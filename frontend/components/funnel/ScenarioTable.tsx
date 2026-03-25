import { formatRate } from '@/lib/utils';
import type { ScenarioResult } from '@/lib/types/funnel';

interface ScenarioTableProps {
  stages: ScenarioResult[];
}

export function ScenarioTable({ stages }: ScenarioTableProps) {
  if (stages.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">暂无场景推演数据</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">环节</th>
            <th className="py-1.5 px-2 border-0 text-right">当前转化率</th>
            <th className="py-1.5 px-2 border-0 text-right">场景转化率</th>
            <th className="py-1.5 px-2 border-0 text-right">影响注册</th>
            <th className="py-1.5 px-2 border-0 text-right">影响付费</th>
            <th className="py-1.5 px-2 border-0 text-right">影响业绩</th>
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
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-medium text-navy-500">
                {formatRate(s.scenario_rate)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                +{s.impact_registrations.toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                +{s.impact_payments.toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-green-600">
                +${s.impact_revenue.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
