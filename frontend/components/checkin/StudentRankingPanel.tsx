'use client';

// 学员排行面板 — 3 维度切换：频次 / 进步 / 转化效率

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { StudentTagBadge } from './StudentTagBadge';
import { fmtEnc, formatRate } from '@/lib/utils';
import type { StudentRow } from '@/lib/types/checkin-student';
type RankingMode = 'frequency' | 'improvement' | 'conversion';

interface Section {
  label: string;
  emoji: string;
  rows: StudentRow[];
}

function buildFrequencySections(rows: StudentRow[], t: (key: string, params?: any) => string): Section[] {
  const superfan = rows.filter((r) => r.days_this_month === 6);
  const active = rows.filter((r) => r.days_this_month >= 4 && r.days_this_month <= 5);
  const low = rows.filter((r) => r.days_this_month >= 1 && r.days_this_month <= 3);
  return [
    { label: t('fullAttendance', { n: superfan.length }), emoji: '🏆', rows: superfan },
    { label: t('activeZone', { n: active.length }), emoji: '🌟', rows: active },
    { label: t('lowFreq', { n: low.length }), emoji: '⚠️', rows: low },
  ].filter((s) => s.rows.length > 0);
}

function buildImprovementSections(rows: StudentRow[], t: (key: string, params?: any) => string): Section[] {
  const big = rows.filter((r) => r.delta >= 3);
  const mid = rows.filter((r) => r.delta === 2);
  const small = rows.filter((r) => r.delta === 1);
  return [
    { label: t('improvement3', { n: big.length }), emoji: '📈', rows: big },
    { label: t('improvement2', { n: mid.length }), emoji: '📈', rows: mid },
    { label: t('improvement1', { n: small.length }), emoji: '📈', rows: small },
  ].filter((s) => s.rows.length > 0);
}

interface TableRowProps {
  rank: number;
  row: StudentRow;
  index: number;
}

function StudentTableRow({ rank, row, index }: TableRowProps) {
  const deltaColor =
    row.delta > 0 ? 'text-success-token' : row.delta < 0 ? 'text-danger-token' : 'text-muted-token';

  const rowClass = index % 2 === 0 ? 'slide-row-even' : 'slide-row-odd';

  return (
    <tr className={rowClass}>
      <td className="slide-td text-center font-mono tabular-nums text-muted-token">{rank}</td>
      <td className="slide-td font-mono text-xs text-primary-token">{row.student_id}</td>
      <td className="slide-td text-center text-secondary-token">{fmtEnc(row.enclosure)}</td>
      <td className="slide-td text-secondary-token">{row.cc_name || '—'}</td>
      <td className="slide-td text-center font-semibold text-primary-token tabular-nums">
        {row.days_this_month}
      </td>
      <td className="slide-td text-center tabular-nums text-secondary-token">
        {row.days_last_month}
      </td>
      <td className={`slide-td text-center tabular-nums font-semibold ${deltaColor}`}>
        {row.delta > 0 ? `+${row.delta}` : row.delta}
      </td>
      <td className="slide-td text-center tabular-nums text-secondary-token">
        {row.lesson_this_month != null ? row.lesson_this_month : '—'}
      </td>
      <td className="slide-td text-center tabular-nums text-secondary-token">
        {row.referral_registrations}
      </td>
      <td className="slide-td">
        <StudentTagBadge tags={row.tags} maxVisible={2} />
      </td>
    </tr>
  );
}

interface SectionTableProps {
  sections: Section[];
  flatMode?: boolean;
  t: (key: string, params?: any) => string;
}

