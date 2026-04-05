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

/** 下划线式 Tab（用于页面级主导航） */
export function PageTabs({ tabs, activeId, onChange, className }: PageTabsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-8 border-b border-subtle-token overflow-x-auto scrollbar-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-1 py-3 text-sm font-medium transition-colors outline-none whitespace-nowrap min-h-[44px]',
              isActive ? 'text-action' : 'text-secondary-token hover:text-primary-token'
            )}
          >
            {tab.label}
            {isActive && (
              <div className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-action shadow-[0_0_8px_rgba(255,209,0,0.5)] transition-all animate-in fade-in" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}

/** 胶囊式 Tab（用于页面内 CC/SS/LP 切换） */
export function SegmentedTabs<T extends string = string>({
  tabs,
  active,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div className={cn('flex items-center gap-1 bg-subtle rounded-lg p-1 w-fit', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors outline-none min-h-[44px] min-w-[44px]',
            active === t.key
              ? 'bg-surface text-primary-token shadow-sm'
              : 'text-secondary-token hover:text-primary-token'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
