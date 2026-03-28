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

  // Preserve existing query params from basePath
  const [path, existingQuery] = basePath.split('?');
  if (existingQuery) {
    new URLSearchParams(existingQuery).forEach((v, k) => params.set(k, v));
  }

  // team / cc — backwards compat mapping
  if (dims.teamFilter) params.set('team', dims.teamFilter);
  if (dims.focusCC) params.set('cc', dims.focusCC);

  // country: skip default 'TH'
  if (dims.country && dims.country !== 'TH') params.set('country', dims.country);

  // dataRole → data_role: skip default 'all'
  if (dims.dataRole && dims.dataRole !== 'all') params.set('data_role', dims.dataRole);

  // enclosure: null = not sent, array = comma-joined
  if (dims.enclosure !== null && dims.enclosure.length > 0) {
    params.set('enclosure', dims.enclosure.join(','));
  }

  // granularity: skip default 'month'
  if (dims.granularity && dims.granularity !== 'month') params.set('granularity', dims.granularity);

  // funnelStage → funnel_stage: skip default 'all'
  if (dims.funnelStage && dims.funnelStage !== 'all') params.set('funnel_stage', dims.funnelStage);

  // channel: skip default 'all'
  if (dims.channel && dims.channel !== 'all') params.set('channel', dims.channel);

  // behavior: null = not sent, array = comma-joined
  if (dims.behavior !== null && dims.behavior.length > 0) {
    params.set('behavior', dims.behavior.join(','));
  }

  // benchmarks: always sent
  if (dims.benchmarks && dims.benchmarks.length > 0) {
    params.set('benchmarks', dims.benchmarks.join(','));
  }

  // Extra caller-provided params (override dimension params if same key)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== '') params.set(k, v);
    }
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
