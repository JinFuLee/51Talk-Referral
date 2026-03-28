'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useConfigStore, type TimeRange } from './stores/config-store';
import type {
  Country,
  DataRole,
  Granularity,
  FunnelStage,
  Channel,
  BehaviorSegment,
  BenchmarkMode,
} from './types/filters';
import { useEffect, useRef } from 'react';

/**
 * useFilterSync v2 — Bidirectional sync between URL search params and config-store.
 *
 * Syncs all 8 dimension params + existing time/team/cc:
 *   ?time=this_month&team=THCC-A&cc=张伟
 *   &country=TH&data_role=all&enclosure=M0,M1&granularity=month
 *   &funnel_stage=all&channel=all&behavior=gold,effective&benchmarks=target
 *
 * Default values are preserved in URL for clarity (unlike useFilteredSWR which omits them).
 * Uses router.replace so URL updates don't add history entries.
 */
export function useFilterSync(): void {
  const searchParams = useSearchParams();
  const router = useRouter();

  const timeRange = useConfigStore((s) => s.timeRange);
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

  const setTimeRange = useConfigStore((s) => s.setTimeRange);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);
  const setCountry = useConfigStore((s) => s.setCountry);
  const setDataRole = useConfigStore((s) => s.setDataRole);
  const setEnclosure = useConfigStore((s) => s.setEnclosure);
  const setGranularity = useConfigStore((s) => s.setGranularity);
  const setFunnelStage = useConfigStore((s) => s.setFunnelStage);
  const setChannel = useConfigStore((s) => s.setChannel);
  const setBehavior = useConfigStore((s) => s.setBehavior);
  const setBenchmarks = useConfigStore((s) => s.setBenchmarks);

  // Track whether the initial URL → store sync has happened
  const initializedRef = useRef(false);

  // 1. On mount: read URL params → apply to store
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const timeParam = searchParams.get('time');
    const teamParam = searchParams.get('team');
    const ccParam = searchParams.get('cc');
    const countryParam = searchParams.get('country');
    const dataRoleParam = searchParams.get('data_role');
    const enclosureParam = searchParams.get('enclosure');
    const granularityParam = searchParams.get('granularity');
    const funnelStageParam = searchParams.get('funnel_stage');
    const channelParam = searchParams.get('channel');
    const behaviorParam = searchParams.get('behavior');
    const benchmarksParam = searchParams.get('benchmarks');

    if (timeParam) {
      const parsed = parseTimeParam(timeParam);
      if (parsed !== null) setTimeRange(parsed);
    }

    setTeamFilter(teamParam ?? null);
    setFocusCC(ccParam ?? null);

    if (countryParam) setCountry(countryParam as Country);
    if (dataRoleParam) setDataRole(dataRoleParam as DataRole);
    if (enclosureParam) setEnclosure(enclosureParam.split(',').filter(Boolean));
    if (granularityParam) setGranularity(granularityParam as Granularity);
    if (funnelStageParam) setFunnelStage(funnelStageParam as FunnelStage);
    if (channelParam) setChannel(channelParam as Channel);
    if (behaviorParam) setBehavior(behaviorParam.split(',').filter(Boolean) as BehaviorSegment[]);
    if (benchmarksParam)
      setBenchmarks(benchmarksParam.split(',').filter(Boolean) as BenchmarkMode[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. When store state changes: update URL params (no page reload)
  useEffect(() => {
    if (!initializedRef.current) return;

    const params = new URLSearchParams(searchParams.toString());

    // time
    params.set('time', serializeTimeRange(timeRange));

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

    params.set('granularity', granularity);
    params.set('funnel_stage', funnelStage);
    params.set('channel', channel);

    if (behavior !== null && behavior.length > 0) {
      params.set('behavior', behavior.join(','));
    } else {
      params.delete('behavior');
    }

    if (benchmarks.length > 0) {
      params.set('benchmarks', benchmarks.join(','));
    } else {
      params.delete('benchmarks');
    }

    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timeRange,
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
  ]);
}

function serializeTimeRange(range: TimeRange): string {
  if (typeof range === 'string') return range;
  return `custom:${range.start}:${range.end}`;
}

function parseTimeParam(param: string): TimeRange | null {
  if (param === 'this_week' || param === 'this_month' || param === 'last_month') {
    return param;
  }
  if (param.startsWith('custom:')) {
    const parts = param.split(':');
    if (parts.length === 3 && parts[1] && parts[2]) {
      return { start: parts[1], end: parts[2] };
    }
  }
  return null;
}
