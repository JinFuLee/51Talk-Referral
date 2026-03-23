'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTabs } from '@/components/ui/PageTabs';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { TeamDetailTab } from '@/components/checkin/TeamDetailTab';
import { FollowupTab } from '@/components/checkin/FollowupTab';
import { RankingTab } from '@/components/checkin/RankingTab';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { ContactConversionScatter } from '@/components/daily-monitor/ContactConversionScatter';
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

function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

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
          {fmtRate(ch.checkin_rate ?? 0)}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">有效学员 · 已打卡 · 打卡率</div>
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
                {fmtRate(row.rate)}
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
              <span className="col-span-2 text-[var(--text-secondary)]">{row.enclosure}</span>
              <span className="text-right text-[var(--text-primary)]">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor?.(row.rate) ?? '')}>
                {fmtRate(row.rate)}
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

  const { data, isLoading, error } = useSWR<CheckinSummaryResponse>(
    `/api/checkin/summary?role_config=${encodeURIComponent(configJson)}`,
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="数据加载失败" description="无法获取打卡汇总数据，请检查后端服务" />;
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

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function CheckinPage() {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const { activeRoles, roleEnclosures } = useWideConfig();

  const { data: scatterData } = useSWR<ContactConversionItem[]>(
    '/api/daily-monitor/contact-vs-conversion',
    swrFetcher
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">打卡管理</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          有效学员打卡率 · 按岗位 / 团队 / 围场拆分
        </p>
      </div>

      <PageTabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
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
