'use client';

import { useLocale } from 'next-intl';
import type { WarroomStudent } from '@/lib/types/cross-analysis';

const I18N = {
  zh: {
    red: '紧急',
    yellow: '关注',
    green: '正常',
    unit: '人',
  },
  'zh-TW': {
    red: '緊急',
    yellow: '關注',
    green: '正常',
    unit: '人',
  },
  en: {
    red: 'Urgent',
    yellow: 'Monitor',
    green: 'Normal',
    unit: '',
  },
  th: {
    red: 'เร่งด่วน',
    yellow: 'ติดตาม',
    green: 'ปกติ',
    unit: 'คน',
  },
} as const;

interface UrgencyCardsProps {
  students: WarroomStudent[];
  activeFilter: 'red' | 'yellow' | 'green' | null;
  onFilterChange: (level: 'red' | 'yellow' | 'green' | null) => void;
}

const URGENCY_STYLE = {
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700',
    activeBorder: 'border-red-500 ring-2 ring-red-300',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    countText: 'text-red-600 dark:text-red-400',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
    activeBorder: 'border-yellow-500 ring-2 ring-yellow-300',
    dot: 'bg-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-400',
    countText: 'text-[var(--color-warning)]',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
    activeBorder: 'border-green-500 ring-2 ring-green-300',
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    countText: 'text-[var(--color-success)]',
  },
} as const;

export function UrgencyCards({ students, activeFilter, onFilterChange }: UrgencyCardsProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  const counts = {
    red: students.filter((s) => s.urgency_level === 'red').length,
    yellow: students.filter((s) => s.urgency_level === 'yellow').length,
    green: students.filter((s) => s.urgency_level === 'green').length,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(['red', 'yellow', 'green'] as const).map((level) => {
        const style = URGENCY_STYLE[level];
        const isActive = activeFilter === level;
        return (
          <button
            key={level}
            onClick={() => onFilterChange(isActive ? null : level)}
            className={[
              'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer min-h-[44px]',
              style.bg,
              isActive ? style.activeBorder : style.border,
            ].join(' ')}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              <span className={`text-xs font-medium ${style.text}`}>{t[level]}</span>
            </div>
            <span className={`text-3xl font-bold ${style.countText}`}>{counts[level]}</span>
            {t.unit && <span className={`text-xs mt-0.5 ${style.text}`}>{t.unit}</span>}
          </button>
        );
      })}
    </div>
  );
}
