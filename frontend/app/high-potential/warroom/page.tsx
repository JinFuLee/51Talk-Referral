'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
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

const URGENCY_COLORS: Record<string, string> = {
  red: '#ef4444',
  yellow: '#f59e0b',
  green: '#22c55e',
};

const URGENCY_LABELS: Record<string, string> = {
  red: '紧急',
  yellow: '关注',
  green: '正常',
};

function UrgencyBadge({ level }: { level: 'red' | 'yellow' | 'green' }) {
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
      {URGENCY_LABELS[level]}
    </span>
  );
}

export default function WarroomPage() {
  const [urgencyFilter, setUrgencyFilter] = useState<'red' | 'yellow' | 'green' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const url = urgencyFilter
    ? `/api/high-potential/warroom?urgency=${urgencyFilter}`
    : '/api/high-potential/warroom';

  const { data, isLoading, error } = useSWR<WarroomStudent[]>(url, swrFetcher);

  const allStudentsUrl = '/api/high-potential/warroom';
  const { data: allData } = useSWR<WarroomStudent[]>(allStudentsUrl, swrFetcher);

  const students: WarroomStudent[] = Array.isArray(data) ? data : [];
  const allStudents: WarroomStudent[] = Array.isArray(allData) ? allData : [];

  const redCount = allStudents.filter((s) => s.urgency_level === 'red').length;

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="数据加载失败" description="无法获取作战室数据，请检查后端服务" />;
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">高潜学员作战室</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            实时跟进高潜学员触达状态 · 共 {allStudents.length} 人
          </p>
        </div>
        {redCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">今日紧急</span>
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
            学员列表
            {urgencyFilter && (
              <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                （已筛选：{URGENCY_LABELS[urgencyFilter]}）
              </span>
            )}
          </h3>
          {isLoading && <Spinner size="sm" />}
        </div>

        {students.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="暂无学员数据"
              description={urgencyFilter ? '当前筛选条件下无学员' : '上传数据后自动识别高潜学员'}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">学员ID</TableHead>
                <TableHead className="text-xs">CC</TableHead>
                <TableHead className="text-xs">SS</TableHead>
                <TableHead className="text-xs">LP</TableHead>
                <TableHead className="text-xs text-center">带新</TableHead>
                <TableHead className="text-xs text-center">出席</TableHead>
                <TableHead className="text-xs text-center">付费</TableHead>
                <TableHead className="text-xs text-center">剩余天</TableHead>
                <TableHead className="text-xs">最后接通</TableHead>
                <TableHead className="text-xs text-center">7日打卡</TableHead>
                <TableHead className="text-xs text-center">紧急度</TableHead>
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
                        <UrgencyBadge level={s.urgency_level} />
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
