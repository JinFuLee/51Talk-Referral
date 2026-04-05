'use client';

// 学员排行面板 — 3 维度切换：频次 / 进步 / 转化效率

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { StudentTagBadge } from './StudentTagBadge';
import { fmtEnc, formatRate } from '@/lib/utils';
import type { StudentRow } from '@/lib/types/checkin-student';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    fullAttendance: (n: number) => `满勤区（6次）（${n} 人）`,
    activeZone: (n: number) => `活跃区（4-5次）（${n} 人）`,
    lowFreq: (n: number) => `低频区（1-3次）（${n} 人）`,
    improvement3: (n: number) => `进步 ≥3（${n} 人）`,
    improvement2: (n: number) => `进步 2（${n} 人）`,
    improvement1: (n: number) => `进步 1（${n} 人）`,
    conversionZone: (n: number) => `转化效率（${n} 人）`,
    rankHeader: '排名',
    studentIdHeader: '学员 ID',
    enclosureHeader: '围场',
    ccHeader: 'CC',
    thisMonthHeader: '本月',
    lastMonthHeader: '上月',
    deltaHeader: '△',
    lessonHeader: '课耗',
    referralHeader: '推荐注册',
    tagsHeader: '标签',
    panelTitle: '学员排行',
    modeFrequency: '频次排行',
    modeImprovement: '进步排行',
    modeConversion: '转化效率',
    loading: '加载中…',
    loadFailed: '数据加载失败，请刷新重试',
    noData: '暂无排行数据',
    noDataHint: '请确认当月已有打卡记录',
  },
  'zh-TW': {
    fullAttendance: (n: number) => `滿勤區（6次）（${n} 人）`,
    activeZone: (n: number) => `活躍區（4-5次）（${n} 人）`,
    lowFreq: (n: number) => `低頻區（1-3次）（${n} 人）`,
    improvement3: (n: number) => `進步 ≥3（${n} 人）`,
    improvement2: (n: number) => `進步 2（${n} 人）`,
    improvement1: (n: number) => `進步 1（${n} 人）`,
    conversionZone: (n: number) => `轉化效率（${n} 人）`,
    rankHeader: '排名',
    studentIdHeader: '學員 ID',
    enclosureHeader: '圍場',
    ccHeader: 'CC',
    thisMonthHeader: '本月',
    lastMonthHeader: '上月',
    deltaHeader: '△',
    lessonHeader: '課耗',
    referralHeader: '推薦注冊',
    tagsHeader: '標籤',
    panelTitle: '學員排行',
    modeFrequency: '頻次排行',
    modeImprovement: '進步排行',
    modeConversion: '轉化效率',
    loading: '載入中…',
    loadFailed: '資料載入失敗，請重新整理',
    noData: '暫無排行資料',
    noDataHint: '請確認當月已有打卡記錄',
  },
  en: {
    fullAttendance: (n: number) => `Full Attendance (6×) — ${n} students`,
    activeZone: (n: number) => `Active (4-5×) — ${n} students`,
    lowFreq: (n: number) => `Low Frequency (1-3×) — ${n} students`,
    improvement3: (n: number) => `Improved ≥3 — ${n} students`,
    improvement2: (n: number) => `Improved 2 — ${n} students`,
    improvement1: (n: number) => `Improved 1 — ${n} students`,
    conversionZone: (n: number) => `Conversion Efficiency — ${n} students`,
    rankHeader: 'Rank',
    studentIdHeader: 'Student ID',
    enclosureHeader: 'Enclosure',
    ccHeader: 'CC',
    thisMonthHeader: 'This Month',
    lastMonthHeader: 'Last Month',
    deltaHeader: '△',
    lessonHeader: 'Lessons',
    referralHeader: 'Referrals',
    tagsHeader: 'Tags',
    panelTitle: 'Student Rankings',
    modeFrequency: 'Frequency',
    modeImprovement: 'Improvement',
    modeConversion: 'Conversion',
    loading: 'Loading…',
    loadFailed: 'Failed to load data. Please refresh.',
    noData: 'No ranking data',
    noDataHint: 'Please ensure check-in records exist for this month.',
  },
  th: {
    fullAttendance: (n: number) => `เช็คอินครบ (6 ครั้ง) — ${n} คน`,
    activeZone: (n: number) => `แอคทีฟ (4-5 ครั้ง) — ${n} คน`,
    lowFreq: (n: number) => `ความถี่ต่ำ (1-3 ครั้ง) — ${n} คน`,
    improvement3: (n: number) => `พัฒนา ≥3 — ${n} คน`,
    improvement2: (n: number) => `พัฒนา 2 — ${n} คน`,
    improvement1: (n: number) => `พัฒนา 1 — ${n} คน`,
    conversionZone: (n: number) => `ประสิทธิภาพการแปลง — ${n} คน`,
    rankHeader: 'อันดับ',
    studentIdHeader: 'รหัสนักเรียน',
    enclosureHeader: 'คอก',
    ccHeader: 'CC',
    thisMonthHeader: 'เดือนนี้',
    lastMonthHeader: 'เดือนที่แล้ว',
    deltaHeader: '△',
    lessonHeader: 'บทเรียน',
    referralHeader: 'แนะนำ',
    tagsHeader: 'แท็ก',
    panelTitle: 'การจัดอันดับนักเรียน',
    modeFrequency: 'ความถี่',
    modeImprovement: 'ความก้าวหน้า',
    modeConversion: 'การแปลง',
    loading: 'กำลังโหลด…',
    loadFailed: 'โหลดข้อมูลล้มเหลว กรุณารีเฟรช',
    noData: 'ไม่มีข้อมูลการจัดอันดับ',
    noDataHint: 'กรุณาตรวจสอบว่ามีบันทึกเช็คอินในเดือนนี้',
  },
} as const;

