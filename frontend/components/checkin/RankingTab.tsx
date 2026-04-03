'use client';

import React, { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandDot } from '@/components/ui/BrandDot';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { formatRate } from '@/lib/utils';
import { OpsChannelView } from './OpsChannelView';
import { CCStudentDrilldown } from './CCStudentDrilldown';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    noData: '暂无数据',
    rank: '排名',
    team: '团队',
    sales: '销售',
    validStudents: '有效学员',
    validStudentsTooltip: '已付费且在有效期内的学员数，是打卡运营的基数',
    checkedIn: '已打卡',
    checkinRate: '打卡率',
    checkinRateTooltip: '转码且分享的学员/有效学员。绿≥50%，橙30-50%，红<30%',
    total: '合计',
    noMembers: '暂无成员数据',
    subtotal: '小计',
    subTabGroup: '小组排行',
    subTabPerson: '个人排行 + 团队卡片',
    loading: '加载排行数据…',
    loadError: '加载失败',
    loadErrorDesc: '无法获取打卡排行数据，请检查后端服务是否正常运行',
    retry: '重试',
    noRankData: '暂无排行数据',
    noRankDataDesc: '上传围场打卡数据（D2）并完成分析后自动刷新',
    noRoleData: '暂无排行数据',
    noRoleDataDesc: '当前围场配置下无可展示的角色排行，请检查围场角色分配设置',
    teamCards: '团队卡片',
  },
  'zh-TW': {
    noData: '暫無數據',
    rank: '排名',
    team: '團隊',
    sales: '銷售',
    validStudents: '有效學員',
    validStudentsTooltip: '已付費且在有效期內的學員數，是打卡運營的基數',
    checkedIn: '已打卡',
    checkinRate: '打卡率',
    checkinRateTooltip: '轉碼且分享的學員/有效學員。綠≥50%，橙30-50%，紅<30%',
    total: '合計',
    noMembers: '暫無成員數據',
    subtotal: '小計',
    subTabGroup: '小組排行',
    subTabPerson: '個人排行 + 團隊卡片',
    loading: '載入排行數據…',
    loadError: '載入失敗',
    loadErrorDesc: '無法取得打卡排行數據，請檢查後端服務是否正常運行',
    retry: '重試',
    noRankData: '暫無排行數據',
    noRankDataDesc: '上傳圍場打卡數據（D2）並完成分析後自動刷新',
    noRoleData: '暫無排行數據',
    noRoleDataDesc: '目前圍場設定下無可展示的角色排行，請檢查圍場角色分配設定',
    teamCards: '團隊卡片',
  },
  en: {
    noData: 'No data',
    rank: 'Rank',
    team: 'Team',
    sales: 'Sales',
    validStudents: 'Valid Students',
    validStudentsTooltip: 'Paid and active students; base for check-in operations',
    checkedIn: 'Checked In',
    checkinRate: 'Check-in Rate',
    checkinRateTooltip:
      'Students who transcoded & shared / valid students. Green≥50%, Orange 30-50%, Red<30%',
    total: 'Total',
    noMembers: 'No member data',
    subtotal: 'Subtotal',
    subTabGroup: 'Group Ranking',
    subTabPerson: 'Individual Ranking + Team Cards',
    loading: 'Loading ranking data…',
    loadError: 'Load Failed',
    loadErrorDesc: 'Unable to fetch check-in ranking data, please check backend service',
    retry: 'Retry',
    noRankData: 'No ranking data',
    noRankDataDesc: 'Upload enclosure check-in data (D2) and complete analysis to refresh',
    noRoleData: 'No ranking data',
    noRoleDataDesc:
      'No role rankings available under current enclosure config; check role assignment',
    teamCards: 'Team Cards',
  },
  th: {
    noData: 'ไม่มีข้อมูล',
    rank: 'อันดับ',
    team: 'ทีม',
    sales: 'การขาย',
    validStudents: 'นักเรียนที่ใช้งานอยู่',
    validStudentsTooltip: 'นักเรียนที่ชำระเงินและยังอยู่ในช่วงใช้งาน',
    checkedIn: 'เช็คอินแล้ว',
    checkinRate: 'อัตราเช็คอิน',
    checkinRateTooltip:
      'นักเรียนที่แปลงโค้ดและแชร์ / นักเรียนที่ใช้งานอยู่ เขียว≥50% ส้ม30-50% แดง<30%',
    total: 'รวม',
    noMembers: 'ไม่มีข้อมูลสมาชิก',
    subtotal: 'ยอดรวมย่อย',
    subTabGroup: 'อันดับกลุ่ม',
    subTabPerson: 'อันดับบุคคล + การ์ดทีม',
    loading: 'กำลังโหลดข้อมูลอันดับ…',
    loadError: 'โหลดล้มเหลว',
    loadErrorDesc: 'ไม่สามารถดึงข้อมูลอันดับการเช็คอิน กรุณาตรวจสอบบริการ backend',
    retry: 'ลองใหม่',
    noRankData: 'ไม่มีข้อมูลอันดับ',
    noRankDataDesc: 'อัปโหลดข้อมูลเช็คอินคอก (D2) และวิเคราะห์เสร็จแล้วจะรีเฟรชอัตโนมัติ',
    noRoleData: 'ไม่มีข้อมูลอันดับ',
    noRoleDataDesc: 'ไม่มีอันดับบทบาทภายใต้การตั้งค่าคอกปัจจุบัน',
    teamCards: 'การ์ดทีม',
  },
} as const;

