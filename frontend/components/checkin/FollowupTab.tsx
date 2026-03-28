'use client';

import { Fragment, useState, useMemo } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRevenue } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MemberDetailDrawer } from '@/components/members/MemberDetailDrawer';
import { StudentTagBadge } from '@/components/checkin/StudentTagBadge';
import { useWideConfig } from '@/lib/hooks/useWideConfig';

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = 'CC' | 'SS' | 'LP' | '运营';

interface FollowupMember {
  rank: number;
  quality_score: number;
  id: string | number;
  enclosure: string;
  responsible: string; // CC 负责人
  lesson_avg_3m: number | null; // 3月均课耗
  referrals_this_month: number | null;
  total_revenue_usd: number | null;
  cc_last_contact_date: string | null; // CC末次联系
  days_until_card_expiry: number | null;
  extra?: Record<string, unknown>; // D4 extra 字段（含本月/上月打卡天数）
  // 新增字段
  ss_name: string | null;
  ss_group: string | null;
  lp_name: string | null;
  lp_group: string | null;
  weeks_active: number;
  days_this_week: number;
  days_this_month: number;
  cc_connected: number;
  ss_connected: number;
  lp_connected: number;
  cc_last_note_date: string | null;
  cc_last_note_content: string | null;
  renewal_days_ago: number | null;
  incentive_status: string | null;
  action_priority_score: number;
  recommended_channel: string;
  golden_window: string[];
  team?: string;
  // allow full D4 extra fields for drawer
  [key: string]: unknown;
}

// 后端原始返回的 student 字段名
interface BackendStudent {
  student_id: string;
  enclosure: string;
  role: string;
  cc_name: string; // 负责人
  team: string;
  quality_score: number;
  lesson_consumption_3m: number | null;
  referral_registrations: number | null;
  referral_payments: number | null;
  cc_last_call_date: string | null;
  card_days_remaining: number | null;
  extra: Record<string, unknown>;
  // 新增字段
  ss_name: string | null;
  ss_group: string | null;
  lp_name: string | null;
  lp_group: string | null;
  weeks_active: number;
  days_this_week: number;
  days_this_month: number;
  cc_connected: number;
  ss_connected: number;
  lp_connected: number;
  cc_last_note_date: string | null;
  cc_last_note_content: string | null;
  renewal_days_ago: number | null;
  incentive_status: string | null;
  action_priority_score: number;
  recommended_channel: string;
  golden_window: string[];
}

interface FollowupResponseRaw {
  students?: BackendStudent[];
  items?: FollowupMember[];
  total: number;
  avg_quality_score?: number;
  high_quality_count?: number;
  teams?: string[];
  score_formula?: string;
}

interface FollowupResponse {
  items: FollowupMember[];
  total: number;
  avg_quality_score: number;
  high_quality_count: number;
  teams: string[];
}

// ── Tag Logic ──────────────────────────────────────────────────────────────────

type GroupFilter =
  | 'all'
  | 'never'
  | 'was_active'
  | 'partial'
  | 'this_week'
  | 'card_expiry'
  | 'dormant_hp'
  | 'handover'
  | 'renewal_risk';

const GROUP_FILTER_LABELS: Record<GroupFilter, string> = {
  all: '全部',
  never: '从未打卡',
  was_active: '曾打卡本月未打',
  this_week: '本周未打卡',
  partial: '打过今天没打',
  card_expiry: '卡到期≤30天',
  dormant_hp: '沉睡高潜',
  handover: '即将交接',
  renewal_risk: '续费风险',
};

function computeClientTags(
  daysThis: number,
  daysLast: number,
  lesson: number,
  registrations: number
): string[] {
  const tags: string[] = [];
  if (daysThis >= 6) tags.push('满勤');
  else if (daysThis >= 4) tags.push('活跃');
  const delta = daysThis - daysLast;
  if (delta >= 2 && daysLast > 0) tags.push('进步明显');
  if (delta <= -2) tags.push('在退步');
  if (daysThis === 0 && lesson >= 10) tags.push('沉睡高潜');
  if (daysThis >= 4 && registrations >= 2) tags.push('超级转化');
  return tags;
}

