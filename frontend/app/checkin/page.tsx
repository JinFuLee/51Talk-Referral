'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTabs } from '@/components/ui/PageTabs';
import { cn } from '@/lib/utils';
import { TeamDetailTab } from '@/components/checkin/TeamDetailTab';
import { FollowupTab } from '@/components/checkin/FollowupTab';

// ── 类型定义 ───────────────────────────────────────────────────────────────────

interface FlatCheckinRow {
  enclosure: string;
  enclosure_raw: string;
  cc_name: string;
  cc_group: string;
  students: number;
  checkin_rate: number;
  checked_in: number;
  participation_rate: number;
  new_coefficient: number;
  cargo_ratio: number;
  cc_reach_rate: number;
  ss_reach_rate: number;
  lp_reach_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

interface FlatRowsResponse {
  rows: FlatCheckinRow[];
  total: number;
}

// ── Tab 定义 ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary', label: '汇总视图' },
  { id: 'team_detail', label: '团队明细' },
  { id: 'followup', label: '未打卡跟进' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── 格式化工具 ────────────────────────────────────────────────────────────────

function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function checkinRateCell(rate: number): string {
  if (rate >= 0.6) return 'text-green-700 font-semibold';
  if (rate >= 0.4) return 'text-yellow-700 font-semibold';
  return 'text-red-600 font-semibold';
}

// 围场顺序
const ENCLOSURE_ORDER = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6+'];
const ENCLOSURE_ALL = ['全部', ...ENCLOSURE_ORDER];

// ── Tab 1: 汇总视图（全维度表格）────────────────────────────────────────────

function SummaryTab() {
  const [enclosureFilter, setEnclosureFilter] = useState<string>('全部');
  const [groupFilter, setGroupFilter] = useState<string>('全部');

  const { data, isLoading, error } = useSWR<FlatRowsResponse>('/api/checkin/flat-rows', swrFetcher);

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

  const allRows = data?.rows ?? [];

  if (allRows.length === 0) {
    return <EmptyState title="暂无打卡数据" description="上传包含打卡记录的数据文件后自动刷新" />;
  }

  // 提取团队列表（保留顺序去重）
  const allGroups = Array.from(new Set(allRows.map((r) => r.cc_group))).sort();
  const groupOptions = ['全部', ...allGroups];

  // 筛选
  const rows = allRows.filter((r) => {
    if (enclosureFilter !== '全部' && r.enclosure !== enclosureFilter) return false;
    if (groupFilter !== '全部' && r.cc_group !== groupFilter) return false;
    return true;
  });

  // 底部汇总
  const totalStudents = rows.reduce((s, r) => s + r.students, 0);
  const totalCheckedIn = rows.reduce((s, r) => s + r.checked_in, 0);
  const weightedRate = totalStudents > 0 ? totalCheckedIn / totalStudents : 0;
  const totalRegistrations = rows.reduce((s, r) => s + r.registrations, 0);
  const totalPayments = rows.reduce((s, r) => s + r.payments, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue_usd, 0);

  return (
    <div className="space-y-3">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 围场按钮组 */}
        <div className="flex flex-wrap gap-1">
          {ENCLOSURE_ALL.map((enc) => (
            <button
              key={enc}
              onClick={() => setEnclosureFilter(enc)}
              className={cn(
                'px-2 py-0.5 text-xs rounded border transition-colors',
                enclosureFilter === enc
                  ? 'bg-[var(--n-800,#1e293b)] text-white border-[var(--n-800,#1e293b)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--n-600)]'
              )}
            >
              {enc}
            </button>
          ))}
        </div>

        {/* 团队下拉 */}
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="text-xs border border-[var(--border-default)] rounded px-2 py-1 bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none"
        >
          {groupOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <span className="text-xs text-[var(--text-muted)] ml-auto">
          {rows.length} 条 / 共 {allRows.length} 条
        </span>
      </div>

      {/* 全维度表格 */}
      <div className="overflow-x-auto rounded-md border border-[var(--border-default)]">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[var(--n-800,#1e293b)] text-white">
              <th className="px-2 py-1.5 text-left whitespace-nowrap">围场</th>
              <th className="px-2 py-1.5 text-left whitespace-nowrap">CC</th>
              <th className="px-2 py-1.5 text-left whitespace-nowrap">团队</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap font-mono">有效学员</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap font-mono">已打卡</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap">打卡率</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap">参与率</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap font-mono">带新系数</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap">带货比</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap">CC触达率</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap">SS触达率</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap">LP触达率</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap font-mono">注册数</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap font-mono">付费数</th>
              <th className="px-2 py-1.5 text-right whitespace-nowrap font-mono">业绩(USD)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-8 text-[var(--text-muted)]">
                  暂无符合筛选条件的数据
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={`${row.cc_name}-${row.enclosure_raw}-${i}`}
                  className={cn(
                    'border-t border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]',
                    i % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-subtle)]'
                  )}
                >
                  <td className="px-2 py-1 whitespace-nowrap text-[var(--text-secondary)]">
                    {row.enclosure}
                  </td>
                  <td
                    className="px-2 py-1 whitespace-nowrap text-[var(--text-primary)] font-medium max-w-[100px] truncate"
                    title={row.cc_name}
                  >
                    {row.cc_name}
                  </td>
                  <td
                    className="px-2 py-1 whitespace-nowrap text-[var(--text-secondary)] max-w-[80px] truncate"
                    title={row.cc_group}
                  >
                    {row.cc_group}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--text-primary)]">
                    {fmtNum(row.students)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--text-primary)]">
                    {fmtNum(row.checked_in)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1 text-right tabular-nums',
                      checkinRateCell(row.checkin_rate)
                    )}
                  >
                    {fmtRate(row.checkin_rate)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]">
                    {fmtRate(row.participation_rate)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {row.new_coefficient.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]">
                    {fmtRate(row.cargo_ratio)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]">
                    {fmtRate(row.cc_reach_rate)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]">
                    {fmtRate(row.ss_reach_rate)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]">
                    {fmtRate(row.lp_reach_rate)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--text-primary)]">
                    {fmtNum(row.registrations)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--text-primary)]">
                    {fmtNum(row.payments)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--text-primary)]">
                    {fmtUsd(row.revenue_usd)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* 汇总行 */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--n-800,#1e293b)] text-white font-bold border-t-2 border-[var(--border-default)]">
                <td className="px-2 py-1.5 whitespace-nowrap" colSpan={3}>
                  合计 ({rows.length} 行)
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtNum(totalStudents)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtNum(totalCheckedIn)}
                </td>
                <td
                  className={cn(
                    'px-2 py-1.5 text-right tabular-nums',
                    checkinRateCell(weightedRate)
                  )}
                >
                  {fmtRate(weightedRate)}
                </td>
                <td className="px-2 py-1.5" colSpan={6} />
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtNum(totalRegistrations)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtNum(totalPayments)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtUsd(totalRevenue)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
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
