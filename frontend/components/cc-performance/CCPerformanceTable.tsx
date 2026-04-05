'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { formatRevenue, formatRate, metricColor } from '@/lib/utils';
import { useExport } from '@/lib/use-export';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExportButton } from '@/components/ui/ExportButton';
import type { CCPerformanceRecord, CCPerformanceTeamSummary } from '@/lib/types/cc-performance';
import { CCPerformanceDetail } from './CCPerformanceDetail';
type Locale = 'zh' | 'zh-TW' | 'en' | 'th';
// ── 视图模式 ─────────────────────────────────────────────
export type ViewMode = 'target' | 'bm';

// ── 列组定义 ──────────────────────────────────────────────

type ColGroupKey =
  | 'identity'
  | 'revenue'
  | 'referral'
  | 'funnel'
  | 'conversion'
  | 'process'
  | 'outreach'
  | 'pace';

interface ColGroup {
  key: ColGroupKey;
  labelKey: string;
  defaultVisible: boolean;
}

const COL_GROUPS: ColGroup[] = [
  { key: 'identity', labelKey: 'basicInfo', defaultVisible: true },
  { key: 'revenue', labelKey: 'performance', defaultVisible: true },
  { key: 'funnel', labelKey: 'funnel', defaultVisible: true },
  { key: 'conversion', labelKey: 'conversionRate', defaultVisible: true },
  { key: 'process', labelKey: 'processMetrics', defaultVisible: true },
  { key: 'outreach', labelKey: 'outreachCoverage', defaultVisible: false },
  { key: 'pace', labelKey: 'pace', defaultVisible: false },
];

// ── 达成率色彩 ──────────────────────────────────────────

function achievementTextClass(pct: number | null): string {
  if (pct == null) return 'text-muted-token';
  if (pct >= 1) return 'text-success-token font-semibold';
  if (pct >= 0.8) return 'text-warning-token';
  return 'text-danger-token';
}

// ── 排名徽章 ────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-warning-surface text-warning-token'
      : rank === 2
        ? 'bg-subtle text-secondary-token'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-muted-token';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

// ── 进度差额显示 ─────────────────────────────────────────

function GapCell({ gap }: { gap: number | null }) {
  if (gap == null) return <span className="text-muted-token">—</span>;
  const isPos = gap >= 0;
  return (
    <span className={isPos ? 'text-success-token font-semibold' : 'text-danger-token'}>
      {isPos ? '+' : ''}
      {gap.toLocaleString()}
    </span>
  );
}

/** 通用金额 gap 单元格（正绿负红，绝对值 < 100 显示 $0） */
function AmtGapCell({ gap }: { gap: number | null }) {
  if (gap == null || gap === 0) return <span className="text-muted-token">—</span>;
  const absVal = Math.abs(gap);
  const display = absVal < 100 ? '$0' : `$${Math.round(absVal).toLocaleString()}`;
  return (
    <span className={gap > 0 ? 'text-success-token font-semibold' : 'text-danger-token'}>
      {gap > 0 ? '+' : '-'}
      {display}
    </span>
  );
}

/** 通用整数 gap 单元格（正绿负红） */
function CountGapCell({ gap }: { gap: number | null }) {
  if (gap == null || gap === 0) return <span className="text-muted-token">—</span>;
  return (
    <span className={gap > 0 ? 'text-success-token font-semibold' : 'text-danger-token'}>
      {gap > 0 ? '+' : ''}
      {Math.round(gap).toLocaleString()}
    </span>
  );
}

// ── pickMetric：根据 viewMode 选择指标字段 ────────────────
interface PickedMetric {
  reference: number | null | undefined;
  gap: number | null | undefined;
  pct: number | null | undefined;
}

function pickMetric(
  m:
    | {
        target?: number | null;
        gap?: number | null;
        achievement_pct?: number | null;
        bm_expected?: number | null;
        bm_gap?: number | null;
        bm_pct?: number | null;
      }
    | null
    | undefined,
  mode: ViewMode
): PickedMetric {
  if (!m) return { reference: null, gap: null, pct: null };
  if (mode === 'bm') {
    return {
      reference: m.bm_expected,
      gap: m.bm_gap,
      pct: m.bm_pct,
    };
  }
  return {
    reference: m.target,
    gap: m.gap,
    pct: m.achievement_pct,
  };
}

