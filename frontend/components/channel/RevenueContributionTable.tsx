import { formatRevenue, formatRate } from "@/lib/utils";
import type { RevenueContribution } from "@/lib/types/channel";

interface RevenueContributionTableProps {
  contributions: RevenueContribution[];
}

export function RevenueContributionTable({ contributions }: RevenueContributionTableProps) {
  if (contributions.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] text-center py-6">暂无贡献数据</p>
    );
  }

  const totalRevenue = contributions.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)] border-b border-slate-100">
            <th className="py-2 pr-4 font-medium">渠道</th>
            <th className="py-2 pr-4 text-right font-medium">净业绩</th>
            <th className="py-2 pr-4 text-right font-medium">占比</th>
            <th className="py-2 text-right font-medium">人均业绩</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => {
            const sharePct = c.share / 100;
            const barWidth = Math.min(100, (c.revenue / (totalRevenue || 1)) * 100);
            return (
              <tr
                key={c.channel}
                className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
              >
                <td className="py-2.5 pr-4">
                  <span className="font-medium text-[var(--text-primary)]">{c.channel}</span>
                  {/* Mini bar */}
                  <div className="mt-1 w-full bg-slate-100 rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-blue-400 transition-all duration-200"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold text-[var(--text-primary)]">
                  {formatRevenue(c.revenue)}
                </td>
                <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">
                  {formatRate(sharePct)}
                </td>
                <td className="py-2.5 text-right text-[var(--text-secondary)]">
                  {formatRevenue(c.per_capita)}
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr className="bg-slate-50 font-semibold border-t border-slate-200">
            <td className="py-2.5 pr-4 text-[var(--text-primary)]">合计</td>
            <td className="py-2.5 pr-4 text-right text-[var(--text-primary)]">
              {formatRevenue(totalRevenue)}
            </td>
            <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">100%</td>
            <td className="py-2.5 text-right text-[var(--text-muted)]">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
