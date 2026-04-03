'use client';

// CC 学员明细展开面板 — 懒加载，用于 TeamDetailTab 中 CC 行点击展开

import { useLocale } from 'next-intl';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { StudentTagBadge } from './StudentTagBadge';
import { fmtEnc } from '@/lib/utils';
import type { StudentRow } from '@/lib/types/checkin-student';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    loading: '加载中…',
    loadFailed: '数据加载失败',
    noData: '该 CC 暂无学员数据',
    totalLabel: '共',
    totalUnit: (n: number) => `${n} 学员`,
    checkedInLabel: '已打卡',
    checkedInValue: (n: number, pct: number) => `${n}（${pct}%）`,
    sleepHighLabel: '沉睡高潜',
    sleepHighValue: (n: number) => `${n} 人`,
    studentIdHeader: '学员 ID',
    enclosureHeader: '围场',
    thisMonthHeader: '本月',
    lastMonthHeader: '上月',
    deltaHeader: '△',
    lessonHeader: '课耗',
    referralHeader: '推荐注册',
    tagsHeader: '标签',
  },
  'zh-TW': {
    loading: '載入中…',
    loadFailed: '資料載入失敗',
    noData: '此 CC 暫無學員資料',
    totalLabel: '共',
    totalUnit: (n: number) => `${n} 學員`,
    checkedInLabel: '已打卡',
    checkedInValue: (n: number, pct: number) => `${n}（${pct}%）`,
    sleepHighLabel: '沉睡高潛',
    sleepHighValue: (n: number) => `${n} 人`,
    studentIdHeader: '學員 ID',
    enclosureHeader: '圍場',
    thisMonthHeader: '本月',
    lastMonthHeader: '上月',
    deltaHeader: '△',
    lessonHeader: '課耗',
    referralHeader: '推薦注冊',
    tagsHeader: '標籤',
  },
  en: {
    loading: 'Loading…',
    loadFailed: 'Failed to load data',
    noData: 'No student data for this CC',
    totalLabel: 'Total',
    totalUnit: (n: number) => `${n} students`,
    checkedInLabel: 'Checked In',
    checkedInValue: (n: number, pct: number) => `${n} (${pct}%)`,
    sleepHighLabel: 'Dormant High-Potential',
    sleepHighValue: (n: number) => `${n}`,
    studentIdHeader: 'Student ID',
    enclosureHeader: 'Enclosure',
    thisMonthHeader: 'This Month',
    lastMonthHeader: 'Last Month',
    deltaHeader: '△',
    lessonHeader: 'Lessons',
    referralHeader: 'Referrals',
    tagsHeader: 'Tags',
  },
  th: {
    loading: 'กำลังโหลด…',
    loadFailed: 'โหลดข้อมูลล้มเหลว',
    noData: 'ไม่มีข้อมูลนักเรียนสำหรับ CC นี้',
    totalLabel: 'ทั้งหมด',
    totalUnit: (n: number) => `${n} คน`,
    checkedInLabel: 'เช็คอินแล้ว',
    checkedInValue: (n: number, pct: number) => `${n} (${pct}%)`,
    sleepHighLabel: 'ศักยภาพสูงที่ไม่ใช้งาน',
    sleepHighValue: (n: number) => `${n} คน`,
    studentIdHeader: 'รหัสนักเรียน',
    enclosureHeader: 'คอก',
    thisMonthHeader: 'เดือนนี้',
    lastMonthHeader: 'เดือนที่แล้ว',
    deltaHeader: '△',
    lessonHeader: 'บทเรียน',
    referralHeader: 'แนะนำ',
    tagsHeader: 'แท็ก',
  },
} as const;

type Locale = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

interface CCStudentDrilldownProps {
  ccName: string;
}

interface SummaryStatProps {
  label: string;
  value: string | number;
}

function SummaryStat({ label, value }: SummaryStatProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </span>
  );
}

interface DeltaCellProps {
  delta: number;
}

function DeltaCell({ delta }: DeltaCellProps) {
  const color =
    delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-red-600' : 'text-[var(--text-muted)]';
  return (
    <td className={`slide-td text-center tabular-nums font-semibold ${color}`}>
      {delta > 0 ? `+${delta}` : delta}
    </td>
  );
}

/**
 * CC 学员明细展开面板
 *
 * 按 CC 姓名筛选学员数据，展示摘要行 + 紧凑表格。
 * 最大高度 400px 内滚动。
 *
 * 使用示例：
 *   <CCStudentDrilldown ccName="小明" />
 */
export function CCStudentDrilldown({ ccName }: CCStudentDrilldownProps) {
  const t = useT();
  const { data, error, isLoading } = useStudentAnalysis({ cc: ccName });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-[var(--text-muted)]">
        {t.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-red-600">
        {t.loadFailed}
      </div>
    );
  }

  const students: StudentRow[] = data?.top_students ?? [];

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-[var(--text-muted)]">
        {t.noData}
      </div>
    );
  }

  // 计算摘要指标
  const total = students.length;
  const checkedIn = students.filter((s) => s.days_this_month > 0).length;
  const checkedInPct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
  const sleepHighPotential = students.filter((s) => s.tags.includes('沉睡高潜')).length;

  // 按本月打卡降序排列
  const sorted = [...students].sort((a, b) => b.days_this_month - a.days_this_month);

  return (
    <div className="border-t border-[var(--border-default)] bg-[var(--bg-subtle)]">
      {/* 摘要行 */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border-default)]">
        <SummaryStat label={t.totalLabel} value={t.totalUnit(total)} />
        <span className="text-[var(--border-default)]">·</span>
        <SummaryStat label={t.checkedInLabel} value={t.checkedInValue(checkedIn, checkedInPct)} />
        <span className="text-[var(--border-default)]">·</span>
        <SummaryStat label={t.sleepHighLabel} value={t.sleepHighValue(sleepHighPotential)} />
      </div>

      {/* 紧凑表格，最大高度 400px */}
      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="slide-thead-row">
              <th className="slide-th slide-th-left">{t.studentIdHeader}</th>
              <th className="slide-th slide-th-center">{t.enclosureHeader}</th>
              <th className="slide-th slide-th-center">{t.thisMonthHeader}</th>
              <th className="slide-th slide-th-center">{t.lastMonthHeader}</th>
              <th className="slide-th slide-th-center">{t.deltaHeader}</th>
              <th className="slide-th slide-th-center">{t.lessonHeader}</th>
              <th className="slide-th slide-th-center">{t.referralHeader}</th>
              <th className="slide-th slide-th-left">{t.tagsHeader}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr
                key={row.student_id}
                className={idx % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
              >
                <td className="slide-td font-mono text-[var(--text-primary)]">{row.student_id}</td>
                <td className="slide-td text-center text-[var(--text-secondary)]">
                  {fmtEnc(row.enclosure)}
                </td>
                <td className="slide-td text-center font-semibold tabular-nums text-[var(--text-primary)]">
                  {row.days_this_month}
                </td>
                <td className="slide-td text-center tabular-nums text-[var(--text-secondary)]">
                  {row.days_last_month}
                </td>
                <DeltaCell delta={row.delta} />
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
