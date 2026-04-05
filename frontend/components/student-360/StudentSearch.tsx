'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const I18N = {
  zh: {
    searchPlaceholder: '搜索学员ID / 姓名 / CC姓名...',
    segmentAll: '全部围场',
    lifecycleAll: '全部生命周期',
    hpAll: '全部学员',
    hpHigh: '高潜学员',
    hpNormal: '普通学员',
    lifecycleActive: '活跃',
    lifecycleSilent: '沉默',
    lifecycleRisk: '流失风险',
    lifecycleChurned: '流失',
    ccPlaceholder: 'CC姓名',
    clearFilters: '清除筛选',
  },
  'zh-TW': {
    searchPlaceholder: '搜尋學員ID / 姓名 / CC姓名...',
    segmentAll: '全部圍場',
    lifecycleAll: '全部生命週期',
    hpAll: '全部學員',
    hpHigh: '高潛學員',
    hpNormal: '普通學員',
    lifecycleActive: '活躍',
    lifecycleSilent: '沉默',
    lifecycleRisk: '流失風險',
    lifecycleChurned: '流失',
    ccPlaceholder: 'CC姓名',
    clearFilters: '清除篩選',
  },
  en: {
    searchPlaceholder: 'Search Student ID / Name / CC name...',
    segmentAll: 'All Enclosures',
    lifecycleAll: 'All Lifecycles',
    hpAll: 'All Students',
    hpHigh: 'High Potential',
    hpNormal: 'Regular',
    lifecycleActive: 'Active',
    lifecycleSilent: 'Silent',
    lifecycleRisk: 'At Risk',
    lifecycleChurned: 'Churned',
    ccPlaceholder: 'CC Name',
    clearFilters: 'Clear Filters',
  },
  th: {
    searchPlaceholder: 'ค้นหารหัสนักเรียน / ชื่อ / ชื่อ CC...',
    segmentAll: 'คอกทั้งหมด',
    lifecycleAll: 'วงจรชีวิตทั้งหมด',
    hpAll: 'นักเรียนทั้งหมด',
    hpHigh: 'ศักยภาพสูง',
    hpNormal: 'ปกติ',
    lifecycleActive: 'ใช้งานอยู่',
    lifecycleSilent: 'เงียบ',
    lifecycleRisk: 'เสี่ยงหลุด',
    lifecycleChurned: 'หลุดแล้ว',
    ccPlaceholder: 'ชื่อ CC',
    clearFilters: 'ล้างตัวกรอง',
  },
} as const;

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
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  const SEGMENT_OPTIONS = [
    { value: '', label: t.segmentAll },
    ...SEGMENT_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  ];

  const LIFECYCLE_OPTIONS = [
    { value: '', label: t.lifecycleAll },
    { value: '活跃', label: t.lifecycleActive },
    { value: '沉默', label: t.lifecycleSilent },
    { value: '流失风险', label: t.lifecycleRisk },
    { value: '流失', label: t.lifecycleChurned },
  ];

  const HP_OPTIONS = [
    { value: '', label: t.hpAll },
    { value: 'true', label: t.hpHigh },
    { value: 'false', label: t.hpNormal },
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
        placeholder={t.searchPlaceholder}
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
            <SelectValue placeholder={t.segmentAll} />
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
            <SelectValue placeholder={t.lifecycleAll} />
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
            <SelectValue placeholder={t.hpAll} />
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
          placeholder={t.ccPlaceholder}
          value={filters.cc_name}
          onChange={(e) => onChange({ ...filters, cc_name: e.target.value })}
          className="h-8 px-3 border border-subtle-token rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-action w-28"
        />

        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-8 px-3 text-xs text-secondary-token hover:text-primary-token border border-subtle-token rounded-md"
          >
            {t.clearFilters}
          </button>
        )}
      </div>
    </div>
  );
}
