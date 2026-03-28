'use client';

import { formatRevenue } from '@/lib/utils';
import type { BmComparison, BmMetricItem } from '@/lib/types/bm-calendar';

interface BmComparisonTableProps {
  data: BmComparison;
}

const BM_ROWS = [
  { key: 'register', label: '注册', format: 'count' },
  { key: 'appointment', label: '预约', format: 'count' },
  { key: 'showup', label: '出席', format: 'count' },
  { key: 'paid', label: '付费', format: 'count' },
  { key: 'revenue', label: '业绩 (USD)', format: 'currency' },
] as const;

type RowFormat = 'count' | 'currency';

function fmtNum(v: number, format: RowFormat): string {
  if (format === 'currency') return formatRevenue(v);
  return Math.round(v).toLocaleString();
}

function BmGapCell({ value, format }: { value: number; format: RowFormat }) {
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-emerald-800' : 'text-[var(--color-danger)]';
  const arrow = isPositive ? '▲' : '▼';
  const sign = isPositive ? '+' : '';
  const display =
    format === 'currency' ? formatRevenue(value) : `${sign}${Math.round(value).toLocaleString()}`;
  return (
    <span className={`${colorClass} font-mono tabular-nums text-sm`}>
      {arrow} {display}
    </span>
  );
}

function TodayRequiredCell({ value, format }: { value: number; format: RowFormat }) {
  if (value <= 0) {
    return <span className="text-[var(--text-muted)] text-sm">已超额</span>;
  }
  return (
    <span className="text-[var(--color-danger)] font-mono tabular-nums text-sm">
      {fmtNum(value, format)}
    </span>
  );
}

export function BmComparisonTable({ data }: BmComparisonTableProps) {
  const { calendar, metrics } = data;
  const bmMtdPct = (calendar.bm_mtd_pct * 100).toFixed(1);

  return (
    <div className="card-base overflow-x-auto">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">BM 节奏对比</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            截至 {calendar.reference_date}（{calendar.today_type}）· 累计进度{' '}
            <span className="font-semibold text-[var(--text-secondary)]">{bmMtdPct}%</span>
          </p>
        </div>
      </div>

      {/* 表格 */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            {[
              { label: '指标', align: 'left' },
              { label: '月目标', align: 'right' },
              { label: '累计 BM', align: 'right' },
              { label: 'T-1 实际', align: 'right' },
              { label: 'BM 差额', align: 'right' },
              { label: '今日 BM', align: 'right' },
              { label: '今日需（含补差）', align: 'right' },
            ].map(({ label, align }) => (
              <th key={label} className={`table-header py-2 px-3 text-${align} whitespace-nowrap`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BM_ROWS.map(({ key, label, format }, idx) => {
            const item: BmMetricItem | undefined = metrics[key];
            if (!item) return null;

            const isLast = idx === BM_ROWS.length - 1;
            const rowClass = isLast
              ? 'border-t border-[var(--border-default)] bg-[var(--bg-subtle)]'
              : 'border-b border-[var(--border-default)]';

            return (
              <tr key={key} className={`${rowClass} hover:bg-[var(--bg-subtle)] transition-colors`}>
                <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{label}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(item.target, format)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(item.bm_mtd, format)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-primary)] font-semibold">
                  {fmtNum(item.actual, format)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <BmGapCell value={item.bm_gap} format={format} />
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(item.bm_today, format)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <TodayRequiredCell value={item.today_required} format={format} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 底部说明 */}
      <p className="text-[10px] text-[var(--text-muted)] mt-2">
        BM 差额 = T-1 实际 − 累计 BM 应达；今日需 = 追上 BM
        进度线今日需新增量（负值表示已超额无需额外努力）
      </p>
    </div>
  );
}
