'use client';

import { useLocale } from 'next-intl';
import type { DataSourceStatus } from '@/lib/types';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    synced: (n: number, total: number) => `${n}/${total} 源同步`,
    datesInconsistent: '多源日期不一致',
    date: (d: string) => `日期 ${d}`,
    healthScore: '健康分',
    outOf: '/ 100',
  },
  'zh-TW': {
    synced: (n: number, total: number) => `${n}/${total} 源同步`,
    datesInconsistent: '多源日期不一致',
    date: (d: string) => `日期 ${d}`,
    healthScore: '健康分',
    outOf: '/ 100',
  },
  en: {
    synced: (n: number, total: number) => `${n}/${total} synced`,
    datesInconsistent: 'Dates inconsistent across sources',
    date: (d: string) => `Date ${d}`,
    healthScore: 'Health',
    outOf: '/ 100',
  },
  th: {
    synced: (n: number, total: number) => `${n}/${total} ซิงค์แล้ว`,
    datesInconsistent: 'วันที่ของแหล่งข้อมูลไม่ตรงกัน',
    date: (d: string) => `วันที่ ${d}`,
    healthScore: 'คะแนนสุขภาพ',
    outOf: '/ 100',
  },
} as const;

type Locale = keyof typeof I18N;

/* ── 健康分计算 ──────────────────────────────────────────────────── */

function computeHealthScore(sources: DataSourceStatus[]) {
  let total = 0;
  let syncedCount = 0;

  for (const s of sources) {
    let pts = 0;
    const tier = s.freshness_tier ?? 'missing';

    if (tier === 'today' || tier === 'yesterday') {
      pts += 40;
      syncedCount++;
    } else if (tier === 'recent') {
      pts += 20;
    }

    if (s.row_anomaly === 'ok') pts += 30;
    else if (s.row_anomaly === 'unknown') pts += 15;

    if ((s.critical_completeness_rate ?? 0) >= 1) pts += 30;
    else if ((s.critical_completeness_rate ?? 0) >= 0.8) pts += 20;

    total += pts;
  }

  const score = sources.length > 0 ? Math.round(total / sources.length) : 0;
  return { score, syncedCount };
}

/* ── 摘要条组件 ──────────────────────────────────────────────────── */

export function DataSourceSummaryBar({ sources }: { sources: DataSourceStatus[] }) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { score, syncedCount } = computeHealthScore(sources);
  const allSynced = syncedCount === sources.length && sources.length > 0;

  const uniqueDates = new Set(sources.filter((s) => s.data_date).map((s) => s.data_date));
  const datesConsistent = uniqueDates.size <= 1;
  const uniqueDate = datesConsistent && uniqueDates.size === 1 ? [...uniqueDates][0] : null;

  const scoreColor =
    score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] mb-3">
      <div className="flex items-center gap-3">
        {/* 同步状态 */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              allSynced ? 'bg-success' : 'bg-warning'
            }`}
          />
          <span className="text-xs text-[var(--text-secondary)]">
            {t.synced(syncedCount, sources.length)}
          </span>
        </div>

        {/* 日期一致性 */}
        {!datesConsistent && <span className="text-xs text-warning">{t.datesInconsistent}</span>}
        {datesConsistent && uniqueDate && (
          <span className="text-xs text-[var(--text-muted)]">{t.date(uniqueDate)}</span>
        )}
      </div>

      {/* 健康分 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[var(--text-muted)]">{t.healthScore}</span>
        <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
        <span className="text-xs text-[var(--text-muted)]">{t.outOf}</span>
      </div>
    </div>
  );
}
