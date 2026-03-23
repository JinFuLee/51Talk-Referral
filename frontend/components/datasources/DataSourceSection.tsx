'use client';

import type { DataSourceStatus } from '@/lib/types';
import { DataSourceHealthCard } from './DataSourceHealthCard';
import { DataSourceSummaryBar } from './DataSourceSummaryBar';
import { EmptyState } from '@/components/ui/EmptyState';

export function DataSourceSection({ sources }: { sources: DataSourceStatus[] }) {
  if (sources.length === 0) {
    return <EmptyState title="未检测到数据源" description="请前往设置页面配置数据文件路径" />;
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
