'use client';

import { useState } from 'react';
import { SortableHeader } from '@/components/ui/SortableHeader';
import type { HighPotentialStudent } from '@/lib/types/member';
import type { WarroomStudent } from '@/lib/types/cross-analysis';

type SortKey =
  | 'id'
  | 'enclosure'
  | 'total_new'
  | 'attendance'
  | 'payments'
  | 'days_since_last_cc_contact';

interface HighPotentialTableProps {
  students: HighPotentialStudent[];
  warroomMap: Map<string, WarroomStudent>;
}

/** nan / null / 空 → "—" */
function fmt(v: string | number | null | undefined): string {
  if (v == null) return '—';
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'nan' || s.toLowerCase() === 'none') return '—';
  return s;
}

/** 数值排序辅助 */
function numVal(v: string | number | null | undefined): number {
  const n = Number(v);
  return isNaN(n) ? -Infinity : n;
}

function UrgencyDot({ level }: { level?: 'red' | 'yellow' | 'green' }) {
  if (!level) return null;
  const cls =
    level === 'red'
      ? 'bg-[var(--color-danger)]'
      : level === 'yellow'
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--color-success)]';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} shrink-0`} />;
}

export function HighPotentialTable({ students, warroomMap }: HighPotentialTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total_new');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key as SortKey);
      setSortDir('desc');
    }
  }

  const sorted = [...students].sort((a, b) => {
    let diff = 0;
    switch (sortKey) {
      case 'id':
        diff = String(a.id).localeCompare(String(b.id));
        break;
      case 'enclosure':
        diff = String(a.enclosure ?? '').localeCompare(String(b.enclosure ?? ''));
        break;
      case 'total_new':
        diff = numVal(a.total_new) - numVal(b.total_new);
        break;
      case 'attendance':
        diff = numVal(a.attendance) - numVal(b.attendance);
        break;
      case 'payments':
        diff = numVal(a.payments) - numVal(b.payments);
        break;
      case 'days_since_last_cc_contact':
        diff = numVal(a.days_since_last_cc_contact) - numVal(b.days_since_last_cc_contact);
        break;
    }
    return sortDir === 'asc' ? diff : -diff;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-subtle)]">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="slide-thead-row">
            <SortableHeader
              label="学员ID"
              columnKey="id"
              currentSortKey={sortKey}
              currentSortDir={sortKey === 'id' ? sortDir : null}
              onSort={handleSort}
              className="slide-th slide-th-left"
            />
            <SortableHeader
              label="围场"
              columnKey="enclosure"
              currentSortKey={sortKey}
              currentSortDir={sortKey === 'enclosure' ? sortDir : null}
              onSort={handleSort}
              className="slide-th slide-th-left"
            />
            {/* CC / SS / LP 静态列 */}
            <th className="slide-th slide-th-left text-left px-4 py-3 text-sm font-medium">CC</th>
            <th className="slide-th slide-th-left text-left px-4 py-3 text-sm font-medium">SS</th>
            <th className="slide-th slide-th-left text-left px-4 py-3 text-sm font-medium">LP</th>
            <SortableHeader
              label="带新数"
              columnKey="total_new"
              currentSortKey={sortKey}
              currentSortDir={sortKey === 'total_new' ? sortDir : null}
              onSort={handleSort}
              align="right"
              className="slide-th slide-th-right"
            />
            <SortableHeader
              label="出席数"
              columnKey="attendance"
              currentSortKey={sortKey}
              currentSortDir={sortKey === 'attendance' ? sortDir : null}
              onSort={handleSort}
              align="right"
              className="slide-th slide-th-right"
            />
            <SortableHeader
              label="付费数"
              columnKey="payments"
              currentSortKey={sortKey}
              currentSortDir={sortKey === 'payments' ? sortDir : null}
              onSort={handleSort}
              align="right"
              className="slide-th slide-th-right"
            />
            <th className="slide-th slide-th-center text-center px-4 py-3 text-sm font-medium">
              参与深度
            </th>
            <SortableHeader
              label="打卡次数"
              columnKey="days_since_last_cc_contact"
              currentSortKey={sortKey}
              currentSortDir={sortKey === 'days_since_last_cc_contact' ? sortDir : null}
              onSort={handleSort}
              align="right"
              className="slide-th slide-th-right"
            />
            <th className="slide-th slide-th-right text-right px-4 py-3 text-sm font-medium">
              窗口期
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, idx) => {
            const warroom = warroomMap.get(String(s.id));
            const isEven = idx % 2 === 0;

            return (
              <tr
                key={s.id}
                className={`${isEven ? 'slide-row-even' : 'slide-row-odd'} hover:bg-[var(--color-accent-surface)] transition-colors`}
              >
                {/* 学员ID */}
                <td className="slide-td px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {warroom?.urgency_level && <UrgencyDot level={warroom.urgency_level} />}
                    <span className="font-mono text-xs text-[var(--text-primary)] font-semibold">
                      #{fmt(s.id)}
                    </span>
                  </div>
                </td>

                {/* 围场 */}
                <td className="slide-td px-4 py-2.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-[var(--color-accent-surface)] text-[var(--color-accent)]">
                    {fmt(s.enclosure)}
                  </span>
                </td>

                {/* CC */}
                <td className="slide-td px-4 py-2.5 text-[var(--text-secondary)]">
                  <div className="text-xs">
                    <div className="font-medium">{fmt(s.cc_name)}</div>
                    {s.cc_group && fmt(s.cc_group) !== '—' && (
                      <div className="text-[var(--text-muted)] text-[10px]">{fmt(s.cc_group)}</div>
                    )}
                  </div>
                </td>

                {/* SS */}
                <td className="slide-td px-4 py-2.5 text-[var(--text-secondary)]">
                  <div className="text-xs">
                    <div className="font-medium">{fmt(s.ss_name)}</div>
                    {s.ss_group && fmt(s.ss_group) !== '—' && (
                      <div className="text-[var(--text-muted)] text-[10px]">{fmt(s.ss_group)}</div>
                    )}
                  </div>
                </td>

                {/* LP */}
                <td className="slide-td px-4 py-2.5 text-[var(--text-secondary)]">
                  <div className="text-xs">
                    <div className="font-medium">{fmt(s.lp_name)}</div>
                    {s.lp_group && fmt(s.lp_group) !== '—' && (
                      <div className="text-[var(--text-muted)] text-[10px]">{fmt(s.lp_group)}</div>
                    )}
                  </div>
                </td>

                {/* 带新数 */}
                <td className="slide-td px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">
                  {s.total_new ?? '—'}
                </td>

                {/* 出席数 */}
                <td className="slide-td px-4 py-2.5 text-right text-[var(--text-secondary)]">
                  {s.attendance ?? '—'}
                </td>

                {/* 付费数 */}
                <td className="slide-td px-4 py-2.5 text-right">
                  <span
                    className={`font-semibold ${
                      (s.payments ?? 0) > 0
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {s.payments ?? '—'}
                  </span>
                </td>

                {/* 参与深度 */}
                <td className="slide-td px-4 py-2.5 text-center">
                  {s.deep_engagement != null ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        s.deep_engagement
                          ? 'bg-emerald-50 text-[var(--color-success)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      {s.deep_engagement ? '深度' : '浅度'}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-xs">—</span>
                  )}
                </td>

                {/* 打卡次数（来自 warroom checkin_7d） */}
                <td className="slide-td px-4 py-2.5 text-right text-[var(--text-secondary)]">
                  {warroom?.checkin_7d ?? '—'}
                </td>

                {/* 窗口期（warroom days_remaining） */}
                <td className="slide-td px-4 py-2.5 text-right">
                  {warroom?.days_remaining != null ? (
                    <span
                      className={`text-xs font-medium ${
                        warroom.days_remaining <= 7
                          ? 'text-[var(--color-danger)]'
                          : warroom.days_remaining <= 14
                            ? 'text-[var(--color-warning)]'
                            : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {warroom.days_remaining}天
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
