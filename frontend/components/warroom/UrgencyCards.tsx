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
    bg: 'bg-[var(--color-danger-surface)]',
    border: 'border-[var(--color-danger)]',
    activeBorder: 'border-[var(--color-danger)] ring-2 ring-red-300',
    dot: 'bg-[var(--color-danger)]',
    text: 'text-[var(--color-danger)]',
    countText: 'text-[var(--color-danger)]',
  },
  yellow: {
    bg: 'bg-[var(--color-warning-surface)]',
    border: 'border-[var(--color-warning)]',
    activeBorder: 'border-[var(--color-warning)] ring-2 ring-yellow-300',
    dot: 'bg-[var(--color-warning)]',
    text: 'text-[var(--color-warning)]',
    countText: 'text-[var(--color-warning)]',
  },
  green: {
    bg: 'bg-[var(--color-success-surface)]',
    border: 'border-[var(--color-success)]',
    activeBorder: 'border-[var(--color-success)] ring-2 ring-green-300',
    dot: 'bg-[var(--color-success)]',
    text: 'text-[var(--color-success)]',
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
