'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatRate } from '@/lib/utils';
import type { OpsStudentRankingResponse, OpsStudentRankingRow } from '@/lib/types/checkin-student';
import { useState } from 'react';

// ── 14 维度配置 ───────────────────────────────────────────────────────────────

interface DimensionDef {
  id: string;
  label: string;
  valueKey: keyof OpsStudentRankingRow;
  format: 'int' | 'float2' | 'rate' | 'score';
  description: string;
}

const DIMENSIONS: DimensionDef[] = [
  {
    id: 'checkin_days',
    label: '本月打卡',
    valueKey: 'days_this_month',
    format: 'int',
    description: '本月累计打卡天数',
  },
  {
    id: 'checkin_consistency',
    label: '打卡稳定性',
    valueKey: 'engagement_stability',
    format: 'rate',
    description: '本月/上月打卡天数一致性（0→1）',
  },
  {
    id: 'quality_score',
    label: '质量评分',
    valueKey: 'quality_score',
    format: 'score',
    description: '综合质量评分（课耗40%+推荐30%+付费20%+围场10%）',
  },
  {
    id: 'referral_bindings',
    label: '推荐注册',
    valueKey: 'referral_registrations',
    format: 'int',
    description: '当月推荐注册人数（D4）',
  },
  {
    id: 'referral_attendance',
    label: '推荐出席',
    valueKey: 'referral_attendance',
    format: 'int',
    description: '当月推荐出席人数（D4）',
  },
  {
    id: 'referral_payments',
    label: '推荐付费',
    valueKey: 'referral_payments',
    format: 'int',
    description: '本月推荐付费数（D4）',
  },
  {
    id: 'conversion_rate',
    label: '注册转化率',
    valueKey: 'conversion_rate',
    format: 'rate',
    description: '推荐付费数 ÷ 推荐注册数',
  },
  {
    id: 'secondary_referrals',
    label: '二级裂变',
    valueKey: 'secondary_referrals',
    format: 'int',
    description: '被该学员推荐的B学员中，当月又带来注册的人数',
  },
  {
    id: 'improvement',
    label: '打卡进步',
    valueKey: 'delta',
    format: 'int',
    description: '本月打卡天数 - 上月打卡天数（正=进步）',
  },
  {
    id: 'cc_dial_depth',
    label: 'CC拨打次数',
    valueKey: 'cc_dial_count',
    format: 'int',
    description: '总CC拨打次数（D4）',
  },
  {
    id: 'role_split_new',
    label: '角色带新（注册）',
    valueKey: 'cc_new_count',
    format: 'int',
    description: 'CC+SS+LP 带新注册人数合计',
  },
  {
    id: 'role_split_paid',
    label: '角色带新（付费）',
    valueKey: 'cc_new_paid',
    format: 'int',
    description: 'CC+SS+LP 带新付费人数合计',
  },
  {
    id: 'd3_funnel',
    label: 'D3邀约数',
    valueKey: 'd3_invitations',
    format: 'int',
    description: 'D3 明细表邀约数',
  },
  {
    id: 'historical_total',
    label: '历史累计',
    valueKey: 'total_historical_registrations',
    format: 'int',
    description: '总推荐注册 + 总推荐1v1付费人数',
  },
];

// ── 格式化工具 ────────────────────────────────────────────────────────────────

function fmtValue(val: number | null | undefined, format: DimensionDef['format']): string {
  if (val == null || isNaN(val)) return '—';
  switch (format) {
    case 'int':
      return val.toLocaleString();
    case 'float2':
      return val.toFixed(2);
    case 'rate':
      return formatRate(val);
    case 'score':
      return val.toFixed(1);
    default:
      return String(val);
  }
}

function fmtDelta(delta: number): string {
  if (delta === 0) return '—';
  return delta > 0 ? `+${delta}` : String(delta);
}

// ── 排名徽章 ─────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-white font-bold text-sm">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white font-bold text-sm">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-bold text-sm">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 text-[var(--text-muted)] text-sm tabular-nums">
      {rank}
    </span>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface OpsStudentRankingProps {
  configJson: string;
}

