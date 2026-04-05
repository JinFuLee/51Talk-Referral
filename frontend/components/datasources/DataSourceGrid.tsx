'use client';

import { useLocale } from 'next-intl';
import type { DataSourceStatus } from '@/lib/types';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    empty: '暂无数据源信息',
    statusOk: '正常',
    statusMissing: '缺失',
    statusOutdated: '过期',
    priority: (p: number | string) => `优先级：${p}`,
    latest: (d: string) => `最新：${d}`,
  },
  'zh-TW': {
    empty: '暫無資料來源資訊',
    statusOk: '正常',
    statusMissing: '缺失',
    statusOutdated: '過期',
    priority: (p: number | string) => `優先級：${p}`,
    latest: (d: string) => `最新：${d}`,
  },
  en: {
    empty: 'No data sources found',
    statusOk: 'OK',
    statusMissing: 'Missing',
    statusOutdated: 'Outdated',
    priority: (p: number | string) => `Priority: ${p}`,
    latest: (d: string) => `Latest: ${d}`,
  },
  th: {
    empty: 'ไม่พบแหล่งข้อมูล',
    statusOk: 'ปกติ',
    statusMissing: 'ไม่มีข้อมูล',
    statusOutdated: 'ล้าสมัย',
    priority: (p: number | string) => `ลำดับความสำคัญ: ${p}`,
    latest: (d: string) => `ล่าสุด: ${d}`,
  },
} as const;

type Locale = keyof typeof I18N;

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
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  if (sources.length === 0) {
    return <p className="text-xs text-muted-token py-4 text-center">{t.empty}</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {sources.map((src) => {
        const statusKey = src.has_file ? (src.is_fresh ? 'ok' : 'outdated') : 'missing';
        const statusLabel =
          statusKey === 'ok'
            ? t.statusOk
            : statusKey === 'missing'
              ? t.statusMissing
              : t.statusOutdated;
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
              <p>{t.priority(src.priority)}</p>
              {showDetail && src.latest_date && <p>{t.latest(src.latest_date)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
