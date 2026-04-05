'use client';

import { useLocale } from 'next-intl';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const I18N = {
  zh: { sortTitle: (label: string) => `点击按 ${label} 排序` },
  'zh-TW': { sortTitle: (label: string) => `點擊按 ${label} 排序` },
  en: { sortTitle: (label: string) => `Sort by ${label}` },
  th: { sortTitle: (label: string) => `เรียงตาม ${label}` },
} as const;

export interface SortableHeaderProps {
  label: string;
  columnKey: string;
  currentSortKey: string;
  currentSortDir: 'asc' | 'desc' | null;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function SortableHeader({
  label,
  columnKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className,
  align = 'left',
}: SortableHeaderProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] || I18N.zh;
  const isActive = currentSortKey === columnKey;

  return (
    <th
      onClick={() => onSort(columnKey)}
      title={t.sortTitle(label)}
      className={cn(
        'group cursor-pointer p-4 text-sm font-medium transition-colors select-none',
        isActive
          ? 'bg-subtle text-primary-token'
          : 'text-secondary-token hover:bg-subtle hover:text-primary-token',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1',
          align === 'right'
            ? 'justify-end'
            : align === 'center'
              ? 'justify-center'
              : 'justify-start'
        )}
      >
        <span>{label}</span>
        <div className="flex flex-col opacity-0 group-hover:opacity-50 transition-opacity ml-1 -space-y-1">
          {/* Always show both faded on hover if inactive, or show active directed icon */}
          {isActive ? (
            currentSortDir === 'asc' ? (
              <ChevronUp className="w-3 h-3 text-action-text opacity-100" />
            ) : (
              <ChevronDown className="w-3 h-3 text-action-text opacity-100" />
            )
          ) : (
            <>
              <ChevronUp className="w-3 h-3 text-muted-token" />
              <ChevronDown className="w-3 h-3 text-muted-token" />
            </>
          )}
        </div>
      </div>
    </th>
  );
}
