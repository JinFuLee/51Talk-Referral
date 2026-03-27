'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { PageTabs } from '@/components/ui/PageTabs';
import { Card } from '@/components/ui/Card';
import { TeamDetailTab } from '@/components/checkin/TeamDetailTab';
import { FollowupTab } from '@/components/checkin/FollowupTab';
import { RankingTab } from '@/components/checkin/RankingTab';
import SummaryTab from '@/components/checkin/SummaryTab';
import { MyViewBanner } from '@/components/checkin/MyViewBanner';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useMyView } from '@/lib/hooks/useMyView';
import { ContactConversionScatter } from '@/components/daily-monitor/ContactConversionScatter';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { ContactConversionItem } from '@/lib/types/cross-analysis';

// ── 类型定义（仅保留 page 层需要的类型）──────────────────────────────────────

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

// 后端返回 { by_role: { CC: {...}, SS: {...}, LP: {...} } }
interface CheckinSummaryResponse {
  by_role: Record<string, CheckinRoleSummary>;
}

// ── Tab 定义 ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary', label: '汇总视图' },
  { id: 'ranking', label: '打卡排行' },
  { id: 'team_detail', label: '团队明细' },
  { id: 'followup', label: '未打卡跟进' },
] as const;

// ── 围场筛选选项 ────────────────────────────────────────────────────────────

interface EnclosureOption {
  id: string | null;
  label: string;
}

const ENCLOSURE_OPTIONS: EnclosureOption[] = [
  { id: null, label: '全部围场' },
  { id: 'M0', label: 'M0 (0-30天)' },
  { id: 'M1', label: 'M1 (31-60天)' },
  { id: 'M2', label: 'M2 (61-90天)' },
  { id: 'M3', label: 'M3 (91-120天)' },
  { id: 'M4', label: 'M4 (121-150天)' },
  { id: 'M5', label: 'M5 (151-180天)' },
  { id: 'M6+', label: 'M6+ (181天+)' },
];

type TabId = (typeof TABS)[number]['id'];

// ── 主页面（内部，需要 useSearchParams）────────────────────────────────────────

function CheckinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRoles, roleEnclosures } = useWideConfig();

  // URL → Zustand 同步（mount 时触发一次），同时获取视角状态
  const { focusCC, isActive } = useMyView();

  // 智能默认 Tab：有 cc 参数 → followup；有 team 但无 cc → team_detail；否则 → summary
  function resolveDefaultTab(): TabId {
    const explicit = searchParams.get('tab');
    if (explicit) return explicit as TabId;
    if (searchParams.get('cc')) return 'followup';
    if (searchParams.get('team') && !searchParams.get('cc')) return 'team_detail';
    return 'summary';
  }
  const activeTab = resolveDefaultTab();

  // 围场筛选：从 URL 读取，null = 全部
  const enclosureFilter: string | null = searchParams.get('enclosure') || null;

  const handleEnclosureChange = useCallback(
    (enc: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (enc) {
        params.set('enclosure', enc);
      } else {
        params.delete('enclosure');
      }
      router.replace(`/checkin?${params.toString()}`);
    },
    [router, searchParams]
  );

  const { exportCSV } = useExport();

  const { data: summaryData } = useSWR<CheckinSummaryResponse>(`/api/checkin/summary`, swrFetcher);

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
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <h1 className="page-title">打卡管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {isActive && focusCC
              ? `当前聚焦: ${focusCC} 的学员`
              : '有效学员打卡率 · 按岗位 / 团队 / 围场拆分'}
          </p>
        </div>
        {activeTab === 'summary' && <ExportButton onExportCsv={handleExportSummary} />}
      </div>

      <MyViewBanner />

      {/* 围场筛选器 */}
      <div className="flex items-center gap-1.5 px-0.5 overflow-x-auto pb-0.5">
        {ENCLOSURE_OPTIONS.map((opt) => (
          <button
            key={opt.id ?? 'all'}
            onClick={() => handleEnclosureChange(opt.id)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
              enclosureFilter === opt.id
                ? 'bg-[var(--color-action,#1B365D)] text-white font-medium'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <PageTabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeTab}
        onChange={handleTabChange}
      />

      <div className="mt-2">
        {activeTab === 'summary' && <SummaryTab enclosureFilter={enclosureFilter} />}
        {activeTab === 'ranking' && <RankingTab enclosureFilter={enclosureFilter} />}
        {activeTab === 'team_detail' && (
          <TeamDetailTab activeRoles={activeRoles} roleEnclosures={roleEnclosures} />
        )}
        {activeTab === 'followup' && (
          <FollowupTab
            activeRoles={activeRoles}
            roleEnclosures={roleEnclosures}
            enclosureFilter={enclosureFilter}
          />
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
