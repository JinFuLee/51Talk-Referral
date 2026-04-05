'use client';

import { useTranslations } from 'next-intl';
import { formatRevenue } from '@/lib/utils';
import type { BmComparison, BmMetricItem } from '@/lib/types/bm-calendar';
interface BmComparisonTableProps {
  data: BmComparison;
  visibleKeys?: string[];
}

type RowFormat = 'count' | 'currency';

function fmtNum(v: number, format: RowFormat): string {
  if (format === 'currency') return formatRevenue(v);
  return Math.round(v).toLocaleString();
}

function BmGapCell({ value, format }: { value: number; format: RowFormat }) {
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-success-token' : 'text-danger-token';
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
  const t = useTranslations('BmComparisonTable');
  if (value <= 0) {
    return <span className="text-muted-token text-sm">{t('overQuota')}</span>;
  }
  return (
    <span className="text-danger-token font-mono tabular-nums text-sm">
      {fmtNum(value, format)}
    </span>
  );
}

export function BmComparisonTable({ data, visibleKeys }: BmComparisonTableProps) {
  const t = useTranslations('BmComparisonTable');

  const ALL_BM_ROWS = [
    { key: 'register', label: t('register'), format: 'count' as const },
    { key: 'appointment', label: t('appointment'), format: 'count' as const },
    { key: 'showup', label: t('showup'), format: 'count' as const },
    { key: 'paid', label: t('paid'), format: 'count' as const },
    { key: 'revenue', label: t('revenue'), format: 'currency' as const },
  ];

  const COLUMNS = [
    { label: t('colMetric'), align: 'left' as const, tooltip: '' },
    { label: t('colTarget'), align: 'right' as const, tooltip: t('colTargetTip') },
    { label: t('colBmMtd'), align: 'right' as const, tooltip: t('colBmMtdTip') },
    { label: t('colActual'), align: 'right' as const, tooltip: t('colActualTip') },
    { label: t('colBmGap'), align: 'right' as const, tooltip: t('colBmGapTip') },
    { label: t('colBmToday'), align: 'right' as const, tooltip: t('colBmTodayTip') },
    { label: t('colTodayRequired'), align: 'right' as const, tooltip: t('colTodayRequiredTip') },
    { label: t('colDailyAvg'), align: 'right' as const, tooltip: t('colDailyAvgTip') },
  ];

  const { calendar, metrics } = data;
  const bmMtdPct = ((calendar.bm_mtd_pct ?? 0) * 100).toFixed(1);

  const rows = visibleKeys ? ALL_BM_ROWS.filter((r) => visibleKeys.includes(r.key)) : ALL_BM_ROWS;

  return (
    <div className="card-base overflow-x-auto">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-primary-token">{t('titleBmRhythm')}</h3>
          <p className="text-xs text-muted-token mt-0.5">
            {t('progressThrough')} {calendar.reference_date}（{calendar.today_type}）· {t('cumProgress')}{' '}
            <span className="font-semibold text-secondary-token">{bmMtdPct}%</span>
          </p>
        </div>
      </div>

      {/* 表格 */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-default-token">
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`table-header py-2 px-3 text-${col.align} whitespace-nowrap`}
                title={col.tooltip || undefined}
              >
                {col.label}
                {col.tooltip && <span className="text-muted-token ml-0.5 cursor-help">ⓘ</span>}
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
              ? 'border-t border-default-token bg-subtle'
              : 'border-b border-default-token';

            return (
              <tr key={key} className={`${rowClass} hover:bg-subtle transition-colors`}>
                <td className="py-2.5 px-3 font-medium text-primary-token">{label}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-secondary-token">
                  {fmtNum(item.target, format)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-secondary-token">
                  {fmtNum(item.bm_mtd, format)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-primary-token font-semibold">
                  {fmtNum(item.actual, format)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <BmGapCell value={item.bm_gap} format={format} />
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-secondary-token">
                  {fmtNum(item.bm_today, format)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <TodayRequiredCell value={item.today_required} format={format} />
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-secondary-token">
                  {item.target_daily_avg != null ? fmtNum(item.target_daily_avg, format) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 底部说明 */}
      <p className="text-[10px] text-muted-token mt-2">{t('footnote')}</p>
    </div>
  );
}
