'use client';

import { useLocale } from 'next-intl';

const I18N = {
  zh: { all: '全部', ariaLabel: '围场分段筛选' },
  'zh-TW': { all: '全部', ariaLabel: '圍場分段篩選' },
  en: { all: 'All', ariaLabel: 'Enclosure segment filter' },
  th: { all: 'ทั้งหมด', ariaLabel: 'กรองเซกเมนต์' },
} as const;

const ENCLOSURE_SEGMENTS = [
  'M0（0~30）',
  'M1（31~60）',
  'M2（61~90）',
  'M3（91~120）',
  'M4（121~150）',
  'M5（151~180）',
  'M6（181~210）',
  'M7（211~240）',
  'M8（241~270）',
  'M9（271~300）',
  'M10（301~330）',
  'M11（331~360）',
  'M12（361~390）',
  'M12+（391+）',
];

const SEGMENT_VALUES = [
  '0M',
  '1M',
  '2M',
  '3M',
  '4M',
  '5M',
  '6M',
  '7M',
  '8M',
  '9M',
  '10M',
  '11M',
  '12M',
  '12M+',
];

interface EnclosureFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function EnclosureFilter({ value, onChange }: EnclosureFilterProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] || I18N.zh;

  const filters = [
    { label: t.all, value: '' },
    ...ENCLOSURE_SEGMENTS.map((label, i) => ({ label, value: SEGMENT_VALUES[i] })),
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t.ariaLabel}>
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === f.value
              ? 'bg-action-accent text-white shadow-sm'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--n-200)]'
          }`}
          aria-pressed={value === f.value}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
