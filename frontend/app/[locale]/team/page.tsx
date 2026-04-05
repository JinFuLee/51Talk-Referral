'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { formatRate, formatRevenue, metricColor } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import { SegmentedTabs } from '@/components/ui/PageTabs';
import { BrandDot } from '@/components/ui/BrandDot';
/* ── 类型 ──────────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

interface TeamMember {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
  checkin_rate?: number;
  cc_reach_rate?: number;
}

interface TeamSummaryResponse {
  teams: TeamMember[];
}

interface RankingMember {
  name: string;
  group: string;
  students: number;
  participation_rate: number;
  checkin_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

interface RankingResponse {
  rankings: RankingMember[];
}

/* ── 工具函数 ───────────────────────────────────────────────── */

// metricColor 已移至 lib/utils.ts 共享

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

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const t = useTranslations('teamPage');
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'cc', label: t('tabCC') },
    { key: 'ss', label: t('tabSS') },
    { key: 'lp', label: t('tabLP') },
  ];
  return <SegmentedTabs tabs={tabs} active={active} onChange={onChange} />;
}

/* ── 排序 hook（CC Tab 专用）──────────────────────────────── */

type SortDir = 'asc' | 'desc';

function useSortState(defaultKey: string, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const handleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey]
  );

  return { sortKey, sortDir, handleSort };
}

/* ── CC Tab：表格（与 SS/LP 统一样式）───────────────────── */

