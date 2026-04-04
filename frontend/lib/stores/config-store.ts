import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { Country, DataRole, Channel, BenchmarkMode } from '@/lib/types/filters';

/**
 * 在消费 persist store 的组件中调用，避免 SSR/CSR 水合不匹配。
 * SSR 和首次客户端渲染均返回 false，localStorage 恢复后返回 true。
 */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

export type CompareMode = 'off' | 'pop' | 'yoy' | 'peak' | 'valley';
export type SelectionContext = { type: 'cc' | 'segment' | 'channel'; value: string } | null;

// ── Hydration validators ──────────────────────────────────────────────────────

const VALID_COMPARE_MODES: CompareMode[] = ['off', 'pop', 'yoy', 'peak', 'valley'];
const VALID_ROLES = ['ops', 'exec', 'finance'] as const;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const YYYYMM_RE = /^\d{6}$/;

const VALID_DATA_ROLES: DataRole[] = ['all', 'cc', 'ss', 'lp', 'ops'];
const VALID_CHANNELS: Channel[] = [
  'all',
  'cc_narrow',
  'ss_narrow',
  'lp_narrow',
  'cc_wide',
  'lp_wide',
  'ops_wide',
];
const VALID_BENCHMARKS: BenchmarkMode[] = [
  'off',
  'target',
  'bm_progress',
  'bm_today',
  'prediction',
];

function validateCompareMode(v: unknown): CompareMode {
  return VALID_COMPARE_MODES.includes(v as CompareMode) ? (v as CompareMode) : 'off';
}

function validateRole(v: unknown): 'ops' | 'exec' | 'finance' {
  return VALID_ROLES.includes(v as 'ops' | 'exec' | 'finance')
    ? (v as 'ops' | 'exec' | 'finance')
    : 'ops';
}

function validateDataRole(v: unknown): DataRole {
  return VALID_DATA_ROLES.includes(v as DataRole) ? (v as DataRole) : 'all';
}

function validateChannel(v: unknown): Channel {
  return VALID_CHANNELS.includes(v as Channel) ? (v as Channel) : 'all';
}

function validateBenchmarks(v: unknown): BenchmarkMode[] {
  if (!Array.isArray(v)) return ['target'];
  const valid = v.filter((item) =>
    VALID_BENCHMARKS.includes(item as BenchmarkMode)
  ) as BenchmarkMode[];
  return valid.length > 0 ? valid : ['target'];
}

function validateEnclosure(v: unknown): string[] | null {
  if (v === null || v === undefined) return null;
  if (!Array.isArray(v)) return null;
  const items = v.filter((item) => typeof item === 'string') as string[];
  return items.length > 0 ? items : null;
}

function validateSelectedMonth(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && YYYYMM_RE.test(v)) return v;
  return null;
}

interface ConfigState {
  role: 'ops' | 'exec' | 'finance';
  input_dir: string;
  output_dir: string;
  exchange_rate: number;
  selected_month?: string;
  compareMode: CompareMode;
  teamFilter: string | null;
  focusCC: string | null;
  // Chart selection context for cross-chart linking
  selectionContext: SelectionContext;
  // ── Dimension fields (M37) ───────────────────────────────────────────────────
  country: Country;
  dataRole: DataRole;
  enclosure: string[] | null;
  channel: Channel;
  benchmarks: BenchmarkMode[];
  // ── Month selector (M38) ────────────────────────────────────────────────────
  /** YYYYMM 格式的历史月份，null = 当前月 */
  selectedMonth: string | null;
  /** 自定义日期范围，非 null 时覆盖 selectedMonth */
  customDateRange: { start: string; end: string } | null;
  // ── Setters ──────────────────────────────────────────────────────────────────
  setRole: (role: 'ops' | 'exec' | 'finance') => void;
  setConfig: (
    config: Partial<
      Omit<
        ConfigState,
        | 'setRole'
        | 'setConfig'
        | 'setCompareMode'
        | 'setTeamFilter'
        | 'setFocusCC'
        | 'setSelectionContext'
        | 'clearSelectionContext'
        | 'setCountry'
        | 'setDataRole'
        | 'setEnclosure'
        | 'setChannel'
        | 'setBenchmarks'
        | 'setSelectedMonth'
        | 'setCustomDateRange'
      >
    >
  ) => void;
  setCompareMode: (mode: CompareMode) => void;
  setTeamFilter: (team: string | null) => void;
  setFocusCC: (cc: string | null) => void;
  setSelectionContext: (ctx: SelectionContext) => void;
  clearSelectionContext: () => void;
  setCountry: (country: Country) => void;
  setDataRole: (dataRole: DataRole) => void;
  setEnclosure: (enclosure: string[] | null) => void;
  setChannel: (channel: Channel) => void;
  setBenchmarks: (benchmarks: BenchmarkMode[]) => void;
  setSelectedMonth: (month: string | null) => void;
  setCustomDateRange: (range: { start: string; end: string } | null) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      role: 'ops',
      input_dir: './input',
      output_dir: './output',
      exchange_rate: 35,
      compareMode: 'off',
      teamFilter: null,
      focusCC: null,
      selectionContext: null,
      // Dimension defaults
      country: 'TH',
      dataRole: 'all',
      enclosure: null,
      channel: 'all',
      benchmarks: ['target'],
      selectedMonth: null,
      customDateRange: null,
      setRole: (role) => set({ role }),
      setConfig: (config) => set(config),
      setCompareMode: (compareMode) => set({ compareMode }),
      setTeamFilter: (teamFilter) => set({ teamFilter }),
      setFocusCC: (focusCC) => set({ focusCC }),
      setSelectionContext: (selectionContext) => set({ selectionContext }),
      clearSelectionContext: () => set({ selectionContext: null }),
      setCountry: (country) => set({ country }),
      setDataRole: (dataRole) => set({ dataRole }),
      setEnclosure: (enclosure) => set({ enclosure }),
      setChannel: (channel) => set({ channel }),
      setBenchmarks: (benchmarks) => set({ benchmarks }),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
      setCustomDateRange: (customDateRange) => set({ customDateRange }),
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
        // Dimension field validators
        state.dataRole = validateDataRole(state.dataRole);
        state.channel = validateChannel(state.channel);
        state.benchmarks = validateBenchmarks(state.benchmarks);
        state.enclosure = validateEnclosure(state.enclosure);
        state.selectedMonth = validateSelectedMonth(state.selectedMonth);
        // customDateRange validator
        if (state.customDateRange !== null && state.customDateRange !== undefined) {
          const cdr = state.customDateRange;
          if (
            typeof cdr !== 'object' ||
            !ISO_DATE_RE.test(cdr?.start ?? '') ||
            !ISO_DATE_RE.test(cdr?.end ?? '')
          ) {
            state.customDateRange = null;
          }
        } else {
          state.customDateRange = null;
        }
        // country: must be string, default TH
        if (typeof state.country !== 'string') {
          state.country = 'TH';
        }
      },
    }
  )
);
