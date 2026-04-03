'use client';

import { useTranslations } from 'next-intl';
import type { SnapshotStats } from '@/lib/types';

export function SnapshotStatsCard({ stats }: { stats: SnapshotStats | undefined }) {
  const t = useTranslations('snapshotStats');

  if (!stats) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--text-muted)]">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat label={t('dailySnapshots')} value={stats.total_daily_snapshots} />
      <Stat label={t('ccSnapshots')} value={stats.total_cc_snapshots} />
      <Stat
        label={t('dateRange')}
        value={stats.date_range ? `${stats.date_range.from} ~ ${stats.date_range.to}` : '—'}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
