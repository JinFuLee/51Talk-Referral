import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CompareMode = 'off' | 'pop' | 'yoy' | 'peak' | 'valley';
export type TimeRange = 'this_week' | 'this_month' | 'last_month' | { start: string; end: string };
export type SelectionContext = { type: 'cc' | 'segment' | 'channel'; value: string } | null;

// ── Hydration validators ──────────────────────────────────────────────────────

const VALID_COMPARE_MODES: CompareMode[] = ['off', 'pop', 'yoy', 'peak', 'valley'];
const VALID_SIMPLE_TIME_RANGES = ['this_week', 'this_month', 'last_month'] as const;
const VALID_ROLES = ['ops', 'exec', 'finance'] as const;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateCompareMode(v: unknown): CompareMode {
  return VALID_COMPARE_MODES.includes(v as CompareMode) ? (v as CompareMode) : 'off';
}

function validateTimeRange(v: unknown): TimeRange {
  if (
    typeof v === 'string' &&
    VALID_SIMPLE_TIME_RANGES.includes(v as (typeof VALID_SIMPLE_TIME_RANGES)[number])
  ) {
    return v as TimeRange;
  }
  if (
    v !== null &&
    typeof v === 'object' &&
    'start' in (v as object) &&
    'end' in (v as object) &&
    ISO_DATE_RE.test((v as { start: string }).start) &&
    ISO_DATE_RE.test((v as { end: string }).end)
  ) {
    return v as TimeRange;
  }
  return 'this_month';
}

function validateRole(v: unknown): 'ops' | 'exec' | 'finance' {
  return VALID_ROLES.includes(v as 'ops' | 'exec' | 'finance')
    ? (v as 'ops' | 'exec' | 'finance')
    : 'ops';
}

function validatePeriod(v: unknown): string {
  if (typeof v === 'string' && v.length > 0 && v.length <= 64) return v;
  return 'this_month';
}

interface ConfigState {
  role: 'ops' | 'exec' | 'finance';
  input_dir: string;
  output_dir: string;
  exchange_rate: number;
  selected_month?: string;
  period: string;
  customStart?: string;
  customEnd?: string;
  compareMode: CompareMode;
  // Global filter bar state
  timeRange: TimeRange;
  teamFilter: string | null;
  focusCC: string | null;
  // Chart selection context for cross-chart linking
  selectionContext: SelectionContext;
  setRole: (role: 'ops' | 'exec' | 'finance') => void;
  setConfig: (
    config: Partial<
      Omit<
        ConfigState,
        | 'setRole'
        | 'setConfig'
        | 'setPeriod'
        | 'setCompareMode'
        | 'setTimeRange'
        | 'setTeamFilter'
        | 'setFocusCC'
        | 'setSelectionContext'
        | 'clearSelectionContext'
      >
    >
  ) => void;
  setPeriod: (period: string, customStart?: string, customEnd?: string) => void;
  setCompareMode: (mode: CompareMode) => void;
  setTimeRange: (range: TimeRange) => void;
  setTeamFilter: (team: string | null) => void;
  setFocusCC: (cc: string | null) => void;
  setSelectionContext: (ctx: SelectionContext) => void;
  clearSelectionContext: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      role: 'ops',
      input_dir: './input',
      output_dir: './output',
      exchange_rate: 35,
      period: 'this_month',
      compareMode: 'off',
      timeRange: 'this_month',
      teamFilter: null,
      focusCC: null,
      selectionContext: null,
      setRole: (role) => set({ role }),
      setConfig: (config) => set(config),
      setPeriod: (period, customStart, customEnd) => set({ period, customStart, customEnd }),
      setCompareMode: (compareMode) => set({ compareMode }),
      setTimeRange: (timeRange) => set({ timeRange }),
      setTeamFilter: (teamFilter) => set({ teamFilter }),
      setFocusCC: (focusCC) => set({ focusCC }),
      setSelectionContext: (selectionContext) => set({ selectionContext }),
      clearSelectionContext: () => set({ selectionContext: null }),
    }),
    {
      name: 'panel-config',
      partialize: (state) => {
        const { selectionContext, ...rest } = state;
        return rest;
      },
      // Sanitize values on hydration to prevent invalid data from localStorage
      // from leaking into store state (e.g. injected / corrupted storage).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.role = validateRole(state.role);
        state.compareMode = validateCompareMode(state.compareMode);
        state.timeRange = validateTimeRange(state.timeRange);
        state.period = validatePeriod(state.period);
        // teamFilter and focusCC: must be string or null
        if (state.teamFilter !== null && typeof state.teamFilter !== 'string') {
          state.teamFilter = null;
        }
        if (state.focusCC !== null && typeof state.focusCC !== 'string') {
          state.focusCC = null;
        }
        // selectionContext: validate shape
        if (state.selectionContext !== null) {
          const ctx = state.selectionContext;
          if (
            typeof ctx !== 'object' ||
            !['cc', 'segment', 'channel'].includes(ctx.type) ||
            typeof ctx.value !== 'string'
          ) {
            state.selectionContext = null;
          }
        }
      },
    }
  )
);
