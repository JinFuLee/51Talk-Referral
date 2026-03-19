import { formatRate } from "@/lib/utils";
import type { ThreeFactorComparison } from "@/lib/types/channel";

interface ThreeFactorTableProps {
  comparisons: ThreeFactorComparison[];
}

function FactorBadge({ value }: { value: number }) {
  const pct = value * 100;
  const color =
    pct >= 50
      ? "bg-green-50 text-green-700"
      : pct >= 30
      ? "bg-yellow-50 text-yellow-700"
      : "bg-red-50 text-red-600";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {formatRate(value)}
    </span>
  );
}

export function ThreeFactorTable({ comparisons }: ThreeFactorTableProps) {
  if (comparisons.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] text-center py-6">暂无三因素数据</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)] border-b border-slate-100">
            <th className="py-2 pr-4 font-medium">渠道</th>
            <th className="py-2 pr-4 text-right font-medium">预期量</th>
            <th className="py-2 pr-4 text-right font-medium">实际量</th>
            <th className="py-2 pr-4 text-right font-medium">差距</th>
            <th className="py-2 pr-4 text-right font-medium">预约因子</th>
            <th className="py-2 pr-4 text-right font-medium">出席因子</th>
            <th className="py-2 text-right font-medium">付费因子</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => (
            <tr
              key={c.channel}
              className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
            >
              <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">
                {c.channel}
              </td>
              <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">
                {c.expected_volume.toLocaleString()}
              </td>
              <td className="py-2.5 pr-4 text-right font-semibold text-[var(--text-primary)]">
                {c.actual_volume.toLocaleString()}
              </td>
              <td
                className={`py-2.5 pr-4 text-right font-medium ${
                  c.gap >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {c.gap >= 0 ? "+" : ""}
                {c.gap.toLocaleString()}
              </td>
              <td className="py-2.5 pr-4 text-right">
                <FactorBadge value={c.appt_factor} />
              </td>
              <td className="py-2.5 pr-4 text-right">
                <FactorBadge value={c.show_factor} />
              </td>
              <td className="py-2.5 text-right">
                <FactorBadge value={c.pay_factor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