/** pickMetric 整数版本（注册/出席/付费，无 gap 金额） */
function pickCountMetric(
  m:
    | {
        target?: number | null;
        gap?: number | null;
        bm_expected?: number | null;
        bm_gap?: number | null;
      }
    | null
    | undefined,
  mode: ViewMode
): { reference: number | null | undefined; gap: number | null | undefined } {
  if (!m) return { reference: null, gap: null };
  if (mode === 'bm') {
    return { reference: m.bm_expected, gap: m.bm_gap };
  }
  return { reference: m.target, gap: m.gap };
}

function RateGapCell({ gap }: { gap: number | null }) {
  if (gap == null) return <span className="text-muted-token">—</span>;
  const isPos = gap >= 0;
  return (
    <span className={isPos ? 'text-success-token font-semibold' : 'text-danger-token'}>
      {isPos ? '+' : ''}
      {(gap * 100).toFixed(1)}pp
    </span>
  );
}

// ── 表头按钮 ─────────────────────────────────────────────

type SortKey = string;

function SortTh({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'right',
  tooltip,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
  tooltip?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={`slide-th ${align === 'right' ? 'slide-th-right' : 'slide-th-left'} py-2 px-2 cursor-pointer select-none hover:opacity-80 whitespace-nowrap`}
      onClick={() => onSort(sortKey)}
      title={tooltip}
    >
      {label}
      {active && <span className="ml-1 text-[10px]">{currentDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

// ── 主组件 ───────────────────────────────────────────────

interface CCPerformanceTableProps {
  teams: CCPerformanceTeamSummary[];
  exchangeRate: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function CCPerformanceTable({
  teams,
  exchangeRate,
  isLoading,
  error,
  onRetry,
  viewMode,
  onViewModeChange,
}: CCPerformanceTableProps) {
  const t = useTranslations('CCPerformanceTable');

  // 列组可见性
  const [visibleGroups, setVisibleGroups] = useState<Record<ColGroupKey, boolean>>(
    () =>
      Object.fromEntries(COL_GROUPS.map((g) => [g.key, g.defaultVisible])) as Record<
        ColGroupKey,
        boolean
      >
  );

  // 排序
  const [sortKey, setSortKey] = useState<SortKey>('revenue.actual');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // 搜索 + 团队筛选
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // USD/THB 切换
  const [showTHB, setShowTHB] = useState(false);

  // 展开的行
  const [expandedCC, setExpandedCC] = useState<string | null>(null);

  const { exportCSV } = useExport();

  // 所有团队名列表
  const teamNames = useMemo(() => teams.map((item) => t('team')), [teams]);

  // 扁平化全部 CC 记录（含团队信息）
  const allRecords = useMemo(() => {
    const filtered = teamFilter === 'all' ? teams : teams.filter((tm) => tm.team === teamFilter);
    return filtered.flatMap((tm) => tm.records.map((r) => ({ ...r, _teamName: tm.team })));
  }, [teams, teamFilter]);

  // 搜索过滤
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return allRecords;
    const q = search.toLowerCase();
    return allRecords.filter(
      (r) => r.cc_name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q)
    );
  }, [allRecords, search]);

  // 排序
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const getVal = (rec: CCPerformanceRecord & { _teamName: string }, key: string): number => {
        const parts = key.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let val: any = rec;
        for (const p of parts) {
          val = val?.[p];
        }
        return val ?? 0;
      };
      const diff = getVal(a, sortKey) - getVal(b, sortKey);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [filteredRecords, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function toggleGroup(key: ColGroupKey) {
    setVisibleGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExpand(ccName: string) {
    setExpandedCC((prev) => (prev === ccName ? null : ccName));
  }

  function fmtAmt(usd: number | null | undefined) {
    if (usd == null) return '—';
    if (showTHB) {
      return `฿${Math.round(usd * exchangeRate).toLocaleString()}`;
    }
    return `$${Math.round(usd).toLocaleString()}`;
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    exportCSV(
      sortedRecords as unknown as Record<string, unknown>[],
      [
        { key: 'cc_name', label: t('exportCCName') },
        { key: 'team', label: t('exportTeam') },
        { key: 'students_count', label: t('exportStudents') },
        { key: 'revenue.actual', label: t('exportRevenue') },
        { key: 'revenue.target', label: t('exportRevenueTarget') },
        { key: 'revenue.achievement_pct', label: t('exportAchievement') },
        { key: 'leads.actual', label: t('exportLeads') },
        { key: 'paid.actual', label: t('exportPaid') },
        { key: 'participation_rate', label: t('exportParticipation') },
        { key: 'checkin_rate', label: t('exportCheckin') },
        { key: 'cc_reach_rate', label: t('exportReach') },
      ],
      `${t('exportFilename')}_${today}`
    );
  }

  // ── 三态处理 ─────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t('loadFailTitle')}
        description={t('loadFailDesc')}
        action={{ label: t('retry'), onClick: () => onRetry?.() }}
      />
    );
  }

  if (teams.length === 0 || allRecords.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />;
  }

  const show = visibleGroups;
  const sp: React.ThHTMLAttributes<HTMLTableCellElement> = {
    className:
      'slide-th slide-th-right py-2 px-2 cursor-pointer select-none hover:opacity-80 whitespace-nowrap',
  };

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base h-8 text-sm px-3 w-48 rounded-lg border border-default-token bg-surface text-primary-token placeholder:text-muted-token focus:outline-none focus:ring-2 focus:ring-accent-token focus:border-transparent transition-colors duration-150"
        />

        {/* 团队筛选 */}
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="h-8 text-sm px-3 rounded-lg border border-default-token bg-surface text-primary-token focus:outline-none focus:ring-2 focus:ring-accent-token transition-colors duration-150"
        >
          <option value="all">{t('allTeams')}</option>
          {teamNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {/* USD / THB 切换 */}
        <div className="flex items-center rounded-lg border border-default-token overflow-hidden text-xs">
          <button
            onClick={() => setShowTHB(false)}
            className={`px-3 py-1.5 transition-colors duration-150 ${!showTHB ? 'bg-accent-token text-white font-semibold' : 'bg-surface text-secondary-token hover:bg-subtle'}`}
          >
            USD
          </button>
          <button
            onClick={() => setShowTHB(true)}
            className={`px-3 py-1.5 transition-colors duration-150 ${showTHB ? 'bg-accent-token text-white font-semibold' : 'bg-surface text-secondary-token hover:bg-subtle'}`}
          >
            THB
          </button>
        </div>

        {/* 达标 / BM 参照系切换 */}
        <div
          className="flex items-center rounded-lg border border-default-token overflow-hidden text-xs"
          title={t('viewModeTooltip')}
        >
          <button
            onClick={() => onViewModeChange('target')}
            className={`px-3 py-1.5 transition-colors duration-150 ${viewMode === 'target' ? 'bg-accent-token text-white font-semibold' : 'bg-surface text-secondary-token hover:bg-subtle'}`}
          >
            {t('targetMode')}
          </button>
          <button
            onClick={() => onViewModeChange('bm')}
            className={`px-3 py-1.5 transition-colors duration-150 ${viewMode === 'bm' ? 'bg-accent-token text-white font-semibold' : 'bg-surface text-secondary-token hover:bg-subtle'}`}
          >
            {t('bmMode')}
          </button>
        </div>

        {/* 列组开关 */}
        <div className="flex flex-wrap items-center gap-1 ml-auto">
          {COL_GROUPS.filter((g) => g.key !== 'identity').map((g) => (
            <button
              key={g.key}
              onClick={() => toggleGroup(g.key)}
              className={`px-2 py-1 rounded text-xs transition-colors duration-150 border ${
                visibleGroups[g.key]
                  ? 'bg-accent-token text-white border-accent-token'
                  : 'bg-surface text-muted-token border-default-token hover:border-accent-token'
              }`}
            >
              {t(g.labelKey)}
            </button>
          ))}
        </div>

        {/* 导出 */}
        <ExportButton onExportCsv={handleExport} />
      </div>

      {/* 结果计数 */}
      <p className="text-xs text-muted-token">
        {t('total')} {sortedRecords.length} {t('ccUnit')}
        {search && ` · ${t('searching')}${search}${t('searchingEnd')}`}
        {teamFilter !== 'all' && ` · ${teamFilter}`}
      </p>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-default-token">
        <table className="w-full text-xs">
          <thead>
            <tr className="slide-thead-row">
              {/* 排名 */}
              <th className="slide-th slide-th-center py-2 px-2 w-8">{t('ranking')}</th>

              {/* identity */}
              {show.identity && (
                <>
                  <SortTh
                    label={t('ccName')}
                    sortKey="cc_name"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortTh
                    label={t('team')}
                    sortKey="team"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortTh
                    label={t('students')}
                    sortKey="students_count"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('studentsTooltip')}
                  />
                </>
              )}

              {/* revenue */}
              {show.revenue && (
                <>
                  <SortTh
                    label={viewMode === 'bm' ? t('bmExpected') : t('performanceTarget')}
                    sortKey={viewMode === 'bm' ? 'revenue.bm_expected' : 'revenue.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={viewMode === 'bm' ? t('bmExpectedTooltip') : undefined}
                  />
                  <SortTh
                    label={t('actualPerformance')}
                    sortKey="revenue.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t('vsBMTooltip') : t('targetGapTooltip')}>
                    {viewMode === 'bm' ? t('vsBM') : t('gap')}
                  </th>
                  <SortTh
                    label={viewMode === 'bm' ? t('bmAchievement') : t('achievement')}
                    sortKey={viewMode === 'bm' ? 'revenue.bm_pct' : 'revenue.achievement_pct'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                </>
              )}

              {/* funnel */}
              {show.funnel && (
                <>
                  <SortTh
                    label={viewMode === 'bm' ? t('leadsBM') : t('leadsTarget')}
                    sortKey={viewMode === 'bm' ? 'leads.bm_expected' : 'leads.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('leadsActual')}
                    sortKey="leads.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t('leadsVsBMTooltip') : t('leadsGapTooltip')}>
                    {viewMode === 'bm' ? t('leadsVsBM') : t('leadsGap')}
                  </th>
                  <SortTh
                    label={viewMode === 'bm' ? t('showupBM') : t('showupTarget')}
                    sortKey={viewMode === 'bm' ? 'showup.bm_expected' : 'showup.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('showupActual')}
                    sortKey="showup.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t('showupVsBMTooltip') : t('showupGapTooltip')}>
                    {viewMode === 'bm' ? t('showupVsBM') : t('showupGap')}
                  </th>
                  <SortTh
                    label={viewMode === 'bm' ? t('paidBM') : t('paidTarget')}
                    sortKey={viewMode === 'bm' ? 'paid.bm_expected' : 'paid.target'}
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('paidActual')}
                    sortKey="paid.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th {...sp} title={viewMode === 'bm' ? t('paidVsBMTooltip') : t('paidGapTooltip')}>
                    {viewMode === 'bm' ? t('paidVsBM') : t('paidGap')}
                  </th>
                  <SortTh
                    label={t('asp')}
                    sortKey="asp.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('aspTooltip')}
                  />
                </>
              )}

              {/* conversion */}
              {show.conversion && (
                <>
                  <SortTh
                    label={t('showupToPaid')}
                    sortKey="showup_to_paid.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('leadsToPaid')}
                    sortKey="leads_to_paid.actual"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                </>
              )}

              {/* process */}
              {show.process && (
                <>
                  <SortTh
                    label={t('participationRate')}
                    sortKey="participation_rate"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('participationRateTooltip')}
                  />
                  <SortTh
                    label={t('checkinRate')}
                    sortKey="checkin_rate"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('checkinRateTooltip')}
                  />
                  <SortTh
                    label={t('reachRate')}
                    sortKey="cc_reach_rate"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('reachRateTooltip')}
                  />
                  <SortTh
                    label={t('coefficient')}
                    sortKey="coefficient"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('coefficientTooltip')}
                  />
                </>
              )}

              {/* outreach */}
              {show.outreach && (
                <>
                  <SortTh
                    label={t('callTarget')}
                    sortKey="call_target"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('callActual')}
                    sortKey="calls_total"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('callCoverage')}
                    sortKey="call_proportion"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('connectedCount')}
                    sortKey="connected.count"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label={t('effectiveCount')}
                    sortKey="effective.count"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                </>
              )}

              {/* pace */}
              {show.pace && (
                <>
                  <SortTh
                    label={t('currentDailyAvg')}
                    sortKey="current_daily_avg"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('currentDailyAvgTooltip')}
                  />
                  <SortTh
                    label={t('remainingDailyAvg')}
                    sortKey="remaining_daily_avg"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('remainingDailyAvgTooltip')}
                  />
                  <SortTh
                    label={t('efficiencyLift')}
                    sortKey="efficiency_lift_pct"
                    currentSort={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                    tooltip={t('efficiencyLiftTooltip')}
                  />
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {sortedRecords.map((record, i) => {
              const isExpanded = expandedCC === record.cc_name;

              return [
                <tr
                  key={record.cc_name}
                  className={`${i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'} cursor-pointer hover:bg-subtle transition-colors duration-150`}
                  onClick={() => toggleExpand(record.cc_name)}
                  title={t('expandTitle')}
                >
                  {/* 排名 */}
                  <td className="slide-td py-1.5 px-2 text-center">
                    <RankBadge rank={i + 1} />
                  </td>

                  {/* identity */}
                  {show.identity && (
                    <>
                      <td className="slide-td py-1.5 px-2 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-token">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          {record.cc_name}
                        </span>
                      </td>
                      <td className="slide-td py-1.5 px-2 text-secondary-token whitespace-nowrap">
                        {record.team}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.students_count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}

                  {/* revenue */}
                  {show.revenue &&
                    (() => {
                      const rev = pickMetric(record.revenue, viewMode);
                      return (
                        <>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {fmtAmt(rev.reference)}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums font-semibold">
                            {fmtAmt(record.revenue?.actual)}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <AmtGapCell gap={rev.gap ?? null} />
                          </td>
                          <td
                            className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${achievementTextClass(rev.pct ?? null)}`}
                          >
                            {formatRate(rev.pct)}
                          </td>
                        </>
                      );
                    })()}

                  {/* funnel */}
                  {show.funnel &&
                    (() => {
                      const leads = pickCountMetric(record.leads, viewMode);
                      const showup = pickCountMetric(record.showup, viewMode);
                      const paid = pickCountMetric(record.paid, viewMode);
                      return (
                        <>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {leads.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {record.leads?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={leads.gap ?? null} />
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {showup.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {record.showup?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={showup.gap ?? null} />
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {paid.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {record.paid?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={paid.gap ?? null} />
                          </td>
                          <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                            {fmtAmt(record.asp?.actual)}
                          </td>
                        </>
                      );
                    })()}

                  {/* conversion */}
                  {show.conversion && (
                    <>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.showup_to_paid?.actual, [0.3, 0.5])}`}
                      >
                        {formatRate(record.showup_to_paid?.actual)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.leads_to_paid?.actual, [0.1, 0.2])}`}
                      >
                        {formatRate(record.leads_to_paid?.actual)}
                      </td>
                    </>
                  )}

                  {/* process */}
                  {show.process && (
                    <>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.participation_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(record.participation_rate)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.checkin_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(record.checkin_rate)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.cc_reach_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(record.cc_reach_rate)}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.coefficient != null ? record.coefficient.toFixed(2) : '—'}
                      </td>
                    </>
                  )}

                  {/* outreach */}
                  {show.outreach && (
                    <>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums text-secondary-token">
                        {record.call_target?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.calls_total?.toLocaleString() ?? '—'}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(record.call_proportion, [0.5, 0.7])}`}
                      >
                        {formatRate(record.call_proportion)}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.connected?.count?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {record.effective?.count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}

                  {/* pace */}
                  {show.pace && (
                    <>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {fmtAmt(record.current_daily_avg)}
                      </td>
                      <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                        {fmtAmt(record.remaining_daily_avg)}
                      </td>
                      <td
                        className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${record.efficiency_lift_pct != null && record.efficiency_lift_pct > 0.2 ? 'text-danger-token' : record.efficiency_lift_pct != null && record.efficiency_lift_pct <= 0 ? 'text-success-token' : ''}`}
                      >
                        {record.efficiency_lift_pct != null
                          ? `${(record.efficiency_lift_pct * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </>
                  )}
                </tr>,

                // 展开详情行
                isExpanded && (
                  <tr key={`${record.cc_name}-detail`}>
                    <td colSpan={99} className="px-4 py-0 bg-subtle">
                      <CCPerformanceDetail record={record} exchangeRate={exchangeRate} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>

          {/* 团队小计行 */}
          {teamFilter === 'all' && (
            <tfoot>
              {teams.map((team) => (
                <tr
                  key={`subtotal-${team.team}`}
                  className="bg-subtle font-semibold border-t border-default-token"
                >
                  <td className="slide-td py-2 px-2 text-center text-muted-token text-[10px]">
                    {t('subtotal')}
                  </td>
                  {show.identity && (
                    <>
                      <td className="slide-td py-2 px-2 font-semibold text-primary-token">
                        {team.team}
                      </td>
                      <td className="slide-td py-2 px-2 text-secondary-token">
                        {team.headcount}
                        {t('headcountUnit')}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.students_count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}
                  {show.revenue &&
                    (() => {
                      const rev = pickMetric(team.revenue, viewMode);
                      return (
                        <>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {fmtAmt(rev.reference)}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {fmtAmt(team.revenue?.actual)}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <AmtGapCell gap={rev.gap ?? null} />
                          </td>
                          <td
                            className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${achievementTextClass(rev.pct ?? null)}`}
                          >
                            {formatRate(rev.pct)}
                          </td>
                        </>
                      );
                    })()}
                  {show.funnel &&
                    (() => {
                      const leads = pickCountMetric(team.leads, viewMode);
                      const showup = pickCountMetric(team.showup, viewMode);
                      const paid = pickCountMetric(team.paid, viewMode);
                      return (
                        <>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {leads.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {team.leads?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={leads.gap ?? null} />
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {showup.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {team.showup?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={showup.gap ?? null} />
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-secondary-token">
                            {paid.reference?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {team.paid?.actual?.toLocaleString() ?? '—'}
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            <CountGapCell gap={paid.gap ?? null} />
                          </td>
                          <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                            {fmtAmt(team.asp?.actual)}
                          </td>
                        </>
                      );
                    })()}
                  {show.conversion && (
                    <>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.showup_to_paid?.actual, [0.3, 0.5])}`}
                      >
                        {formatRate(team.showup_to_paid?.actual)}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.leads_to_paid?.actual, [0.1, 0.2])}`}
                      >
                        {formatRate(team.leads_to_paid?.actual)}
                      </td>
                    </>
                  )}
                  {show.process && (
                    <>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.participation_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(team.participation_rate)}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.checkin_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(team.checkin_rate)}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.cc_reach_rate, [0.3, 0.5])}`}
                      >
                        {formatRate(team.cc_reach_rate)}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.coefficient != null ? team.coefficient.toFixed(2) : '—'}
                      </td>
                    </>
                  )}
                  {show.outreach && (
                    <>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums text-secondary-token">
                        {team.call_target?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.calls_total?.toLocaleString() ?? '—'}
                      </td>
                      <td
                        className={`slide-td py-2 px-2 text-right font-mono tabular-nums ${metricColor(team.call_proportion, [0.5, 0.7])}`}
                      >
                        {formatRate(team.call_proportion)}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.connected?.count?.toLocaleString() ?? '—'}
                      </td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">
                        {team.effective?.count?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  )}
                  {show.pace && (
                    <>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">—</td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">—</td>
                      <td className="slide-td py-2 px-2 text-right font-mono tabular-nums">—</td>
                    </>
                  )}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
