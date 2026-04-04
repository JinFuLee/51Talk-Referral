'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useConfigStore } from './stores/config-store';
import type { Country, DataRole, Channel, BenchmarkMode } from './types/filters';
import { useEffect, useRef } from 'react';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * useFilterSync v3 — Bidirectional sync between URL search params and config-store.
 *
 * Syncs all 8 dimension params + team/cc + customDateRange:
 *   ?date_from=2026-01-01&date_to=2026-01-31&team=THCC-A&cc=张伟
 *   &country=TH&data_role=all&enclosure=M0,M1&granularity=month
 *   &funnel_stage=all&channel=all&behavior=gold,effective&benchmarks=target
 *
 * Default values are preserved in URL for clarity (unlike useFilteredSWR which omits them).
 * Uses router.replace so URL updates don't add history entries.
 */
export function useFilterSync(): void {
  const searchParams = useSearchParams();
  const router = useRouter();

  const customDateRange = useConfigStore((s) => s.customDateRange);
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const country = useConfigStore((s) => s.country);
  const dataRole = useConfigStore((s) => s.dataRole);
  const enclosure = useConfigStore((s) => s.enclosure);
  const channel = useConfigStore((s) => s.channel);
  const benchmarks = useConfigStore((s) => s.benchmarks);

  const setCustomDateRange = useConfigStore((s) => s.setCustomDateRange);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);
  const setCountry = useConfigStore((s) => s.setCountry);
  const setDataRole = useConfigStore((s) => s.setDataRole);
  const setEnclosure = useConfigStore((s) => s.setEnclosure);
  const setChannel = useConfigStore((s) => s.setChannel);
  const setBenchmarks = useConfigStore((s) => s.setBenchmarks);

  // Track whether the initial URL → store sync has happened
  const initializedRef = useRef(false);

  // 1. On mount: read URL params → apply to store
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const dateFromParam = searchParams.get('date_from');
    const dateToParam = searchParams.get('date_to');
    const teamParam = searchParams.get('team');
    const ccParam = searchParams.get('cc');
    const countryParam = searchParams.get('country');
    const dataRoleParam = searchParams.get('data_role');
    const enclosureParam = searchParams.get('enclosure');
    const channelParam = searchParams.get('channel');
    const benchmarksParam = searchParams.get('benchmarks');

    // customDateRange from URL
    if (
      dateFromParam &&
      dateToParam &&
      ISO_DATE_RE.test(dateFromParam) &&
      ISO_DATE_RE.test(dateToParam)
    ) {
      setCustomDateRange({ start: dateFromParam, end: dateToParam });
    }

    setTeamFilter(teamParam ?? null);
    setFocusCC(ccParam ?? null);

    if (countryParam) setCountry(countryParam as Country);
    if (dataRoleParam) setDataRole(dataRoleParam as DataRole);
    if (enclosureParam) setEnclosure(enclosureParam.split(',').filter(Boolean));
    if (channelParam) setChannel(channelParam as Channel);
    if (benchmarksParam)
      setBenchmarks(benchmarksParam.split(',').filter(Boolean) as BenchmarkMode[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. When store state changes: update URL params (no page reload)
  useEffect(() => {
    if (!initializedRef.current) return;

    const params = new URLSearchParams(searchParams.toString());

    // customDateRange → date_from + date_to
    if (customDateRange) {
      params.set('date_from', customDateRange.start);
      params.set('date_to', customDateRange.end);
    } else {
      params.delete('date_from');
      params.delete('date_to');
    }

    // team / cc
    if (teamFilter) {
      params.set('team', teamFilter);
    } else {
      params.delete('team');
    }
    if (focusCC) {
      params.set('cc', focusCC);
    } else {
      params.delete('cc');
    }

    // dimension params
    params.set('country', country);
    params.set('data_role', dataRole);

    if (enclosure !== null && enclosure.length > 0) {
      params.set('enclosure', enclosure.join(','));
    } else {
      params.delete('enclosure');
    }

    params.set('channel', channel);

    if (benchmarks.length > 0) {
      params.set('benchmarks', benchmarks.join(','));
    } else {
      params.delete('benchmarks');
    }

    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDateRange, teamFilter, focusCC, country, dataRole, enclosure, channel, benchmarks]);
}
