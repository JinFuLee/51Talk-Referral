'use client';

import { DataSourceStatus as DSStatus } from '@/lib/types';

interface DataSourceStatusProps {
  source: DSStatus;
  lang: string;
}

const STATUS_I18N = {
  zh: { missing: '缺失', fresh: '最新', stale: '旧' },
  'zh-TW': { missing: '缺失', fresh: '最新', stale: '舊' },
  en: { missing: 'Missing', fresh: 'Fresh', stale: 'Stale' },
  th: { missing: 'ไม่มี', fresh: 'ล่าสุด', stale: 'เก่า' },
} as const;

type SupportedLang = keyof typeof STATUS_I18N;

function StatusBadge({
  isFresh,
  hasFile,
  lang,
}: {
  isFresh: boolean;
  hasFile: boolean;
  lang: string;
}) {
  const t = STATUS_I18N[(lang as SupportedLang) in STATUS_I18N ? (lang as SupportedLang) : 'zh'];
  if (!hasFile) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
        {t.missing}
      </span>
    );
  }
  if (isFresh) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
        {t.fresh}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
      {t.stale}
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
        <StatusBadge isFresh={source.is_fresh} hasFile={source.has_file} lang={lang} />
        {source.latest_date && (
          <span className="text-xs text-[var(--text-muted)]">{source.latest_date}</span>
        )}
      </div>
    </div>
  );
}
