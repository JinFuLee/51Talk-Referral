'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { useWideConfig } from '@/lib/hooks/useWideConfig';
import { useCheckinThresholds } from '@/lib/hooks/useCheckinThresholds';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatMiniCard } from '@/components/ui/StatMiniCard';
import { StudentFrequencyChart } from '@/components/checkin/StudentFrequencyChart';
import { LessonCheckinCross } from '@/components/checkin/LessonCheckinCross';
import { ConversionFunnelProof } from '@/components/checkin/ConversionFunnelProof';
import { ContactCheckinChart } from '@/components/checkin/ContactCheckinChart';
import { RenewalCheckinChart } from '@/components/checkin/RenewalCheckinChart';
import { cn, formatRate, fmtEnc } from '@/lib/utils';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { EnclosureDistItem } from '@/lib/types/checkin-student';

// ── 类型定义（与 page.tsx 保持一致）────────────────────────────────────────────

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

// ── 单个渠道列（从 page.tsx 迁移）────────────────────────────────────────────

interface ChannelColumnProps {
  ch: CheckinChannelSummary;
  rateColor: (rate: number) => string;
  rateBg: (rate: number) => string;
}

function ChannelColumn({ ch, rateColor, rateBg }: ChannelColumnProps) {
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

// ── 围场参与率水平柱图 ─────────────────────────────────────────────────────────

interface EnclosureChartRow {
  label: string;
  participation_pct: number;
  avg_days: number;
  total: number;
}

function EnclosureTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as EnclosureChartRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mb-1">
        围场：{label}
      </p>
      <p className="text-[var(--text-secondary)]">
        参与率：
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {row.participation_pct.toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        人均打卡：
        <span className="font-mono tabular-nums ml-1">{row.avg_days.toFixed(2)} 天</span>
      </p>
      <p className="text-[var(--text-muted)]">该围场学员数：{row.total.toLocaleString()}</p>
    </div>
  );
}

