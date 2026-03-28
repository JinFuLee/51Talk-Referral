'use client';

import { Suspense, useCallback, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { PageTabs } from '@/components/ui/PageTabs';
import { Card } from '@/components/ui/Card';
import { FollowupTab } from '@/components/checkin/FollowupTab';
import { RankingTab } from '@/components/checkin/RankingTab';
import SummaryTab from '@/components/checkin/SummaryTab';
import { StudentInsightsTab } from '@/components/checkin/StudentInsightsTab';
import { RoiAnalysisTab } from '@/components/checkin/RoiAnalysisTab';
import { UnifiedFilterBar } from '@/components/checkin/UnifiedFilterBar';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useMyView } from '@/lib/hooks/useMyView';
import { ContactConversionScatter } from '@/components/daily-monitor/ContactConversionScatter';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { ContactConversionItem } from '@/lib/types/cross-analysis';

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface CheckinTeamRow {
  team: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface CheckinRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: Array<{ enclosure: string; students: number; checked_in: number; rate: number }>;
}

interface CheckinSummaryResponse {
  by_role: Record<string, CheckinRoleSummary>;
}

// ── Tab 定义 ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: '概览' },
  { id: 'insights', label: '学员洞察' },
  { id: 'leaderboard', label: '排行榜' },
  { id: 'action', label: '行动中心' },
  { id: 'roi', label: 'ROI 分析' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const ROLES_ALL = ['CC', 'SS', 'LP', '运营'] as const;

// ── 主页面（内部，需要 useSearchParams）────────────────────────────────────────

function CheckinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRoles, roleEnclosures } = useWideConfig();

  const { focusCC, clearMyView } = useMyView();

  // ── 智能默认 Tab ──────────────────────────────────────────────────────────
  function resolveDefaultTab(): TabId {
    const explicit = searchParams.get('tab');
    if (explicit) return explicit as TabId;
    if (searchParams.get('cc')) return 'action';
    if (searchParams.get('team') && !searchParams.get('cc')) return 'leaderboard';
    return 'overview';
  }
  const activeTab = resolveDefaultTab();

  // ── 筛选状态（集中管理）──────────────────────────────────────────────────

  // 角色：URL 持久化
  const roleFilter: string = searchParams.get('role') || 'CC';

  // 团队：URL 持久化
  const teamFilter: string = searchParams.get('team') || '';

  // 围场：URL 持久化
  const enclosureFilter: string | null = searchParams.get('enclosure') || null;

  // CC 搜索：page 级 state（初始值来自 URL cc 参数）
  const [ccSearch, setCCSearch] = useState<string>(() => searchParams.get('cc') || focusCC || '');

  // KPI 围场（当前角色负责的围场列表）
  const kpiEnclosures = useMemo(
    () => (roleEnclosures[roleFilter] ?? []) as string[],
    [roleEnclosures, roleFilter]
  );

  // ── URL 更新函数 ──────────────────────────────────────────────────────────

  const handleEnclosureChange = useCallback(
    (enc: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (enc) params.set('enclosure', enc);
      else params.delete('enclosure');
      router.replace(`/checkin?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleRoleChange = useCallback(
    (role: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('role', role);
      params.delete('team'); // 切换角色时清除团队筛选
      router.replace(`/checkin?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleTeamChange = useCallback(
    (team: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (team) params.set('team', team);
      else params.delete('team');
      router.replace(`/checkin?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleClearAll = useCallback(() => {
    clearMyView();
    setCCSearch('');
    const params = new URLSearchParams();
    if (searchParams.get('tab')) params.set('tab', searchParams.get('tab')!);
    router.replace(`/checkin?${params.toString()}`);
  }, [clearMyView, router, searchParams]);

  // ── 是否有筛选激活 ────────────────────────────────────────────────────────
  const hasAnyFilter = Boolean(enclosureFilter || roleFilter !== 'CC' || teamFilter || ccSearch);

  // ── 团队列表（从 summary 数据提取）────────────────────────────────────────
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useSWR<CheckinSummaryResponse>('/api/checkin/summary', swrFetcher);

  const teams = useMemo(() => {
    const roleData = summaryData?.by_role?.[roleFilter];
    return roleData?.by_team?.map((t) => t.team).sort() ?? [];
  }, [summaryData, roleFilter]);

  // ── 可见角色列表 ──────────────────────────────────────────────────────────
  const visibleRoles = useMemo(
    () =>
      activeRoles.length > 0
        ? ROLES_ALL.filter((r) => activeRoles.includes(r))
        : Array.from(ROLES_ALL),
    [activeRoles]
  );

  // ── 导出 ──────────────────────────────────────────────────────────────────
  const { exportCSV } = useExport();

  const { data: scatterData } = useFilteredSWR<ContactConversionItem[]>(
    '/api/daily-monitor/contact-vs-conversion'
  );

  function handleTabChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`/checkin?${params.toString()}`);
  }

  function handleExportSummary() {
    const byRole = summaryData?.by_role ?? {};
    const rows: Record<string, unknown>[] = [];
    Object.entries(byRole).forEach(([role, v]) => {
      (v.by_team ?? []).forEach((t) => {
        rows.push({
          role,
          team: t.team,
          students: t.students,
          checked_in: t.checked_in,
          rate: t.rate,
        });
      });
    });
    const today = new Date().toISOString().slice(0, 10);
    exportCSV(
      rows,
      [
        { key: 'role', label: '岗位' },
        { key: 'team', label: '团队' },
        { key: 'students', label: '学员数' },
        { key: 'checked_in', label: '打卡数' },
        { key: 'rate', label: '打卡率' },
      ],
      `打卡汇总_${today}`
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* 标题行 */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="page-title">打卡管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            有效学员打卡率 · 按岗位 / 团队 / 围场拆分
          </p>
        </div>
        {activeTab === 'overview' && <ExportButton onExportCsv={handleExportSummary} />}
      </div>

      {/* ── 汇总数据状态提示 ── */}
      {summaryLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Spinner size="sm" />
          <span>加载团队数据中…</span>
        </div>
      )}
      {summaryError && (
        <div className="text-center py-4">
          <p className="text-sm font-semibold text-red-600">汇总数据加载失败</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">请检查后端服务是否正常运行</p>
        </div>
      )}

      {/* ── 统一筛选栏（2层架构 L1）── */}
      <UnifiedFilterBar
        role={roleFilter}
        onRoleChange={handleRoleChange}
        activeRoles={visibleRoles as string[]}
        team={teamFilter}
        onTeamChange={handleTeamChange}
        teams={teams}
        ccSearch={ccSearch}
        onCCSearchChange={setCCSearch}
        enclosure={enclosureFilter}
        onEnclosureChange={handleEnclosureChange}
        kpiEnclosures={kpiEnclosures}
        onClearAll={handleClearAll}
        hasFilter={hasAnyFilter}
      />

      {/* ── Tab 导航（L2）── */}
      <PageTabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeTab}
        onChange={handleTabChange}
      />

      {/* ── Tab 内容 ── */}
      <div className="mt-2">
        {activeTab === 'overview' && (
          <SummaryTab enclosureFilter={enclosureFilter} roleFilter={roleFilter} />
        )}
        {activeTab === 'insights' && <StudentInsightsTab enclosureFilter={enclosureFilter} />}
        {activeTab === 'leaderboard' && (
          <RankingTab
            roleFilter={roleFilter}
            activeRoles={activeRoles}
            roleEnclosures={roleEnclosures}
            enclosureFilter={enclosureFilter}
          />
        )}
        {activeTab === 'action' && (
          <FollowupTab
            activeRoles={activeRoles}
            roleEnclosures={roleEnclosures}
            enclosureFilter={enclosureFilter}
            roleFilter={roleFilter}
            teamFilter={teamFilter}
            salesSearch={ccSearch}
          />
        )}
        {activeTab === 'roi' && (
          <RoiAnalysisTab roleFilter={roleFilter} enclosureFilter={enclosureFilter} />
        )}
      </div>

      {/* 触达效果分析 */}
      {scatterData && scatterData.length > 0 && (
        <div className="mt-6">
          <Card title="触达效果分析">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              触达率 × 转化率散点图 · 数据来源：日常触达监控
            </p>
            <ContactConversionScatter data={scatterData} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ── 导出 ────────────────────────────────────────────────────────────────────

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <CheckinPageInner />
    </Suspense>
  );
}
