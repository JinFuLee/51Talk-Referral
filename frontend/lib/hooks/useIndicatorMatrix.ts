'use client';

import { useCallback } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import type { IndicatorDef, IndicatorMatrix } from '@/lib/types/indicator-matrix';

export function useIndicatorMatrix() {
  const {
    data: registry,
    isLoading: registryLoading,
    error: registryError,
  } = useFilteredSWR<IndicatorDef[]>('/api/indicator-matrix/registry');
  const {
    data: matrix,
    mutate,
    isLoading: matrixLoading,
    error: matrixError,
  } = useFilteredSWR<IndicatorMatrix>('/api/indicator-matrix/matrix');

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
