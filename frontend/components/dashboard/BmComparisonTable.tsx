'use client';

import { formatRevenue } from '@/lib/utils';
import type { BmComparison, BmMetricItem } from '@/lib/types/bm-calendar';

interface BmComparisonTableProps {
  data: BmComparison;
  visibleKeys?: string[];
}

const ALL_BM_ROWS = [
  { key: 'register', label: '注册', format: 'count' as const },
  { key: 'appointment', label: '预约', format: 'count' as const },
  { key: 'showup', label: '出席', format: 'count' as const },
  { key: 'paid', label: '付费', format: 'count' as const },
  { key: 'revenue', label: '业绩 (USD)', format: 'currency' as const },
];

const COLUMNS = [
  { label: '指标', align: 'left' as const, tooltip: '' },
  { label: '月目标', align: 'right' as const, tooltip: '本月 KPI 目标值' },
  {
    label: '累计 BM',
    align: 'right' as const,
    tooltip: '月目标 × BM 进度%（截至 T-1 应达基准值）',
  },
  { label: 'T-1 实际', align: 'right' as const, tooltip: '截至昨日的实际累计完成量' },
  { label: 'BM 差额', align: 'right' as const, tooltip: '实际 − 累计 BM：正值超前，负值落后' },
  { label: '今日 BM', align: 'right' as const, tooltip: '月目标 × 今日 BM%（今日基准配额）' },
  {
    label: '今日需（含补差）',
    align: 'right' as const,
    tooltip: '剩余量 × (今日BM% ÷ 剩余BM%)：今日具体需完成量',
  },
  {
    label: '达标日均',
    align: 'right' as const,
    tooltip: '(月目标 − 实际) ÷ 剩余工作日：平均每日需完成量',
  },
];

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

export function BmComparisonTable({ data, visibleKeys }: BmComparisonTableProps) {
  const { calendar, metrics } = data;
  const bmMtdPct = (calendar.bm_mtd_pct * 100).toFixed(1);

  const rows = visibleKeys ? ALL_BM_ROWS.filter((r) => visibleKeys.includes(r.key)) : ALL_BM_ROWS;

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
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`table-header py-2 px-3 text-${col.align} whitespace-nowrap`}
                title={col.tooltip || undefined}
              >
                {col.label}
                {col.tooltip && (
                  <span className="text-[var(--text-muted)] ml-0.5 cursor-help">ⓘ</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, format }, idx) => {
            const item: BmMetricItem | undefined = metrics[key];
            if (!item) return null;

            const isLast = idx === rows.length - 1;
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
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {item.target_daily_avg != null ? fmtNum(item.target_daily_avg, format) : '—'}
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
