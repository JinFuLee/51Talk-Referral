'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
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
import { TeamSummaryCard } from '@/components/team/TeamSummaryCard';
import { CHART_PALETTE } from '@/lib/chart-palette';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';

/* ── 类型 ──────────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'cc', label: 'CC 前端' },
  { key: 'ss', label: 'SS 后端' },
  { key: 'lp', label: 'LP 服务' },
];

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

function metricColor(value: number | null | undefined, thresholds: [number, number]) {
  if (value === null || value === undefined) return 'text-[var(--text-muted)]';
  if (value >= thresholds[1]) return 'text-green-600 font-semibold';
  if (value >= thresholds[0]) return 'text-yellow-600';
  return 'text-red-500';
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-yellow-100 text-yellow-700'
      : rank === 2
        ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
        : rank === 3
          ? 'bg-orange-50 text-orange-600'
          : 'text-[var(--text-muted)]';
  return (
    <span
      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {rank}
    </span>
  );
}

/* ── Tab Bar ──────────────────────────────────────────────── */

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-subtle)] rounded-lg p-1 w-fit">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === t.key
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── CC Tab：原有内容 ─────────────────────────────────────── */

function CCTabContent() {
  const { data, isLoading, error } = useFilteredSWR<TeamSummaryResponse>('/api/team/summary');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title="数据加载失败" description="无法获取团队数据，请检查后端服务" />;
  }

  const teams = Array.isArray(data) ? data : (data?.teams ?? []);
  const chartData = teams.map((t) => ({
    name: t.cc_name,
    注册: t.registrations,
    付费: t.payments,
    学员: t.students,
  }));

  return (
    <div className="space-y-6">
      {/* 团队汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? (
          <div className="col-span-full">
            <EmptyState title="暂无团队数据" description="上传数据文件后自动刷新" />
          </div>
        ) : (
          teams.map((t) => (
            <TeamSummaryCard
              key={t.cc_name}
              cc_name={t.cc_name}
              cc_group={t.cc_group}
              students={t.students}
              participation_rate={t.participation_rate}
              registrations={t.registrations}
              payments={t.payments}
              revenue_usd={t.revenue_usd ?? 0}
              checkin_rate={t.checkin_rate}
              cc_reach_rate={t.cc_reach_rate}
            />
          ))
        )}
      </div>

      {/* 团队对比柱状图 */}
      {chartData.length > 0 && (
        <Card title="团队注册 vs 付费对比">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="注册" fill={CHART_PALETTE.c2} radius={[4, 4, 0, 0]} />
              <Bar dataKey="付费" fill={CHART_PALETTE.c4} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

/* ── SS/LP 通用排名表格 ─────────────────────────────────── */

function RoleRankingContent({ role, apiUrl }: { role: 'SS' | 'LP'; apiUrl: string }) {
  const { data, isLoading, error } = useSWR<RankingResponse>(apiUrl, swrFetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState title="数据加载失败" description={`无法获取 ${role} 团队数据，请检查后端服务`} />
    );
  }

  const rankings = Array.isArray(data) ? data : (data?.rankings ?? []);
  const chartData = rankings.map((r) => ({
    name: r.name,
    注册: r.registrations,
    付费: r.payments,
  }));

  return (
    <div className="space-y-4">
      {/* 排名表格 */}
      <Card title={`${role} 组级绩效排名`}>
        {rankings.length === 0 ? (
          <EmptyState title={`暂无 ${role} 数据`} description="上传数据文件后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left py-2 px-2">排名</th>
                  <th className="slide-th slide-th-left py-2 px-2">姓名</th>
                  <th className="slide-th slide-th-left py-2 px-2">组名</th>
                  <th className="slide-th slide-th-right py-2 px-2">学员数</th>
                  <th className="slide-th slide-th-right py-2 px-2">参与率</th>
                  <th className="slide-th slide-th-right py-2 px-2">打卡率</th>
                  <th className="slide-th slide-th-right py-2 px-2">注册数</th>
                  <th className="slide-th slide-th-right py-2 px-2">付费数</th>
                  <th className="slide-th slide-th-right py-2 px-2">业绩(USD)</th>
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
                    <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">{r.group}</td>
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
        <Card title={`${role} 注册 vs 付费对比`}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="注册" fill={CHART_PALETTE.c2} radius={[4, 4, 0, 0]} />
              <Bar dataKey="付费" fill={CHART_PALETTE.c4} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

/* ── 主页面内部 ──────────────────────────────────────────── */

function TeamPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'cc') as TabKey;
  const { exportCSV } = useExport();

  const { data: ccData } = useFilteredSWR<TeamSummaryResponse>('/api/team/summary');
  const { data: ssData } = useSWR<RankingResponse>('/api/team/ss-ranking', swrFetcher);
  const { data: lpData } = useSWR<RankingResponse>('/api/team/lp-ranking', swrFetcher);

  function handleTabChange(t: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
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
          { key: 'cc_group', label: '组别' },
          { key: 'students', label: '学员数' },
          { key: 'participation_rate', label: '参与率' },
          { key: 'registrations', label: '注册数' },
          { key: 'payments', label: '付费数' },
          { key: 'revenue_usd', label: '业绩(USD)' },
          { key: 'checkin_rate', label: '打卡率' },
          { key: 'cc_reach_rate', label: '触达率' },
        ],
        `团队汇总_CC_${today}`
      );
    } else if (activeTab === 'ss') {
      const rankings = Array.isArray(ssData) ? ssData : (ssData?.rankings ?? []);
      exportCSV(
        rankings as unknown as Record<string, unknown>[],
        [
          { key: 'name', label: '姓名' },
          { key: 'group', label: '组别' },
          { key: 'students', label: '学员数' },
          { key: 'participation_rate', label: '参与率' },
          { key: 'checkin_rate', label: '打卡率' },
          { key: 'registrations', label: '注册数' },
          { key: 'payments', label: '付费数' },
          { key: 'revenue_usd', label: '业绩(USD)' },
        ],
        `团队汇总_SS_${today}`
      );
    } else {
      const rankings = Array.isArray(lpData) ? lpData : (lpData?.rankings ?? []);
      exportCSV(
        rankings as unknown as Record<string, unknown>[],
        [
          { key: 'name', label: '姓名' },
          { key: 'group', label: '组别' },
          { key: 'students', label: '学员数' },
          { key: 'participation_rate', label: '参与率' },
          { key: 'checkin_rate', label: '打卡率' },
          { key: 'registrations', label: '注册数' },
          { key: 'payments', label: '付费数' },
          { key: 'revenue_usd', label: '业绩(USD)' },
        ],
        `团队汇总_LP_${today}`
      );
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">团队汇总</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            CC / SS / LP 三岗团队绩效 · 学员数 · 参与率 · 注册 · 付费
          </p>
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
