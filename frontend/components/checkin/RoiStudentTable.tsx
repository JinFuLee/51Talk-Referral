'use client';

import { useState, useMemo } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUSD, formatRate } from '@/lib/utils';
import type { RoiAnalysisResponse, RoiStudentRow, RiskLevel } from '@/lib/types/checkin-roi';
import { RISK_LEVEL_CONFIG, getRiskLabel } from '@/lib/types/checkin-roi';
import { useLocale, useTranslations } from 'next-intl';

// ── i18n ──────────────────────────────────────────────────────────────────────
interface Props {
  roleFilter?: string;
  enclosureFilter?: string | null;
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const locale = useLocale();
  const cfg = RISK_LEVEL_CONFIG[level];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
    >
      {cfg.emoji} {getRiskLabel(level, locale)}
    </span>
  );
}

function RoiCell({ roi }: { roi: number | null }) {
  if (roi == null) return <span className="text-muted-token">—</span>;
  const color = roi >= 200 ? '#16a34a' : roi >= 0 ? '#ca8a04' : '#dc2626';
  return (
    <span className="font-semibold" style={{ color }}>
      {roi.toFixed(1)}%
    </span>
  );
}

// CSV 导出
function exportToCSV(students: RoiStudentRow[], t: (key: string, params?: any) => string) {
  const headers = [
    t('csvRank'),
    t('csvStudentId'),
    t('csvEnclosure'),
    t('csvOwner'),
    t('csvTeam'),
    t('csvActivityCards'),
    t('csvBindingCards'),
    t('csvAttendCards'),
    t('csvPayCards'),
    t('csvTotalCards'),
    t('csvTotalCost'),
    t('csvRevenue'),
    t('csvRoi'),
    t('csvRiskLevel'),
    t('csvCheckin'),
    t('csvLesson'),
  ];
  const rows = students.map((s, i) => [
    i + 1,
    s.student_id,
    s.enclosure,
    s.cc_name,
    s.team,
    s.activity_cards,
    s.binding_cards,
    s.attendance_cards,
    s.payment_cards,
    s.total_cards,
    s.total_cost_usd,
    s.revenue_usd,
    s.roi ?? '',
    RISK_LEVEL_CONFIG[s.risk_level]?.label ?? s.risk_level,
    s.days_this_month,
    s.lesson_this_month,
  ]);

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t('csvFilePrefix')}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RoiStudentTable({ roleFilter, enclosureFilter }: Props) {
  const rawLocale = useLocale();
  const locale = rawLocale;
  const t = useTranslations('RoiStudentTable');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [sortKey, setSortKey] = useState<'roi' | 'cost' | 'revenue'>('roi');

  const params = new URLSearchParams();
  if (roleFilter) params.set('role', roleFilter);
  if (enclosureFilter) params.set('enclosure', enclosureFilter);

  const { data, isLoading, error } = useFilteredSWR<RoiAnalysisResponse>(
    `/api/checkin/roi-analysis${params.toString() ? '?' + params.toString() : ''}`
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.students;
    if (riskFilter !== 'all') {
      list = list.filter((s) => s.risk_level === riskFilter);
    }
    // 排序
    return [...list].sort((a, b) => {
      if (sortKey === 'roi') {
        const ar = a.roi ?? -Infinity;
        const br = b.roi ?? -Infinity;
        return br - ar;
      }
      if (sortKey === 'cost') return b.total_cost_usd - a.total_cost_usd;
      return b.revenue_usd - a.revenue_usd;
    });
  }, [data, riskFilter, sortKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t('loadFail')} description={t('loadFailDesc')} />;
  }

  if (!data || data.students.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />;
  }

  const FILTER_OPTIONS: { id: RiskLevel | 'all'; label: string }[] = [
    { id: 'all', label: t('filterAll') },
    { id: 'gold', label: t('filterGold') },
    { id: 'effective', label: t('filterEffective') },
    { id: 'stuck_pay', label: t('filterStuckPay') },
    { id: 'stuck_show', label: t('filterStuckShow') },
    { id: 'potential', label: t('filterPotential') },
    { id: 'freeloader', label: t('filterFreeloader') },
    { id: 'newcomer', label: t('filterNewcomer') },
    { id: 'casual', label: t('filterCasual') },
  ];

  return (
    <div className="space-y-3">
      {/* 筛选 + 排序 + 导出 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRiskFilter(opt.id)}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                riskFilter === opt.id
                  ? 'bg-action-accent-token text-white border-action-accent-token'
                  : 'bg-surface text-secondary-token border-default-token hover:bg-subtle',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as 'roi' | 'cost' | 'revenue')}
            className="input-base text-xs py-1 px-2"
          >
            <option value="roi">{t('sortByRoi')}</option>
            <option value="revenue">{t('sortByRevenue')}</option>
            <option value="cost">{t('sortByCost')}</option>
          </select>
          <button
            onClick={() => exportToCSV(filtered, t)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {t('exportCsv')}
          </button>
        </div>
      </div>

      {/* 结果数 */}
      <p className="text-xs text-muted-token">
        {filtered.length.toLocaleString()} {t('studentCount')}
        {riskFilter !== 'all' &&
          `${t('filteredBy')}${getRiskLabel(riskFilter as RiskLevel, rawLocale)}${t('filteredBySuffix')}`}
      </p>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-default-token">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-right w-10">{t('colRank')}</th>
              <th className="slide-th">{t('colStudentId')}</th>
              <th className="slide-th">{t('colEnclosure')}</th>
              <th className="slide-th">{t('colOwner')}</th>
              <th className="slide-th">{t('colActivityCard')}</th>
              <th className="slide-th">{t('colBindingCard')}</th>
              <th className="slide-th">{t('colAttendCard')}</th>
              <th className="slide-th">{t('colPayCard')}</th>
              <th className="slide-th text-right">{t('colTotalCost')}</th>
              <th className="slide-th text-right">{t('colRevenue')}</th>
              <th className="slide-th text-right">{t('colRoi')}</th>
              <th className="slide-th">{t('colRiskLevel')}</th>
              <th className="slide-th text-right">{t('colCheckin')}</th>
              <th className="slide-th text-right">{t('colLesson')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-xs text-muted-token">
                  {t('noStudents')}
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr
                  key={s.student_id || i}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td text-right text-muted-token">{i + 1}</td>
                  <td className="slide-td font-mono text-xs">{s.student_id || '—'}</td>
                  <td className="slide-td">{s.enclosure || '—'}</td>
                  <td className="slide-td">{s.cc_name || '—'}</td>
                  <td className="slide-td text-right">{s.activity_cards}</td>
                  <td className="slide-td text-right">{s.binding_cards}</td>
                  <td className="slide-td text-right">{s.attendance_cards}</td>
                  <td className="slide-td text-right">{s.payment_cards}</td>
                  <td className="slide-td text-right">{formatUSD(s.total_cost_usd)}</td>
                  <td className="slide-td text-right">{formatUSD(s.revenue_usd)}</td>
                  <td className="slide-td text-right">
                    <RoiCell roi={s.roi} />
                  </td>
                  <td className="slide-td">
                    <RiskBadge level={s.risk_level} />
                  </td>
                  <td className="slide-td text-right">{s.days_this_month}</td>
                  <td className="slide-td text-right">
                    {s.lesson_this_month > 0 ? s.lesson_this_month.toFixed(1) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