type RankingLocale = keyof typeof I18N;
function useRankingT() {
  const locale = useLocale();
  return I18N[(locale as RankingLocale) in I18N ? (locale as RankingLocale) : 'zh'];
}

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
  const t = useRankingT();
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
          <div className="py-6 text-center text-xs text-[var(--text-muted)]">{t.noData}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--n-200)] text-[var(--text-secondary)] text-xs font-semibold border-b border-[var(--border-default)]">
                <th className="py-1 px-2 text-center w-8">{t.rank}</th>
                <th className="py-1 px-2 text-left">{subTab === 'group' ? t.team : t.sales}</th>
                {subTab === 'person' && (
                  <th className="py-1 px-2 text-left whitespace-nowrap">{t.team}</th>
                )}
                <th className="py-1 px-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1">
                    {t.validStudents}
                    <BrandDot tooltip={t.validStudentsTooltip} />
                  </span>
                </th>
                <th className="py-1 px-2 text-right whitespace-nowrap">{t.checkedIn}</th>
                <th className="py-1 px-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1">
                    {t.checkinRate}
                    <BrandDot tooltip={t.checkinRateTooltip} />
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
                  {t.total}
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
  const t = useRankingT();
  const shortName = card.team.replace(/^TH-/i, '').replace(/Team$/i, '');
  const [expandedCC, setExpandedCC] = useState<string | null>(null);

  return (
    <div className="card-base overflow-hidden !p-0">
      {/* 卡片头部 */}
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
        <div className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">{t.noMembers}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-xs font-semibold">
                <th className="py-1 px-2 text-center w-7">#</th>
                <th className="py-1 px-2 text-left">{t.sales}</th>
                <th className="py-1 px-2 text-right">{t.validStudents}</th>
                <th className="py-1 px-2 text-right">{t.checkedIn}</th>
                <th className="py-1 px-2 text-right">{t.checkinRate}</th>
              </tr>
            </thead>
            <tbody>
              {card.members.map((m, i) => (
                <React.Fragment key={m.name}>
                  <tr
                    onClick={() => setExpandedCC(expandedCC === m.name ? null : m.name)}
                    className={`cursor-pointer even:bg-[var(--bg-subtle)] hover:bg-action-accent-surface/50 transition-colors ${
                      expandedCC === m.name ? 'border-l-2 border-[var(--color-accent)]' : ''
                    }`}
                  >
                    <td className="py-1 px-2 text-center text-[var(--text-muted)] font-mono tabular-nums">
                      {i + 1}
                    </td>
                    <td
                      className="py-1 px-2 font-medium whitespace-nowrap min-w-[100px] text-[var(--text-primary)]"
                      title={m.name}
                    >
                      {m.name}
                      {expandedCC === m.name && (
                        <span className="ml-1.5 text-[var(--text-muted)]">▲</span>
                      )}
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
              <tr className="border-t border-[var(--border-default)] font-semibold bg-[var(--bg-subtle)]">
                <td className="py-1.5 px-2 text-center text-[var(--text-muted)]">—</td>
                <td className="py-1.5 px-2 text-[var(--text-primary)]">{t.subtotal}</td>
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

  const t = useRankingT();

  const SUB_TABS: { id: 'group' | 'person'; label: string }[] = [
    { id: 'group', label: t.subTabGroup },
    { id: 'person', label: t.subTabPerson },
  ];

  // 运营角色：渠道触达视图
  if (roleFilter === '运营') {
    return <OpsChannelView configJson={configJson} />;
  }

  return (
    <div className="space-y-4">
      {/* 子 Tab 切换 + 围场徽章 */}
      <div className="flex items-center gap-3">
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
        {enclosureFilter && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
            {enclosureFilter}
          </span>
        )}
      </div>

      {/* 加载态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--text-muted)]">
          <Spinner size="lg" />
          <span>{t.loading}</span>
        </div>
      )}

      {/* 错误态 */}
      {error && !isLoading && (
        <EmptyState
          title={t.loadError}
          description={t.loadErrorDesc}
          action={{ label: t.retry, onClick: () => mutate() }}
        />
      )}

      {/* 空态 */}
      {!isLoading && !error && !data && (
        <EmptyState title={t.noRankData} description={t.noRankDataDesc} />
      )}

      {/* 排行数据 */}
      {!isLoading && !error && data && (
        <>
          {Object.keys(data.by_role).length === 0 ? (
            <EmptyState title={t.noRoleData} description={t.noRoleDataDesc} />
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
                      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                        {t.teamCards}
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
    </div>
  );
}