export function OpsStudentRanking({ configJson }: OpsStudentRankingProps) {
  const [dimension, setDimension] = useState<string>('checkin_days');

  const apiUrl = `/api/checkin/ops-student-ranking?dimension=${dimension}&role_config=${encodeURIComponent(configJson)}&limit=50`;

  const { data, isLoading, error, mutate } = useFilteredSWR<OpsStudentRankingResponse>(apiUrl, {
    refreshInterval: 60_000,
  });

  const currentDimDef = DIMENSIONS.find((d) => d.id === dimension) ?? DIMENSIONS[0];

  // ── loading 态 ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--text-muted)]">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── 错误态 ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取学员排行数据，请检查后端服务"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  // ── 空态 ───────────────────────────────────────────────────────────────────
  if (!data || data.total_students === 0) {
    return (
      <div className="space-y-4">
        {/* 维度切换 pill bar（空态仍然可以切换） */}
        <DimensionPillBar current={dimension} onSelect={setDimension} />
        <EmptyState
          title="M6~M12+ 围场暂无学员数据"
          description="上传包含 M6+ 围场的 D4 学员数据后自动刷新"
        />
      </div>
    );
  }

  const students = data.students ?? [];
  const nonZeroCount = students.filter((s) => (s[currentDimDef.valueKey] as number) > 0).length;
  const nonZeroPct = students.length > 0 ? Math.round((nonZeroCount / students.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 维度切换 pill bar */}
      <DimensionPillBar current={dimension} onSelect={setDimension} />

      {/* 当前维度说明 */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] px-1">
        <span className="font-medium text-[var(--text-secondary)]">{currentDimDef.label}：</span>
        <span>{currentDimDef.description}</span>
      </div>

      {/* 排行表 */}
      <div className="card-base overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">排名</th>
                <th className="slide-th">学员 ID</th>
                <th className="slide-th text-center">围场</th>
                <th className="slide-th">负责人</th>
                <th className="slide-th font-bold text-right">{currentDimDef.label}</th>
                <th className="slide-th text-right">本月打卡</th>
                <th className="slide-th text-right">推荐注册</th>
                <th className="slide-th text-right">推荐付费</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const isTop3 = s.rank <= 3;
                return (
                  <tr
                    key={s.student_id}
                    className={cn(
                      idx % 2 === 0 ? 'slide-row-even' : 'slide-row-odd',
                      isTop3 && 'bg-amber-50/40'
                    )}
                  >
                    <td className="slide-td text-center">
                      <RankBadge rank={s.rank} />
                    </td>
                    <td className="slide-td font-mono text-xs text-[var(--text-secondary)] max-w-[120px] truncate">
                      {s.student_id || '—'}
                    </td>
                    <td className="slide-td text-center">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {s.enclosure}
                      </span>
                    </td>
                    <td className="slide-td text-xs">
                      <div className="truncate max-w-[100px]">{s.cc_name || '—'}</div>
                      {s.team && (
                        <div className="text-[var(--text-muted)] truncate max-w-[100px]">
                          {s.team}
                        </div>
                      )}
                    </td>
                    <td className="slide-td text-right font-bold text-[var(--text-primary)] tabular-nums">
                      {fmtValue(s[currentDimDef.valueKey] as number, currentDimDef.format)}
                    </td>
                    <td className="slide-td text-right tabular-nums">
                      <span>{s.days_this_month}</span>
                      {s.delta !== 0 && (
                        <span
                          className={cn(
                            'ml-1 text-xs',
                            s.delta > 0 ? 'text-emerald-600' : 'text-red-500'
                          )}
                        >
                          {fmtDelta(s.delta)}
                        </span>
                      )}
                    </td>
                    <td className="slide-td text-right tabular-nums">
                      {s.referral_registrations || '—'}
                    </td>
                    <td className="slide-td text-right tabular-nums">
                      {s.referral_payments || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部统计摘要 */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
        <span>
          共{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            {data.total_students.toLocaleString()}
          </span>{' '}
          名运营围场学员
        </span>
        <span>
          当前维度非零占比：
          <span className="font-semibold text-[var(--text-primary)] ml-1">{nonZeroPct}%</span>（
          {nonZeroCount}/{students.length}）
        </span>
      </div>
    </div>
  );
}

// ── 维度切换 pill bar ─────────────────────────────────────────────────────────

function DimensionPillBar({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {DIMENSIONS.map((dim) => (
        <button
          key={dim.id}
          onClick={() => onSelect(dim.id)}
          className={cn(
            'whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors duration-150 flex-shrink-0',
            current === dim.id
              ? 'bg-[var(--action-accent,#1d4ed8)] text-white border-[var(--action-accent,#1d4ed8)] font-semibold'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]'
          )}
          title={dim.description}
        >
          {dim.label}
        </button>
      ))}
    </div>
  );
}
