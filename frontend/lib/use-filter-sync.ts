"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useConfigStore, type TimeRange } from "./stores/config-store";
import { useEffect, useRef } from "react";

/**
 * Bidirectional sync between URL search params and config-store filter state.
 *
 * URL format: ?time=this_month&team=THCC-A&cc=张伟
 * - time: 'this_week' | 'this_month' | 'last_month' | 'custom:start:end'
 * - team: team filter value, omitted when null (all teams)
 * - cc:   CC person name, omitted when null (all CC)
 *
 * Call this hook once in a layout or page that wraps the filter bar.
 * Uses router.replace so URL updates don't add history entries.
 */
export function useFilterSync(): void {
  const searchParams = useSearchParams();
  const router = useRouter();

  const timeRange = useConfigStore((s) => s.timeRange);
  const teamFilter = useConfigStore((s) => s.teamFilter);
  const focusCC = useConfigStore((s) => s.focusCC);
  const setTimeRange = useConfigStore((s) => s.setTimeRange);
  const setTeamFilter = useConfigStore((s) => s.setTeamFilter);
  const setFocusCC = useConfigStore((s) => s.setFocusCC);

  // Track whether the initial URL → store sync has happened
  const initializedRef = useRef(false);

  // 1. On mount: read URL params → apply to store
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const timeParam = searchParams.get("time");
    const teamParam = searchParams.get("team");
    const ccParam = searchParams.get("cc");

    if (timeParam) {
      const parsed = parseTimeParam(timeParam);
      if (parsed !== null) setTimeRange(parsed);
    }

    setTeamFilter(teamParam ?? null);
    setFocusCC(ccParam ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. When store state changes: update URL params (no page reload)
  useEffect(() => {
    if (!initializedRef.current) return;

    const params = new URLSearchParams(searchParams.toString());

    const timeParam = serializeTimeRange(timeRange);
    params.set("time", timeParam);

    if (teamFilter) {
      params.set("team", teamFilter);
    } else {
      params.delete("team");
    }

    if (focusCC) {
      params.set("cc", focusCC);
    } else {
      params.delete("cc");
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [timeRange, teamFilter, focusCC]); // eslint-disable-line react-hooks/exhaustive-deps
}

function serializeTimeRange(range: TimeRange): string {
  if (typeof range === "string") return range;
  return `custom:${range.start}:${range.end}`;
}

function parseTimeParam(param: string): TimeRange | null {
  if (
    param === "this_week" ||
    param === "this_month" ||
    param === "last_month"
  ) {
    return param;
  }
  if (param.startsWith("custom:")) {
    const parts = param.split(":");
    if (parts.length === 3 && parts[1] && parts[2]) {
      return { start: parts[1], end: parts[2] };
    }
  }
  return null;
}
