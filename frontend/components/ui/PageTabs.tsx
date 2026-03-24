'use client';

import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
}

export interface PageTabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function PageTabs({ tabs, activeId, onChange, className }: PageTabsProps) {
  return (
    <div
      className={cn('flex items-center gap-8 border-b border-[var(--border-subtle)]', className)}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-1 py-3 text-sm font-medium transition-colors outline-none whitespace-nowrap',
              isActive
                ? 'text-brand-600'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {tab.label}
            {isActive && (
              <div className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-brand-600 shadow-[0_0_8px_rgba(2,132,199,0.5)] transition-all animate-in fade-in" />
            )}
          </button>
        );
      })}
    </div>
  );
}
