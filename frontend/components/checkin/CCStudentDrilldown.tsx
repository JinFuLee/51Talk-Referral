'use client';

// CC 学员明细展开面板 — 懒加载，用于 TeamDetailTab 中 CC 行点击展开

import { useTranslations } from 'next-intl';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { StudentTagBadge } from './StudentTagBadge';
import { fmtEnc } from '@/lib/utils';
import type { StudentRow } from '@/lib/types/checkin-student';
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
      <span className="text-muted-token">{label}</span>
      <span className="font-semibold text-primary-token">{value}</span>
    </span>
  );
}

interface DeltaCellProps {
  delta: number;
}

function DeltaCell({ delta }: DeltaCellProps) {
  const color =
    delta > 0 ? 'text-success-token' : delta < 0 ? 'text-danger-token' : 'text-muted-token';
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
 * <CCStudentDrilldown ccName="小明" />
 */
export function CCStudentDrilldown({ ccName }: CCStudentDrilldownProps) {
  const t = useTranslations('CCStudentDrilldown');
  const { data, error, isLoading } = useStudentAnalysis({ cc: ccName });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-muted-token">
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-danger-token">
        {t('loadFailed')}
      </div>
    );
  }

  const students: StudentRow[] = data?.top_students ?? [];

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-muted-token">
        {t('noData')}
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
    <div className="border-t border-default-token bg-subtle">
      {/* 摘要行 */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-default-token">
        <SummaryStat label={t('totalLabel')} value={t('totalUnit', { n: total })} />
        <span className="text-secondary-token">·</span>
        <SummaryStat label={t('checkedInLabel')} value={t('checkedInValue', { n: checkedIn, checkedInPct })} />
        <span className="text-secondary-token">·</span>
        <SummaryStat label={t('sleepHighLabel')} value={t('sleepHighValue', { n: sleepHighPotential })} />
      </div>

      {/* 紧凑表格，最大高度 400px */}
      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="slide-thead-row">
              <th className="slide-th slide-th-left">{t('studentIdHeader')}</th>
              <th className="slide-th slide-th-center">{t('enclosureHeader')}</th>
              <th className="slide-th slide-th-center">{t('thisMonthHeader')}</th>
              <th className="slide-th slide-th-center">{t('lastMonthHeader')}</th>
              <th className="slide-th slide-th-center">{t('deltaHeader')}</th>
              <th className="slide-th slide-th-center">{t('lessonHeader')}</th>
              <th className="slide-th slide-th-center">{t('referralHeader')}</th>
              <th className="slide-th slide-th-left">{t('tagsHeader')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr
                key={row.student_id}
                className={idx % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
              >
                <td className="slide-td font-mono text-primary-token">{row.student_id}</td>
                <td className="slide-td text-center text-secondary-token">
                  {fmtEnc(row.enclosure)}
                </td>
                <td className="slide-td text-center font-semibold tabular-nums text-primary-token">
                  {row.days_this_month}
                </td>
                <td className="slide-td text-center tabular-nums text-secondary-token">
                  {row.days_last_month}
                </td>
                <DeltaCell delta={row.delta} />
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
