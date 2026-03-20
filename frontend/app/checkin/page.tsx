'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTabs } from '@/components/ui/PageTabs';
import { cn } from '@/lib/utils';
import { TeamDetailTab } from '@/components/checkin/TeamDetailTab';
import { FollowupTab } from '@/components/checkin/FollowupTab';

// ── 宽口径配置读取 ─────────────────────────────────────────────────────────────

const ENCLOSURE_KEYS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6+'] as const;
type EnclosureMonth = (typeof ENCLOSURE_KEYS)[number];
type Role = 'CC' | 'SS' | 'LP' | '运营';
type EnclosureRoleAssignment = Record<EnclosureMonth, Role[]>;

// 宽口径默认值（与 EnclosureRoleCard 保持同步）
const DEFAULT_WIDE: EnclosureRoleAssignment = {
  M0: ['CC'],
  M1: ['CC'],
  M2: ['CC'],
  M3: ['SS'],
  M4: ['LP'],
  M5: ['LP'],
  'M6+': ['运营'],
};

/**
 * 从 localStorage 读取宽口径配置，转换为后端期望的格式：
 * { CC: {min_days, max_days}, SS: {...}, ... }
 *
 * 后端 _load_role_assignment 会读取 config.json 的 enclosure_role_wide，
 * 但前端保存的配置优先级更高——通过 query param `role_config` 传入后端。
 */
function loadWideConfig(): Record<string, { min_days: number; max_days: number | null }> {
  let assignment: EnclosureRoleAssignment = DEFAULT_WIDE;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('enclosure_role_wide');
      if (raw) assignment = JSON.parse(raw) as EnclosureRoleAssignment;
    } catch {
      // fallback to default
    }
  }

  // M 月份 → 天数范围映射（与后端 _ENCLOSURE_BANDS 对齐）
  const M_TO_DAYS: Record<string, { min: number; max: number | null }> = {
    M0: { min: 0, max: 30 },
    M1: { min: 31, max: 60 },
    M2: { min: 61, max: 90 },
    M3: { min: 91, max: 120 },
    M4: { min: 121, max: 150 },
    M5: { min: 151, max: 180 },
    'M6+': { min: 181, max: null },
  };

  // 将 assignment（月份→角色[]）反转为 角色→{min_days, max_days}
  // 每个角色取其覆盖的连续月份段的 min/max
  const roleToMonths: Record<string, EnclosureMonth[]> = {};
  for (const month of ENCLOSURE_KEYS) {
    const roles = assignment[month] ?? [];
    for (const role of roles) {
      if (!roleToMonths[role]) roleToMonths[role] = [];
      roleToMonths[role].push(month);
    }
  }

  const result: Record<string, { min_days: number; max_days: number | null }> = {};
  for (const [role, months] of Object.entries(roleToMonths)) {
    const dayRanges = months.map((m) => M_TO_DAYS[m]).filter(Boolean);
    if (dayRanges.length === 0) continue;
    const minDays = Math.min(...dayRanges.map((r) => r!.min));
    // 取最后一段的 max_days（连续段末尾，null 表示无上限）
    const sortedMonths = months
      .slice()
      .sort((a, b) => ENCLOSURE_KEYS.indexOf(a) - ENCLOSURE_KEYS.indexOf(b));
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const maxDays = M_TO_DAYS[lastMonth]?.max ?? null;
    result[role] = { min_days: minDays, max_days: maxDays };
  }

  return result;
}

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
  { id: 'team_detail', label: '团队明细' },
  { id: 'followup', label: '未打卡跟进' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── 打卡率颜色 ────────────────────────────────────────────────────────────────

function rateColor(rate: number): string {
  if (rate >= 0.6) return 'text-green-600';
  if (rate >= 0.4) return 'text-yellow-600';
  return 'text-red-500';
}

function rateBg(rate: number): string {
  if (rate >= 0.6) return 'bg-green-50 text-green-700';
  if (rate >= 0.4) return 'bg-yellow-50 text-yellow-700';
  return 'bg-red-50 text-red-500';
}

function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ── 单个渠道列 ────────────────────────────────────────────────────────────────

function ChannelColumn({ ch }: { ch: CheckinChannelSummary }) {
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
            rateBg(ch.checkin_rate)
          )}
        >
          {fmtRate(ch.checkin_rate)}
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
        {ch.by_team.length === 0 ? (
          <div className="text-[10px] text-[var(--text-muted)] px-2 py-2">暂无团队数据</div>
        ) : (
          ch.by_team.map((row, i) => (
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
              <span className={cn('text-right font-medium', rateColor(row.rate))}>
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
        {ch.by_enclosure.length === 0 ? (
          <div className="text-[10px] text-[var(--text-muted)] px-2 py-2">暂无围场数据</div>
        ) : (
          ch.by_enclosure.map((row, i) => (
            <div
              key={row.enclosure}
              className={cn(
                'grid grid-cols-4 gap-1 px-2 py-1 text-xs',
                i % 2 === 0 ? 'bg-[var(--bg-subtle)]' : 'bg-[var(--bg-surface)]'
              )}
            >
              <span className="col-span-2 text-[var(--text-secondary)]">{row.enclosure}</span>
              <span className="text-right text-[var(--text-primary)]">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor(row.rate))}>
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
  const [summaryUrl, setSummaryUrl] = useState<string | null>(null);

  // 构建 URL + 监听 localStorage 变化（Settings 页面保存后自动刷新）
  useEffect(() => {
    function buildUrl() {
      const cfg = loadWideConfig();
      const encoded = encodeURIComponent(JSON.stringify(cfg));
      setSummaryUrl(`/api/checkin/summary?role_config=${encoded}`);
    }
    buildUrl();

    // 监听 storage 事件（其他 tab 改了 localStorage）+ 自定义事件（同 tab）
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'enclosure_role_wide') buildUrl();
    };
    const onCustom = () => buildUrl();
    window.addEventListener('storage', onStorage);
    window.addEventListener('enclosure-role-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('enclosure-role-changed', onCustom);
    };
  }, []);

  const { data, isLoading, error } = useSWR<CheckinSummaryResponse>(
    summaryUrl, // null 时 SWR 不发请求，等 useEffect 完成后才触发
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

  // 将后端 by_role 对象转为前端渲染列表
  const byRole = data?.by_role ?? {};
  const channels: CheckinChannelSummary[] = Object.entries(byRole).map(([role, v]) => ({
    channel: role,
    total_students: v.total_students,
    total_checkin: v.checked_in,
    checkin_rate: v.checkin_rate,
    by_team: v.by_team,
    by_enclosure: v.by_enclosure,
  }));

  if (channels.length === 0) {
    return <EmptyState title="暂无打卡数据" description="上传包含打卡记录的数据文件后自动刷新" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {channels.map((ch) => (
        <ChannelColumn key={ch.channel} ch={ch} />
      ))}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function CheckinPage() {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">打卡管理</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          有效学员打卡率 · 按岗位 / 团队 / 围场拆分
        </p>
      </div>

      {/* Tab 切换 */}
      <PageTabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {/* Tab 内容 */}
      <div className="mt-2">
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'team_detail' && <TeamDetailTab />}
        {activeTab === 'followup' && <FollowupTab />}
      </div>
    </div>
  );
}
