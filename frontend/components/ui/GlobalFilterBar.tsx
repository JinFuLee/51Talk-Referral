'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { Filter, Users, Search, X, SlidersHorizontal } from 'lucide-react';
import { useConfigStore, useStoreHydrated } from '@/lib/stores/config-store';
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
  const hydrated = useStoreHydrated();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);

  const teams = useTeamList();

  const handleClear = useCallback(() => {
    setTeamFilter(null);
    setFocusCC(null);
  }, [setTeamFilter, setFocusCC]);

  // 水合前 persist store 值未恢复，使用默认值避免水合不匹配
  const hasActiveFilter = hydrated && Boolean(teamFilter || focusCC);

  // 抽屉打开时禁止 body 滚动
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <>
      <div className="sticky top-0 z-40 w-full bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-sm flex-shrink-0">
        {/* Mobile Bar: 单行按钮 */}
        <div className="md:hidden flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            筛选
            {hasActiveFilter && (
              <span className="ml-1 w-2 h-2 rounded-full bg-[var(--brand-p1)] inline-block" />
            )}
          </button>
          {hasActiveFilter && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-3 h-3" />
              清除
            </button>
          )}
        </div>

        {/* Desktop Bar */}
        <div className="hidden md:flex items-center justify-between px-4 py-2.5 gap-4">
          {/* Left: Team Filter */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded">
              <Users className="w-4 h-4" />
            </div>
            <select
              value={teamFilter ?? ''}
              onChange={(e) => setTeamFilter(e.target.value || null)}
              className="bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] cursor-pointer border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium rounded-lg focus:ring-2 focus:ring-action focus:border-action block w-auto px-3 py-1.5 outline-none transition-colors"
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
            <div className="relative w-64">
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

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          {/* 抽屉内容 */}
          <div className="absolute bottom-0 inset-x-0 bg-[var(--bg-surface)] rounded-t-2xl shadow-xl">
            {/* 把手 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
            </div>
            <div className="px-4 pb-2 flex items-center justify-between">
              <span className="text-base font-semibold text-[var(--text-primary)]">数据筛选</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-4">
              {/* 团队筛选 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  团队
                </label>
                <select
                  value={teamFilter ?? ''}
                  onChange={(e) => setTeamFilter(e.target.value || null)}
                  className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium rounded-lg focus:ring-2 focus:ring-action focus:border-action block w-full px-3 py-2.5 outline-none transition-colors"
                >
                  <option value="">所有团队 (All Teams)</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* CC 搜索 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  搜索 CC
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={focusCC ?? ''}
                    onChange={(e) => setFocusCC(e.target.value || null)}
                    className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-2 focus:ring-action focus:border-action block w-full pl-9 pr-4 py-2.5 outline-none transition-all placeholder:text-[var(--text-muted)]"
                    placeholder="搜索特定 CC..."
                    autoFocus
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-1">
                {hasActiveFilter && (
                  <button
                    onClick={() => {
                      handleClear();
                      setDrawerOpen(false);
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    清除筛选
                  </button>
                )}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[var(--brand-p1)] text-white hover:opacity-90 transition-opacity"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
