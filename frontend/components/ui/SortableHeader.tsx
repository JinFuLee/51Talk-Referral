'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const isActive = currentSortKey === columnKey;

  return (
    <th
      onClick={() => onSort(columnKey)}
      title={`点击按 ${label} 排序`}
      className={cn(
        'group cursor-pointer p-4 text-sm font-medium transition-colors select-none',
        isActive
          ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
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
              <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </>
          )}
        </div>
      </div>
    </th>
  );
}
