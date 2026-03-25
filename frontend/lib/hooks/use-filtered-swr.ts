'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { useConfigStore } from '@/lib/stores/config-store';
import { swrFetcher } from '@/lib/api';

/**
 * Drop-in replacement for useSWR that automatically appends teamFilter and
 * focusCC query params from the global config store to every request.
 *
 * Usage:
 *   const { data } = useFilteredSWR<MyType>('/api/some/endpoint');
 *
 * If teamFilter = 'THCC-A' and focusCC = '张伟', the actual request URL
 * becomes: /api/some/endpoint?team=THCC-A&cc=%E5%BC%A0%E4%BC%9F
 *
 * Pass extraParams for additional query params beyond the global filters.
 */
export function useFilteredSWR<T>(
  basePath: string | null,
  config?: SWRConfiguration<T>,
  extraParams?: Record<string, string | null | undefined>
) {
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);

  const key = buildKey(basePath, teamFilter, focusCC, extraParams);

  return useSWR<T>(key, swrFetcher, config);
}

function buildKey(
  basePath: string | null,
  team: string | null,
  cc: string | null,
  extra?: Record<string, string | null | undefined>
): string | null {
  if (!basePath) return null;

  const params = new URLSearchParams();

  // Preserve existing query params from basePath
  const [path, existingQuery] = basePath.split('?');
  if (existingQuery) {
    new URLSearchParams(existingQuery).forEach((v, k) => params.set(k, v));
  }

  if (team) params.set('team', team);
  if (cc) params.set('cc', cc);

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== '') params.set(k, v);
    }
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
