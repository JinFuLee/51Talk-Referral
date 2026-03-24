import { formatRate } from '@/lib/utils';
import type { ThreeFactorComparison } from '@/lib/types/channel';

interface ThreeFactorTableProps {
  comparisons: ThreeFactorComparison[];
}

function FactorBadge({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs text-[var(--text-secondary)]">—</span>;
  }
  const pct = value * 100;
  const color =
    pct >= 50
      ? 'bg-green-50 text-green-700'
      : pct >= 30
        ? 'bg-yellow-50 text-yellow-700'
        : 'bg-red-50 text-red-600';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {formatRate(value)}
    </span>
  );
}

export function ThreeFactorTable({ comparisons }: ThreeFactorTableProps) {
  if (comparisons.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">暂无三因素数据</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">渠道</th>
            <th className="py-1.5 px-2 border-0 text-right">预期量</th>
            <th className="py-1.5 px-2 border-0 text-right">实际量</th>
            <th className="py-1.5 px-2 border-0 text-right">差距</th>
            <th className="py-1.5 px-2 border-0 text-right">预约因子</th>
            <th className="py-1.5 px-2 border-0 text-right">出席因子</th>
            <th className="py-1.5 px-2 border-0 text-right">付费因子</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => (
            <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
              <td className="py-1 px-2 text-xs font-medium text-[var(--text-primary)]">
                {c.channel}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {c.expected_volume != null ? c.expected_volume.toLocaleString() : '—'}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                {c.actual_volume != null ? c.actual_volume.toLocaleString() : '—'}
              </td>
              <td
                className={`py-1 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                  c.gap == null
                    ? 'text-[var(--text-secondary)]'
                    : c.gap >= 0
                      ? 'text-green-600'
                      : 'text-red-500'
                }`}
              >
                {c.gap == null ? '—' : `${c.gap >= 0 ? '+' : ''}${c.gap.toLocaleString()}`}
              </td>
              <td className="py-1 px-2 text-xs text-right">
                <FactorBadge value={c.appt_factor} />
              </td>
              <td className="py-1 px-2 text-xs text-right">
                <FactorBadge value={c.show_factor} />
              </td>
              <td className="py-1 px-2 text-xs text-right">
                <FactorBadge value={c.pay_factor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
