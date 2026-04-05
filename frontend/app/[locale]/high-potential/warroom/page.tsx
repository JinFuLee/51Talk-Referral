'use client';

import { useTranslations } from 'next-intl';
import { Fragment, useState } from 'react';
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
    red: 'bg-danger-surface text-danger-token',
    yellow: 'bg-warning-surface text-warning-token',
    green: 'bg-success-surface text-success-token',
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
  usePageDimensions({ country: true, enclosure: true, team: true });
  const t = useTranslations('highPotentialPage');

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
    red: t('urgentRed'),
    yellow: t('urgentYellow'),
    green: t('urgentGreen'),
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t('loadError')} description={t('loadErrorDesc')} />;
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="text-sm text-secondary-token mt-0.5">
            {t('pageSubtitle', { count: allStudents.length })}
          </p>
        </div>
        {redCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-surface border border-danger-token">
            <AlertTriangle className="w-4 h-4 text-danger-token" />
            <span className="text-sm font-semibold text-danger-token">{t('todayUrgent')}</span>
            <Badge className="bg-danger-token text-white text-xs px-1.5 py-0 ml-0.5">
              {redCount}
            </Badge>
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
      <div className="bg-surface rounded-xl border border-default-token shadow-[var(--shadow-subtle)]">
        <div className="px-3 py-2 border-b border-default-token flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-token">
            {t('studentList')}
            {urgencyFilter && (
              <span className="ml-2 text-xs font-normal text-muted-token">
                {t('filteredLabel', { label: urgencyLabels[urgencyFilter] })}
              </span>
            )}
          </h3>
          {isLoading && <Spinner size="sm" />}
        </div>

        {students.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t('emptyTitle')}
              description={urgencyFilter ? t('emptyFiltered') : t('emptyNoFilter')}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('colStudentId')}</TableHead>
                <TableHead className="text-xs">{t('colCC')}</TableHead>
                <TableHead className="text-xs">{t('colSS')}</TableHead>
                <TableHead className="text-xs">{t('colLP')}</TableHead>
                <TableHead className="text-xs text-center">{t('colNew')}</TableHead>
                <TableHead className="text-xs text-center">{t('colAttendance')}</TableHead>
                <TableHead className="text-xs text-center">{t('colPayments')}</TableHead>
                <TableHead className="text-xs text-center">{t('colDaysLeft')}</TableHead>
                <TableHead className="text-xs">{t('colLastContact')}</TableHead>
                <TableHead className="text-xs text-center">{t('colCheckin7d')}</TableHead>
                <TableHead className="text-xs text-center">{t('colUrgency')}</TableHead>
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
                        idx % 2 === 0 ? 'bg-surface' : 'bg-subtle',
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
                      <TableCell className="text-xs text-muted-token">
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
