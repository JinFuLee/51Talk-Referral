'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { swrFetcher } from '@/lib/api';
import type { IndicatorDef, IndicatorMatrix } from '@/lib/types/indicator-matrix';

export function useIndicatorMatrix() {
  const {
    data: registry,
    isLoading: registryLoading,
    error: registryError,
  } = useSWR<IndicatorDef[]>('/api/indicator-matrix/registry', swrFetcher);
  const {
    data: matrix,
    mutate,
    isLoading: matrixLoading,
    error: matrixError,
  } = useSWR<IndicatorMatrix>('/api/indicator-matrix/matrix', swrFetcher);

  const getActiveForRole = useCallback(
    (role: 'CC' | 'SS' | 'LP') => {
      if (!matrix || !registry) return [];
      const activeIds = new Set(matrix[role].active);
      return registry.filter((ind) => activeIds.has(ind.id));
    },
    [matrix, registry]
  );

  return {
    registry: registry ?? [],
    matrix,
    mutate,
    getActiveForRole,
    isLoading: registryLoading || matrixLoading,
    error: registryError || matrixError,
  };
}
