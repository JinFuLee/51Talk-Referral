'use client';

// "我的视角" hook — URL searchParams ↔ Zustand focusCC / teamFilter 双向同步

import { useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useConfigStore } from '@/lib/stores/config-store';

/**
 * useMyView — URL ↔ Zustand 双向同步 hook
 *
 * 职责：
 * - Mount 时从 URL query params 同步到 Zustand（cc / team）
 * - 提供 setMyView / clearMyView 工具函数，供组件调用
 *
 * 使用场景：
 * - 分享深度链接时，URL 参数自动恢复 focusCC / teamFilter 状态
 * - MyViewBanner 显示当前视角并提供"清除"入口
 *
 * 使用示例：
 *   const { focusCC, setMyView, clearMyView, isActive } = useMyView();
 *   setMyView('小明');   // 设置 CC 视角并同步 URL
 *   clearMyView();       // 清除视角
 */
export function useMyView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const focusCC = useConfigStore((s) => s.focusCC);
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);

  // URL → Zustand（仅 mount 时同步一次，避免循环更新）
  useEffect(() => {
    const urlCC = searchParams.get('cc');
    const urlTeam = searchParams.get('team');
    if (urlCC && urlCC !== focusCC) setFocusCC(urlCC);
    if (urlTeam && urlTeam !== teamFilter) setTeamFilter(urlTeam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only — intentional

  // Zustand → URL 同步工具（底层）
  const syncToUrl = useCallback(
    (cc: string | null, team: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (cc) params.set('cc', cc);
      else params.delete('cc');
      if (team) params.set('team', team);
      else params.delete('team');
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  // 设置 CC 视角并同步 URL
  const setMyView = useCallback(
    (cc: string | null) => {
      setFocusCC(cc);
      const params = new URLSearchParams(searchParams.toString());
      if (cc) params.set('cc', cc);
      else params.delete('cc');
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, setFocusCC, router, pathname]
  );

  const clearMyView = useCallback(() => {
    setFocusCC(null);
    setTeamFilter(null);
    syncToUrl(null, null);
  }, [setFocusCC, setTeamFilter, syncToUrl]);

  return {
    focusCC,
    teamFilter,
    setMyView,
    syncToUrl,
    clearMyView,
    isActive: !!focusCC,
  };
}
