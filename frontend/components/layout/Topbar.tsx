'use client';

import { useHealth } from '@/lib/hooks';
import { usePathname } from 'next/navigation';
import { usePresentationStore } from '@/lib/stores/presentation-store';
import { MonitorPlay } from 'lucide-react';
import clsx from 'clsx';
import { TimePeriodSelector } from '@/components/shared/TimePeriodSelector';
import { CompareToggle } from '@/components/shared/CompareToggle';
import { BrandMark } from '@/components/ui/BrandMark';

function ViewModeBadge({ pathname }: { pathname: string }) {
  if (pathname.startsWith('/ops')) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-white font-medium">
        运营视图
      </span>
    );
  }
  if (pathname.startsWith('/biz')) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
        业务视图
      </span>
    );
  }
  return null;
}

export function Topbar() {
  const { data: health } = useHealth();
  const pathname = usePathname();
  const togglePresentationMode = usePresentationStore((s) => s.togglePresentationMode);

  const isOnline = health?.status === 'ok';

  return (
    <header className="h-14 bg-[var(--bg-surface)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] flex items-center justify-between px-3 lg:px-6 shrink-0 relative z-40">
      {/* 移动端左侧为汉堡按钮留出空间（固定定位在 left-4，宽约 44px） */}
      <div className="flex items-center gap-2 lg:gap-3 pl-10 lg:pl-0">
        <div className="hidden sm:block text-sm font-medium text-[var(--text-secondary)]">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          <span className="text-[var(--text-muted)] mx-2">|</span>
          T-1 数据
        </div>
        <TimePeriodSelector />
        <span className="hidden sm:inline text-[var(--text-muted)]">|</span>
        <CompareToggle />
        <ViewModeBadge pathname={pathname} />
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Presentation Mode Toggle */}
        <button
          onClick={togglePresentationMode}
          className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-action-text hover:bg-action-surface hover:border-action transition-all"
        >
          <MonitorPlay className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">汇报沉浸模式</span>
        </button>

        <span className="hidden sm:inline text-[var(--text-muted)]">|</span>

        {/* Backend status indicator */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <span
            className={clsx(
              'inline-block w-2.5 h-2.5 rounded-full shadow-sm',
              isOnline ? 'bg-success' : 'bg-destructive'
            )}
          />
          <span className="hidden sm:inline">{isOnline ? '后端在线' : '后端连接断开'}</span>
        </div>

        <span className="hidden sm:inline text-[var(--text-muted)]">|</span>

        {/* SEE Brand Mark */}
        <div className="flex items-center gap-2" title="SEE — Self-Evolving Ecosystem">
          <BrandMark size={18} className="text-[var(--brand-p1)] brand-mark-enter" />
        </div>
      </div>
    </header>
  );
}
