'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { useConfigStore } from '@/lib/stores/config-store';
import { swrFetcher } from '@/lib/api';

/**
 * useFilteredSWR v2 — Drop-in replacement for useSWR that automatically appends
 * all dimension params from the global config store to every request.
 *
 * Serialization rules (per spec §4.3):
 * - Default values are omitted to keep URLs clean:
 *     country='TH' → not sent, dataRole='all' → not sent,
 *     granularity='month' → not sent, funnelStage='all' → not sent,
 *     channel='all' → not sent
 * - null values are not sent: enclosure=null → not sent, behavior=null → not sent
 * - Arrays are comma-joined: enclosure=['M0','M1'] → "M0,M1"
 * - camelCase → snake_case: dataRole → data_role, funnelStage → funnel_stage
 * - benchmarks always sent (backend needs it)
 * - teamFilter → 'team', focusCC → 'cc' (backwards compat)
 *
 * Usage:
 *   const { data } = useFilteredSWR<MyType>('/api/some/endpoint');
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
  const granularity = useConfigStore((s) => s.granularity);
  const funnelStage = useConfigStore((s) => s.funnelStage);
  const channel = useConfigStore((s) => s.channel);
  const behavior = useConfigStore((s) => s.behavior);
  const benchmarks = useConfigStore((s) => s.benchmarks);

  const key = buildKey(
    basePath,
    {
      teamFilter,
      focusCC,
      country,
      dataRole,
      enclosure,
      granularity,
      funnelStage,
      channel,
      behavior,
      benchmarks,
    },
    extraParams
  );

  return useSWR<T>(key, swrFetcher, config);
}

interface DimensionParams {
  teamFilter: string | null;
  focusCC: string | null;
  country: string;
  dataRole: string;
  enclosure: string[] | null;
  granularity: string;
  funnelStage: string;
  channel: string;
  behavior: string[] | null;
  benchmarks: string[];
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

  // granularity: skip default 'month'
  if (dims.granularity && dims.granularity !== 'month')
    setIfNotLocal('granularity', dims.granularity);

  // funnelStage → funnel_stage: skip default 'all'
  if (dims.funnelStage && dims.funnelStage !== 'all')
    setIfNotLocal('funnel_stage', dims.funnelStage);

  // channel: skip default 'all'
  if (dims.channel && dims.channel !== 'all') setIfNotLocal('channel', dims.channel);

  // behavior: null = not sent, array = comma-joined
  if (dims.behavior !== null && dims.behavior.length > 0) {
    setIfNotLocal('behavior', dims.behavior.join(','));
  }

  // benchmarks: always sent (unless page explicitly passes it)
  if (dims.benchmarks && dims.benchmarks.length > 0) {
    setIfNotLocal('benchmarks', dims.benchmarks.join(','));
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
