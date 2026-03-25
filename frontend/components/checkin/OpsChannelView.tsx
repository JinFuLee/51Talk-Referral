'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface OpsChannel {
  channel_id: string;
  channel_name: string;
  priority: 'high' | 'medium' | 'low';
  cost_level: 'high' | 'medium' | 'low' | 'lowest';
  description: string;
  target_criteria: string;
  estimated_contact_rate: number;
  recommended_count: number;
}

interface EnclosureSegment {
  segment: string;
  label: string;
  students: number;
  checked_in: number;
  rate: number;
}

interface OpsRoleSummary {
  total_students: number;
  checked_in: number;
  checkin_rate: number;
  channels: OpsChannel[];
  by_enclosure_segment: EnclosureSegment[];
  by_group: [];
  by_person: [];
}

interface RankingResponse {
  by_role: Record<string, OpsRoleSummary>;
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function fmtRate(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

// ── 优先级标签 ────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border border-red-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '高优先',
  medium: '中优先',
  low: '低优先',
};

const COST_LABELS: Record<string, string> = {
  high: '高成本',
  medium: '中成本',
  low: '低成本',
  lowest: '极低成本',
};

const COST_STYLES: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-green-600',
  lowest: 'text-green-700',
};

// ── 渠道卡片 ─────────────────────────────────────────────────────────────────

function ChannelCard({ channel }: { channel: OpsChannel }) {
  const ratePercent = Math.min(100, Math.round(channel.estimated_contact_rate * 100));

  return (
    <div className="card-compact overflow-hidden flex flex-col !p-0">
      {/* 卡片头部 */}
      <div className="bg-[var(--n-800,#1e293b)] text-white px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold truncate">{channel.channel_name}</span>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap',
            PRIORITY_STYLES[channel.priority] ?? PRIORITY_STYLES.low
          )}
        >
          {PRIORITY_LABELS[channel.priority] ?? channel.priority}
        </span>
      </div>

      {/* 卡片内容 */}
      <div className="p-3 flex flex-col gap-3 flex-1">
        {/* 推荐触达人数 */}
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
            {fmtNum(channel.recommended_count)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">推荐触达人数</div>
        </div>

        {/* 目标条件 */}
        <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded px-2 py-1.5 leading-relaxed">
          {channel.target_criteria}
        </div>

        {/* 预估触达率 */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">预估触达率</span>
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">
              {fmtRate(channel.estimated_contact_rate)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-action-accent transition-all"
              style={{ width: `${ratePercent}%` }}
            />
          </div>
        </div>

        {/* 成本级别 */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">成本级别</span>
          <span
            className={cn(
              'font-semibold',
              COST_STYLES[channel.cost_level] ?? 'text-[var(--text-secondary)]'
            )}
          >
            {COST_LABELS[channel.cost_level] ?? channel.cost_level}
          </span>
        </div>

        {/* 渠道描述 */}
        <div className="text-xs text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-default)] pt-2">
          {channel.description}
        </div>
      </div>
    </div>
  );
}

// ── 围场子段条形图 ──────────────────────────────────────────────────────────────

function EnclosureSegmentBar({ segments }: { segments: EnclosureSegment[] }) {
  const maxStudents = Math.max(...segments.map((s) => s.students), 1);

  return (
    <div className="card-compact overflow-hidden !p-0">
      <div className="bg-[var(--n-800,#1e293b)] text-white px-3 py-2">
        <span className="text-sm font-bold">围场子段分布</span>
      </div>
      <div className="p-3 space-y-3">
        {segments.map((seg) => {
          const barWidth = Math.round((seg.students / maxStudents) * 100);
          const ratePercent = Math.min(100, Math.round(seg.rate * 100));
          return (
            <div key={seg.segment}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[var(--text-primary)]">{seg.label}</span>
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {fmtNum(seg.checked_in)}/{fmtNum(seg.students)}{' '}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {fmtRate(seg.rate)}
                  </span>
                </span>
              </div>
              {/* 学员数量条 */}
              <div className="h-4 rounded bg-[var(--bg-subtle)] overflow-hidden relative">
                <div
                  className="h-full rounded bg-action-accent-subtle transition-all"
                  style={{ width: `${barWidth}%` }}
                />
                {/* 打卡率覆盖层 */}
                <div
                  className="absolute top-0 left-0 h-full rounded bg-action-accent opacity-70 transition-all"
                  style={{ width: `${Math.round((barWidth * ratePercent) / 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-action-accent-subtle" />
            总学员数
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-action-accent opacity-70" />
            已打卡
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface OpsChannelViewProps {
  configJson: string;
}

export function OpsChannelView({ configJson }: OpsChannelViewProps) {
  const { data, isLoading, error } = useSWR<RankingResponse>(
    `/api/checkin/ranking?role_config=${encodeURIComponent(configJson)}`,
    swrFetcher,
    { refreshInterval: 30_000 }
  );

  const opsData = data?.by_role?.['运营'];

  // 加载态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--text-muted)]">
        <Spinner size="lg" />
      </div>
    );
  }

  // 错误态
  if (error) {
    return <EmptyState title="数据加载失败" description="无法获取运营渠道数据，请检查后端服务" />;
  }

  // 空态
  if (!opsData || opsData.total_students === 0) {
    return (
      <EmptyState
        title="M6+ 围场暂无学员数据"
        description="上传包含 M6+ 围场的过程数据（D3）后自动刷新"
      />
    );
  }

  const channels = opsData.channels ?? [];
  const segments = opsData.by_enclosure_segment ?? [];

  return (
    <div className="space-y-5">
      {/* 区域 A — 顶部总览卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-compact text-center">
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {fmtNum(opsData.total_students)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">M6+ 总学员</div>
        </div>
        <div className="card-compact text-center">
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {fmtNum(opsData.checked_in)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">已打卡</div>
        </div>
        <div className="card-compact text-center">
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {fmtRate(opsData.checkin_rate)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">打卡率</div>
        </div>
      </div>

      {/* 区域 B — 四渠道触达卡片 */}
      {channels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {channels.map((ch) => (
            <ChannelCard key={ch.channel_id} channel={ch} />
          ))}
        </div>
      )}

      {channels.length === 0 && (
        <EmptyState title="暂无渠道配置" description="后端尚未返回渠道触达数据" />
      )}

      {/* 区域 C — 围场子段分布 */}
      {segments.length > 1 && <EnclosureSegmentBar segments={segments} />}

      {segments.length === 1 && (
        <div className="card-compact">
          <div className="text-xs text-[var(--text-muted)] mb-1">围场子段</div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-[var(--text-primary)]">{segments[0].label}</span>
            <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
              {fmtNum(segments[0].checked_in)}/{fmtNum(segments[0].students)} ·{' '}
              {fmtRate(segments[0].rate)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
