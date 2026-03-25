'use client';

import type { WarroomStudent } from '@/lib/types/cross-analysis';

interface UrgencyCardsProps {
  students: WarroomStudent[];
  activeFilter: 'red' | 'yellow' | 'green' | null;
  onFilterChange: (level: 'red' | 'yellow' | 'green' | null) => void;
}

const URGENCY_CONFIG = {
  red: {
    label: '紧急',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700',
    activeBorder: 'border-red-500 ring-2 ring-red-300',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    countText: 'text-red-600 dark:text-red-400',
  },
  yellow: {
    label: '关注',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
    activeBorder: 'border-yellow-500 ring-2 ring-yellow-300',
    dot: 'bg-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-400',
    countText: 'text-[var(--color-warning)]',
  },
  green: {
    label: '正常',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
    activeBorder: 'border-green-500 ring-2 ring-green-300',
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    countText: 'text-[var(--color-success)]',
  },
} as const;

export function UrgencyCards({ students, activeFilter, onFilterChange }: UrgencyCardsProps) {
  const counts = {
    red: students.filter((s) => s.urgency_level === 'red').length,
    yellow: students.filter((s) => s.urgency_level === 'yellow').length,
    green: students.filter((s) => s.urgency_level === 'green').length,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(['red', 'yellow', 'green'] as const).map((level) => {
        const cfg = URGENCY_CONFIG[level];
        const isActive = activeFilter === level;
        return (
          <button
            key={level}
            onClick={() => onFilterChange(isActive ? null : level)}
            className={[
              'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer min-h-[44px]',
              cfg.bg,
              isActive ? cfg.activeBorder : cfg.border,
            ].join(' ')}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
            </div>
            <span className={`text-3xl font-bold ${cfg.countText}`}>{counts[level]}</span>
            <span className={`text-xs mt-0.5 ${cfg.text}`}>人</span>
          </button>
        );
      })}
    </div>
  );
}