type Locale = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

type RankingMode = 'frequency' | 'improvement' | 'conversion';

interface Section {
  label: string;
  emoji: string;
  rows: StudentRow[];
}

function buildFrequencySections(rows: StudentRow[], t: ReturnType<typeof useT>): Section[] {
  const superfan = rows.filter((r) => r.days_this_month === 6);
  const active = rows.filter((r) => r.days_this_month >= 4 && r.days_this_month <= 5);
  const low = rows.filter((r) => r.days_this_month >= 1 && r.days_this_month <= 3);
  return [
    { label: t.fullAttendance(superfan.length), emoji: '🏆', rows: superfan },
    { label: t.activeZone(active.length), emoji: '🌟', rows: active },
    { label: t.lowFreq(low.length), emoji: '⚠️', rows: low },
  ].filter((s) => s.rows.length > 0);
}

function buildImprovementSections(rows: StudentRow[], t: ReturnType<typeof useT>): Section[] {
  const big = rows.filter((r) => r.delta >= 3);
  const mid = rows.filter((r) => r.delta === 2);
  const small = rows.filter((r) => r.delta === 1);
  return [
    { label: t.improvement3(big.length), emoji: '📈', rows: big },
    { label: t.improvement2(mid.length), emoji: '📈', rows: mid },
    { label: t.improvement1(small.length), emoji: '📈', rows: small },
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
  t: ReturnType<typeof useT>;
}

function SectionTable({ sections, flatMode = false, t }: SectionTableProps) {
  let globalRank = 0;
  let globalIndex = 0;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="slide-thead-row">
          <th className="slide-th slide-th-center">{t.rankHeader}</th>
          <th className="slide-th slide-th-left">{t.studentIdHeader}</th>
          <th className="slide-th slide-th-center">{t.enclosureHeader}</th>
          <th className="slide-th slide-th-left">{t.ccHeader}</th>
          <th className="slide-th slide-th-center">{t.thisMonthHeader}</th>
          <th className="slide-th slide-th-center">{t.lastMonthHeader}</th>
          <th className="slide-th slide-th-center">{t.deltaHeader}</th>
          <th className="slide-th slide-th-center">{t.lessonHeader}</th>
          <th className="slide-th slide-th-center">{t.referralHeader}</th>
          <th className="slide-th slide-th-left">{t.tagsHeader}</th>
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
  const t = useT();
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
    return [{ label: t.conversionZone(sorted.length), emoji: '💎', rows: sorted }];
  }, [data, mode, t]);

  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);

  const MODES: { key: RankingMode; label: string }[] = [
    { key: 'frequency', label: t.modeFrequency },
    { key: 'improvement', label: t.modeImprovement },
    { key: 'conversion', label: t.modeConversion },
  ];

  return (
    <div className="card-base">
      {/* 标题 + 切换按钮 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-primary-token">{t.panelTitle}</h3>
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
          {t.loading}
        </div>
      )}

      {/* error */}
      {!isLoading && error && (
        <div className="flex items-center justify-center h-32 text-sm text-danger-token">
          {t.loadFailed}
        </div>
      )}

      {/* empty */}
      {!isLoading && !error && totalRows === 0 && (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-sm text-muted-token">
          <span>{t.noData}</span>
          <span className="text-xs">{t.noDataHint}</span>
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
