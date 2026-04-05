'use client';

import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { useConfigStore } from '@/lib/stores/config-store';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatMiniCard } from '@/components/ui/StatMiniCard';
import { EnclosureParticipationChart } from '@/components/checkin/EnclosureParticipationChart';
import { cn, formatRate, fmtEnc } from '@/lib/utils';
// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface CheckinTeamRow {
  team: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface CheckinEnclosureRow {
  enclosure: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface CheckinRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

interface CheckinSummaryResponse {
  by_role: Record<string, CheckinRoleSummary>;
}

interface CheckinChannelSummary {
  channel: string;
  total_students: number;
  total_checkin: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

// ── 单个渠道列 ────────────────────────────────────────────────────────────────

interface ChannelColumnProps {
  ch: CheckinChannelSummary;
  rateColor: (rate: number) => string;
  rateBg: (rate: number) => string;
  isSelected?: boolean;
  t: (key: string, params?: any) => string;
}

function ChannelColumn({ ch, rateColor, rateBg, isSelected, t }: ChannelColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 min-w-0',
        isSelected ? 'ring-2 ring-action-opt rounded-lg' : ''
      )}
    >
      {/* 渠道标题 */}
      <div className="bg-n-800 text-white text-xs font-semibold px-2 py-1.5 rounded-t-md">
        {ch.channel}
        {isSelected && <span className="ml-1.5 opacity-70 text-[10px]">▶ {t('currentRole')}</span>}
      </div>

      {/* 零数据提示 */}
      {ch.total_students === 0 && ch.channel !== 'CC' && (
        <div className="bg-warning-surface border border-warning-token rounded-md px-3 py-2.5 text-xs text-warning-token">
          {t('zeroDataHint')}
        </div>
      )}

      {/* 总体大数字 */}
      <div className="bg-surface border border-default-token rounded-md px-3 py-2.5 space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-primary-token">{ch.total_checkin}</span>
          <span className="text-xs text-muted-token">{t('personCount', { n: ch.total_students })}</span>
        </div>
        <div
          className={cn(
            'inline-block text-sm font-semibold px-1.5 py-0.5 rounded',
            rateBg(ch.checkin_rate ?? 0)
          )}
        >
          {formatRate(ch.checkin_rate ?? 0)}
        </div>
        <div className="text-[10px] text-muted-token">{t('checkedStudentsDesc')}</div>
        <div className="text-[10px] text-muted-token opacity-75">{t('colorHint')}</div>
      </div>

      {/* 按团队 */}
      <div className="bg-surface border border-default-token rounded-md overflow-hidden">
        <div className="bg-n-800 text-white text-[10px] font-semibold px-2 py-1 grid grid-cols-4 gap-1">
          <span className="col-span-2">{t('teamHeader')}</span>
          <span className="text-right">{t('studentHeader')}</span>
          <span className="text-right">{t('checkinRateHeader')}</span>
        </div>
        {(ch.by_team ?? []).length === 0 ? (
          <div className="text-[10px] text-muted-token px-2 py-2">{t('noTeamData')}</div>
        ) : (
          (ch.by_team ?? []).map((row, i) => (
            <div
              key={row.team}
              className={cn(
                'grid grid-cols-4 gap-1 px-2 py-1 text-xs',
                i % 2 === 0 ? 'bg-subtle' : 'bg-surface'
              )}
            >
              <span className="col-span-2 truncate text-secondary-token" title={row.team}>
                {row.team}
              </span>
              <span className="text-right text-primary-token">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor?.(row.rate) ?? '')}>
                {formatRate(row.rate)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 按围场 */}
      <div className="bg-surface border border-default-token rounded-md overflow-hidden">
        <div className="bg-n-800 text-white text-[10px] font-semibold px-2 py-1 grid grid-cols-4 gap-1">
          <span className="col-span-2">{t('enclosureHeader')}</span>
          <span className="text-right">{t('studentHeader')}</span>
          <span className="text-right">{t('checkinRateHeader')}</span>
        </div>
        {(ch.by_enclosure ?? []).length === 0 ? (
          <div className="text-[10px] text-muted-token px-2 py-2">{t('noEnclosureData')}</div>
        ) : (
          (ch.by_enclosure ?? []).map((row, i) => (
            <div
              key={row.enclosure}
              className={cn(
                'grid grid-cols-4 gap-1 px-2 py-1 text-xs',
                i % 2 === 0 ? 'bg-subtle' : 'bg-surface'
              )}
            >
              <span className="col-span-2 text-secondary-token">{fmtEnc(row.enclosure)}</span>
              <span className="text-right text-primary-token">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor?.(row.rate) ?? '')}>
                {formatRate(row.rate)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 主组件：SummaryTab（概览）─────────────────────────────────────────────────

interface SummaryTabProps {
  enclosureFilter?: string | null;
  roleFilter?: string;
}

export default function SummaryTab({ enclosureFilter, roleFilter }: SummaryTabProps) {
    const t = useTranslations('SummaryTab');
  const { configJson } = useWideConfig();
  const { rateColor, rateBg } = useCheckinThresholds();
  const dataRole = useConfigStore((s) => s.dataRole);

  const summaryUrl = `/api/checkin/summary?role_config=${encodeURIComponent(configJson)}${
    enclosureFilter ? `&enclosure=${encodeURIComponent(enclosureFilter)}` : ''
  }`;
  const { data, isLoading, error, mutate } = useFilteredSWR<CheckinSummaryResponse>(summaryUrl);

  // KPI 卡片数据（来自学员分析）
  const { data: studentData } = useStudentAnalysis(
    enclosureFilter ? { enclosure: enclosureFilter } : undefined
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t('loadFailed')}
        description={t('loadFailedDesc')}
        action={{ label: t('retry'), onClick: () => mutate() }}
      />
    );
  }

  const byRole = data?.by_role ?? {};

  // dataRole 映射：全部 → CC+SS+LP+运营，单选 → 只显示对应角色面板
  const _ROLE_MAP: Record<string, string[]> = {
    all: ['CC', 'SS', 'LP', '运营'],
    cc: ['CC'],
    ss: ['SS'],
    lp: ['LP'],
    ops: ['运营'],
  };
  const visibleRoles = _ROLE_MAP[dataRole] ?? _ROLE_MAP.all;

  const channels: CheckinChannelSummary[] = visibleRoles.map((role) => {
    const v = byRole[role];
    return {
      channel: role,
      total_students: v?.total_students ?? 0,
      total_checkin: v?.checked_in ?? 0,
      checkin_rate: v?.checkin_rate ?? 0,
      by_team: v?.by_team ?? [],
      by_enclosure: v?.by_enclosure ?? [],
    };
  });

  if (channels.length === 0) {
    return <EmptyState title={t('noData')} description={t('noDataDesc')} />;
  }

  const mc = studentData?.month_comparison;

  return (
    <div className="space-y-8">
      {/* 角色汇总 grid（选中角色高亮 ring） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {channels.map((ch) => (
          <ChannelColumn
            key={ch.channel}
            ch={ch}
            rateColor={rateColor}
            rateBg={rateBg}
            isSelected={dataRole !== 'all' || ch.channel === (roleFilter || 'CC')}
            t={t}
          />
        ))}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-n-200" />

      {/* KPI 卡片行（来自 student-analysis） */}
      {mc && (
        <div>
          <h3 className="text-sm font-semibold text-secondary-token uppercase tracking-wider mb-3">
            {t('monthlyKpi')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMiniCard
              label={t('participationRate')}
              value={
                mc.participation_rate_this != null
                  ? `${(mc.participation_rate_this * 100).toFixed(1)}%`
                  : '—'
              }
              sub={
                mc.participation_rate_last != null
                  ? `${t('lastMonthPrefix')} ${(mc.participation_rate_last * 100).toFixed(1)}%`
                  : `${t('lastMonthPrefix')} —`
              }
              accent={
                mc.participation_rate_this > mc.participation_rate_last
                  ? 'green'
                  : mc.participation_rate_this < mc.participation_rate_last
                    ? 'red'
                    : 'slate'
              }
              subtitle={t('participationSubtitle')}
            />
            <StatMiniCard
              label={t('avgCheckinDays')}
              value={(mc.avg_days_this ?? 0).toFixed(2)}
              sub={t('lastMonthDays', { v: (mc.avg_days_last ?? 0).toFixed(2) })}
              accent={
                (mc.avg_days_this ?? 0) > (mc.avg_days_last ?? 0)
                  ? 'green'
                  : (mc.avg_days_this ?? 0) < (mc.avg_days_last ?? 0)
                    ? 'red'
                    : 'slate'
              }
              subtitle={t('avgDaysSubtitle')}
            />
            <StatMiniCard
              label={t('zeroCheckin')}
              value={(mc.zero_this ?? 0).toLocaleString()}
              sub={t('lastMonthPeople', { n: (mc.zero_last ?? 0).toLocaleString() })}
              accent={(mc.zero_this ?? 0) > (mc.zero_last ?? 0) ? 'red' : 'green'}
              subtitle={t('zeroSubtitle')}
            />
            <StatMiniCard
              label={t('superfan')}
              value={(mc.superfan_this ?? 0).toLocaleString()}
              sub={t('lastMonthPeople', { n: (mc.superfan_last ?? 0).toLocaleString() })}
              accent={mc.superfan_this >= mc.superfan_last ? 'green' : 'red'}
              subtitle={t('superfanSubtitle')}
            />
          </div>
        </div>
      )}

      {/* 围场参与率柱图 */}
      {studentData?.by_enclosure && studentData.by_enclosure.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary-token uppercase tracking-wider mb-3">
            {t('enclosureCheckinRate')}
          </h3>
          <div className="card-base p-5">
            <p className="text-xs text-muted-token mb-3">{t('enclosureChartDesc')}</p>
            <EnclosureParticipationChart data={studentData.by_enclosure} />
          </div>
        </div>
      )}
    </div>
  );
}
