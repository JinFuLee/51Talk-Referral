import { create } from 'zustand';
import type { AnalysisResult } from '@/lib/types';

interface AnalysisState {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  setResult: (result: AnalysisResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAnalysisStore = create<AnalysisState>()((set) => ({
  result: null,
  loading: false,
  error: null,
  lastUpdated: null,
  setResult: (result) =>
    set({ result, lastUpdated: new Date().toISOString(), error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
