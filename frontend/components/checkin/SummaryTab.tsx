'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatMiniCard } from '@/components/ui/StatMiniCard';
import { EnclosureParticipationChart } from '@/components/checkin/EnclosureParticipationChart';
import { cn, formatRate, fmtEnc } from '@/lib/utils';

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface CheckinTeamRow {
  team: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface CheckinEnclosureRow {
  enclosure: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface CheckinRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

interface CheckinSummaryResponse {
  by_role: Record<string, CheckinRoleSummary>;
}

interface CheckinChannelSummary {
  channel: string;
  total_students: number;
  total_checkin: number;
  checkin_rate: number;
  by_team: CheckinTeamRow[];
  by_enclosure: CheckinEnclosureRow[];
}

// ── 单个渠道列 ────────────────────────────────────────────────────────────────

interface ChannelColumnProps {
  ch: CheckinChannelSummary;
  rateColor: (rate: number) => string;
  rateBg: (rate: number) => string;
  isSelected?: boolean;
}

function ChannelColumn({ ch, rateColor, rateBg, isSelected }: ChannelColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 min-w-0',
        isSelected ? 'ring-2 ring-[var(--color-action,#1B365D)] rounded-lg' : ''
      )}
    >
      {/* 渠道标题 */}
      <div className="bg-[var(--n-800,#1e293b)] text-white text-xs font-semibold px-2 py-1.5 rounded-t-md">
        {ch.channel}
        {isSelected && (
          <span className="ml-1.5 opacity-70 text-[10px]">▶ 当前角色</span>
        )}
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
          {formatRate(ch.checkin_rate ?? 0)}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          已打卡学员数 / 本渠道有效学员数（付费且在有效期）
        </div>
        <div className="text-[10px] text-[var(--text-muted)] opacity-75">
          颜色：绿≥50% · 橙30-50% · 红&lt;30%（可在设置调整）
        </div>
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
                {formatRate(row.rate)}
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
              <span className="col-span-2 text-[var(--text-secondary)]">
                {fmtEnc(row.enclosure)}
              </span>
              <span className="text-right text-[var(--text-primary)]">{row.students}</span>
              <span className={cn('text-right font-medium', rateColor?.(row.rate) ?? '')}>
                {formatRate(row.rate)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 主组件：SummaryTab（概览）─────────────────────────────────────────────────

interface SummaryTabProps {
  enclosureFilter?: string | null;
  roleFilter?: string;
}

export default function SummaryTab({ enclosureFilter, roleFilter }: SummaryTabProps) {
  const { configJson } = useWideConfig();
  const { rateColor, rateBg } = useCheckinThresholds();

  const { data, isLoading, error, mutate } = useFilteredSWR<CheckinSummaryResponse>(
    `/api/checkin/summary?role_config=${encodeURIComponent(configJson)}`
  );

  // KPI 卡片数据（来自学员分析）
  const { data: studentData } = useStudentAnalysis(
    enclosureFilter ? { enclosure: enclosureFilter } : undefined
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取打卡汇总数据，请检查后端服务"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

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

  const mc = studentData?.month_comparison;

  return (
    <div className="space-y-8">
      {/* 角色汇总 grid（选中角色高亮 ring） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {channels.map((ch) => (
          <ChannelColumn
            key={ch.channel}
            ch={ch}
            rateColor={rateColor}
            rateBg={rateBg}
            isSelected={roleFilter ? ch.channel === roleFilter : false}
          />
        ))}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-[var(--border-default)]" />

      {/* KPI 卡片行（来自 student-analysis） */}
      {mc && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            月度核心指标
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMiniCard
              label="本月参与率"
              value={
                mc.participation_rate_this != null
                  ? `${(mc.participation_rate_this * 100).toFixed(1)}%`
                  : '—'
              }
              sub={
                mc.participation_rate_last != null
                  ? `上月 ${(mc.participation_rate_last * 100).toFixed(1)}%`
                  : '上月 —'
              }
              accent={
                mc.participation_rate_this > mc.participation_rate_last
                  ? 'green'
                  : mc.participation_rate_this < mc.participation_rate_last
                    ? 'red'
                    : 'slate'
              }
              subtitle="至少打卡 1 次的学员 / 有效学员总数"
            />
            <StatMiniCard
              label="人均打卡天数"
              value={mc.avg_days_this.toFixed(2)}
              sub={`上月 ${mc.avg_days_last.toFixed(2)} 天`}
              accent={
                mc.avg_days_this > mc.avg_days_last
                  ? 'green'
                  : mc.avg_days_this < mc.avg_days_last
                    ? 'red'
                    : 'slate'
              }
              subtitle="本月所有有效学员的平均打卡次数"
            />
            <StatMiniCard
              label="零打卡学员"
              value={mc.zero_this.toLocaleString()}
              sub={`上月 ${mc.zero_last.toLocaleString()} 人`}
              accent={mc.zero_this > mc.zero_last ? 'red' : 'green'}
              subtitle="本月一次都未打卡的有效学员数"
            />
            <StatMiniCard
              label="满勤学员（≥6次）"
              value={mc.superfan_this.toLocaleString()}
              sub={`上月 ${mc.superfan_last.toLocaleString()} 人`}
              accent={mc.superfan_this >= mc.superfan_last ? 'green' : 'red'}
              subtitle="本月打卡次数达到 6 次（满勤）的学员数"
            />
          </div>
        </div>
      )}

      {/* 围场参与率柱图 */}
      {studentData?.by_enclosure && studentData.by_enclosure.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            围场打卡参与率
          </h3>
          <div className="card-base p-5">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              各围场（M0→M12+）打卡参与率对比 · 颜色：绿≥50% · 橙30-50% · 红&lt;30%
            </p>
            <EnclosureParticipationChart data={studentData.by_enclosure} />
          </div>
        </div>
      )}
    </div>
  );
}
