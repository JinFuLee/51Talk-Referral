'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { formatRate } from '@/lib/utils';
interface CCRankingItem {
  cc_name: string;
  cc_group: string;
  students?: number;
  participation_rate: number;
  cargo_ratio: number;
  registrations: number;
  payments: number;
  revenue_usd?: number;
}

type SortKey = keyof Pick<
  CCRankingItem,
  'participation_rate' | 'cargo_ratio' | 'registrations' | 'payments' | 'revenue_usd'
>;

interface CCRankingTableProps {
  rankings: CCRankingItem[];
}

export function CCRankingTable({ rankings }: CCRankingTableProps) {
  const t = useTranslations('CCRankingTable');

  const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
    { key: 'participation_rate', label: t('participationRate'), format: (v) => formatRate(v) },
    { key: 'cargo_ratio', label: t('cargoRatio'), format: (v) => formatRate(v) },
    { key: 'registrations', label: t('registrations'), format: (v) => (v ?? 0).toLocaleString() },
    { key: 'payments', label: t('payments'), format: (v) => (v ?? 0).toLocaleString() },
    { key: 'revenue_usd', label: t('revenue'), format: (v) => `$${(v ?? 0).toLocaleString()}` },
  ];

  const [sortKey, setSortKey] = useState<SortKey>('participation_rate');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...rankings].sort((a, b) => {
    const diff = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
    return sortAsc ? diff : -diff;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  if (rankings.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-token">{t('empty')}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t('rank')}</th>
            <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap min-w-[100px]">
              {t('ccName')}
            </th>
            <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap min-w-[80px]">
              {t('group')}
            </th>
            {rankings[0]?.students !== undefined && (
              <th className="py-1.5 px-2 border-0 text-right">{t('students')}</th>
            )}
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="py-1.5 px-2 border-0 text-right cursor-pointer hover:text-muted-token select-none"
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.cc_name} className="even:bg-subtle">
              <td className="py-1 px-2 text-xs">
                <span
                  className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? 'bg-warning-surface text-warning-token'
                      : i === 1
                        ? 'bg-surface text-secondary-token'
                        : i === 2
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-muted-token text-xs'
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td
                className="py-1 px-2 text-xs font-medium whitespace-nowrap min-w-[100px]"
                title={r.cc_name}
              >
                <span className="truncate block max-w-[150px]">{r.cc_name}</span>
              </td>
              <td className="py-1 px-2 text-xs text-secondary-token whitespace-nowrap">
                {r.cc_group}
              </td>
              {r.students !== undefined && (
                <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                  {(r.students ?? 0).toLocaleString()}
                </td>
              )}
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`py-1 px-2 text-xs text-right font-mono tabular-nums ${
                    sortKey === col.key ? 'font-semibold text-action-accent' : ''
                  }`}
                >
                  {col.format(r[col.key] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
