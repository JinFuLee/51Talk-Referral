'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandDot } from '@/components/ui/BrandDot';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { formatRate } from '@/lib/utils';
import { StudentRankingPanel } from './StudentRankingPanel';

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface RankingGroupRow {
  group: string;
  students: number;
  checked_in: number;
  rate: number;
  rank: number;
}

interface RankingPersonRow {
  name: string;
  group: string;
  students: number;
  checked_in: number;
  rate: number;
  rank: number;
}

interface RankingRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  by_group: RankingGroupRow[];
  by_person: RankingPersonRow[];
}

interface RankingResponse {
  by_role: Record<string, RankingRoleSummary>;
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

// ── 角色排行列 ────────────────────────────────────────────────────────────────

interface RoleColumnProps {
  role: string;
  summary: RankingRoleSummary;
  subTab: 'group' | 'person' | 'student';
  rateColor?: (rate: number) => string;
}

function RoleColumn({ role, summary, subTab, rateColor }: RoleColumnProps) {
  const rows = subTab === 'group' ? summary.by_group : summary.by_person;

  return (
    <div className="card-base flex flex-col min-w-[320px] flex-1 !p-0 overflow-hidden">
      {/* 角色标题 + 汇总 */}
      <div className="bg-[var(--n-800,#1e293b)] text-white text-xs font-semibold px-3 py-2 flex items-center justify-between">
        <span>{role}</span>
        <span
          className={`font-mono tabular-nums ${rateColor?.(summary.checkin_rate) ?? ''}`}
          style={{ color: 'inherit' }}
        >
          <span className="opacity-70">
            {fmtNum(summary.checked_in)}/{fmtNum(summary.total_students)}
          </span>
          <span className="ml-1.5">{formatRate(summary.checkin_rate)}</span>
        </span>
      </div>

      {/* 排行表 */}
      <div className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)]">暂无数据</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--n-200)] text-[var(--text-secondary)] text-xs font-semibold border-b border-[var(--border-default)]">
                <th className="py-1 px-2 text-center w-8">排名</th>
                <th className="py-1 px-2 text-left">{subTab === 'group' ? '团队' : '销售'}</th>
                {subTab === 'person' && (
                  <th className="py-1 px-2 text-left whitespace-nowrap">团队</th>
                )}
                <th className="py-1 px-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1">
                    有效学员
                    <BrandDot tooltip="已付费且在有效期内的学员数，是打卡运营的基数" />
                  </span>
                </th>
                <th className="py-1 px-2 text-right whitespace-nowrap">已打卡</th>
                <th className="py-1 px-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1">
                    打卡率
                    <BrandDot tooltip="转码且分享的学员/有效学员。绿≥50%，橙30-50%，红<30%" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const nameField =
                  subTab === 'group'
                    ? (row as RankingGroupRow).group
                    : (row as RankingPersonRow).name;
                const teamField = subTab === 'person' ? (row as RankingPersonRow).group : null;

                return (
                  <tr key={`${nameField}-${i}`} className="even:bg-[var(--bg-subtle)]">
                    <td className="py-1 px-2 text-center text-[var(--text-muted)] font-mono tabular-nums">
                      {row.rank}
                    </td>
                    <td
                      className="py-1 px-2 font-medium whitespace-nowrap min-w-[100px]"
                      title={nameField}
                    >
                      {nameField}
                    </td>
                    {subTab === 'person' && (
                      <td
                        className="py-1 px-2 text-[var(--text-muted)] whitespace-nowrap min-w-[80px]"
                        title={teamField ?? ''}
                      >
                        {teamField || '—'}
                      </td>
                    )}
                    <td className="py-1 px-2 text-right font-mono tabular-nums">
                      {fmtNum(row.students)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono tabular-nums">
                      {fmtNum(row.checked_in)}
                    </td>
                    <td
                      className={`py-1 px-2 text-right font-mono tabular-nums ${rateColor?.(row.rate) ?? ''}`}
                    >
                      {formatRate(row.rate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* 合计行 */}
            <tfoot>
              <tr className="bg-[var(--bg-subtle)] font-semibold border-t border-[var(--border-subtle)]">
                <td className="py-1 px-2 text-center text-[var(--text-muted)] text-xs">—</td>
                <td className="py-1 px-2 text-xs" colSpan={subTab === 'person' ? 2 : 1}>
                  合计
                </td>
                <td className="py-1 px-2 text-right font-mono tabular-nums text-xs">
                  {fmtNum(summary.total_students)}
                </td>
                <td className="py-1 px-2 text-right font-mono tabular-nums text-xs">
                  {fmtNum(summary.checked_in)}
                </td>
                <td
                  className={`py-1 px-2 text-right font-mono tabular-nums text-xs ${rateColor?.(summary.checkin_rate) ?? ''}`}
                >
                  {formatRate(summary.checkin_rate)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface RankingTabProps {
  enclosureFilter?: string | null;
}

export function RankingTab({ enclosureFilter }: RankingTabProps) {
  const { configJson, activeRoles } = useWideConfig();
  const { rateColor, legend } = useCheckinThresholds();
  const [subTab, setSubTab] = useState<'group' | 'person' | 'student'>('group');

  const { data, isLoading, error, mutate } = useSWR<RankingResponse>(
    `/api/checkin/ranking?role_config=${encodeURIComponent(configJson)}`,
    swrFetcher,
    { refreshInterval: 30_000 }
  );

  const SUB_TABS: { id: 'group' | 'person' | 'student'; label: string }[] = [
    { id: 'group', label: '小组排行' },
    { id: 'person', label: '个人排行' },
    { id: 'student', label: '学员' },
  ];

  return (
    <div className="space-y-4">
      {/* 子 Tab 切换 */}
      <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden text-xs font-medium w-fit">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-1.5 transition-colors whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-[var(--n-800,#1e293b)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 学员排行面板（独立 Tab） */}
      {subTab === 'student' && <StudentRankingPanel enclosureFilter={enclosureFilter} />}

      {/* 小组/个人排行（共用数据） */}
      {subTab !== 'student' && (
        <>
          {/* 加载态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--text-muted)]">
              <Spinner size="lg" />
              <span>加载排行数据…</span>
            </div>
          )}

          {/* 错误态 */}
          {error && !isLoading && (
            <EmptyState
              title="加载失败"
              description="无法获取打卡排行数据，请检查后端服务是否正常运行"
              action={{ label: '重试', onClick: () => mutate() }}
            />
          )}

          {/* 空态 */}
          {!isLoading && !error && !data && (
            <EmptyState
              title="暂无排行数据"
              description="上传围场打卡数据（D2）并完成分析后自动刷新"
            />
          )}

          {/* 排行列（按角色分列展示） */}
          {!isLoading && !error && data && (
            <>
              {Object.keys(data.by_role).length === 0 ? (
                <EmptyState
                  title="暂无排行数据"
                  description="当前围场配置下无可展示的角色排行，请检查围场角色分配设置"
                />
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {(activeRoles.length > 0
                    ? activeRoles.filter((r) => r in data.by_role)
                    : Object.keys(data.by_role)
                  ).map((role) => (
                    <RoleColumn
                      key={role}
                      role={role}
                      summary={data.by_role[role]}
                      subTab={subTab}
                      rateColor={rateColor}
                    />
                  ))}
                </div>
              )}

              {/* 图例 */}
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 opacity-70" />
                  {legend.good}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 opacity-70" />
                  {legend.warning}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400 opacity-70" />
                  {legend.bad}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
