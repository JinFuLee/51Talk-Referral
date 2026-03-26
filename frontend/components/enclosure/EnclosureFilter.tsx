'use client';

const FILTERS = [
  { label: '全部', value: '' },
  { label: '0~30天', value: '0-30' },
  { label: '31~60天', value: '31-60' },
  { label: '61~90天', value: '61-90' },
  { label: '91~120天', value: '91-120' },
  { label: '121~150天', value: '121-150' },
  { label: '151~180天', value: '151-180' },
  { label: '6M', value: '6M' },
  { label: '7M', value: '7M' },
  { label: '8M', value: '8M' },
  { label: '9M', value: '9M' },
  { label: '10M', value: '10M' },
  { label: '11M', value: '11M' },
  { label: '12M', value: '12M' },
  { label: '12M+', value: '12M+' },
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