function computeActivationScore(daysLast: number, lesson: number): number {
  return Math.round(Math.min(daysLast / 6, 1) * 60 + Math.min(lesson / 15, 1) * 40);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function fmtRevenue(usd: number | null | undefined): string {
  return formatRevenue(usd);
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

// ── Filter Bar（已移至 checkin/page.tsx 统一筛选栏，此处仅保留 GroupFilterBar）──

// ── Row expand ─────────────────────────────────────────────────────────────────

interface ExpandedRowProps {
  member: FollowupMember;
  colSpan: number;
  onClose: () => void;
}

function ExpandedRow({ member, colSpan, onClose }: ExpandedRowProps) {
  // Extract extra fields (everything beyond known columns)
  const KNOWN = new Set([
    'rank',
    'quality_score',
    'id',
    'enclosure',
    'responsible',
    'lesson_avg_3m',
    'referrals_this_month',
    'total_revenue_usd',
    'cc_last_contact_date',
    'days_until_card_expiry',
  ]);
  const extra = Object.fromEntries(Object.entries(member).filter(([k]) => !KNOWN.has(k)));

  return (
    <tr className="bg-[var(--bg-subtle)]">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            完整档案 — 全部字段
          </span>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs px-2 py-0.5 rounded hover:bg-[var(--n-200)] transition-colors"
          >
            收起 ▲
          </button>
        </div>

        {/* Known columns summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mb-3 text-xs">
          {[
            ['学员 ID', String(member.id)],
            ['围场', member.enclosure || '—'],
            ['负责人', member.responsible || '—'],
            ['质量评分', String(member.quality_score)],
            ['3月均课耗', fmtNum(member.lesson_avg_3m)],
            ['本月推荐', fmtNum(member.referrals_this_month)],
            ['历史付费', fmtRevenue(member.total_revenue_usd)],
            ['CC末次联系', member.cc_last_contact_date || '—'],
            ['卡到期天数', fmtNum(member.days_until_card_expiry)],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-[var(--text-muted)] w-24 shrink-0">{label}</span>
              <span className="text-[var(--text-primary)] font-medium">{val}</span>
            </div>
          ))}
        </div>

        {/* Extra D4 fields */}
        {Object.keys(extra).length > 0 && (
          <div className="rounded border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(extra).map(([key, val], idx) => (
                  <tr
                    key={key}
                    className={
                      idx % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-muted,#f9fafb)]'
                    }
                  >
                    <td
                      className="py-1 px-3 text-[var(--text-muted)] w-1/2 break-words"
                      title={key}
                    >
                      {key}
                    </td>
                    <td className="py-1 px-3 text-[var(--text-primary)] text-right break-all font-mono tabular-nums">
                      {val === null || val === undefined || val === '' ? '—' : String(val)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Activation Score Dot ───────────────────────────────────────────────────────

function ActivationDot({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <span
        className={`w-2.5 h-2.5 rounded-full inline-block ${color}`}
        title={`激活概率 ${score}`}
      />
      <span className="font-mono tabular-nums text-[var(--text-secondary)]">{score}</span>
    </div>
  );
}

// ── Priority Score Badge ────────────────────────────────────────────────────────

function PriorityBadge({ score }: { score: number }) {
  const color =
    score >= 60
      ? 'text-red-600 font-semibold'
      : score >= 30
        ? 'text-amber-500 font-medium'
        : 'text-[var(--text-muted)]';
  const dot = score >= 60 ? 'bg-red-500' : score >= 30 ? 'bg-amber-400' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-1 justify-center">
      <span className={`w-2 h-2 rounded-full inline-block ${dot}`} />
      <span className={`font-mono tabular-nums text-xs ${color}`}>{score}</span>
    </div>
  );
}

// ── Channel Icon ────────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<string, string> = {
  line: '💬',
  sms: '✉️',
  phone: '📞',
  app: '📱',
};

const CHANNEL_LABEL: Record<string, string> = {
  line: 'LINE',
  sms: '短信',
  phone: '电话',
  app: 'APP',
};

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span title={CHANNEL_LABEL[channel] ?? channel} className="text-base leading-none">
      {CHANNEL_ICON[channel] ?? '📱'}
    </span>
  );
}

// ── Connection Status Dots ──────────────────────────────────────────────────────

function ConnStatusDots({ cc, ss, lp }: { cc: number; ss: number; lp: number }) {
  const dot = (val: number, label: string) => (
    <span
      title={`${label}: ${val === 1 ? '已接通' : '未接通'}`}
      className={`w-2 h-2 rounded-full inline-block ${
        val === 1 ? 'bg-emerald-500' : val === 0 ? 'bg-red-400' : 'bg-gray-300'
      }`}
    />
  );
  return (
    <div className="flex items-center gap-1 justify-center">
      {dot(cc, 'CC')}
      {dot(ss, 'SS')}
      {dot(lp, 'LP')}
    </div>
  );
}

// ── Golden Window Badges ────────────────────────────────────────────────────────

const WINDOW_LABEL: Record<string, string> = {
  first_checkin: '首次打卡',
  lead_no_show: '有B未出席',
  renewal_window: '续费窗口',
};

function GoldenWindowBadges({ windows }: { windows: string[] }) {
  if (!windows || windows.length === 0) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {windows.map((w) => (
        <span
          key={w}
          className="px-1 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 whitespace-nowrap"
        >
          {WINDOW_LABEL[w] ?? w}
        </span>
      ))}
    </div>
  );
}

// ── CC Contact Badge ────────────────────────────────────────────────────────────

function ContactBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-[var(--text-muted)]">—</span>;
  if (days > 14)
    return (
      <span className="text-red-600 font-medium">
        {days}天前
        <span className="ml-1 px-1 py-0.5 bg-red-100 text-red-600 rounded text-xs">需联系</span>
      </span>
    );
  if (days > 7) return <span className="text-amber-500 font-medium">{days}天前</span>;
  return <span className="text-emerald-600">{days}天前</span>;
}

// ── Group Filter Bar ────────────────────────────────────────────────────────────

interface GroupFilterBarProps {
  active: GroupFilter;
  onChange: (g: GroupFilter) => void;
}

function GroupFilterBar({
  active,
  onChange,
  exportHref,
}: GroupFilterBarProps & { exportHref?: string }) {
  const groups: GroupFilter[] = [
    'all',
    'never',
    'was_active',
    'this_week',
    'partial',
    'card_expiry',
    'dormant_hp',
    'handover',
    'renewal_risk',
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 pb-2">
      <span className="text-xs text-[var(--text-muted)]">分群:</span>
      <div className="flex flex-wrap rounded-lg border border-[var(--border-subtle)] overflow-hidden text-xs font-medium">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => onChange(g)}
            className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
              active === g
                ? 'bg-[var(--n-800)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {GROUP_FILTER_LABELS[g]}
          </button>
        ))}
      </div>
      {exportHref && (
        <a
          href={exportHref}
          download="followup.tsv"
          className="ml-auto px-3 py-1.5 text-xs font-medium border border-[var(--border-default)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap"
        >
          导出 TSV ↓
        </a>
      )}
    </div>
  );
}

