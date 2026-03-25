'use client';

import { Suspense } from 'react';
import { useFilterSync } from '@/lib/use-filter-sync';

/**
 * Activates URL ↔ Store bidirectional sync for global filters.
 * Must be a Client Component; wrapped in Suspense for useSearchParams().
 */
function FilterSyncInner() {
  useFilterSync();
  return null;
}

export function FilterSyncActivator() {
  return (
    <Suspense fallback={null}>
      <FilterSyncInner />
    </Suspense>
  );
}
