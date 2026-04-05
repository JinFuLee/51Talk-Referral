'use client';

import { useTranslations } from 'next-intl';
import type { DataSourceStatus } from '@/lib/types';
import { DataSourceHealthCard } from './DataSourceHealthCard';
import { DataSourceSummaryBar } from './DataSourceSummaryBar';
import { EmptyState } from '@/components/ui/EmptyState';
export function DataSourceSection({ sources }: { sources: DataSourceStatus[] }) {
  const t = useTranslations('DataSourceSection');

  if (sources.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />;
  }

  return (
    <div>
      <DataSourceSummaryBar sources={sources} />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {sources.map((s) => (
          <DataSourceHealthCard key={s.id} source={s} />
        ))}
      </div>
    </div>
  );
}
