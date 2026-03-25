'use client';

import { useEffect, useRef } from 'react';
import { useConfigStore } from '@/lib/stores/config-store';

/**
 * 监听全局筛选器变化，触发主内容区 fade 过渡。
 * 通过 data-loading 属性驱动 .content-transition CSS。
 */
export function ContentTransitionWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.dataset.loading = 'true';
    const t = setTimeout(() => {
      el.dataset.loading = 'false';
    }, 150);
    return () => clearTimeout(t);
  }, [teamFilter, focusCC]);

  return (
    <div ref={ref} className="content-transition h-full">
      {children}
    </div>
  );
}
