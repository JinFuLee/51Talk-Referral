'use client';

import { useTranslations } from 'next-intl';
import type { DataSourceStatus } from '@/lib/types';
const statusStyle: Record<string, string> = {
  ok: 'bg-success/10 text-success',
  missing: 'bg-destructive/10 text-destructive',
  outdated: 'bg-warning/10 text-warning',
};

interface DataSourceGridProps {
  sources: DataSourceStatus[];
  showDetail?: boolean;
}

export function DataSourceGrid({ sources, showDetail }: DataSourceGridProps) {
  const t = useTranslations('DataSourceGrid');

  if (sources.length === 0) {
    return <p className="text-xs text-muted-token py-4 text-center">{t('empty')}</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {sources.map((src) => {
        const statusKey = src.has_file ? (src.is_fresh ? 'ok' : 'outdated') : 'missing';
        const statusLabel =
          statusKey === 'ok'
            ? t('statusOk')
            : statusKey === 'missing'
              ? t('statusMissing')
              : t('statusOutdated');
        return (
          <div
            key={src.id}
            className="rounded-xl border border-subtle-token bg-surface p-3 text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-primary-token truncate">{src.name_zh}</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${statusStyle[statusKey]}`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="text-muted-token space-y-0.5">
              <p>{t('priority', { p: src.priority })}</p>
              {showDetail && src.latest_date && <p>{t('latest', { d: src.latest_date })}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
