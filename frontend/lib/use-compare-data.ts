/**
 * useCompareData — 通用对比数据 hook
 * 图表组件只接收 data/compareData props，不关心数据来源
 */
import useSWR from "swr";
import { useConfigStore, type CompareMode } from "./stores/config-store";
import { swrFetcher } from "./api";

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
    compareMode !== "off" && primaryKey
      ? compareKeyFn(compareMode, primaryKey)
      : null;

  const primary = useSWR<T>(primaryKey, swrFetcher);
  const compare = useSWR<T>(compareKey, swrFetcher);

  return {
    data: primary.data,
    compareData: compare.data,
    isLoading: primary.isLoading || (compareKey !== null && compare.isLoading),
    error: (primary.error ?? compare.error) as Error | undefined,
  };
}
