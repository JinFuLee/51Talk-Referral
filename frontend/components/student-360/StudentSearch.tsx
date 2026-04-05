'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
export interface SearchFilters {
  query: string;
  segment: string;
  lifecycle: string;
  cc_name: string;
  is_hp: boolean | undefined;
}

interface StudentSearchProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

const SEGMENT_RANGE_OPTIONS = [
  { value: '0M', label: 'M0（0~30）' },
  { value: '1M', label: 'M1（31~60）' },
  { value: '2M', label: 'M2（61~90）' },
  { value: '3M', label: 'M3（91~120）' },
  { value: '4M', label: 'M4（121~150）' },
  { value: '5M', label: 'M5（151~180）' },
  { value: '6M', label: 'M6（181~210）' },
  { value: '7M', label: 'M7（211~240）' },
  { value: '8M', label: 'M8（241~270）' },
  { value: '9M', label: 'M9（271~300）' },
  { value: '10M', label: 'M10（301~330）' },
  { value: '11M', label: 'M11（331~360）' },
  { value: '12M', label: 'M12（361~390）' },
  { value: '12M+', label: 'M12+（391+）' },
] as const;

export function StudentSearch({ filters, onChange }: StudentSearchProps) {
  const t = useTranslations('StudentSearch');

  const SEGMENT_OPTIONS = [
    { value: '', label: t('segmentAll') },
    ...SEGMENT_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  ];

  const LIFECYCLE_OPTIONS = [
    { value: '', label: t('lifecycleAll') },
    { value: '活跃', label: t('lifecycleActive') },
    { value: '沉默', label: t('lifecycleSilent') },
    { value: '流失风险', label: t('lifecycleRisk') },
    { value: '流失', label: t('lifecycleChurned') },
  ];

  const HP_OPTIONS = [
    { value: '', label: t('hpAll') },
    { value: 'true', label: t('hpHigh') },
    { value: 'false', label: t('hpNormal') },
  ];

  const [queryInput, setQueryInput] = useState(filters.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync external reset
  useEffect(() => {
    setQueryInput(filters.query);
  }, [filters.query]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQueryInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filters, query: value });
      }, 300);
    },
    [filters, onChange]
  );

  const hasFilters =
    filters.query ||
    filters.segment ||
    filters.lifecycle ||
    filters.cc_name ||
    filters.is_hp !== undefined;

  const clearAll = () => {
    setQueryInput('');
    onChange({ query: '', segment: '', lifecycle: '', cc_name: '', is_hp: undefined });
  };

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <input
        type="text"
        placeholder={t('searchPlaceholder')}
        value={queryInput}
        onChange={(e) => handleQueryChange(e.target.value)}
        className="w-full px-3 py-2 border border-subtle-token rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action"
      />

      {/* 筛选器一行 */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 围场 */}
        <Select
          value={filters.segment || 'all'}
          onValueChange={(v) => onChange({ ...filters, segment: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder={t('segmentAll')} />
          </SelectTrigger>
          <SelectContent>
            {SEGMENT_OPTIONS.map((o) => (
              <SelectItem key={o.value || 'all'} value={o.value || 'all'} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 生命周期 */}
        <Select
          value={filters.lifecycle || 'all'}
          onValueChange={(v) => onChange({ ...filters, lifecycle: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder={t('lifecycleAll')} />
          </SelectTrigger>
          <SelectContent>
            {LIFECYCLE_OPTIONS.map((o) => (
              <SelectItem key={o.value || 'all'} value={o.value || 'all'} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 高潜 toggle */}
        <Select
          value={filters.is_hp === undefined ? 'all' : filters.is_hp ? 'true' : 'false'}
          onValueChange={(v) =>
            onChange({
              ...filters,
              is_hp: v === 'all' ? undefined : v === 'true',
            })
          }
        >
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue placeholder={t('hpAll')} />
          </SelectTrigger>
          <SelectContent>
            {HP_OPTIONS.map((o) => (
              <SelectItem key={o.value || 'all'} value={o.value || 'all'} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* CC 搜索 */}
        <input
          type="text"
          placeholder={t('ccPlaceholder')}
          value={filters.cc_name}
          onChange={(e) => onChange({ ...filters, cc_name: e.target.value })}
          className="h-8 px-3 border border-subtle-token rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-action w-28"
        />

        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-8 px-3 text-xs text-secondary-token hover:text-primary-token border border-subtle-token rounded-md"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>
    </div>
  );
}