function EnclosureParticipationChart({ data }: { data: EnclosureDistItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-[var(--text-muted)]">
        暂无围场分布数据
      </div>
    );
  }

  const chartData: EnclosureChartRow[] = data.map((item) => ({
    label: fmtEnc(item.enclosure),
    participation_pct: parseFloat((item.participation_rate * 100).toFixed(1)),
    avg_days: item.avg_days,
    total: item.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        barCategoryGap="30%"
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisTick }}
          axisLine={{ stroke: CHART_PALETTE.border }}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<EnclosureTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="participation_pct" radius={[0, 4, 4, 0]}>
          {chartData.map((row, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                row.participation_pct >= 50
                  ? CHART_PALETTE.success
                  : row.participation_pct >= 30
                    ? CHART_PALETTE.warning
                    : CHART_PALETTE.danger
              }
            />
          ))}
          <LabelList
            dataKey="participation_pct"
            position="right"
            style={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
            formatter={(v: number) => `${v}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 学员行为全景区块 ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function StudentPanoramaSection({ enclosureFilter }: { enclosureFilter?: string | null }) {
  const { data, isLoading, error } = useStudentAnalysis(
    enclosureFilter ? { enclosure: enclosureFilter } : undefined
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] p-4 text-sm text-[var(--text-muted)]">
        学员行为数据加载失败，请检查后端服务
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] p-4 text-sm text-[var(--text-muted)]">
        暂无学员行为数据，请先上传数据文件
      </div>
    );
  }

  const mc = data.month_comparison;

  // 参与率趋势
  const participationTrend: 'up' | 'down' | 'flat' =
    mc.participation_rate_this > mc.participation_rate_last
      ? 'up'
      : mc.participation_rate_this < mc.participation_rate_last
        ? 'down'
        : 'flat';

  // 人均打卡趋势
  const avgDaysTrend: 'up' | 'down' | 'flat' =
    mc.avg_days_this > mc.avg_days_last
      ? 'up'
      : mc.avg_days_this < mc.avg_days_last
        ? 'down'
        : 'flat';

  return (
    <div className="space-y-8">
      {/* 大标题 + 分隔线 */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">学员打卡行为全景</h2>
          <div className="flex-1 h-px bg-[var(--border-default)]" />
        </div>

        {/* 行 1：KPI 卡片行 */}
        <div className="space-y-3 mb-6">
          <SectionTitle>月度对比核心指标</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMiniCard
              label="本月参与率"
              value={formatRate(mc.participation_rate_this)}
              sub={`上月 ${formatRate(mc.participation_rate_last)}`}
              accent={
                participationTrend === 'up'
                  ? 'green'
                  : participationTrend === 'down'
                    ? 'red'
                    : 'slate'
              }
              subtitle="至少打卡 1 次的学员 / 有效学员总数"
            />
            <StatMiniCard
              label="人均打卡天数"
              value={mc.avg_days_this.toFixed(2)}
              sub={`上月 ${mc.avg_days_last.toFixed(2)} 天`}
              accent={avgDaysTrend === 'up' ? 'green' : avgDaysTrend === 'down' ? 'red' : 'slate'}
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

        {/* 行 2：频次分布 + 课耗×打卡四象限 */}
        <div className="space-y-3 mb-6">
          <SectionTitle>频次分布 · 课耗×打卡四象限</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
                打卡频次分布（0–6 次）
              </p>
              <StudentFrequencyChart data={data.frequency_distribution} />
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
                课耗×打卡四象限
              </p>
              <LessonCheckinCross data={data.lesson_checkin_cross} />
            </div>
          </div>
        </div>

        {/* 行 3：围场参与率水平柱图 */}
        <div className="space-y-3 mb-6">
          <SectionTitle>围场打卡参与率</SectionTitle>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              各围场（M0→M5+）打卡参与率对比 · 颜色：绿≥50% · 橙30-50% · 红&lt;30%
            </p>
            <EnclosureParticipationChart data={data.by_enclosure} />
          </div>
        </div>

        {/* 行 4：三级转化漏斗证明 */}
        <div className="space-y-3 mb-6">
          <SectionTitle>打卡频次×推荐转化漏斗</SectionTitle>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              不同打卡频段学员的推荐注册率与付费率对比 · 验证打卡→推荐的正相关关系
            </p>
            <ConversionFunnelProof data={data.conversion_funnel} />
          </div>
        </div>

        {/* 行 5：CC触达效果 + 续费关联 */}
        <div className="space-y-3">
          <SectionTitle>CC 触达效果 · 续费关联</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
                CC 触达频率×打卡参与率
              </p>
              <ContactCheckinChart data={data.contact_checkin_response} />
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">
                打卡频段×续费关联
              </p>
              <RenewalCheckinChart data={data.renewal_checkin_correlation} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 主组件：SummaryTab ─────────────────────────────────────────────────────────

/**
 * 打卡管理汇总 Tab
 *
 * 包含两个部分：
 * 1. 按岗位（CC/SS/LP）展示打卡率的渠道列汇总
 * 2. 学员打卡行为全景（5 行：KPI卡片 + 频次图 + 围场参与率 + 转化漏斗 + 触达/续费）
 */
interface SummaryTabProps {
  enclosureFilter?: string | null;
}

export default function SummaryTab({ enclosureFilter }: SummaryTabProps) {
  const { configJson } = useWideConfig();
  const { rateColor, rateBg } = useCheckinThresholds();

  const { data, isLoading, error, mutate } = useFilteredSWR<CheckinSummaryResponse>(
    `/api/checkin/summary?role_config=${encodeURIComponent(configJson)}`
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

  // 将后端 by_role 对象转为前端渲染列表（过滤运营：运营有独立 OpsChannelView）
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

  return (
    <div className="space-y-8">
      {/* 原有角色汇总 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {channels.map((ch) => (
          <ChannelColumn key={ch.channel} ch={ch} rateColor={rateColor} rateBg={rateBg} />
        ))}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-[var(--border-default)]" />

      {/* 学员行为全景 */}
      <StudentPanoramaSection enclosureFilter={enclosureFilter} />
    </div>
  );
}
