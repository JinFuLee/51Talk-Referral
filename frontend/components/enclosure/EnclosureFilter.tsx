'use client';

const FILTERS = [
  { label: '全部', value: '' },
  { label: 'M0（0~30）', value: '0~30' },
  { label: 'M1（31~60）', value: '31~60' },
  { label: 'M2（61~90）', value: '61~90' },
  { label: 'M3（91~120）', value: '91~120' },
  { label: 'M4（121~150）', value: '121~150' },
  { label: 'M5（151~180）', value: '151~180' },
  { label: 'M6', value: '6M' },
  { label: 'M7', value: '7M' },
  { label: 'M8', value: '8M' },
  { label: 'M9', value: '9M' },
  { label: 'M10', value: '10M' },
  { label: 'M11', value: '11M' },
  { label: 'M12', value: '12M' },
  { label: 'M12+', value: '12M+' },
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
