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
    bg: 'bg-danger-surface',
    border: 'border-danger-token',
    activeBorder: 'border-danger-token ring-2 ring-red-300',
    dot: 'bg-danger-token',
    text: 'text-danger-token',
    countText: 'text-danger-token',
  },
  yellow: {
    bg: 'bg-warning-surface',
    border: 'border-warning-token',
    activeBorder: 'border-warning-token ring-2 ring-yellow-300',
    dot: 'bg-warning-token',
    text: 'text-warning-token',
    countText: 'text-warning-token',
  },
  green: {
    bg: 'bg-success-surface',
    border: 'border-success-token',
    activeBorder: 'border-success-token ring-2 ring-green-300',
    dot: 'bg-success-token',
    text: 'text-success-token',
    countText: 'text-success-token',
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
