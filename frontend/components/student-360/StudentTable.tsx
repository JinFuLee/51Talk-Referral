'use client';

import type { Student360Brief } from '@/lib/types/cross-analysis';
import { formatRevenue } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortKey = 'paid_amount' | 'total_new' | 'checkin_rate' | 'last_contact_date';
type SortDir = 'asc' | 'desc';

interface StudentTableProps {
  items: Student360Brief[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  onSortChange: (sort: string) => void;
  onPageChange: (page: number) => void;
  onRowClick: (stdt_id: string) => void;
}

function SortIcon({ col, sort }: { col: SortKey; sort: string }) {
  const [key, dir] = sort.split(':') as [SortKey, SortDir];
  if (key !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

function SortableHead({
  col,
  sort,
  onSort,
  children,
  align = 'right',
}: {
  col: SortKey;
  sort: string;
  onSort: (col: SortKey) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`py-1.5 px-2 border-0 text-${align} whitespace-nowrap cursor-pointer select-none group`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1 group-hover:text-white/80">
        {children}
        <SortIcon col={col} sort={sort} />
      </span>
    </th>
  );
}

export function StudentTable({
  items,
  total,
  page,
  pageSize,
  sort,
  onSortChange,
  onPageChange,
  onRowClick,
}: StudentTableProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleSort = (col: SortKey) => {
    const [key, dir] = sort.split(':') as [SortKey, SortDir];
    if (key === col) {
      onSortChange(`${col}:${dir === 'desc' ? 'asc' : 'desc'}`);
    } else {
      onSortChange(`${col}:desc`);
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">学员ID</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">姓名</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">围场</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">生命周期</th>
              <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap min-w-[100px]">CC</th>
              <SortableHead col="paid_amount" sort={sort} onSort={handleSort}>
                付费金额
              </SortableHead>
              <SortableHead col="total_new" sort={sort} onSort={handleSort}>
                带新数
              </SortableHead>
              <SortableHead col="checkin_rate" sort={sort} onSort={handleSort}>
                打卡率
              </SortableHead>
              <th className="py-1.5 px-2 border-0 text-center whitespace-nowrap">高潜</th>
              <SortableHead col="last_contact_date" sort={sort} onSort={handleSort} align="left">
                最后接通
              </SortableHead>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sm text-[var(--text-muted)]">
                  暂无数据，请调整搜索条件
                </td>
              </tr>
            ) : (
              items.map((m) => (
                <tr
                  key={m.stdt_id}
                  onClick={() => onRowClick(m.stdt_id)}
                  className={`even:bg-[var(--bg-subtle)] cursor-pointer hover:bg-action-accent-surface transition-colors ${
                    m.is_high_potential ? 'border-l-2 border-l-orange-400' : ''
                  }`}
                >
                  <td className="py-1 px-2 text-xs text-action-accent font-medium font-mono tabular-nums whitespace-nowrap">
                    {m.stdt_id}
                  </td>
                  <td className="py-1 px-2 text-xs whitespace-nowrap">{m.name || '—'}</td>
                  <td className="py-1 px-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {m.enclosure || '—'}
                  </td>
                  <td className="py-1 px-2 text-xs whitespace-nowrap">
                    <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] rounded text-xs">
                      {m.lifecycle || '—'}
                    </span>
                  </td>
                  <td
                    className="py-1 px-2 text-xs whitespace-nowrap min-w-[100px]"
                    title={m.cc_name ?? ''}
                  >
                    <span className="truncate block max-w-[140px]">{m.cc_name || '—'}</span>
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {formatRevenue(m.paid_amount)}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.total_new ?? '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {m.checkin_rate != null ? `${(m.checkin_rate * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-1 px-2 text-xs text-center">
                    {m.is_high_potential ? (
                      <Badge
                        className="text-white border-0 text-[10px] px-1.5 py-0.5"
                        style={{ backgroundColor: '#f97316' }}
                      >
                        高潜
                      </Badge>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {m.last_contact_date || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <span className="text-xs text-[var(--text-muted)]">
          第 {page} / {totalPages} 页，共 {total} 条
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
          >
            上一页
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
