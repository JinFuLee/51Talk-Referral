'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { useConfigStore } from '@/lib/stores/config-store';
import { swrFetcher } from '@/lib/api';

/** 返回 YYYYMM 格式的当前月，例如 "202604" */
function getCurrentYYYYMM(): string {
  return new Date().toISOString().slice(0, 7).replace('-', '');
}

/**
 * useFilteredSWR v2 — Drop-in replacement for useSWR that automatically appends
 * all dimension params from the global config store to every request.
 *
 * Serialization rules (per spec §4.3):
 * - Default values are omitted to keep URLs clean:
 * country='TH' → not sent, dataRole='all' → not sent,
 * channel='all' → not sent
 * - null values are not sent: enclosure=null → not sent
 * - Arrays are comma-joined: enclosure=['M0','M1'] → "M0,M1"
 * - camelCase → snake_case: dataRole → data_role
 * - benchmarks always sent (backend needs it)
 * - teamFilter → 'team', focusCC → 'cc' (backwards compat)
 * - selectedMonth: only sent if not null and not current month (YYYYMM)
 *
 * Usage:
 * const { data } = useFilteredSWR<MyType>('/api/some/endpoint');
 */
export function useFilteredSWR<T>(
  basePath: string | null,
  config?: SWRConfiguration<T>,
  extraParams?: Record<string, string | null | undefined>
) {
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const country = useConfigStore((s) => s.country);
  const dataRole = useConfigStore((s) => s.dataRole);
  const enclosure = useConfigStore((s) => s.enclosure);
  const channel = useConfigStore((s) => s.channel);
  const benchmarks = useConfigStore((s) => s.benchmarks);
  const selectedMonth = useConfigStore((s) => s.selectedMonth);
  const customDateRange = useConfigStore((s) => s.customDateRange);

  // 历史月份时自动关闭 focus-revalidate（数据不再变化）
  const isHistoricalMonth = selectedMonth !== null && selectedMonth !== getCurrentYYYYMM();
  const mergedConfig: SWRConfiguration<T> = isHistoricalMonth
    ? { revalidateOnFocus: false, dedupingInterval: 60000, ...config }
    : (config ?? {});

  const key = buildKey(
    basePath,
    {
      teamFilter,
      focusCC,
      country,
      dataRole,
      enclosure,
      channel,
      benchmarks,
      selectedMonth,
      customDateRange,
    },
    extraParams
  );

  return useSWR<T>(key, swrFetcher, mergedConfig);
}

interface DimensionParams {
  teamFilter: string | null;
  focusCC: string | null;
  country: string;
  dataRole: string;
  enclosure: string[] | null;
  channel: string;
  benchmarks: string[];
  selectedMonth: string | null;
  customDateRange: { start: string; end: string } | null;
}

function buildKey(
  basePath: string | null,
  dims: DimensionParams,
  extra?: Record<string, string | null | undefined>
): string | null {
  if (!basePath) return null;

  const params = new URLSearchParams();

  // Preserve existing query params from basePath — these are page-local params
  // that take priority over global store dimensions.
  const [path, existingQuery] = basePath.split('?');
  const localKeys = new Set<string>();
  if (existingQuery) {
    new URLSearchParams(existingQuery).forEach((v, k) => {
      params.set(k, v);
      localKeys.add(k);
    });
  }

  // Helper: only set global dimension param if page-local didn't already set it
  const setIfNotLocal = (key: string, value: string) => {
    if (!localKeys.has(key)) params.set(key, value);
  };

  // team / cc — backwards compat mapping
  if (dims.teamFilter) setIfNotLocal('team', dims.teamFilter);
  if (dims.focusCC) setIfNotLocal('cc', dims.focusCC);

  // country: skip default 'TH'
  if (dims.country && dims.country !== 'TH') setIfNotLocal('country', dims.country);

  // dataRole → data_role: skip default 'all'
  if (dims.dataRole && dims.dataRole !== 'all') setIfNotLocal('data_role', dims.dataRole);

  // enclosure: null = not sent, array = comma-joined
  if (dims.enclosure !== null && dims.enclosure.length > 0) {
    setIfNotLocal('enclosure', dims.enclosure.join(','));
  }

  // channel: skip default 'all'
  if (dims.channel && dims.channel !== 'all') setIfNotLocal('channel', dims.channel);

  // benchmarks: always sent (unless page explicitly passes it)
  if (dims.benchmarks && dims.benchmarks.length > 0) {
    setIfNotLocal('benchmarks', dims.benchmarks.join(','));
  }

  // 自定义日期范围优先于月份
  if (dims.customDateRange) {
    setIfNotLocal('date_from', dims.customDateRange.start);
    setIfNotLocal('date_to', dims.customDateRange.end);
  } else if (dims.selectedMonth !== null && dims.selectedMonth !== getCurrentYYYYMM()) {
    // month: only send if non-null and not equal to current month
    setIfNotLocal('month', dims.selectedMonth);
  }

  // Extra caller-provided params (override everything — caller knows best)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== '') params.set(k, v);
    }
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
