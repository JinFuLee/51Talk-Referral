/**
 * useCompareData — 通用对比数据 hook
 * 图表组件只接收 data/compareData props，不关心数据来源
 *
 * v2: benchmarks 数组替代 compareMode 单值（向后兼容：compareMode 仍保留在 store）
 */
import useSWR from 'swr';
import { useConfigStore, type CompareMode } from './stores/config-store';
import type { BenchmarkMode } from './types/filters';
import { swrFetcher } from './api';

export function useCompareData<T>(
  primaryKey: string | null,
  compareKeyFn: (mode: CompareMode, primaryKey: string) => string | null
): {
  data: T | undefined;
  compareData: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const compareMode = useConfigStore((s) => s.compareMode);

  const compareKey =
    compareMode !== 'off' && primaryKey ? compareKeyFn(compareMode, primaryKey) : null;

  const primary = useSWR<T>(primaryKey, swrFetcher);
  const compare = useSWR<T>(compareKey, swrFetcher);

  return {
    data: primary.data,
    compareData: compare.data,
    isLoading: primary.isLoading || (compareKey !== null && compare.isLoading),
    error: (primary.error ?? compare.error) as Error | undefined,
  };
}

/**
 * useCompareDataV2 — benchmarks 数组驱动的对比数据 hook
 * 支持多基准（≤2）对比，由 BenchmarkSelector 驱动
 */
export function useCompareDataV2<T>(
  primaryKey: string | null,
  benchmarkKeyFn: (benchmark: BenchmarkMode, primaryKey: string) => string | null
): {
  data: T | undefined;
  compareData: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const benchmarks = useConfigStore((s) => s.benchmarks);

  // Use first non-'off' benchmark for comparison
  const activeBenchmark = benchmarks.find((b) => b !== 'off') ?? null;

  const compareKey =
    activeBenchmark && primaryKey ? benchmarkKeyFn(activeBenchmark, primaryKey) : null;

  const primary = useSWR<T>(primaryKey, swrFetcher);
  const compare = useSWR<T>(compareKey, swrFetcher);

  return {
    data: primary.data,
    compareData: compare.data,
    isLoading: primary.isLoading || (compareKey !== null && compare.isLoading),
    error: (primary.error ?? compare.error) as Error | undefined,
  };
}
