'use client';

// 学员排行面板 — 3 维度切换：频次 / 进步 / 转化效率

import { useState, useMemo } from 'react';
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

function buildFrequencySections(rows: StudentRow[]): Section[] {
  const superfan = rows.filter((r) => r.days_this_month === 6);
  const active = rows.filter((r) => r.days_this_month >= 4 && r.days_this_month <= 5);
  const low = rows.filter((r) => r.days_this_month >= 1 && r.days_this_month <= 3);
  return [
    { label: '满勤区（6次）', emoji: '🏆', rows: superfan },
    { label: '活跃区（4-5次）', emoji: '🌟', rows: active },
    { label: '低频区（1-3次）', emoji: '⚠️', rows: low },
  ].filter((s) => s.rows.length > 0);
}

function buildImprovementSections(rows: StudentRow[]): Section[] {
  const big = rows.filter((r) => r.delta >= 3);
  const mid = rows.filter((r) => r.delta === 2);
  const small = rows.filter((r) => r.delta === 1);
  return [
    { label: '进步 ≥3', emoji: '📈', rows: big },
    { label: '进步 2', emoji: '📈', rows: mid },
    { label: '进步 1', emoji: '📈', rows: small },
  ].filter((s) => s.rows.length > 0);
}

interface TableRowProps {
  rank: number;
  row: StudentRow;
  index: number;
}

function StudentTableRow({ rank, row, index }: TableRowProps) {
  const deltaColor =
    row.delta > 0
      ? 'text-emerald-700'
      : row.delta < 0
        ? 'text-red-600'
        : 'text-[var(--text-muted)]';

  const rowClass = index % 2 === 0 ? 'slide-row-even' : 'slide-row-odd';

  return (
    <tr className={rowClass}>
      <td className="slide-td text-center font-mono tabular-nums text-[var(--text-muted)]">
        {rank}
      </td>
      <td className="slide-td font-mono text-xs text-[var(--text-primary)]">{row.student_id}</td>
      <td className="slide-td text-center text-[var(--text-secondary)]">{fmtEnc(row.enclosure)}</td>
      <td className="slide-td text-[var(--text-secondary)]">{row.cc_name || '—'}</td>
      <td className="slide-td text-center font-semibold text-[var(--text-primary)] tabular-nums">
        {row.days_this_month}
      </td>
      <td className="slide-td text-center tabular-nums text-[var(--text-secondary)]">
        {row.days_last_month}
      </td>
      <td className={`slide-td text-center tabular-nums font-semibold ${deltaColor}`}>
        {row.delta > 0 ? `+${row.delta}` : row.delta}
      </td>
      <td className="slide-td text-center tabular-nums text-[var(--text-secondary)]">
        {row.lesson_this_month != null ? row.lesson_this_month : '—'}
      </td>
      <td className="slide-td text-center tabular-nums text-[var(--text-secondary)]">
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
}

function SectionTable({ sections, flatMode = false }: SectionTableProps) {
  let globalRank = 0;
  let globalIndex = 0;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="slide-thead-row">
          <th className="slide-th slide-th-center">排名</th>
          <th className="slide-th slide-th-left">学员 ID</th>
          <th className="slide-th slide-th-center">围场</th>
          <th className="slide-th slide-th-left">CC</th>
          <th className="slide-th slide-th-center">本月</th>
          <th className="slide-th slide-th-center">上月</th>
          <th className="slide-th slide-th-center">△</th>
          <th className="slide-th slide-th-center">课耗</th>
          <th className="slide-th slide-th-center">推荐注册</th>
          <th className="slide-th slide-th-left">标签</th>
        </tr>
      </thead>
      <tbody>
        {sections.map((section) => (
          <>
            {!flatMode && (
              <tr key={`section-${section.label}`} className="bg-[var(--bg-subtle)]">
                <td
                  colSpan={10}
                  className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
                >
                  {section.emoji} {section.label}（{section.rows.length} 人）
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
 *   <StudentRankingPanel />
 */
export function StudentRankingPanel() {
  const [mode, setMode] = useState<RankingMode>('frequency');
  const { data, error, isLoading } = useStudentAnalysis();

  const sections = useMemo<Section[]>(() => {
    if (!data) return [];

    if (mode === 'frequency') {
      const sorted = [...data.top_students].sort((a, b) => b.days_this_month - a.days_this_month);
      return buildFrequencySections(sorted);
    }

    if (mode === 'improvement') {
      const sorted = [...data.improvement_ranking].sort((a, b) => b.delta - a.delta);
      return buildImprovementSections(sorted);
    }

    // conversion: 转化效率，days_this_month ≥ 1，按推荐注册降序
    const eligible = data.top_students.filter((r) => r.days_this_month >= 1);
    const sorted = [...eligible].sort(
      (a, b) => b.referral_registrations - a.referral_registrations
    );
    return [{ label: '转化效率', emoji: '💎', rows: sorted }];
  }, [data, mode]);

  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);

  const MODES: { key: RankingMode; label: string }[] = [
    { key: 'frequency', label: '频次排行' },
    { key: 'improvement', label: '进步排行' },
    { key: 'conversion', label: '转化效率' },
  ];

  return (
    <div className="card-base">
      {/* 标题 + 切换按钮 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">学员排行</h3>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                mode === m.key ? 'bg-[var(--color-accent)] text-white' : 'btn-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32 text-sm text-[var(--text-muted)]">
          加载中…
        </div>
      )}

      {/* error */}
      {!isLoading && error && (
        <div className="flex items-center justify-center h-32 text-sm text-red-600">
          数据加载失败，请刷新重试
        </div>
      )}

      {/* empty */}
      {!isLoading && !error && totalRows === 0 && (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-sm text-[var(--text-muted)]">
          <span>暂无排行数据</span>
          <span className="text-xs">请确认当月已有打卡记录</span>
        </div>
      )}

      {/* table */}
      {!isLoading && !error && totalRows > 0 && (
        <div className="overflow-x-auto">
          <SectionTable sections={sections} flatMode={mode === 'conversion'} />
        </div>
      )}
    </div>
  );
}
