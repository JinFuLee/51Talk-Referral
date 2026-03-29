'use client';

import { Fragment, useState } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { UrgencyCards } from '@/components/warroom/UrgencyCards';
import { ContactTimeline } from '@/components/warroom/ContactTimeline';
import { HPFunnel } from '@/components/warroom/HPFunnel';
import type { WarroomStudent } from '@/lib/types/cross-analysis';
import { AlertTriangle } from 'lucide-react';

// ── I18N ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    pageTitle: '高潜学员作战室',
    pageSubtitle: (count: number) => `实时跟进高潜学员触达状态 · 共 ${count} 人`,
    todayUrgent: '今日紧急',
    studentList: '学员列表',
    filteredLabel: (label: string) => `（已筛选：${label}）`,
    emptyTitle: '暂无学员数据',
    emptyNoFilter: '上传数据后自动识别高潜学员',
    emptyFiltered: '当前筛选条件下无学员',
    loadError: '数据加载失败',
    loadErrorDesc: '无法获取作战室数据，请检查后端服务',
    colStudentId: '学员ID',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colNew: '带新',
    colAttendance: '出席',
    colPayments: '付费',
    colDaysLeft: '剩余天',
    colLastContact: '最后接通',
    colCheckin7d: '7日打卡',
    colUrgency: '紧急度',
    urgentRed: '紧急',
    urgentYellow: '关注',
    urgentGreen: '正常',
  },
  'zh-TW': {
    pageTitle: '高潛學員作戰室',
    pageSubtitle: (count: number) => `即時跟進高潛學員觸達狀態 · 共 ${count} 人`,
    todayUrgent: '今日緊急',
    studentList: '學員列表',
    filteredLabel: (label: string) => `（已篩選：${label}）`,
    emptyTitle: '暫無學員資料',
    emptyNoFilter: '上傳資料後自動識別高潛學員',
    emptyFiltered: '當前篩選條件下無學員',
    loadError: '資料載入失敗',
    loadErrorDesc: '無法獲取作戰室資料，請檢查後端服務',
    colStudentId: '學員ID',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colNew: '帶新',
    colAttendance: '出席',
    colPayments: '付費',
    colDaysLeft: '剩餘天',
    colLastContact: '最後接通',
    colCheckin7d: '7日打卡',
    colUrgency: '緊急度',
    urgentRed: '緊急',
    urgentYellow: '關注',
    urgentGreen: '正常',
  },
  en: {
    pageTitle: 'High-Potential War Room',
    pageSubtitle: (count: number) =>
      `Real-time tracking of high-potential students · ${count} total`,
    todayUrgent: "Today's Urgent",
    studentList: 'Student List',
    filteredLabel: (label: string) => ` (Filtered: ${label})`,
    emptyTitle: 'No student data',
    emptyNoFilter: 'High-potential students will be identified automatically after data upload',
    emptyFiltered: 'No students match current filter',
    loadError: 'Failed to load data',
    loadErrorDesc: 'Unable to fetch war room data, please check the backend service',
    colStudentId: 'Student ID',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colNew: 'New',
    colAttendance: 'Attend.',
    colPayments: 'Payments',
    colDaysLeft: 'Days Left',
    colLastContact: 'Last Contact',
    colCheckin7d: '7d Check-in',
    colUrgency: 'Urgency',
    urgentRed: 'Urgent',
    urgentYellow: 'Watch',
    urgentGreen: 'Normal',
  },
  th: {
    pageTitle: 'ห้องปฏิบัติการนักเรียนศักยภาพสูง',
    pageSubtitle: (count: number) => `ติดตามสถานะการติดต่อแบบเรียลไทม์ · รวม ${count} คน`,
    todayUrgent: 'เร่งด่วนวันนี้',
    studentList: 'รายชื่อนักเรียน',
    filteredLabel: (label: string) => ` (กรอง: ${label})`,
    emptyTitle: 'ไม่มีข้อมูลนักเรียน',
    emptyNoFilter: 'นักเรียนศักยภาพสูงจะถูกระบุอัตโนมัติหลังอัปโหลดข้อมูล',
    emptyFiltered: 'ไม่มีนักเรียนตรงกับเงื่อนไขที่เลือก',
    loadError: 'โหลดข้อมูลล้มเหลว',
    loadErrorDesc: 'ไม่สามารถดึงข้อมูลห้องปฏิบัติการได้ กรุณาตรวจสอบบริการแบ็กเอนด์',
    colStudentId: 'รหัสนักเรียน',
    colCC: 'CC',
    colSS: 'SS',
    colLP: 'LP',
    colNew: 'ใหม่',
    colAttendance: 'เข้าร่วม',
    colPayments: 'ชำระ',
    colDaysLeft: 'วันที่เหลือ',
    colLastContact: 'ติดต่อล่าสุด',
    colCheckin7d: 'เช็คอิน 7 วัน',
    colUrgency: 'ความเร่งด่วน',
    urgentRed: 'เร่งด่วน',
    urgentYellow: 'ติดตาม',
    urgentGreen: 'ปกติ',
  },
};

