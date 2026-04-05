'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandDot } from '@/components/ui/BrandDot';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { formatRate } from '@/lib/utils';
import { OpsChannelView } from './OpsChannelView';
import { CCStudentDrilldown } from './CCStudentDrilldown';

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

// ── 角色排行列（小组/个人模式）────────────────────────────────────────────────

interface RoleColumnProps {
  role: string;
  summary: RankingRoleSummary;
  subTab: 'group' | 'person';
  rateColor?: (rate: number) => string;
}

function RoleColumn({ role, summary, subTab, rateColor }: RoleColumnProps) {
  const t = useTranslations('RankingTab');
  const rows = subTab === 'group' ? summary.by_group : summary.by_person;

  return (
    <div className="card-base flex flex-col min-w-[320px] flex-1 !p-0 overflow-hidden">
      {/* 角色标题 + 汇总 */}
      <div className="bg-n-800 text-white text-xs font-semibold px-3 py-2 flex items-center justify-between">
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
          <div className="py-6 text-center text-xs text-muted-token">{t('noData')}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-n-200 text-secondary-token text-xs font-semibold border-b border-default-token">
                <th className="py-1 px-2 text-center w-8">{t('rank')}</th>
                <th className="py-1 px-2 text-left">{subTab === 'group' ? t('team') : t('sales')}</th>
                {subTab === 'person' && (
                  <th className="py-1 px-2 text-left whitespace-nowrap">{t('team')}</th>
                )}
                <th className="py-1 px-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1">
                    {t('validStudents')}
                    <BrandDot tooltip={t('validStudentsTooltip')} />
                  </span>
                </th>
                <th className="py-1 px-2 text-right whitespace-nowrap">{t('checkedIn')}</th>
                <th className="py-1 px-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1">
                    {t('checkinRate')}
                    <BrandDot tooltip={t('checkinRateTooltip')} />
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
                  <tr key={`${nameField}-${i}`} className="even:bg-subtle">
                    <td className="py-1 px-2 text-center text-muted-token font-mono tabular-nums">
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
                        className="py-1 px-2 text-muted-token whitespace-nowrap min-w-[80px]"
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
              <tr className="bg-subtle font-semibold border-t border-subtle-token">
                <td className="py-1 px-2 text-center text-muted-token text-xs">—</td>
                <td className="py-1 px-2 text-xs" colSpan={subTab === 'person' ? 2 : 1}>
                  {t('total')}
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

// ── 团队卡片（从 TeamDetailTab 合并）─────────────────────────────────────────

interface TeamCardData {
  team: string;
  totalStudents: number;
  totalCheckedIn: number;
  checkinRate: number;
  members: RankingPersonRow[];
}

interface TeamCardProps {
  card: TeamCardData;
  rateColor?: (r: number) => string;
  rateBg?: (r: number) => string;
}

function TeamCard({ card, rateColor, rateBg }: TeamCardProps) {
  const t = useTranslations('RankingTab');
  const shortName = card.team.replace(/^TH-/i, '').replace(/Team$/i, '');
  const [expandedCC, setExpandedCC] = useState<string | null>(null);

  return (
    <div className="card-base overflow-hidden !p-0">
      {/* 卡片头部 */}
      <div className="bg-n-800 text-white px-3 py-2 flex items-center justify-between">
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
        <div className="px-3 py-4 text-xs text-muted-token text-center">{t('noMembers')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-subtle text-muted-token text-xs font-semibold">
                <th className="py-1 px-2 text-center w-7">#</th>
                <th className="py-1 px-2 text-left">{t('sales')}</th>
                <th className="py-1 px-2 text-right">{t('validStudents')}</th>
                <th className="py-1 px-2 text-right">{t('checkedIn')}</th>
                <th className="py-1 px-2 text-right">{t('checkinRate')}</th>
              </tr>
            </thead>
            <tbody>
              {card.members.map((m, i) => (
                <React.Fragment key={m.name}>
                  <tr
                    onClick={() => setExpandedCC(expandedCC === m.name ? null : m.name)}
                    className={`cursor-pointer even:bg-subtle hover:bg-action-accent-surface/50 transition-colors ${
                      expandedCC === m.name ? 'border-l-2 border-accent-token' : ''
                    }`}
                  >
                    <td className="py-1 px-2 text-center text-muted-token font-mono tabular-nums">
                      {i + 1}
                    </td>
                    <td
                      className="py-1 px-2 font-medium whitespace-nowrap min-w-[100px] text-primary-token"
                      title={m.name}
                    >
                      {m.name}
                      {expandedCC === m.name && <span className="ml-1.5 text-muted-token">▲</span>}
                    </td>
                    <td className="py-1 px-2 text-right font-mono tabular-nums text-secondary-token">
                      {fmtNum(m.students)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono tabular-nums text-secondary-token">
                      {fmtNum(m.checked_in)}
                    </td>
                    <td
                      className={`py-1 px-2 text-right font-mono tabular-nums font-semibold ${rateColor?.(m.rate) ?? ''}`}
                    >
                      {formatRate(m.rate)}
                    </td>
                  </tr>
                  {expandedCC === m.name && (
                    <tr>
                      <td colSpan={5}>
                        <CCStudentDrilldown ccName={expandedCC} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-default-token font-semibold bg-subtle">
                <td className="py-1.5 px-2 text-center text-muted-token">—</td>
                <td className="py-1.5 px-2 text-primary-token">{t('subtotal')}</td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-primary-token">
                  {fmtNum(card.totalStudents)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-primary-token">
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

interface RankingTabProps {
  roleFilter?: string;
  activeRoles?: string[];
  roleEnclosures?: Record<string, string[]>;
  enclosureFilter?: string | null;
}

export function RankingTab({ roleFilter = 'CC', enclosureFilter }: RankingTabProps) {
  const { configJson, activeRoles } = useWideConfig();
  const { rateColor, rateBg, legend } = useCheckinThresholds();
  const [subTab, setSubTab] = useState<'group' | 'person'>('group');

  const rankingUrl = useMemo(() => {
    let url = `/api/checkin/ranking?role_config=${encodeURIComponent(configJson)}`;
    if (enclosureFilter) {
      url += `&enclosure=${encodeURIComponent(enclosureFilter)}`;
    }
    return url;
  }, [configJson, enclosureFilter]);

  const { data, isLoading, error, mutate } = useFilteredSWR<RankingResponse>(rankingUrl, {
    refreshInterval: 30_000,
  });

  // 团队卡片数据（仅当 subTab === 'person' 时渲染）
  const teamCards: TeamCardData[] = useMemo(() => {
    if (!data?.by_role?.[roleFilter]) return [];
    const roleSummary = data.by_role[roleFilter];
    const persons = roleSummary.by_person ?? [];

    const groupMap = new Map<string, RankingPersonRow[]>();
    for (const p of persons) {
      const g = p.group || '未分组';
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(p);
    }

    const groupOrder = (roleSummary.by_group ?? []).map((g) => g.group);
    const orderedKeys = [
      ...groupOrder.filter((g) => groupMap.has(g)),
      ...[...groupMap.keys()].filter((g) => !groupOrder.includes(g)),
    ];

    return orderedKeys.map((team) => {
      const members = groupMap.get(team) ?? [];
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
  }, [data, roleFilter]);

  const t = useTranslations('RankingTab');

  const SUB_TABS: { id: 'group' | 'person'; label: string }[] = [
    { id: 'group', label: t('subTabGroup') },
    { id: 'person', label: t('subTabPerson') },
  ];

  // 运营角色：渠道触达视图
  if (roleFilter === '运营') {
    return <OpsChannelView configJson={configJson} />;
  }

  return (
    <div className="space-y-4">
      {/* 子 Tab 切换 + 围场徽章 */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-subtle-token overflow-hidden text-xs font-medium w-fit">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`px-4 py-1.5 transition-colors whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-n-800 text-white'
                  : 'bg-surface text-secondary-token hover:bg-subtle'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {enclosureFilter && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-warning-surface text-warning-token text-xs font-medium">
            {enclosureFilter}
          </span>
        )}
      </div>

      {/* 加载态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-token">
          <Spinner size="lg" />
          <span>{t('loading')}</span>
        </div>
      )}

      {/* 错误态 */}
      {error && !isLoading && (
        <EmptyState
          title={t('loadError')}
          description={t('loadErrorDesc')}
          action={{ label: t('retry'), onClick: () => mutate() }}
        />
      )}

      {/* 空态 */}
      {!isLoading && !error && !data && (
        <EmptyState title={t('noRankData')} description={t('noRankDataDesc')} />
      )}

      {/* 排行数据 */}
      {!isLoading && !error && data && (
        <>
          {Object.keys(data.by_role).length === 0 ? (
            <EmptyState title={t('noRoleData')} description={t('noRoleDataDesc')} />
          ) : (
            <>
              {/* subTab=group: 按角色分列（由 roleFilter 限定只显示当前角色） */}
              {subTab === 'group' && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {(activeRoles.length > 0
                    ? activeRoles.filter((r) => r in data.by_role)
                    : Object.keys(data.by_role)
                  )
                    .filter((r) => r === roleFilter || !roleFilter)
                    .map((role) => (
                      <RoleColumn
                        key={role}
                        role={role}
                        summary={data.by_role[role]}
                        subTab="group"
                        rateColor={rateColor}
                      />
                    ))}
                </div>
              )}

              {/* subTab=person: 个人排行 + 团队卡片 */}
              {subTab === 'person' && (
                <div className="space-y-8">
                  {/* 个人排行表 */}
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {(activeRoles.length > 0
                      ? activeRoles.filter((r) => r in data.by_role)
                      : Object.keys(data.by_role)
                    )
                      .filter((r) => r === roleFilter || !roleFilter)
                      .map((role) => (
                        <RoleColumn
                          key={role}
                          role={role}
                          summary={data.by_role[role]}
                          subTab="person"
                          rateColor={rateColor}
                        />
                      ))}
                  </div>

                  {/* 团队卡片网格 */}
                  {teamCards.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-secondary-token uppercase tracking-wider mb-3">
                        {t('teamCards')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {teamCards.map((card) => (
                          <TeamCard
                            key={card.team}
                            card={card}
                            rateColor={rateColor}
                            rateBg={rateBg}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 图例 */}
          <div className="flex items-center gap-4 text-xs text-muted-token pt-1">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success-token opacity-70" />
              {legend.good}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-warning-token opacity-70" />
              {legend.warning}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-danger-token opacity-70" />
              {legend.bad}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
