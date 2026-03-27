'use client';

import { useMyView } from '@/lib/hooks/useMyView';

/**
 * MyViewBanner — 当前岗位沉浸式视角提示条
 *
 * 当 focusCC 有值时，展示蓝色横幅：📌 当前视角: {focusCC} [清除]
 * focusCC 为空（含 teamFilter-only 场景）时：仍展示 teamFilter 摘要。
 * 两者均为空时返回 null。
 *
 * 使用示例：
 *   <MyViewBanner />
 */
export function MyViewBanner() {
  const { focusCC, teamFilter, clearMyView } = useMyView();

  if (!focusCC && !teamFilter) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
      style={{
        backgroundColor: 'var(--color-accent-surface)',
        borderColor: 'var(--color-accent)',
      }}
    >
      <span className="text-[var(--color-accent)] font-medium select-none">📌</span>

      {focusCC && (
        <span className="font-medium text-[var(--text-primary)]">当前视角: {focusCC}</span>
      )}

      {teamFilter && !focusCC && (
        <span className="font-medium text-[var(--text-primary)]">团队: {teamFilter}</span>
      )}

      {focusCC && teamFilter && (
        <span className="text-xs text-[var(--text-muted)] pl-1">/ 团队: {teamFilter}</span>
      )}

      <button
        onClick={clearMyView}
        className="ml-auto flex items-center gap-1 text-xs text-[var(--color-accent)] hover:opacity-70 transition-opacity font-medium"
        aria-label="清除当前视角"
      >
        <span aria-hidden="true">✕</span>
        <span>清除</span>
      </button>
    </div>
  );
}
