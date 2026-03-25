'use client';

import { Search, X } from 'lucide-react';
import type { HighPotentialStudent } from '@/lib/types/member';

export interface FilterState {
  search: string;
  enclosure: string;
  deepEngagement: string; // 'all' | 'deep' | 'shallow'
  hasPaid: string; // 'all' | 'yes' | 'no'
  ccGroup: string;
}

interface HighPotentialFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  students: HighPotentialStudent[];
  totalFiltered: number;
  totalAll: number;
}

/** 从学员列表提取去重选项 */
function extractOptions(
  students: HighPotentialStudent[],
  key: keyof HighPotentialStudent
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of students) {
    const v = String(s[key] ?? '').trim();
    if (v && v !== 'nan' && v !== 'None' && !seen.has(v)) {
      seen.add(v);
      result.push(v);
    }
  }
  return result.sort();
}

export function HighPotentialFilters({
  filters,
  onChange,
  students,
  totalFiltered,
  totalAll,
}: HighPotentialFiltersProps) {
  const enclosureOptions = extractOptions(students, 'enclosure');
  const ccGroupOptions = extractOptions(students, 'cc_group');

  const hasActiveFilter =
    filters.search !== '' ||
    filters.enclosure !== 'all' ||
    filters.deepEngagement !== 'all' ||
    filters.hasPaid !== 'all' ||
    filters.ccGroup !== 'all';

  function handleReset() {
    onChange({
      search: '',
      enclosure: 'all',
      deepEngagement: 'all',
      hasPaid: 'all',
      ccGroup: 'all',
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 搜索框 */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="搜索学员ID / CC名"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent-muted)]"
        />
      </div>

      {/* 围场下拉 */}
      <select
        value={filters.enclosure}
        onChange={(e) => onChange({ ...filters, enclosure: e.target.value })}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 cursor-pointer"
      >
        <option value="all">全部围场</option>
        {enclosureOptions.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      {/* 参与深度 */}
      <select
        value={filters.deepEngagement}
        onChange={(e) => onChange({ ...filters, deepEngagement: e.target.value })}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 cursor-pointer"
      >
        <option value="all">参与深度：全部</option>
        <option value="deep">深度参与</option>
        <option value="shallow">浅度参与</option>
      </select>

      {/* 付费状态 */}
      <select
        value={filters.hasPaid}
        onChange={(e) => onChange({ ...filters, hasPaid: e.target.value })}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 cursor-pointer"
      >
        <option value="all">付费：全部</option>
        <option value="yes">已付费</option>
        <option value="no">未付费</option>
      </select>

      {/* CC 团队 */}
      {ccGroupOptions.length > 0 && (
        <select
          value={filters.ccGroup}
          onChange={(e) => onChange({ ...filters, ccGroup: e.target.value })}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 cursor-pointer"
        >
          <option value="all">CC 团队：全部</option>
          {ccGroupOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      )}

      {/* 重置 + 计数 */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
          {totalFiltered === totalAll ? `共 ${totalAll} 人` : `${totalFiltered} / ${totalAll} 人`}
        </span>
        {hasActiveFilter && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-default)] transition-colors"
          >
            <X className="w-3 h-3" />
            重置
          </button>
        )}
      </div>
    </div>
  );
}
