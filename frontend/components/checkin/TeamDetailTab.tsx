'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { useWideConfig } from '@/lib/hooks/useWideConfig';

// ── 团队列表（value 与后端 D3 group_name 一致）──────────────────────────────
const TEAM_OPTIONS = [
  // CC 团队
  { value: 'TH-CC01Team', label: 'CC01', group: 'CC' },
  { value: 'TH-CC02Team', label: 'CC02', group: 'CC' },
  { value: 'TH-CC03Team', label: 'CC03', group: 'CC' },
  { value: 'TH-CC04Team', label: 'CC04', group: 'CC' },
  { value: 'TH-CC05Team', label: 'CC05', group: 'CC' },
  { value: 'TH-CC06Team', label: 'CC06', group: 'CC' },
  { value: 'TH-CC15Team', label: 'CC15', group: 'CC' },
  // SS 团队
  { value: 'TH-SS01Team', label: 'SS01', group: 'SS' },
  { value: 'TH-SS02Team', label: 'SS02', group: 'SS' },
  { value: 'TH-SS03Team', label: 'SS03', group: 'SS' },
  { value: 'TH-SS04Team', label: 'SS04', group: 'SS' },
  // LP 团队
  { value: 'TH-LP01Team', label: 'LP01', group: 'LP' },
  { value: 'TH-LP02Team', label: 'LP02', group: 'LP' },
  { value: 'TH-LP03Team', label: 'LP03', group: 'LP' },
];

// ── 类型定义 ──────────────────────────────────────────────────────────────────

// 后端 by_enclosure 按围场分组的明细
interface EnclosureRow {
  enclosure: string;
  students: number;
  checked_in: number;
  rate: number;
}

// 后端 member 字段：total_students / checked_in / rate（无 monthly 历史）
interface CheckinPersonRow {
  name: string;
  total_students: number; // 后端字段
  checked_in: number;
  rate: number; // 后端字段名（打卡率 0~1）
  by_enclosure: EnclosureRow[];
}

interface TeamDetailResponse {
  team: string;
  members: CheckinPersonRow[];
  // 后端目前不返回 summary / month_labels，前端自行派生
}

// ── 打卡率颜色编码 ─────────────────────────────────────────────────────────────
function rateColor(rate: number): string {
  if (rate >= 0.6) return 'text-green-600 font-semibold';
  if (rate >= 0.4) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function fmtRate(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

// ── 组件 ──────────────────────────────────────────────────────────────────────
interface TeamDetailTabProps {
  activeRoles?: string[];
  roleEnclosures?: Record<string, string[]>;
}

export function TeamDetailTab({
  activeRoles: activeRolesProp,
  roleEnclosures: roleEnclosuresProp,
}: TeamDetailTabProps) {
  const { configJson, activeRoles: hookActiveRoles } = useWideConfig();

  // 优先使用 hook 内部读取的值，props 作为备用
  const activeRoles = hookActiveRoles.length > 0 ? hookActiveRoles : (activeRolesProp ?? []);
  void roleEnclosuresProp; // 预留：可用于围场维度筛选

  // 只显示配置中有围场分配的角色的团队
  const visibleGroups =
    activeRoles.length > 0
      ? (['CC', 'SS', 'LP'] as const).filter((g) => activeRoles.includes(g))
      : (['CC', 'SS', 'LP'] as const);
  const visibleTeams = TEAM_OPTIONS.filter((o) =>
    visibleGroups.includes(o.group as 'CC' | 'SS' | 'LP')
  );
  const [selectedTeam, setSelectedTeam] = useState<string>(
    visibleTeams[0]?.value ?? TEAM_OPTIONS[0].value
  );

  const { data, error, isLoading } = useSWR<TeamDetailResponse>(
    `/api/checkin/team-detail?team=${encodeURIComponent(selectedTeam)}&role_config=${encodeURIComponent(configJson)}`,
    swrFetcher,
    { refreshInterval: 30_000 }
  );

  const members = data?.members ?? [];

  // 从 members 派生团队汇总（后端不返回 summary 字段）
  const summary =
    members.length > 0
      ? (() => {
          const totalStudents = members.reduce((s, m) => s + m.total_students, 0);
          const totalCheckedIn = members.reduce((s, m) => s + m.checked_in, 0);
          return {
            total_students: totalStudents,
            total_checked_in: totalCheckedIn,
            checkin_rate: totalStudents > 0 ? totalCheckedIn / totalStudents : 0,
          };
        })()
      : null;

  return (
    <div className="space-y-3">
      {/* 团队选择器 — 按配置中有效的角色分组 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleGroups.map((group, gi) => (
          <div key={group} className="contents">
            {gi > 0 && <span className="text-[var(--text-muted)] text-xs mx-1">|</span>}
            <span className="text-[10px] text-[var(--text-muted)] font-medium mr-0.5">{group}</span>
            {TEAM_OPTIONS.filter((o) => o.group === group).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedTeam(opt.value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selectedTeam === opt.value
                    ? 'bg-[var(--n-800)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* 加载态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-[var(--text-muted)]">
          <Spinner size="sm" />
          <span>加载中…</span>
        </div>
      )}

      {/* 错误态 */}
      {error && !isLoading && (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
          数据加载失败，请稍后刷新重试
        </div>
      )}

      {/* 空态 */}
      {!isLoading && !error && members.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
          暂无{TEAM_OPTIONS.find((o) => o.value === selectedTeam)?.label ?? selectedTeam}
          团队打卡数据
          <p className="mt-1 text-xs">请确认已上传围场过程数据（D2）并运行分析</p>
        </div>
      )}

      {/* 数据表格 */}
      {!isLoading && !error && members.length > 0 && (
        <div className="overflow-x-auto rounded border border-slate-100">
          <table className="w-full text-sm">
            {/* 表头 */}
            <thead>
              <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                <th className="py-1.5 px-2 border-0 text-center whitespace-nowrap w-10">排名</th>
                <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">销售</th>
                <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">有效学员</th>
                <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">已打卡</th>
                <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">打卡率</th>
              </tr>
            </thead>

            {/* 数据行 */}
            <tbody>
              {members.map((row, i) => (
                <tr key={row.name} className="even:bg-[var(--bg-subtle)]">
                  <td className="py-1 px-2 text-xs text-center text-[var(--text-muted)] font-mono tabular-nums">
                    {i + 1}
                  </td>
                  <td className="py-1 px-2 text-xs font-medium whitespace-nowrap">{row.name}</td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(row.total_students)}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(row.checked_in)}
                  </td>
                  <td
                    className={`py-1 px-2 text-xs text-right font-mono tabular-nums ${rateColor(row.rate)}`}
                  >
                    {fmtRate(row.rate)}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* 汇总行 */}
            {summary && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold border-t border-slate-200">
                  <td className="py-1.5 px-2 text-xs text-center text-[var(--text-muted)]">—</td>
                  <td className="py-1.5 px-2 text-xs">团队合计</td>
                  <td className="py-1.5 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(summary.total_students)}
                  </td>
                  <td className="py-1.5 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(summary.total_checked_in)}
                  </td>
                  <td
                    className={`py-1.5 px-2 text-xs text-right font-mono tabular-nums ${rateColor(summary.checkin_rate)}`}
                  >
                    {fmtRate(summary.checkin_rate)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 图例说明 */}
      {!isLoading && !error && members.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 opacity-70" />
            ≥60% 达标
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 opacity-70" />
            40–60% 接近
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400 opacity-70" />
            &lt;40% 落后
          </span>
        </div>
      )}
    </div>
  );
}
