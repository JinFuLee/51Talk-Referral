import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from '@/lib/stores/config-store';
import type { CompareMode } from '@/lib/stores/config-store';

function resetStore() {
  useConfigStore.setState({
    role: 'ops',
    input_dir: './input',
    output_dir: './output',
    exchange_rate: 35,
    compareMode: 'off',
    selectedMonth: null,
    customDateRange: null,
    teamFilter: null,
    focusCC: null,
    selectionContext: null,
  });
}

describe('useConfigStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ── initial state ────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('has default role ops', () => {
      expect(useConfigStore.getState().role).toBe('ops');
    });

    it('has default selectedMonth null (current month)', () => {
      expect(useConfigStore.getState().selectedMonth).toBeNull();
    });

    it('has default customDateRange null', () => {
      expect(useConfigStore.getState().customDateRange).toBeNull();
    });

    it('has default compareMode off', () => {
      expect(useConfigStore.getState().compareMode).toBe('off');
    });

    it('has null teamFilter and focusCC', () => {
      expect(useConfigStore.getState().teamFilter).toBeNull();
      expect(useConfigStore.getState().focusCC).toBeNull();
    });
  });

  // ── setRole ──────────────────────────────────────────────────────────────────
  describe('setRole', () => {
    it('sets role to exec', () => {
      useConfigStore.getState().setRole('exec');
      expect(useConfigStore.getState().role).toBe('exec');
    });

    it('sets role to finance', () => {
      useConfigStore.getState().setRole('finance');
      expect(useConfigStore.getState().role).toBe('finance');
    });
  });

  // ── setSelectedMonth ──────────────────────────────────────────────────────────
  describe('setSelectedMonth', () => {
    it('sets a historical month in YYYYMM format', () => {
      useConfigStore.getState().setSelectedMonth('202603');
      expect(useConfigStore.getState().selectedMonth).toBe('202603');
    });

    it('resets selectedMonth to null (current month)', () => {
      useConfigStore.getState().setSelectedMonth('202603');
      useConfigStore.getState().setSelectedMonth(null);
      expect(useConfigStore.getState().selectedMonth).toBeNull();
    });
  });

  // ── setCustomDateRange ────────────────────────────────────────────────────────
  describe('setCustomDateRange', () => {
    it('sets a valid date range', () => {
      useConfigStore.getState().setCustomDateRange({ start: '2026-01-01', end: '2026-01-31' });
      const state = useConfigStore.getState();
      expect(state.customDateRange).toEqual({ start: '2026-01-01', end: '2026-01-31' });
    });

    it('clears customDateRange to null', () => {
      useConfigStore.getState().setCustomDateRange({ start: '2026-01-01', end: '2026-01-31' });
      useConfigStore.getState().setCustomDateRange(null);
      expect(useConfigStore.getState().customDateRange).toBeNull();
    });
  });

  // ── setCompareMode ───────────────────────────────────────────────────────────
  describe('setCompareMode', () => {
    const validModes: CompareMode[] = ['off', 'pop', 'yoy', 'peak', 'valley'];

    for (const mode of validModes) {
      it(`sets compareMode to ${mode}`, () => {
        useConfigStore.getState().setCompareMode(mode);
        expect(useConfigStore.getState().compareMode).toBe(mode);
      });
    }
  });

  // ── setTeamFilter / setFocusCC ────────────────────────────────────────────────
  describe('setTeamFilter and setFocusCC', () => {
    it('sets teamFilter to a string value', () => {
      useConfigStore.getState().setTeamFilter('THCC-A');
      expect(useConfigStore.getState().teamFilter).toBe('THCC-A');
    });

    it('clears teamFilter to null', () => {
      useConfigStore.getState().setTeamFilter('THCC-A');
      useConfigStore.getState().setTeamFilter(null);
      expect(useConfigStore.getState().teamFilter).toBeNull();
    });

    it('sets focusCC to a name', () => {
      useConfigStore.getState().setFocusCC('Alice');
      expect(useConfigStore.getState().focusCC).toBe('Alice');
    });

    it('clears focusCC to null', () => {
      useConfigStore.getState().setFocusCC('Alice');
      useConfigStore.getState().setFocusCC(null);
      expect(useConfigStore.getState().focusCC).toBeNull();
    });
  });

  // ── selectionContext ──────────────────────────────────────────────────────────
  describe('selectionContext', () => {
    it('sets a cc selection context', () => {
      useConfigStore.getState().setSelectionContext({ type: 'cc', value: 'Alice' });
      expect(useConfigStore.getState().selectionContext).toEqual({ type: 'cc', value: 'Alice' });
    });

    it('clearSelectionContext resets to null', () => {
      useConfigStore.getState().setSelectionContext({ type: 'channel', value: 'referral' });
      useConfigStore.getState().clearSelectionContext();
      expect(useConfigStore.getState().selectionContext).toBeNull();
    });

    it('sets a segment selection context', () => {
      useConfigStore.getState().setSelectionContext({ type: 'segment', value: 'enclosure_0_30' });
      expect(useConfigStore.getState().selectionContext?.type).toBe('segment');
    });
  });

  // ── setConfig ────────────────────────────────────────────────────────────────
  describe('setConfig', () => {
    it('updates exchange_rate', () => {
      useConfigStore.getState().setConfig({ exchange_rate: 36 });
      expect(useConfigStore.getState().exchange_rate).toBe(36);
    });

    it('updates multiple fields at once', () => {
      useConfigStore
        .getState()
        .setConfig({ input_dir: '/custom/input', output_dir: '/custom/output' });
      const state = useConfigStore.getState();
      expect(state.input_dir).toBe('/custom/input');
      expect(state.output_dir).toBe('/custom/output');
    });
  });
});