// ── Main Table ─────────────────────────────────────────────────────────────────

interface FollowupTableProps {
  items: FollowupMember[];
  onDrawerOpen: (member: FollowupMember) => void;
}

function FollowupTable({ items, onDrawerOpen }: FollowupTableProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState title="暂无未打卡学员" description="当前筛选条件下无数据，或数据文件尚未上传" />
    );
  }

  // 改造后共 20 列
  const COL_SPAN = 20;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 text-center whitespace-nowrap w-8">排名</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">🔴优先级</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">激活</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">学员ID</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">围场</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px]">CC负责</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px]">SS负责</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px]">LP负责</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">本周/月打卡</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">上月打卡</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">CC/SS/LP 接通</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[120px]">标签</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">渠道</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[80px]">黄金窗口</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">📚课耗(3月均)</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">👥本月推荐</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">💰历史付费</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">CC末次联系</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">激励</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">卡到期</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => {
            const isHighQuality = m.quality_score >= 70;
            const expanded = expandedId === m.id;
            const daysSinceContact = daysSince(m.cc_last_contact_date);
            const cardExpirySoon =
              m.days_until_card_expiry !== null &&
              m.days_until_card_expiry !== undefined &&
              m.days_until_card_expiry <= 30;

            // 打卡天数（优先从顶层字段，fallback extra）
            const daysThis = m.days_this_month ?? Number(m.extra?.['本月打卡天数'] ?? 0);
            const daysLast = Number(m.extra?.['上月打卡天数'] ?? 0);
            const daysThisWeek = m.days_this_week ?? 0;
            const lessonVal = m.lesson_avg_3m ?? 0;
            const regsVal = m.referrals_this_month ?? 0;

            // 客户端标签计算
            const clientTags = computeClientTags(daysThis, daysLast, lessonVal, regsVal);
            // 激活概率
            const activationScore = computeActivationScore(daysLast, lessonVal);

            return (
              <Fragment key={m.id}>
                <tr
                  onClick={() => {
                    if (expanded) {
                      setExpandedId(null);
                    } else {
                      setExpandedId(m.id);
                    }
                  }}
                  className={`cursor-pointer transition-colors even:bg-[var(--bg-subtle)] hover:bg-action-accent-surface relative ${
                    expanded ? 'bg-action-accent-surface' : ''
                  }`}
                  style={
                    isHighQuality
                      ? { borderLeft: '4px solid #f97316' }
                      : { borderLeft: '4px solid transparent' }
                  }
                >
                  {/* 排名 */}
                  <td className="py-1 px-2 text-center font-mono tabular-nums text-[var(--text-muted)]">
                    {m.rank}
                  </td>
                  {/* 优先级评分（新） */}
                  <td className="py-1 px-2 text-center">
                    <PriorityBadge score={m.action_priority_score ?? 0} />
                  </td>
                  {/* 激活概率 */}
                  <td className="py-1 px-2">
                    <ActivationDot score={activationScore} />
                  </td>
                  {/* 学员ID */}
                  <td className="py-1 px-2 text-action-accent font-medium font-mono tabular-nums whitespace-nowrap">
                    {m.id}
                  </td>
                  {/* 围场 */}
                  <td className="py-1 px-2 text-[var(--text-secondary)] whitespace-nowrap">
                    {m.enclosure || '—'}
                  </td>
                  {/* CC 负责人 */}
                  <td className="py-1 px-2 whitespace-nowrap" title={m.responsible ?? ''}>
                    {m.responsible || '—'}
                  </td>
                  {/* SS 负责人（新） */}
                  <td
                    className="py-1 px-2 whitespace-nowrap text-[var(--text-secondary)]"
                    title={m.ss_name ?? ''}
                  >
                    {m.ss_name || '—'}
                  </td>
                  {/* LP 负责人（新） */}
                  <td
                    className="py-1 px-2 whitespace-nowrap text-[var(--text-secondary)]"
                    title={m.lp_name ?? ''}
                  >
                    {m.lp_name || '—'}
                  </td>
                  {/* 本周/月打卡（新：本周+本月双行） */}
                  <td className="py-1 px-2 text-center font-mono tabular-nums">
                    <div className="flex flex-col items-center leading-tight">
                      <span
                        className={
                          daysThisWeek === 0
                            ? 'text-[var(--text-muted)]'
                            : 'text-emerald-600 font-semibold'
                        }
                        title="本周"
                      >
                        本周 {daysThisWeek}
                      </span>
                      <span
                        className={`text-[10px] ${
                          daysThis === 0
                            ? 'text-[var(--text-muted)]'
                            : daysThis >= 5
                              ? 'text-emerald-600'
                              : 'text-[var(--text-secondary)]'
                        }`}
                        title="本月"
                      >
                        本月 {daysThis}/6
                      </span>
                    </div>
                  </td>
                  {/* 上月打卡 */}
                  <td className="py-1 px-2 text-center font-mono tabular-nums text-[var(--text-muted)]">
                    {daysLast}/6
                  </td>
                  {/* CC/SS/LP 接通状态（新） */}
                  <td className="py-1 px-2">
                    <ConnStatusDots
                      cc={m.cc_connected ?? 0}
                      ss={m.ss_connected ?? 0}
                      lp={m.lp_connected ?? 0}
                    />
                  </td>
                  {/* 标签 */}
                  <td className="py-1 px-2 min-w-[120px]">
                    {clientTags.length > 0 ? (
                      <StudentTagBadge tags={clientTags} maxVisible={2} />
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  {/* 推荐渠道（新） */}
                  <td className="py-1 px-2 text-center">
                    <ChannelBadge channel={m.recommended_channel ?? 'app'} />
                  </td>
                  {/* 黄金窗口（新） */}
                  <td className="py-1 px-2 min-w-[80px]">
                    <GoldenWindowBadges windows={m.golden_window ?? []} />
                  </td>
                  {/* 课耗 */}
                  <td className="py-1 px-2 text-right font-mono tabular-nums">
                    {fmtNum(m.lesson_avg_3m)}
                  </td>
                  {/* 本月推荐 */}
                  <td className="py-1 px-2 text-right font-mono tabular-nums">
                    {fmtNum(m.referrals_this_month)}
                  </td>
                  {/* 历史付费 */}
                  <td className="py-1 px-2 text-right font-mono tabular-nums">
                    {fmtRevenue(m.total_revenue_usd)}
                  </td>
                  {/* CC末次联系 */}
                  <td className="py-1 px-2 whitespace-nowrap">
                    <ContactBadge days={daysSinceContact} />
                  </td>
                  {/* 激励状态（新） */}
                  <td className="py-1 px-2 text-center">
                    {m.incentive_status ? (
                      <span className="px-1 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 whitespace-nowrap">
                        {m.incentive_status}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  {/* 卡到期 */}
                  <td
                    className={`py-1 px-2 text-right font-mono tabular-nums ${
                      cardExpirySoon
                        ? 'text-orange-500 font-medium'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {m.days_until_card_expiry === null || m.days_until_card_expiry === undefined
                      ? '—'
                      : m.days_until_card_expiry <= -9000
                        ? '—'
                        : String(Math.round(m.days_until_card_expiry))}
                  </td>
                </tr>

                {expanded && (
                  <ExpandedRow member={m} colSpan={COL_SPAN} onClose={() => setExpandedId(null)} />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Bottom Stats ───────────────────────────────────────────────────────────────

interface BottomStatsProps {
  total: number;
  avgScore: number;
  highQualityCount: number;
}

function BottomStats({ total, avgScore, highQualityCount }: BottomStatsProps) {
  const pct = total > 0 ? ((highQualityCount / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="flex flex-wrap gap-6 pt-3 mt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
      <span>
        共{' '}
        <strong className="text-[var(--text-primary)] font-semibold font-mono tabular-nums">
          {total}
        </strong>{' '}
        名未打卡有效学员
      </span>
      <span>
        平均评分{' '}
        <strong className="text-[var(--text-primary)] font-semibold font-mono tabular-nums">
          {avgScore.toFixed(1)}
        </strong>
      </span>
      <span>
        高质量(≥70)占比{' '}
        <strong className="text-orange-500 font-semibold font-mono tabular-nums">{pct}%</strong> (
        {highQualityCount} 人)
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface FollowupTabProps {
  activeRoles?: string[];
  roleEnclosures?: Record<string, string[]>;
  enclosureFilter?: string | null;
  roleFilter?: string;
  teamFilter?: string;
  salesSearch?: string;
}

export function FollowupTab({
  activeRoles: activeRolesProp,
  enclosureFilter,
  roleFilter = 'CC',
  teamFilter = '',
  salesSearch = '',
}: FollowupTabProps) {
  const { configJson, activeRoles: hookActiveRoles } = useWideConfig();

  // 优先使用 hook 内部读取的值，props 作为备用
  const activeRoles = hookActiveRoles.length > 0 ? hookActiveRoles : (activeRolesProp ?? []);
  void activeRoles; // 仅用于类型保留，实际 role 由 page 级 roleFilter 控制

  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  // Drawer state
  const [drawerMember, setDrawerMember] = useState<FollowupMember | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Build base path — role/sales/enclosure/role_config 由 basePath 携带
  // teamFilter 和全局 focusCC 由 useFilteredSWR 从 config-store 自动注入
  // 若 page 传入 teamFilter，通过 extraParams 覆盖 store 的值（最终优先级最高）
  const basePath = useMemo(() => {
    const p = new URLSearchParams({ role: roleFilter });
    if (salesSearch.trim()) p.set('sales', salesSearch.trim());
    if (enclosureFilter) p.set('enclosure', enclosureFilter);
    p.set('role_config', configJson);
    return `/api/checkin/followup?${p.toString()}`;
  }, [roleFilter, salesSearch, enclosureFilter, configJson]);

  const extraParams = useMemo(() => (teamFilter ? { team: teamFilter } : undefined), [teamFilter]);

  const {
    data: raw,
    isLoading,
    error,
  } = useFilteredSWR<FollowupResponseRaw>(basePath, undefined, extraParams);

  // 适配后端字段名 → 前端 FollowupMember 接口
  const data: FollowupResponse | undefined = raw
    ? (() => {
        // 后端用 students[] 返回，字段名与前端接口不同，需要逐一映射
        const backendStudents: BackendStudent[] =
          (raw.students as BackendStudent[] | undefined) ?? [];
        const items: FollowupMember[] = backendStudents.map((s, idx) => ({
          rank: idx + 1,
          quality_score: s.quality_score ?? 0,
          id: s.student_id,
          enclosure: s.enclosure,
          responsible: s.cc_name,
          lesson_avg_3m: s.lesson_consumption_3m,
          referrals_this_month: s.referral_registrations ?? 0,
          total_revenue_usd: null,
          cc_last_contact_date: s.cc_last_call_date,
          days_until_card_expiry: s.card_days_remaining,
          team: s.team,
          extra: s.extra ?? {},
          // 新增字段
          ss_name: s.ss_name ?? null,
          ss_group: s.ss_group ?? null,
          lp_name: s.lp_name ?? null,
          lp_group: s.lp_group ?? null,
          weeks_active: s.weeks_active ?? 0,
          days_this_week: s.days_this_week ?? 0,
          days_this_month: s.days_this_month ?? 0,
          cc_connected: s.cc_connected ?? 0,
          ss_connected: s.ss_connected ?? 0,
          lp_connected: s.lp_connected ?? 0,
          cc_last_note_date: s.cc_last_note_date ?? null,
          cc_last_note_content: s.cc_last_note_content ?? null,
          renewal_days_ago: s.renewal_days_ago ?? null,
          incentive_status: s.incentive_status ?? null,
          action_priority_score: s.action_priority_score ?? 0,
          recommended_channel: s.recommended_channel ?? 'app',
          golden_window: s.golden_window ?? [],
          // 展开 extra 字段（D4 全量字段，用于 ExpandedRow 展示）
          ...(s.extra ?? {}),
        }));

        const scores = items.map((s) => s.quality_score ?? 0);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const highCount = scores.filter((s) => s >= 70).length;
        const teamSet = new Set(items.map((s) => s.team as string).filter(Boolean));
        return {
          items,
          total: raw.total ?? items.length,
          avg_quality_score: raw.avg_quality_score ?? avg,
          high_quality_count: raw.high_quality_count ?? highCount,
          teams: raw.teams ?? Array.from(teamSet).sort(),
        };
      })()
    : undefined;

  // 分群过滤（纯前端）
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;

    // 分群逻辑
    if (groupFilter !== 'all') {
      items = items.filter((m) => {
        const daysThis = m.days_this_month ?? Number(m.extra?.['本月打卡天数'] ?? 0);
        const daysLast = Number(m.extra?.['上月打卡天数'] ?? 0);
        const daysThisWeek = m.days_this_week ?? 0;
        const cardDays = m.days_until_card_expiry;
        const lessonVal = m.lesson_avg_3m ?? 0;
        const renewalDays = m.renewal_days_ago;
        if (groupFilter === 'never') return daysThis === 0 && daysLast === 0;
        if (groupFilter === 'was_active') return daysLast > 0 && daysThis === 0;
        if (groupFilter === 'this_week') return daysThis > 0 && daysThisWeek === 0;
        if (groupFilter === 'partial') return daysThis > 0;
        if (groupFilter === 'card_expiry')
          return cardDays !== null && cardDays !== undefined && cardDays <= 30;
        if (groupFilter === 'dormant_hp') return daysThis === 0 && lessonVal >= 10;
        if (groupFilter === 'handover') {
          // 围场边界：卡到期天数在 25-35 天附近（即将进入下一围场）
          return cardDays !== null && cardDays !== undefined && cardDays >= 25 && cardDays <= 35;
        }
        if (groupFilter === 'renewal_risk')
          return renewalDays !== null && renewalDays !== undefined && renewalDays > 180;
        return true;
      });
    }

    return items;
  }, [data?.items, groupFilter]);

  // 导出 TSV 链接（携带当前 role/team/sales 筛选）
  const exportHref = useMemo(() => {
    const p = new URLSearchParams({ role: roleFilter });
    if (teamFilter) p.set('team', teamFilter);
    if (salesSearch.trim()) p.set('cc_name', salesSearch.trim());
    return `/api/checkin/followup/tsv?${p.toString()}`;
  }, [roleFilter, teamFilter, salesSearch]);

  return (
    <div className="space-y-4">
      {/* L2 分群筛选（Tab 专属，紧凑 pill 行）+ 导出按钮 */}
      <GroupFilterBar active={groupFilter} onChange={setGroupFilter} exportHref={exportHref} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState title="加载失败" description="请检查后端服务是否正常运行" />
      ) : !data || filteredItems.length === 0 ? (
        <EmptyState title="暂无未打卡学员" description="当前筛选条件下无数据，或数据文件尚未上传" />
      ) : (
        <>
          <FollowupTable
            items={filteredItems}
            onDrawerOpen={(m) => {
              setDrawerMember(m);
              setDrawerOpen(true);
            }}
          />
          <BottomStats
            total={filteredItems.length}
            avgScore={data.avg_quality_score}
            highQualityCount={data.high_quality_count}
          />
        </>
      )}

      {/* Detail drawer */}
      <MemberDetailDrawer
        student={
          drawerMember
            ? ({
                ...drawerMember,
                total_revenue_usd: drawerMember.total_revenue_usd ?? undefined,
                days_until_card_expiry: drawerMember.days_until_card_expiry ?? undefined,
                cc_last_call_date: drawerMember.cc_last_contact_date ?? undefined,
                lesson_consumed_this_month: drawerMember.lesson_avg_3m ?? undefined,
                referral_code_count_this_month: drawerMember.referrals_this_month ?? undefined,
              } as Parameters<typeof MemberDetailDrawer>[0]['student'])
            : null
        }
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerMember(null);
        }}
      />
    </div>
  );
}
