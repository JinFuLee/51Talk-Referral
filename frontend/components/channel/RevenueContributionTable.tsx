import { useTranslations } from 'next-intl';
import { formatRevenue, formatRate } from '@/lib/utils';
import type { RevenueContribution } from '@/lib/types/channel';
interface RevenueContributionTableProps {
  contributions: RevenueContribution[];
}

export function RevenueContributionTable({ contributions }: RevenueContributionTableProps) {
  const t = useTranslations('RevenueContributionTable');
  if (contributions.length === 0) {
    return <p className="text-sm text-muted-token text-center py-6">{t('empty')}</p>;
  }

  const totalRevenue = contributions.reduce((sum, c) => sum + (c.revenue ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t('colChannel')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colNetRev')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colShare')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('colPerCapita')}</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => {
            const barWidth = Math.min(100, ((c.revenue ?? 0) / (totalRevenue || 1)) * 100);
            return (
              <tr key={c.channel} className="even:bg-subtle">
                <td className="py-1 px-2 text-xs">
                  <span className="font-medium text-primary-token">{c.channel}</span>
                  {/* Mini bar */}
                  <div className="mt-0.5 w-full bg-subtle rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-action-accent-muted transition-all duration-200"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-primary-token">
                  {formatRevenue(c.revenue)}
                </td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                  {formatRate(c.share)}
                </td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                  {formatRevenue(c.per_capita)}
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr className="bg-subtle font-semibold border-t border-subtle-token">
            <td className="py-1 px-2 text-xs text-primary-token">{t('total')}</td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-primary-token">
              {formatRevenue(totalRevenue)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
              100%
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-muted-token">
              —
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
