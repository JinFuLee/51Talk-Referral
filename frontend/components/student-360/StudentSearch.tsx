'use client';

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

const SEGMENT_OPTIONS = [
  { value: '', label: '全部围场' },
  { value: '0-30', label: '0-30天' },
  { value: '31-60', label: '31-60天' },
  { value: '61-90', label: '61-90天' },
  { value: '91-180', label: '91-180天' },
  { value: '181+', label: '181+天' },
];

const LIFECYCLE_OPTIONS = [
  { value: '', label: '全部生命周期' },
  { value: '活跃', label: '活跃' },
  { value: '沉默', label: '沉默' },
  { value: '流失风险', label: '流失风险' },
  { value: '流失', label: '流失' },
];

const HP_OPTIONS = [
  { value: '', label: '全部学员' },
  { value: 'true', label: '高潜学员' },
  { value: 'false', label: '普通学员' },
];

export function StudentSearch({ filters, onChange }: StudentSearchProps) {
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
        placeholder="搜索学员ID / 姓名 / CC姓名..."
        value={queryInput}
        onChange={(e) => handleQueryChange(e.target.value)}
        className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
      />

      {/* 筛选器一行 */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 围场 */}
        <Select
          value={filters.segment}
          onValueChange={(v) => onChange({ ...filters, segment: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="全部围场" />
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
          value={filters.lifecycle}
          onValueChange={(v) => onChange({ ...filters, lifecycle: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="全部生命周期" />
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
            <SelectValue placeholder="全部学员" />
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
          placeholder="CC姓名"
          value={filters.cc_name}
          onChange={(e) => onChange({ ...filters, cc_name: e.target.value })}
          className="h-8 px-3 border border-[var(--border-subtle)] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-navy-400 w-28"
        />

        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-8 px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
