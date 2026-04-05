'use client';

import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import type { HighPotentialStudent } from '@/lib/types/member';
export interface FilterState {
  search: string;
  enclosure: string;
  deepEngagement: string; // 'all' | 'deep' | 'shallow'
  hasPaid: string; // 'all' | 'yes' | 'no'
  ccGroup: string;
}

interface HighPotentialFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  students: HighPotentialStudent[];
  totalFiltered: number;
  totalAll: number;
}

/** 从学员列表提取去重选项 */
function extractOptions(
  students: HighPotentialStudent[],
  key: keyof HighPotentialStudent
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of students) {
    const v = String(s[key] ?? '').trim();
    if (v && v !== 'nan' && v !== 'None' && !seen.has(v)) {
      seen.add(v);
      result.push(v);
    }
  }
  return result.sort();
}

export function HighPotentialFilters({
  filters,
  onChange,
  students,
  totalFiltered,
  totalAll,
}: HighPotentialFiltersProps) {
  const t = useTranslations('HighPotentialFilters');
  const enclosureOptions = extractOptions(students, 'enclosure');
  const ccGroupOptions = extractOptions(students, 'cc_group');

  const hasActiveFilter =
    filters.search !== '' ||
    filters.enclosure !== 'all' ||
    filters.deepEngagement !== 'all' ||
    filters.hasPaid !== 'all' ||
    filters.ccGroup !== 'all';

  function handleReset() {
    onChange({
      search: '',
      enclosure: 'all',
      deepEngagement: 'all',
      hasPaid: 'all',
      ccGroup: 'all',
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 搜索框 */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-token" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-default-token bg-surface text-primary-token placeholder:text-muted-token focus:outline-none focus:ring-2 focus:ring-accent-token/20 focus:border-accent-muted-token"
        />
      </div>

      {/* 围场下拉 */}
      <select
        value={filters.enclosure}
        onChange={(e) => onChange({ ...filters, enclosure: e.target.value })}
        className="px-3 py-1.5 text-sm rounded-lg border border-default-token bg-surface text-primary-token focus:outline-none focus:ring-2 focus:ring-accent-token/20 cursor-pointer"
      >
        <option value="all">{t('allEnclosures')}</option>
        {enclosureOptions.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      {/* 参与深度 */}
      <select
        value={filters.deepEngagement}
        onChange={(e) => onChange({ ...filters, deepEngagement: e.target.value })}
        className="px-3 py-1.5 text-sm rounded-lg border border-default-token bg-surface text-primary-token focus:outline-none focus:ring-2 focus:ring-accent-token/20 cursor-pointer"
      >
        <option value="all">{t('engagementAll')}</option>
        <option value="deep">{t('engagementDeep')}</option>
        <option value="shallow">{t('engagementShallow')}</option>
      </select>

      {/* 付费状态 */}
      <select
        value={filters.hasPaid}
        onChange={(e) => onChange({ ...filters, hasPaid: e.target.value })}
        className="px-3 py-1.5 text-sm rounded-lg border border-default-token bg-surface text-primary-token focus:outline-none focus:ring-2 focus:ring-accent-token/20 cursor-pointer"
      >
        <option value="all">{t('paidAll')}</option>
        <option value="yes">{t('paidYes')}</option>
        <option value="no">{t('paidNo')}</option>
      </select>

      {/* CC 团队 */}
      {ccGroupOptions.length > 0 && (
        <select
          value={filters.ccGroup}
          onChange={(e) => onChange({ ...filters, ccGroup: e.target.value })}
          className="px-3 py-1.5 text-sm rounded-lg border border-default-token bg-surface text-primary-token focus:outline-none focus:ring-2 focus:ring-accent-token/20 cursor-pointer"
        >
          <option value="all">{t('ccTeamAll')}</option>
          {ccGroupOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      )}

      {/* 重置 + 计数 */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-muted-token whitespace-nowrap">
          {totalFiltered === totalAll
            ? t('countAll', { n: totalAll })
            : t('countFiltered', { filtered: totalFiltered, totalAll })}
        </span>
        {hasActiveFilter && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-subtle text-secondary-token hover:bg-n-200 transition-colors"
          >
            <X className="w-3 h-3" />
            {t('reset')}
          </button>
        )}
      </div>
    </div>
  );
}
