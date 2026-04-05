'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { Spinner } from '@/components/ui/Spinner';
import { PageTabs } from '@/components/ui/PageTabs';
import { FollowupTab } from '@/components/checkin/FollowupTab';
import { RankingTab } from '@/components/checkin/RankingTab';
import SummaryTab from '@/components/checkin/SummaryTab';
import { StudentInsightsTab } from '@/components/checkin/StudentInsightsTab';
import { RoiAnalysisTab } from '@/components/checkin/RoiAnalysisTab';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useMyView } from '@/lib/hooks/useMyView';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';

// ── I18N ──────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    pageTitle: '打卡管理',
    pageSubtitle: '有效学员打卡率 · 按岗位 / 团队 / 围场拆分',
    loadingTeams: '加载团队数据中…',
    summaryLoadFailed: '汇总数据加载失败',
    checkBackend: '请检查后端服务是否正常运行',
    tabs: {
      overview: '概览',
      insights: '学员洞察',
      leaderboard: '排行榜',
      action: '行动中心',
      roi: 'ROI 分析',
    },
    exportCols: {
      role: '岗位',
      team: '团队',
      students: '学员数',
      checked_in: '打卡数',
      rate: '打卡率',
    },
    exportFilename: '打卡汇总',
  },
  'zh-TW': {
    pageTitle: '打卡管理',
    pageSubtitle: '有效學員打卡率 · 按崗位 / 團隊 / 圍場拆分',
    loadingTeams: '載入團隊資料中…',
    summaryLoadFailed: '匯總資料載入失敗',
    checkBackend: '請檢查後端服務是否正常運行',
    tabs: {
      overview: '概覽',
      insights: '學員洞察',
      leaderboard: '排行榜',
      action: '行動中心',
      roi: 'ROI 分析',
    },
    exportCols: {
      role: '崗位',
      team: '團隊',
      students: '學員數',
      checked_in: '打卡數',
      rate: '打卡率',
    },
    exportFilename: '打卡匯總',
  },
  en: {
    pageTitle: 'Check-in Management',
    pageSubtitle: 'Student Check-in Rate · By Role / Team / Enclosure',
    loadingTeams: 'Loading team data…',
    summaryLoadFailed: 'Summary data failed to load',
    checkBackend: 'Please check if the backend service is running',
    tabs: {
      overview: 'Overview',
      insights: 'Student Insights',
      leaderboard: 'Leaderboard',
      action: 'Action Center',
      roi: 'ROI Analysis',
    },
    exportCols: {
      role: 'Role',
      team: 'Team',
      students: 'Students',
      checked_in: 'Checked-in',
      rate: 'Check-in Rate',
    },
    exportFilename: 'checkin-summary',
  },
  th: {
    pageTitle: 'จัดการการเช็คอิน',
    pageSubtitle: 'อัตราเช็คอินของนักเรียนที่ใช้งาน · แยกตามตำแหน่ง / ทีม / ระยะเวลา',
    loadingTeams: 'กำลังโหลดข้อมูลทีม…',
    summaryLoadFailed: 'โหลดข้อมูลสรุปล้มเหลว',
    checkBackend: 'กรุณาตรวจสอบว่าบริการแบ็กเอนด์ทำงานอยู่',
    tabs: {
      overview: 'ภาพรวม',
      insights: 'ข้อมูลเชิงลึกนักเรียน',
      leaderboard: 'กระดานผู้นำ',
      action: 'ศูนย์ปฏิบัติการ',
      roi: 'การวิเคราะห์ ROI',
    },
    exportCols: {
      role: 'ตำแหน่ง',
      team: 'ทีม',
      students: 'นักเรียน',
      checked_in: 'เช็คอินแล้ว',
      rate: 'อัตราเช็คอิน',
    },
    exportFilename: 'checkin-summary',
  },
};

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
  { id: 'overview' },
  { id: 'insights' },
  { id: 'leaderboard' },
  { id: 'action' },
  { id: 'roi' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── 主页面（内部，需要 useSearchParams）────────────────────────────────────────

function CheckinPageInner() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRoles, roleEnclosures } = useWideConfig();

  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });

  const { focusCC } = useMyView();

  // ── 智能默认 Tab ──────────────────────────────────────────────────────────
  function resolveDefaultTab(): TabId {
    const explicit = searchParams.get('tab');
    if (explicit) return explicit as TabId;
    if (searchParams.get('cc')) return 'action';
    if (searchParams.get('team') && !searchParams.get('cc')) return 'leaderboard';
    return 'overview';
  }
  const activeTab = resolveDefaultTab();

  // ── 筛选状态（从 URL 读取，UI 由 UnifiedFilterBar 全局管理）──────────────
  const roleFilter: string = searchParams.get('role') || 'CC';
  const teamFilter: string = searchParams.get('team') || '';
  const enclosureFilter: string | null = searchParams.get('enclosure') || null;
  const ccSearch: string = searchParams.get('cc') || focusCC || '';

  // ── 汇总数据（导出 + 状态提示）───────────────────────────────────────────
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useFilteredSWR<CheckinSummaryResponse>('/api/checkin/summary');

  // ── 导出 ──────────────────────────────────────────────────────────────────
  const { exportCSV } = useExport();

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
        { key: 'role', label: t.exportCols.role },
        { key: 'team', label: t.exportCols.team },
        { key: 'students', label: t.exportCols.students },
        { key: 'checked_in', label: t.exportCols.checked_in },
        { key: 'rate', label: t.exportCols.rate },
      ],
      `${t.exportFilename}_${today}`
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* 标题行 */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="page-title">{t.pageTitle}</h1>
          <p className="text-sm text-secondary-token mt-0.5">{t.pageSubtitle}</p>
        </div>
        {activeTab === 'overview' && <ExportButton onExportCsv={handleExportSummary} />}
      </div>

      {/* ── 汇总数据状态提示 ── */}
      {summaryLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-token">
          <Spinner size="sm" />
          <span>{t.loadingTeams}</span>
        </div>
      )}
      {summaryError && (
        <div className="text-center py-4">
          <p className="text-sm font-semibold text-red-600">{t.summaryLoadFailed}</p>
          <p className="text-xs text-muted-token mt-1">{t.checkBackend}</p>
        </div>
      )}

      {/* ── Tab 导航（L2）── */}
      <PageTabs
        tabs={TABS.map((tab) => ({ id: tab.id, label: t.tabs[tab.id as keyof typeof t.tabs] }))}
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
