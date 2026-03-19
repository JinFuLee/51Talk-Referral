import { formatRate } from "@/lib/utils";
import type { ScenarioResult } from "@/lib/types/funnel";

interface ScenarioTableProps {
  stages: ScenarioResult[];
}

export function ScenarioTable({ stages }: ScenarioTableProps) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">暂无场景推演数据</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
            <th className="py-2 pr-4">环节</th>
            <th className="py-2 pr-4 text-right">当前转化率</th>
            <th className="py-2 pr-4 text-right">场景转化率</th>
            <th className="py-2 pr-4 text-right">影响注册</th>
            <th className="py-2 pr-4 text-right">影响付费</th>
            <th className="py-2 text-right">影响业绩</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.stage} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
              <td className="py-2.5 pr-4 font-medium text-slate-800">
                {s.stage}
              </td>
              <td className="py-2.5 pr-4 text-right text-slate-500">
                {formatRate(s.current_rate)}
              </td>
              <td className="py-2.5 pr-4 text-right font-medium text-blue-600">
                {formatRate(s.scenario_rate)}
              </td>
              <td className="py-2.5 pr-4 text-right text-slate-700">
                +{s.impact_registrations.toLocaleString()}
              </td>
              <td className="py-2.5 pr-4 text-right text-slate-700">
                +{s.impact_payments.toLocaleString()}
              </td>
              <td className="py-2.5 text-right font-semibold text-green-600">
                +${s.impact_revenue.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