function SectionTable({ sections, flatMode = false, t }: SectionTableProps) {
  let globalRank = 0;
  let globalIndex = 0;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="slide-thead-row">
          <th className="slide-th slide-th-center">{t('rankHeader')}</th>
          <th className="slide-th slide-th-left">{t('studentIdHeader')}</th>
          <th className="slide-th slide-th-center">{t('enclosureHeader')}</th>
          <th className="slide-th slide-th-left">{t('ccHeader')}</th>
          <th className="slide-th slide-th-center">{t('thisMonthHeader')}</th>
          <th className="slide-th slide-th-center">{t('lastMonthHeader')}</th>
          <th className="slide-th slide-th-center">{t('deltaHeader')}</th>
          <th className="slide-th slide-th-center">{t('lessonHeader')}</th>
          <th className="slide-th slide-th-center">{t('referralHeader')}</th>
          <th className="slide-th slide-th-left">{t('tagsHeader')}</th>
        </tr>
      </thead>
      <tbody>
        {sections.map((section) => (
          <>
            {!flatMode && (
              <tr key={`section-${section.label}`} className="bg-subtle">
                <td colSpan={10} className="px-3 py-1.5 text-xs font-semibold text-secondary-token">
                  {section.emoji} {section.label}
                </td>
              </tr>
            )}
            {section.rows.map((row) => {
              globalRank += 1;
              const rank = globalRank;
              const idx = globalIndex;
              globalIndex += 1;
              return <StudentTableRow key={row.student_id} rank={rank} row={row} index={idx} />;
            })}
          </>
        ))}
      </tbody>
    </table>
  );
}

/**
 * 学员排行面板
 *
 * 3 维度切换：频次排行 / 进步排行 / 转化效率
 * 按分区展示：满勤区 / 活跃区 / 低频区（频次模式）
 *
 * 使用示例：
 * <StudentRankingPanel />
 */
interface StudentRankingPanelProps {
  enclosureFilter?: string | null;
}

export function StudentRankingPanel({ enclosureFilter }: StudentRankingPanelProps) {
  const t = useTranslations('StudentRankingPanel');
  const [mode, setMode] = useState<RankingMode>('frequency');
  const { data, error, isLoading } = useStudentAnalysis(
    enclosureFilter ? { enclosure: enclosureFilter } : undefined
  );

  const sections = useMemo<Section[]>(() => {
    if (!data) return [];

    if (mode === 'frequency') {
      const sorted = [...data.top_students].sort((a, b) => b.days_this_month - a.days_this_month);
      return buildFrequencySections(sorted, t);
    }

    if (mode === 'improvement') {
      const sorted = [...data.improvement_ranking].sort((a, b) => b.delta - a.delta);
      return buildImprovementSections(sorted, t);
    }

    // conversion: 转化效率，days_this_month ≥ 1，按推荐注册降序
    const eligible = data.top_students.filter((r) => r.days_this_month >= 1);
    const sorted = [...eligible].sort(
      (a, b) => b.referral_registrations - a.referral_registrations
    );
    return [{ label: t('conversionZone', { n: sorted.length }), emoji: '💎', rows: sorted }];
  }, [data, mode, t]);

  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);

  const MODES: { key: RankingMode; label: string }[] = [
    { key: 'frequency', label: t('modeFrequency') },
    { key: 'improvement', label: t('modeImprovement') },
    { key: 'conversion', label: t('modeConversion') },
  ];

  return (
    <div className="card-base">
      {/* 标题 + 切换按钮 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-primary-token">{t('panelTitle')}</h3>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                mode === m.key ? 'bg-accent-token text-white' : 'btn-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32 text-sm text-muted-token">
          {t('loading')}
        </div>
      )}

      {/* error */}
      {!isLoading && error && (
        <div className="flex items-center justify-center h-32 text-sm text-danger-token">
          {t('loadFailed')}
        </div>
      )}

      {/* empty */}
      {!isLoading && !error && totalRows === 0 && (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-sm text-muted-token">
          <span>{t('noData')}</span>
          <span className="text-xs">{t('noDataHint')}</span>
        </div>
      )}

      {/* table */}
      {!isLoading && !error && totalRows > 0 && (
        <div className="overflow-x-auto">
          <SectionTable sections={sections} flatMode={mode === 'conversion'} t={t} />
        </div>
      )}
    </div>
  );
}
