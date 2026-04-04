'use client';

import { useLocale } from 'next-intl';

const I18N = {
  zh: { all: '全部', ariaLabel: '围场分段筛选' },
  'zh-TW': { all: '全部', ariaLabel: '圍場分段篩選' },
  en: { all: 'All', ariaLabel: 'Enclosure segment filter' },
  th: { all: 'ทั้งหมด', ariaLabel: 'กรองเซกเมนต์' },
} as const;

const FILTERS_BASE = [
  { label_zh: '全部', value: '' },
  { label: 'M0（0~30）', value: '0M' },
  { label: 'M1（31~60）', value: '1M' },
  { label: 'M2（61~90）', value: '2M' },
  { label: 'M3（91~120）', value: '3M' },
  { label: 'M4（121~150）', value: '4M' },
  { label: 'M5（151~180）', value: '5M' },
  { label: 'M6（181~210）', value: '6M' },
  { label: 'M7（211~240）', value: '7M' },
  { label: 'M8（241~270）', value: '8M' },
  { label: 'M9（271~300）', value: '9M' },
  { label: 'M10（301~330）', value: '10M' },
  { label: 'M11（331~360）', value: '11M' },
  { label: 'M12（361~390）', value: '12M' },
  { label: 'M12+（391+）', value: '12M+' },
];

interface EnclosureFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function EnclosureFilter({ value, onChange }: EnclosureFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="围场分段筛选">
      {FILTERS.map((f) => (
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