function CCTabContent() {
  const tr = useTranslations('teamPage');
  const { data, isLoading, error, mutate } =
    useFilteredSWR<TeamSummaryResponse>('/api/team/summary');
  const { sortKey, sortDir, handleSort } = useSortState('participation_rate');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={tr('loadFail')}
        description={tr('loadFailCCDesc')}
        action={{ label: tr('retry'), onClick: () => mutate() }}
      />
    );
  }

  const rawTeams = Array.isArray(data) ? data : (data?.teams ?? []);

  // 排序
  const teams = [...rawTeams].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sortKey] ?? 0;
    const vb = (b as Record<string, unknown>)[sortKey] ?? 0;
    const diff = (va as number) - (vb as number);
    return sortDir === 'asc' ? diff : -diff;
  });

  const chartData = teams.map((member) => ({
    name: member.cc_name,
    [tr('chartRegKey')]: member.registrations,
    [tr('chartPayKey')]: member.payments,
  }));

  // insight：按参与率 top/bottom
  const sortedByPart = [...rawTeams].sort(
    (a, b) => (b.participation_rate ?? 0) - (a.participation_rate ?? 0)
  );
  const topCC = sortedByPart[0];
  const bottomCC = sortedByPart[sortedByPart.length - 1];

  function sortIcon(key: string) {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function thProps(key: string, align: 'left' | 'right' = 'right') {
    return {
      onClick: () => handleSort(key),
      title: tr('clickToSort'),
      className: `slide-th ${align === 'right' ? 'slide-th-right' : 'slide-th-left'} py-2 px-2 cursor-pointer select-none hover:opacity-80`,
    };
  }

  return (
    <div className="space-y-4">
      {/* insight 卡片 */}
      {topCC && bottomCC && topCC.cc_name !== bottomCC.cc_name && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-default-token border-l-4 border-l-green-500 bg-success-surface px-4 py-3">
          <div className="text-sm font-semibold text-primary-token">{tr('insightTitle')}</div>
          <div className="text-xs text-secondary-token">
            {tr('insightTopLabel')}
            <span className="font-semibold text-primary-token">{topCC.cc_name}</span>{' '}
            <span className="text-success-token font-semibold">
              {formatRate(topCC.participation_rate)}
            </span>
            {tr('insightBottomLabel')}
            <span className="font-semibold text-primary-token">{bottomCC.cc_name}</span>{' '}
            <span className="text-danger-token font-semibold">
              {formatRate(bottomCC.participation_rate)}
            </span>
            {topCC.participation_rate != null &&
              bottomCC.participation_rate != null &&
              tr('insightGap', { n:
                Math.round(Math.abs(topCC.participation_rate - bottomCC.participation_rate) * 100)
              })}
            。
          </div>
          <p className="text-[10px] text-muted-token">
            {tr('colorHint')}
            <span className="text-success-token font-medium">{tr('colorGreen')}</span> ·{' '}
            <span className="text-warning-token font-medium">{tr('colorAmber')}</span> ·{' '}
            <span className="text-danger-token font-medium">{tr('colorRed')}</span>
            {tr('colorHintSuffix')}
          </p>
        </div>
      )}

      {/* 排名表格 */}
      <Card title={tr('ccTableTitle')}>
        {teams.length === 0 ? (
          <EmptyState title={tr('noCCData')} description={tr('noCCDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{tr('colRank')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr('colName')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr('colTeam')}</th>
                  <th {...thProps('students')}>
                    {tr('colStudents')} <BrandDot tooltip={tr('ttStudents')} />
                    {sortIcon('students')}
                  </th>
                  <th {...thProps('participation_rate')}>
                    {tr('colParticipation')} <BrandDot tooltip={tr('ttParticipation')} />
                    {sortIcon('participation_rate')}
                  </th>
                  <th {...thProps('registrations')}>
                    {tr('colRegistrations')}
                    {sortIcon('registrations')}
                  </th>
                  <th {...thProps('payments')}>
                    {tr('colPayments')}
                    {sortIcon('payments')}
                  </th>
                  <th {...thProps('checkin_rate')}>
                    {tr('colCheckin')} <BrandDot tooltip={tr('ttCheckin')} />
                    {sortIcon('checkin_rate')}
                  </th>
                  <th {...thProps('cc_reach_rate')}>
                    {tr('colReach')} <BrandDot tooltip={tr('ttReach')} />
                    {sortIcon('cc_reach_rate')}
                  </th>
                  <th {...thProps('revenue_usd')}>
                    {tr('colRevenue')}
                    {sortIcon('revenue_usd')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((row, i) => (
                  <tr key={row.cc_name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{row.cc_name}</td>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">{row.cc_group}</td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(row.students ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(row.participation_rate, [0.3, 0.5])}`}
                    >
                      {row.participation_rate != null ? formatRate(row.participation_rate) : '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(row.registrations ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${(row.payments ?? 0) >= 1 ? 'text-success-token font-semibold' : ''}`}
                    >
                      {(row.payments ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(row.checkin_rate, [0.3, 0.5])}`}
                    >
                      {row.checkin_rate != null ? formatRate(row.checkin_rate) : '—'}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(row.cc_reach_rate, [0.3, 0.5])}`}
                    >
                      {row.cc_reach_rate != null ? formatRate(row.cc_reach_rate) : '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {formatRevenue(row.revenue_usd ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 对比柱状图 */}
      {chartData.length > 0 && (
        <Card title={tr('chartCCTitle')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md, 10px)',
                  boxShadow: 'var(--shadow-medium)',
                  fontSize: '12px',
                }}
                cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
              <Bar
                dataKey={tr('chartRegKey')}
                fill={CHART_PALETTE.c2}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey={tr('chartPayKey')}
                fill={CHART_PALETTE.c4}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

/* ── SS/LP 通用排名表格 ─────────────────────────────────── */

function RoleRankingContent({ role, apiUrl }: { role: 'SS' | 'LP'; apiUrl: string }) {
  const tr = useTranslations('teamPage');
  const { data, isLoading, error, mutate } = useFilteredSWR<RankingResponse>(apiUrl);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title={tr('loadFail')}
        description={tr('loadFailRoleDesc', { n: role })}
        action={{ label: tr('retry'), onClick: () => mutate() }}
      />
    );
  }

  const rankings = Array.isArray(data) ? data : (data?.rankings ?? []);
  const chartData = rankings.map((r) => ({
    name: r.name,
    [tr('chartRegKey')]: r.registrations,
    [tr('chartPayKey')]: r.payments,
  }));

  // Top/Bottom（按参与率）
  const sortedByParticipation = [...rankings].sort(
    (a, b) => (b.participation_rate ?? 0) - (a.participation_rate ?? 0)
  );
  const topMember = sortedByParticipation[0];
  const bottomMember = sortedByParticipation[sortedByParticipation.length - 1];

  return (
    <div className="space-y-4">
      {/* 效率 insight 卡片 */}
      {topMember && bottomMember && topMember.name !== bottomMember.name && (
        <div className="flex flex-col gap-1 rounded-lg border border-default-token border-l-4 border-l-green-500 bg-success-surface px-4 py-3">
          <div className="text-sm font-semibold text-primary-token">
            {tr('insightRoleTitle', { n: role })}
          </div>
          <div className="text-xs text-secondary-token">
            {tr('insightTopLabel')}
            <span className="font-semibold text-primary-token">{topMember.name}</span>{' '}
            <span className="text-success-token font-semibold">
              {formatRate(topMember.participation_rate)}
            </span>
            {tr('insightBottomLabel')}
            <span className="font-semibold text-primary-token">{bottomMember.name}</span>{' '}
            <span className="text-danger-token font-semibold">
              {formatRate(bottomMember.participation_rate)}
            </span>
            。
          </div>
          <p className="text-[10px] text-muted-token">
            {tr('colorHint')}
            <span className="text-success-token font-medium">{tr('colorGreenLow')}</span> ·{' '}
            <span className="text-warning-token font-medium">{tr('colorAmberLow')}</span> ·{' '}
            <span className="text-danger-token font-medium">{tr('colorRedLow')}</span>
            {tr('colorHintParticipation')}，
            <span className="text-success-token font-medium">{tr('colorGreen')}</span> ·{' '}
            <span className="text-warning-token font-medium">{tr('colorAmber')}</span> ·{' '}
            <span className="text-danger-token font-medium">{tr('colorRed')}</span>
            {tr('colorHintCheckin')}
          </p>
        </div>
      )}
      {/* 排名表格 */}
      <Card title={tr('roleTableTitle', { n: role })}>
        {rankings.length === 0 ? (
          <EmptyState title={tr('noRoleData', { n: role })} description={tr('noRoleDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">{tr('colRank')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr('colName')}</th>
                  <th className="slide-th slide-th-left py-2 px-2">{tr('colGroup')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {tr('colStudents')} <BrandDot tooltip={tr('ttStudents')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {tr('colParticipation')} <BrandDot tooltip={tr('ttParticipation')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">
                    {tr('colCheckin')} <BrandDot tooltip={tr('ttCheckin')} />
                  </th>
                  <th className="slide-th slide-th-right py-2 px-2">{tr('colRegistrations')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{tr('colPayments')}</th>
                  <th className="slide-th slide-th-right py-2 px-2">{tr('csvRevenue')}</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr
                    key={`${r.name}-${i}`}
                    className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                  >
                    <td className="slide-td py-1.5 px-2">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="slide-td py-1.5 px-2 font-medium">{r.name}</td>
                    <td className="slide-td py-1.5 px-2 text-secondary-token">{r.group}</td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(r.students ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.participation_rate, [0.1, 0.2])}`}
                    >
                      {r.participation_rate != null ? formatRate(r.participation_rate) : '—'}
                    </td>
                    <td
                      className={`slide-td py-1.5 px-2 text-right font-mono tabular-nums ${metricColor(r.checkin_rate, [0.3, 0.5])}`}
                    >
                      {r.checkin_rate != null ? formatRate(r.checkin_rate) : '—'}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(r.registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {(r.payments ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                      {r.revenue_usd != null ? `$${r.revenue_usd.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 对比柱状图 */}
      {chartData.length > 0 && (
        <Card title={tr('chartRoleTitle', { n: role })}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md, 10px)',
                  boxShadow: 'var(--shadow-medium)',
                  fontSize: '12px',
                }}
                cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
              <Bar
                dataKey={tr('chartRegKey')}
                fill={CHART_PALETTE.c2}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Bar
                dataKey={tr('chartPayKey')}
                fill={CHART_PALETTE.c4}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

/* ── 主页面内部 ──────────────────────────────────────────── */

function TeamPageInner() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });
  const tr = useTranslations('teamPage');
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const { exportCSV } = useExport();

  const { data: ccData } = useFilteredSWR<TeamSummaryResponse>('/api/team/summary');
  const { data: ssData } = useFilteredSWR<RankingResponse>('/api/team/ss-ranking');
  const { data: lpData } = useFilteredSWR<RankingResponse>('/api/team/lp-ranking');

  // 从 config 动态生成围场×角色描述（非硬编码）
  const { roleEnclosures } = useWideConfig();
  const roleHint = Object.entries(roleEnclosures ?? {})
    .map(([role, encs]) => `${role}=${(encs as string[]).join('/')}`)
    .join('；');

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/team?${params.toString()}`);
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeTab === 'cc') {
      const teams = Array.isArray(ccData) ? ccData : (ccData?.teams ?? []);
      exportCSV(
        teams as unknown as Record<string, unknown>[],
        [
          { key: 'cc_name', label: 'CC' },
          { key: 'cc_group', label: tr('csvGroup') },
          { key: 'students', label: tr('csvStudents') },
          { key: 'participation_rate', label: tr('csvParticipation') },
          { key: 'registrations', label: tr('csvRegistrations') },
          { key: 'payments', label: tr('csvPayments') },
          { key: 'revenue_usd', label: tr('csvRevenue') },
          { key: 'checkin_rate', label: tr('csvCheckin') },
          { key: 'cc_reach_rate', label: tr('csvReach') },
        ],
        tr('exportCCFileName', { n: today })
      );
    } else if (activeTab === 'ss') {
      const rankings = Array.isArray(ssData) ? ssData : (ssData?.rankings ?? []);
      exportCSV(
        rankings as unknown as Record<string, unknown>[],
        [
          { key: 'name', label: tr('colName') },
          { key: 'group', label: tr('csvGroup') },
          { key: 'students', label: tr('csvStudents') },
          { key: 'participation_rate', label: tr('csvParticipation') },
          { key: 'checkin_rate', label: tr('csvCheckin') },
          { key: 'registrations', label: tr('csvRegistrations') },
          { key: 'payments', label: tr('csvPayments') },
          { key: 'revenue_usd', label: tr('csvRevenue') },
        ],
        tr('exportSSFileName', { n: today })
      );
    } else {
      const rankings = Array.isArray(lpData) ? lpData : (lpData?.rankings ?? []);
      exportCSV(
        rankings as unknown as Record<string, unknown>[],
        [
          { key: 'name', label: tr('colName') },
          { key: 'group', label: tr('csvGroup') },
          { key: 'students', label: tr('csvStudents') },
          { key: 'participation_rate', label: tr('csvParticipation') },
          { key: 'checkin_rate', label: tr('csvCheckin') },
          { key: 'registrations', label: tr('csvRegistrations') },
          { key: 'payments', label: tr('csvPayments') },
          { key: 'revenue_usd', label: tr('csvRevenue') },
        ],
        tr('exportLPFileName', { n: today })
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{tr('pageTitle')}</h1>
          <p className="text-sm text-secondary-token mt-1">{tr('pageDesc')}</p>
          <p className="text-sm text-muted-token mt-0.5">{tr('pageHintTemplate', { n: roleHint })}</p>
        </div>
        <ExportButton onExportCsv={handleExport} />
      </div>

      <TabBar active={activeTab} onChange={handleTabChange} />

      {activeTab === 'cc' && <CCTabContent />}
      {activeTab === 'ss' && <RoleRankingContent role="SS" apiUrl="/api/team/ss-ranking" />}
      {activeTab === 'lp' && <RoleRankingContent role="LP" apiUrl="/api/team/lp-ranking" />}
    </div>
  );
}

/* ── 导出 ─────────────────────────────────────────────────── */

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <TeamPageInner />
    </Suspense>
  );
}
