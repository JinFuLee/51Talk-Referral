'use client';

import { DataSourceStatus as DSStatus } from '@/lib/types';

interface DataSourceStatusProps {
  source: DSStatus;
  lang: 'zh' | 'th';
}

function StatusBadge({ isFresh, hasFile }: { isFresh: boolean; hasFile: boolean }) {
  if (!hasFile) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
        缺失
      </span>
    );
  }
  if (isFresh) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
        最新
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
      旧
    </span>
  );
}

export function DataSourceStatus({ source, lang }: DataSourceStatusProps) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--bg-primary)]">
      <span className="text-xs text-[var(--text-primary)] truncate flex-1 mr-2">
        {source.name_zh}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge isFresh={source.is_fresh} hasFile={source.has_file} />
        {source.latest_date && (
          <span className="text-xs text-[var(--text-muted)]">{source.latest_date}</span>
        )}
      </div>
    </div>
  );
}
