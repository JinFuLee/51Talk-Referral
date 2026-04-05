import { useTranslations } from 'next-intl';
import { formatRate } from '@/lib/utils';
import type { ThreeFactorComparison } from '@/lib/types/channel';
interface ThreeFactorTableProps {
  comparisons: ThreeFactorComparison[];
}

function FactorBadge({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs text-secondary-token">—</span>;
  }
  const pct = value * 100;
  const color =
    pct >= 50
      ? 'bg-success-surface text-success-token'
      : pct >= 30
        ? 'bg-warning-surface text-warning-token'
        : 'bg-danger-surface text-danger-token';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {formatRate(value)}
    </span>
  );
}

export function ThreeFactorTable({ comparisons }: ThreeFactorTableProps) {
  const t = useTranslations('ThreeFactorTable');
  if (comparisons.length === 0) {
    return <p className="text-sm text-muted-token text-center py-6">{t('empty')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t('colChannel')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colExpected')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colActual')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colGap')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colApptFactor')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colShowFactor')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colPayFactor')}</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => (
            <tr key={c.channel} className="even:bg-subtle">
              <td className="py-1 px-2 text-xs font-medium text-primary-token">{c.channel}</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                {c.expected_volume != null ? c.expected_volume.toLocaleString() : '—'}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-primary-token">
                {c.actual_volume != null ? c.actual_volume.toLocaleString() : '—'}
              </td>
              <td
                className={`py-1 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                  c.gap == null
                    ? 'text-secondary-token'
                    : c.gap >= 0
                      ? 'text-success-token'
                      : 'text-danger-token'
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
