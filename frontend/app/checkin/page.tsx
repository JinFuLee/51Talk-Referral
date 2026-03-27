'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTabs } from '@/components/ui/PageTabs';
import { Card } from '@/components/ui/Card';
import { cn, formatRate, fmtEnc } from '@/lib/utils';
import { TeamDetailTab } from '@/components/checkin/TeamDetailTab';
import { FollowupTab } from '@/components/checkin/FollowupTab';
import { RankingTab } from '@/components/checkin/RankingTab';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { ContactConversionScatter } from '@/components/daily-monitor/ContactConversionScatter';
import { ExportButton } from '@/components/ui/ExportButton';
import { useExport } from '@/lib/use-export';
import type { ContactConversionItem } from '@/lib/types/cross-analysis';

// ── 类型定义 ───────────────────────────────────────────────────────────────────

interface CheckinTeamRow {
  team: string;
  students: number;
  checked_in: number;
  rate: number; // 后端字段名
}

interface CheckinEnclosureRow {
  enclosure: string;
  students: number;
  checked_in: number;
  rate: number; // 后端字段名
}

interface CheckinRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

// 后端返回 { by_role: { CC: {...}, SS: {...}, LP: {...} } }
interface CheckinSummaryResponse {
  by_role: Record<string, CheckinRoleSummary>;
}

// 前端渲染用的规范化结构
interface CheckinChannelSummary {
  channel: string;
  total_students: number;
  total_checkin: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

// ── Tab 定义 ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary', label: '汇总视图' },
  { id: 'ranking', label: '打卡排行' },
  { id: 'team_detail', label: '团队明细' },
  { id: 'followup', label: '未打卡跟进' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── 工具函数 ──────────────────────────────────────────────────────────────────

// ── 单个渠道列 ────────────────────────────────────────────────────────────────

interface ChannelColumnProps {
  ch: CheckinChannelSummary;
  rateColor: (rate: number) => string;
  rateBg: (rate: number) => string;
}

function ChannelColumn({ ch, rateColor, rateBg }: ChannelColumnProps) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* 渠道标题 */}
      <div className="bg-[var(--n-800,#1e293b)] text-white text-xs font-semibold px-2 py-1.5 rounded-t-md">
        {ch.channel}
      </div>

      {/* 总体大数字 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md px-3 py-2.5 space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-[var(--text-primary)]">{ch.total_checkin}</span>
          <span className="text-xs text-[var(--text-muted)]">/ {ch.total_students} 人</span>
        </div>
        <div
          className={cn(
            'inline-block text-sm font-semibold px-1.5 py-0.5 rounded',
            rateBg(ch.checkin_rate ?? 0)
          )}
        >
          {formatRate(ch.checkin_rate ?? 0)}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          已打卡学员数 / 本渠道有效学员数（付费且在有效期）
        </div>
        <div className="text-[10px] text-[var(--text-muted)] opacity-75">
          颜色：绿≥50% · 橙30-50% · 红&lt;30%（可在设置调整）
        </div>
      </div>

      {/* 按团队 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md overflow-hidden">
        <div className="bg-[var(--n-800,#1e293b)] text-white text-[10px] font-semibold px-2 py-1 grid grid-cols-4 gap-1">
          <span className="col-span-2">团队</span>
          <span className="text-right">学员</span>
          <span className="text-right">打卡率</span>
        </div>
        {(ch.by_team ?? []).length === 0 ? (
          <div className="text-[10px] text-[var(--text-muted)] px-2 py-2">暂无团队数据</div>
        ) : (
          (ch.by_team ?? []).map((row, i) => (
            <div
              key={row.team}
              className={cn(
                'grid grid-cols-4 gap-1 px-2 py-1 text-xs',
                i % 2 === 0 ? 'bg-[var(--bg-subtle)]' : 'bg-[var(--bg-surface)]'
              )}
            >
              <span className="col-span-2 truncate text-[var(--text-secondary)]" title={row.team}>
                {row.team}
              </span>
              <span className="text-right text-[var(--text-primary)]">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor?.(row.rate) ?? '')}>
                {formatRate(row.rate)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 按围场 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md overflow-hidden">
        <div className="bg-[var(--n-800,#1e293b)] text-white text-[10px] font-semibold px-2 py-1 grid grid-cols-4 gap-1">
          <span className="col-span-2">围场</span>
          <span className="text-right">学员</span>
          <span className="text-right">打卡率</span>
        </div>
        {(ch.by_enclosure ?? []).length === 0 ? (
          <div className="text-[10px] text-[var(--text-muted)] px-2 py-2">暂无围场数据</div>
        ) : (
          (ch.by_enclosure ?? []).map((row, i) => (
            <div
              key={row.enclosure}
              className={cn(
                'grid grid-cols-4 gap-1 px-2 py-1 text-xs',
                i % 2 === 0 ? 'bg-[var(--bg-subtle)]' : 'bg-[var(--bg-surface)]'
              )}
            >
              <span className="col-span-2 text-[var(--text-secondary)]">
                {fmtEnc(row.enclosure)}
              </span>
              <span className="text-right text-[var(--text-primary)]">{row.students}</span>
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

// ── Tab 1: 汇总视图 ───────────────────────────────────────────────────────────

function SummaryTab() {
  const { configJson } = useWideConfig();
  const { rateColor, rateBg } = useCheckinThresholds();

  const { data, isLoading, error, mutate } = useFilteredSWR<CheckinSummaryResponse>(
    `/api/checkin/summary?role_config=${encodeURIComponent(configJson)}`
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
        title="数据加载失败"
        description="无法获取打卡汇总数据，请检查后端服务"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  // 将后端 by_role 对象转为前端渲染列表（过滤运营：运营有独立 OpsChannelView）
  const byRole = data?.by_role ?? {};
  const channels: CheckinChannelSummary[] = Object.entries(byRole)
    .filter(([role]) => role !== '运营')
    .map(([role, v]) => ({
      channel: role,
      total_students: v.total_students,
      total_checkin: v.checked_in,
      checkin_rate: v.checkin_rate,
      by_team: v.by_team ?? [],
      by_enclosure: v.by_enclosure ?? [],
    }));

  if (channels.length === 0) {
    return <EmptyState title="暂无打卡数据" description="上传包含打卡记录的数据文件后自动刷新" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {channels.map((ch) => (
        <ChannelColumn key={ch.channel} ch={ch} rateColor={rateColor} rateBg={rateBg} />
      ))}
    </div>
  );
}

// ── 主页面（内部，需要 useSearchParams）────────────────────────────────────────

function CheckinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'followup') as TabId;
  const { activeRoles, roleEnclosures } = useWideConfig();
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
            有效学员打卡率 · 按岗位 / 团队 / 围场拆分
          </p>
        </div>
        {activeTab === 'summary' && <ExportButton onExportCsv={handleExportSummary} />}
      </div>

      <PageTabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeTab}
        onChange={handleTabChange}
      />

      <div className="mt-2">
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'ranking' && <RankingTab />}
        {activeTab === 'team_detail' && (
          <TeamDetailTab activeRoles={activeRoles} roleEnclosures={roleEnclosures} />
        )}
        {activeTab === 'followup' && (
          <FollowupTab activeRoles={activeRoles} roleEnclosures={roleEnclosures} />
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
