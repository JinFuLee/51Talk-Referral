import { formatRevenue, formatRate } from '@/lib/utils';
import type { RevenueContribution } from '@/lib/types/channel';

const I18N = {
  zh: {
    empty: '暂无贡献数据',
    colChannel: '渠道',
    colNetRev: '净业绩',
    colShare: '占比',
    colPerCapita: '人均业绩',
    total: '合计',
  },
  'zh-TW': {
    empty: '暫無貢獻資料',
    colChannel: '渠道',
    colNetRev: '淨業績',
    colShare: '占比',
    colPerCapita: '人均業績',
    total: '合計',
  },
  en: {
    empty: 'No contribution data',
    colChannel: 'Channel',
    colNetRev: 'Net Revenue',
    colShare: 'Share',
    colPerCapita: 'Per Capita',
    total: 'Total',
  },
  th: {
    empty: 'ไม่มีข้อมูลการมีส่วนร่วม',
    colChannel: 'ช่องทาง',
    colNetRev: 'รายได้สุทธิ',
    colShare: 'สัดส่วน',
    colPerCapita: 'รายได้ต่อคน',
    total: 'รวม',
  },
} as const;

interface RevenueContributionTableProps {
  contributions: RevenueContribution[];
  locale?: string;
}

export function RevenueContributionTable({
  contributions,
  locale = 'zh',
}: RevenueContributionTableProps) {
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  if (contributions.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">{t.empty}</p>;
  }

  const totalRevenue = contributions.reduce((sum, c) => sum + (c.revenue ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t.colChannel}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colNetRev}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colShare}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t.colPerCapita}</th>
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
                  <div className="mt-0.5 w-full bg-[var(--bg-subtle)] rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-action-accent-muted transition-all duration-200"
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
            <td className="py-1 px-2 text-xs text-[var(--text-primary)]">{t.total}</td>
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
