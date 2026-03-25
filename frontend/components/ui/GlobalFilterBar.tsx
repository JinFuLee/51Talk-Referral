'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Filter, Users, Search, X } from 'lucide-react';
import { useConfigStore } from '@/lib/stores/config-store';
import { swrFetcher } from '@/lib/api';

// 从 checkin summary 提取团队列表的响应类型（复用已有 API）
interface CheckinTeamRow {
  team: string;
  students: number;
  checked_in: number;
  rate: number;
}
interface CheckinRoleSummary {
  by_team: CheckinTeamRow[];
}
interface CheckinSummaryResponse {
  by_role: Record<string, CheckinRoleSummary>;
}

function useTeamList(): string[] {
  const { data } = useSWR<CheckinSummaryResponse>('/api/checkin/summary', swrFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  if (!data?.by_role) return [];

  const teamSet = new Set<string>();
  for (const roleData of Object.values(data.by_role)) {
    for (const row of roleData.by_team ?? []) {
      if (row.team && row.team.trim()) {
        teamSet.add(row.team.trim());
      }
    }
  }
  return Array.from(teamSet).sort();
}

export function GlobalFilterBar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);

  const teams = useTeamList();

  const handleClear = useCallback(() => {
    setTeamFilter(null);
    setFocusCC(null);
  }, [setTeamFilter, setFocusCC]);

  const hasActiveFilter = Boolean(teamFilter || focusCC);

  return (
    <div className="sticky top-0 z-40 w-full bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-sm flex-shrink-0">
      {/* Mobile Toggle */}
      <div className="md:hidden flex items-center justify-between p-3">
        <span className="text-sm font-semibold text-[var(--text-primary)]">全局数据筛选</span>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-md transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop & Mobile Expanded View */}
      <div
        className={`md:flex items-center justify-between px-4 py-2.5 gap-4 transition-all duration-300 origin-top overflow-hidden ${
          isMobileOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 md:max-h-full md:opacity-100'
        }`}
      >
        {/* Left: Team Filter */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded hidden md:block">
            <Users className="w-4 h-4" />
          </div>
          <select
            value={teamFilter ?? ''}
            onChange={(e) => setTeamFilter(e.target.value || null)}
            className="bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] cursor-pointer border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium rounded-lg focus:ring-2 focus:ring-action focus:border-action block w-full md:w-auto px-3 py-1.5 outline-none transition-colors"
          >
            <option value="">所有团队 (All Teams)</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Right: CC Search */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <input
              type="text"
              value={focusCC ?? ''}
              onChange={(e) => setFocusCC(e.target.value || null)}
              className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-full focus:ring-2 focus:ring-action focus:border-action block w-full pl-9 pr-4 py-1.5 outline-none transition-all placeholder:text-[var(--text-muted)]"
              placeholder="搜索特定 CC..."
            />
          </div>

          {/* Clear button */}
          {hasActiveFilter && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
              清除筛选
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
