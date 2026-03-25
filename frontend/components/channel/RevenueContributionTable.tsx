import { formatRevenue, formatRate } from '@/lib/utils';
import type { RevenueContribution } from '@/lib/types/channel';

interface RevenueContributionTableProps {
  contributions: RevenueContribution[];
}

export function RevenueContributionTable({ contributions }: RevenueContributionTableProps) {
  if (contributions.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">暂无贡献数据</p>;
  }

  const totalRevenue = contributions.reduce((sum, c) => sum + (c.revenue ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">渠道</th>
            <th className="py-1.5 px-2 border-0 text-right">净业绩</th>
            <th className="py-1.5 px-2 border-0 text-right">占比</th>
            <th className="py-1.5 px-2 border-0 text-right">人均业绩</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => {
            const barWidth = Math.min(100, ((c.revenue ?? 0) / (totalRevenue || 1)) * 100);
            return (
              <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
                <td className="py-1 px-2 text-xs">
                  <span className="font-medium text-[var(--text-primary)]">{c.channel}</span>
                  {/* Mini bar */}
                  <div className="mt-0.5 w-full bg-slate-100 rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-navy-300 transition-all duration-200"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                  {formatRevenue(c.revenue)}
                </td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {formatRate(c.share)}
                </td>
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {formatRevenue(c.per_capita)}
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr className="bg-[var(--bg-subtle)] font-semibold border-t border-[var(--border-subtle)]">
            <td className="py-1 px-2 text-xs text-[var(--text-primary)]">合计</td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
              {formatRevenue(totalRevenue)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
              100%
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
              —
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
