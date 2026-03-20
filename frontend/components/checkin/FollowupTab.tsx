'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MemberDetailDrawer } from '@/components/members/MemberDetailDrawer';

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = 'CC' | 'SS' | 'LP' | '运营';

interface FollowupMember {
  rank: number;
  quality_score: number;
  id: string | number;
  enclosure: string;
  responsible: string; // 负责人
  lesson_avg_3m: number | null; // 3月均课耗
  referrals_this_month: number | null;
  total_revenue_usd: number | null;
  cc_last_contact_date: string | null; // CC末次联系
  days_until_card_expiry: number | null;
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function fmtRevenue(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return '—';
  return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

const ROLES: Role[] = ['CC', 'SS', 'LP', '运营'];
const ENCLOSURE_OPTIONS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6+'];

interface FilterBarProps {
  role: Role;
  onRoleChange: (r: Role) => void;
  team: string;
  onTeamChange: (t: string) => void;
  teams: string[];
  salesSearch: string;
  onSalesSearch: (s: string) => void;
  enclosures: string[];
  onEnclosuresChange: (e: string[]) => void;
}

function FilterBar({
  role,
  onRoleChange,
  team,
  onTeamChange,
  teams,
  salesSearch,
  onSalesSearch,
  enclosures,
  onEnclosuresChange,
}: FilterBarProps) {
  function toggleEnclosure(enc: string) {
    if (enclosures.includes(enc)) {
      onEnclosuresChange(enclosures.filter((e) => e !== enc));
    } else {
      onEnclosuresChange([...enclosures, enc]);
    }
  }

  return (
    <div className="space-y-3 pb-3 border-b border-[var(--border-subtle)]">
      {/* Row 1: role + team + search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Role toggle group */}
        <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden text-xs font-medium">
          {visibleRoles.map((r) => (
            <button
              key={r}
              onClick={() => onRoleChange(r)}
              className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
                role === r
                  ? 'bg-[var(--n-800)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Team dropdown */}
        <select
          value={team}
          onChange={(e) => onTeamChange(e.target.value)}
          className="px-2.5 py-1.5 border border-[var(--border-subtle)] rounded-lg text-xs bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部团队</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Sales search */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs select-none">
            🔍
          </span>
          <input
            type="text"
            placeholder="销售姓名搜索"
            value={salesSearch}
            onChange={(e) => onSalesSearch(e.target.value)}
            className="pl-7 pr-3 py-1.5 border border-[var(--border-subtle)] rounded-lg text-xs bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
        </div>
      </div>

      {/* Row 2: enclosure multi-select */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-[var(--text-muted)] mr-1">围场:</span>
        {ENCLOSURE_OPTIONS.map((enc) => {
          const active = enclosures.includes(enc);
          return (
            <button
              key={enc}
              onClick={() => toggleEnclosure(enc)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-blue-400'
              }`}
            >
              {enc}
            </button>
          );
        })}
        {enclosures.length > 0 && (
          <button
            onClick={() => onEnclosuresChange([])}
            className="px-2.5 py-1 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            清除
          </button>
        )}
      </div>
    </div>
  );
}

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
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs px-2 py-0.5 rounded hover:bg-slate-200 transition-colors"
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

  const COL_SPAN = 9;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--n-800)] text-white font-medium">
            <th className="py-1.5 px-2 text-center whitespace-nowrap w-8">排名</th>
            <th className="py-1.5 px-2 text-center whitespace-nowrap">⭐评分</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">学员ID</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">围场</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">负责人</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">📚课耗(3月均)</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">👥本月推荐</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">💰历史付费</th>
            <th className="py-1.5 px-2 text-left whitespace-nowrap">CC末次联系</th>
            <th className="py-1.5 px-2 text-right whitespace-nowrap">卡到期</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => {
            const isHighQuality = m.quality_score >= 70;
            const expanded = expandedId === m.id;
            const daysSinceContact = daysSince(m.cc_last_contact_date);
            const contactOverdue = daysSinceContact !== null && daysSinceContact > 7;
            const cardExpirySoon =
              m.days_until_card_expiry !== null &&
              m.days_until_card_expiry !== undefined &&
              m.days_until_card_expiry <= 30;

            return (
              <>
                <tr
                  key={m.id}
                  onClick={() => {
                    if (expanded) {
                      setExpandedId(null);
                    } else {
                      setExpandedId(m.id);
                    }
                  }}
                  className={`cursor-pointer transition-colors even:bg-[var(--bg-subtle)] hover:bg-blue-50 relative ${
                    expanded ? 'bg-blue-50' : ''
                  }`}
                  style={
                    isHighQuality
                      ? { borderLeft: '4px solid #f97316' }
                      : { borderLeft: '4px solid transparent' }
                  }
                >
                  <td className="py-1 px-2 text-center font-mono tabular-nums text-[var(--text-muted)]">
                    {m.rank}
                  </td>
                  <td className="py-1 px-2 text-center">
                    <span
                      className={`inline-block font-semibold font-mono tabular-nums ${
                        m.quality_score >= 70
                          ? 'text-orange-500'
                          : m.quality_score >= 50
                            ? 'text-yellow-600'
                            : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {m.quality_score}
                    </span>
                  </td>
                  <td className="py-1 px-2 text-blue-600 font-medium font-mono tabular-nums whitespace-nowrap">
                    {m.id}
                  </td>
                  <td className="py-1 px-2 text-[var(--text-secondary)] whitespace-nowrap">
                    {m.enclosure || '—'}
                  </td>
                  <td className="py-1 px-2 whitespace-nowrap">{m.responsible || '—'}</td>
                  <td className="py-1 px-2 text-right font-mono tabular-nums">
                    {fmtNum(m.lesson_avg_3m)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono tabular-nums">
                    {fmtNum(m.referrals_this_month)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono tabular-nums">
                    {fmtRevenue(m.total_revenue_usd)}
                  </td>
                  <td
                    className={`py-1 px-2 whitespace-nowrap ${
                      contactOverdue ? 'text-red-600 font-medium' : 'text-[var(--text-secondary)]'
                    }`}
                    title={m.cc_last_contact_date || ''}
                  >
                    {contactOverdue ? `超7天` : m.cc_last_contact_date || '—'}
                  </td>
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
                  <ExpandedRow
                    member={m}
                    colSpan={COL_SPAN + 1}
                    onClose={() => setExpandedId(null)}
                  />
                )}
              </>
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
}

export function FollowupTab({ activeRoles }: FollowupTabProps) {
  const visibleRoles: Role[] =
    activeRoles && activeRoles.length > 0 ? ROLES.filter((r) => activeRoles.includes(r)) : ROLES;
  const [role, setRole] = useState<Role>(visibleRoles[0] ?? 'CC');
  const [team, setTeam] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [enclosures, setEnclosures] = useState<string[]>([]);

  // Drawer state
  const [drawerMember, setDrawerMember] = useState<FollowupMember | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Build query string
  const qs = useMemo(() => {
    const p = new URLSearchParams({ role });
    if (team) p.set('team', team);
    if (salesSearch.trim()) p.set('sales', salesSearch.trim());
    if (enclosures.length > 0) p.set('enclosure', enclosures.join(','));
    return p.toString();
  }, [role, team, salesSearch, enclosures]);

  const {
    data: raw,
    isLoading,
    error,
  } = useSWR<FollowupResponseRaw>(`/api/checkin/followup?${qs}`, swrFetcher);

  // 适配后端字段名 → 前端 FollowupMember 接口
  const data: FollowupResponse | undefined = raw
    ? (() => {
        // 后端用 students[] 返回，字段名与前端接口不同，需要逐一映射
        const backendStudents: BackendStudent[] =
          (raw.students as BackendStudent[] | undefined) ?? [];
        const items: FollowupMember[] = backendStudents.map((s, idx) => ({
          rank: idx + 1,
          quality_score: s.quality_score ?? 0,
          id: s.student_id, // student_id → id
          enclosure: s.enclosure,
          responsible: s.cc_name, // cc_name → responsible
          lesson_avg_3m: s.lesson_consumption_3m, // lesson_consumption_3m → lesson_avg_3m
          referrals_this_month: s.referral_registrations ?? 0, // referral_registrations → referrals_this_month
          total_revenue_usd: null, // 后端无此字段
          cc_last_contact_date: s.cc_last_call_date, // cc_last_call_date → cc_last_contact_date
          days_until_card_expiry: s.card_days_remaining, // card_days_remaining → days_until_card_expiry
          team: s.team,
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

  const teams = data?.teams ?? [];

  // Reset team when role changes and the current team is no longer available
  const handleRoleChange = (r: Role) => {
    setRole(r);
    setTeam('');
  };

  return (
    <div className="space-y-4">
      <FilterBar
        role={role}
        onRoleChange={handleRoleChange}
        team={team}
        onTeamChange={setTeam}
        teams={teams}
        salesSearch={salesSearch}
        onSalesSearch={setSalesSearch}
        enclosures={enclosures}
        onEnclosuresChange={setEnclosures}
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState title="加载失败" description="请检查后端服务是否正常运行" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="暂无未打卡学员" description="当前筛选条件下无数据，或数据文件尚未上传" />
      ) : (
        <>
          <FollowupTable
            items={data.items}
            onDrawerOpen={(m) => {
              setDrawerMember(m);
              setDrawerOpen(true);
            }}
          />
          <BottomStats
            total={data.total}
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
