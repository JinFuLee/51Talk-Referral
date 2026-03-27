'use client';

import { useMyView } from '@/lib/hooks/useMyView';

/**
 * MyViewBanner — 当前岗位沉浸式视角提示条
 *
 * 当 focusCC 或 teamFilter 有值时，在页面顶部展示当前视角信息，
 * 并提供"清除视角"一键回归全局视图的入口。
 *
 * 使用场景：
 * - CC 通过深度链接打开面板，自动锁定自己的数据视图
 * - 团队负责人按团队筛选后保持视角不丢失
 */
export function MyViewBanner() {
  const { focusCC, teamFilter, clearMyView } = useMyView();
  if (!focusCC && !teamFilter) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
      <span className="text-amber-600 font-medium">当前视角:</span>
      {focusCC && (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-xs font-semibold">
          CC: {focusCC}
        </span>
      )}
      {teamFilter && (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-xs font-semibold">
          团队: {teamFilter}
        </span>
      )}
      <button
        onClick={clearMyView}
        className="ml-auto text-amber-700 hover:text-amber-900 underline text-xs transition-colors"
      >
        清除视角
      </button>
    </div>
  );
}
