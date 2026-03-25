'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { OpsChannelView } from './OpsChannelView';
import { formatRate } from '@/lib/utils';

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface PersonRow {
  name: string;
  group: string;
  students: number;
  checked_in: number;
  rate: number;
  rank: number;
}

interface GroupRow {
  group: string;
  students: number;
  checked_in: number;
  rate: number;
  rank: number;
}

interface RoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  by_group: GroupRow[];
  by_person: PersonRow[];
}

interface RankingResponse {
  by_role: Record<string, RoleSummary>;
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

// ── 团队卡片 ─────────────────────────────────────────────────────────────────

interface TeamCardData {
  team: string;
  totalStudents: number;
  totalCheckedIn: number;
  checkinRate: number;
  members: PersonRow[];
}

interface TeamCardProps {
  card: TeamCardData;
  rateColor?: (r: number) => string;
  rateBg?: (r: number) => string;
}

function TeamCard({ card, rateColor, rateBg }: TeamCardProps) {
  // 短名：TH-CC01Team → CC01
  const shortName = card.team.replace(/^TH-/i, '').replace(/Team$/i, '');

  return (
    <div className="card-base overflow-hidden !p-0">
      {/* 卡片头部：团队名 + 汇总 */}
      <div className="bg-[var(--n-800,#1e293b)] text-white px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-bold">{shortName}</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="opacity-70 font-mono tabular-nums">
            {fmtNum(card.totalCheckedIn)}/{fmtNum(card.totalStudents)}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-xs font-bold border ${rateBg?.(card.checkinRate) ?? ''}`}
          >
            {formatRate(card.checkinRate)}
          </span>
        </div>
      </div>

      {/* 成员列表 */}
      {card.members.length === 0 ? (
        <div className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">暂无成员数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-xs font-semibold">
                <th className="py-1 px-2 text-center w-7">#</th>
                <th className="py-1 px-2 text-left">销售</th>
                <th className="py-1 px-2 text-right">学员</th>
                <th className="py-1 px-2 text-right">打卡</th>
                <th className="py-1 px-2 text-right">打卡率</th>
              </tr>
            </thead>
            <tbody>
              {card.members.map((m, i) => (
                <tr
                  key={m.name}
                  className="even:bg-[var(--bg-subtle)] hover:bg-action-accent-surface/50 transition-colors"
                >
                  <td className="py-1 px-2 text-center text-[var(--text-muted)] font-mono tabular-nums">
                    {i + 1}
                  </td>
                  <td
                    className="py-1 px-2 font-medium whitespace-nowrap min-w-[100px] text-[var(--text-primary)]"
                    title={m.name}
                  >
                    {m.name}
                  </td>
                  <td className="py-1 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {fmtNum(m.students)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {fmtNum(m.checked_in)}
                  </td>
                  <td
                    className={`py-1 px-2 text-right font-mono tabular-nums font-semibold ${rateColor?.(m.rate) ?? ''}`}
                  >
                    {formatRate(m.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--border-default)] font-semibold bg-[var(--bg-subtle)]">
                <td className="py-1.5 px-2 text-center text-[var(--text-muted)]">—</td>
                <td className="py-1.5 px-2 text-[var(--text-primary)]">小计</td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--text-primary)]">
                  {fmtNum(card.totalStudents)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--text-primary)]">
                  {fmtNum(card.totalCheckedIn)}
                </td>
                <td
                  className={`py-1.5 px-2 text-right font-mono tabular-nums font-semibold ${rateColor?.(card.checkinRate) ?? ''}`}
                >
                  {formatRate(card.checkinRate)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface TeamDetailTabProps {
  activeRoles?: string[];
  roleEnclosures?: Record<string, string[]>;
}

const ROLE_OPTIONS = ['CC', 'SS', 'LP', '运营'] as const;

export function TeamDetailTab({ activeRoles: _ar, roleEnclosures: _re }: TeamDetailTabProps) {
  const { configJson, activeRoles } = useWideConfig();
  const { rateColor, rateBg, legend } = useCheckinThresholds();

  // 可见角色（配置中有围场分配的）
  const visibleRoles = useMemo(
    () =>
      activeRoles.length > 0
        ? ROLE_OPTIONS.filter((r) => activeRoles.includes(r))
        : (['CC', 'SS', 'LP'] as const),
    [activeRoles]
  );

  const [selectedRole, setSelectedRole] = useState<string>(visibleRoles[0] ?? 'CC');

  // 一次请求获取全部数据（ranking API 已按角色/团队/个人聚合）
  const { data, isLoading, error } = useSWR<RankingResponse>(
    `/api/checkin/ranking?role_config=${encodeURIComponent(configJson)}`,
    swrFetcher,
    { refreshInterval: 30_000 }
  );

  // 将 by_person 按 group 分组为卡片数据
  const teamCards: TeamCardData[] = useMemo(() => {
    if (!data?.by_role?.[selectedRole]) return [];
    const roleSummary = data.by_role[selectedRole];
    const persons = roleSummary.by_person ?? [];

    // 按 group 分桶
    const groupMap = new Map<string, PersonRow[]>();
    for (const p of persons) {
      const g = p.group || '未分组';
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(p);
    }

    // 用 by_group 的排序（已按 rate DESC）确定卡片顺序
    const groupOrder = (roleSummary.by_group ?? []).map((g) => g.group);
    const orderedKeys = [
      ...groupOrder.filter((g) => groupMap.has(g)),
      ...[...groupMap.keys()].filter((g) => !groupOrder.includes(g)),
    ];

    return orderedKeys.map((team) => {
      const members = groupMap.get(team) ?? [];
      // 组内按 rate DESC → checked_in DESC
      members.sort((a, b) => b.rate - a.rate || b.checked_in - a.checked_in);
      const totalStudents = members.reduce((s, m) => s + m.students, 0);
      const totalCheckedIn = members.reduce((s, m) => s + m.checked_in, 0);
      return {
        team,
        totalStudents,
        totalCheckedIn,
        checkinRate: totalStudents > 0 ? totalCheckedIn / totalStudents : 0,
        members,
      };
    });
  }, [data, selectedRole]);

  // 当前角色汇总
  const roleSummary = data?.by_role?.[selectedRole];

  return (
    <div className="space-y-4">
      {/* 角色选择器 */}
      <div className="flex items-center gap-1.5">
        {visibleRoles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedRole === role
                ? 'bg-[var(--n-800,#1e293b)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
            }`}
          >
            {role}
          </button>
        ))}

        {/* 角色汇总 */}
        {roleSummary && (
          <span className="ml-auto text-xs text-[var(--text-muted)] font-mono tabular-nums">
            {fmtNum(roleSummary.checked_in)}/{fmtNum(roleSummary.total_students)}{' '}
            <span className={`font-semibold ${rateColor?.(roleSummary.checkin_rate) ?? ''}`}>
              {formatRate(roleSummary.checkin_rate)}
            </span>
          </span>
        )}
      </div>

      {/* 运营角色：渠道触达视图 */}
      {selectedRole === '运营' ? (
        <OpsChannelView configJson={configJson} />
      ) : (
        <>
          {/* 加载态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--text-muted)]">
              <Spinner size="lg" />
            </div>
          )}

          {/* 错误态 */}
          {error && !isLoading && (
            <EmptyState title="加载失败" description="无法获取打卡数据，请检查后端服务" />
          )}

          {/* 空态 */}
          {!isLoading && !error && teamCards.length === 0 && (
            <EmptyState
              title={`${selectedRole} 暂无团队打卡数据`}
              description="上传围场过程数据（D3）并运行分析后自动刷新"
            />
          )}

          {/* 团队卡片网格：2-3 列自适应 */}
          {!isLoading && !error && teamCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {teamCards.map((card) => (
                <TeamCard key={card.team} card={card} rateColor={rateColor} rateBg={rateBg} />
              ))}
            </div>
          )}

          {/* 图例 */}
          {!isLoading && !error && teamCards.length > 0 && (
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
          )}
        </>
      )}
    </div>
  );
}