// ── UrgencyBadge ──────────────────────────────────────────────────────────────

const URGENCY_COLORS: Record<string, string> = {
  red: '#ef4444',
  yellow: '#f59e0b',
  green: '#22c55e',
};

function UrgencyBadge({
  level,
  labels,
}: {
  level: 'red' | 'yellow' | 'green';
  labels: { red: string; yellow: string; green: string };
}) {
  const bg: Record<string, string> = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${bg[level]}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: URGENCY_COLORS[level] }}
      />
      {labels[level]}
    </span>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function WarroomPage() {
  usePageDimensions({ country: true, enclosure: true, team: true, behavior: true });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const [urgencyFilter, setUrgencyFilter] = useState<'red' | 'yellow' | 'green' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const url = urgencyFilter
    ? `/api/high-potential/warroom?urgency=${urgencyFilter}`
    : '/api/high-potential/warroom';

  const { data, isLoading, error } = useFilteredSWR<WarroomStudent[]>(url);

  const allStudentsUrl = '/api/high-potential/warroom';
  const { data: allData } = useFilteredSWR<WarroomStudent[]>(allStudentsUrl);

  const students: WarroomStudent[] = Array.isArray(data) ? data : [];
  const allStudents: WarroomStudent[] = Array.isArray(allData) ? allData : [];

  const redCount = allStudents.filter((s) => s.urgency_level === 'red').length;

  const urgencyLabels = {
    red: t.urgentRed,
    yellow: t.urgentYellow,
    green: t.urgentGreen,
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t.loadError} description={t.loadErrorDesc} />;
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {t.pageSubtitle(allStudents.length)}
          </p>
        </div>
        {redCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
            <AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              {t.todayUrgent}
            </span>
            <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 ml-0.5">{redCount}</Badge>
          </div>
        )}
      </div>

      {/* 紧急度卡片 */}
      <UrgencyCards
        students={allStudents}
        activeFilter={urgencyFilter}
        onFilterChange={setUrgencyFilter}
      />

      {/* 漏斗 */}
      <HPFunnel students={allStudents} />

      {/* 学员表格 */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-subtle)]">
        <div className="px-3 py-2 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t.studentList}
            {urgencyFilter && (
              <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                {t.filteredLabel(urgencyLabels[urgencyFilter])}
              </span>
            )}
          </h3>
          {isLoading && <Spinner size="sm" />}
        </div>

        {students.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t.emptyTitle}
              description={urgencyFilter ? t.emptyFiltered : t.emptyNoFilter}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t.colStudentId}</TableHead>
                <TableHead className="text-xs">{t.colCC}</TableHead>
                <TableHead className="text-xs">{t.colSS}</TableHead>
                <TableHead className="text-xs">{t.colLP}</TableHead>
                <TableHead className="text-xs text-center">{t.colNew}</TableHead>
                <TableHead className="text-xs text-center">{t.colAttendance}</TableHead>
                <TableHead className="text-xs text-center">{t.colPayments}</TableHead>
                <TableHead className="text-xs text-center">{t.colDaysLeft}</TableHead>
                <TableHead className="text-xs">{t.colLastContact}</TableHead>
                <TableHead className="text-xs text-center">{t.colCheckin7d}</TableHead>
                <TableHead className="text-xs text-center">{t.colUrgency}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, idx) => {
                const isExpanded = expandedId === s.stdt_id;
                const isUrgentDays = s.days_remaining < 7;
                return (
                  <Fragment key={s.stdt_id}>
                    <TableRow
                      className={[
                        'cursor-pointer transition-colors',
                        idx % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-subtle)]',
                        isExpanded ? 'bg-action-accent-surface dark:bg-action-accent/10' : '',
                      ].join(' ')}
                      onClick={() => setExpandedId(isExpanded ? null : s.stdt_id)}
                    >
                      <TableCell className="text-xs font-mono">{s.stdt_id}</TableCell>
                      <TableCell className="text-xs">{s.cc_name || '—'}</TableCell>
                      <TableCell className="text-xs">{s.ss_name || '—'}</TableCell>
                      <TableCell className="text-xs">{s.lp_name || '—'}</TableCell>
                      <TableCell className="text-xs text-center font-semibold">
                        {s.total_new}
                      </TableCell>
                      <TableCell className="text-xs text-center">{s.attendance}</TableCell>
                      <TableCell className="text-xs text-center">{s.payments}</TableCell>
                      <TableCell
                        className={`text-xs text-center font-${isUrgentDays ? 'bold' : 'normal'}`}
                        style={isUrgentDays ? { color: '#ef4444' } : undefined}
                      >
                        {s.days_remaining}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-muted)]">
                        {s.last_contact_date ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-center">{s.checkin_7d}</TableCell>
                      <TableCell>
                        <UrgencyBadge level={s.urgency_level} labels={urgencyLabels} />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${s.stdt_id}-expand`}>
                        <TableCell colSpan={11} className="p-0 border-0">
                          <div className="px-4 pb-3">
                            <ContactTimeline stdtId={s.stdt_id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
