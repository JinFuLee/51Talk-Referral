'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatRate } from '@/lib/utils';
import type { OpsStudentRankingResponse, OpsStudentRankingRow } from '@/lib/types/checkin-student';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

// ── i18n ──────────────────────────────────────────────────────────────────────
// ── 14 维度配置 ───────────────────────────────────────────────────────────────

interface DimensionDef {
  id: string;
  labelKey: string;
  valueKey: keyof OpsStudentRankingRow;
  format: 'int' | 'float2' | 'rate' | 'score';
  descKey: string;
}

const DIMENSIONS: DimensionDef[] = [
  {
    id: 'checkin_days',
    labelKey: 'dimCheckinDays',
    valueKey: 'days_this_month',
    format: 'int',
    descKey: 'dimCheckinDaysDesc',
  },
  {
    id: 'checkin_consistency',
    labelKey: 'dimConsistency',
    valueKey: 'engagement_stability',
    format: 'rate',
    descKey: 'dimConsistencyDesc',
  },
  {
    id: 'quality_score',
    labelKey: 'dimQuality',
    valueKey: 'quality_score',
    format: 'score',
    descKey: 'dimQualityDesc',
  },
  {
    id: 'referral_bindings',
    labelKey: 'dimRefReg',
    valueKey: 'referral_registrations',
    format: 'int',
    descKey: 'dimRefRegDesc',
  },
  {
    id: 'referral_attendance',
    labelKey: 'dimRefAtt',
    valueKey: 'referral_attendance',
    format: 'int',
    descKey: 'dimRefAttDesc',
  },
  {
    id: 'referral_payments',
    labelKey: 'dimRefPay',
    valueKey: 'referral_payments',
    format: 'int',
    descKey: 'dimRefPayDesc',
  },
  {
    id: 'conversion_rate',
    labelKey: 'dimConvRate',
    valueKey: 'conversion_rate',
    format: 'rate',
    descKey: 'dimConvRateDesc',
  },
  {
    id: 'secondary_referrals',
    labelKey: 'dimSecondary',
    valueKey: 'secondary_referrals',
    format: 'int',
    descKey: 'dimSecondaryDesc',
  },
  {
    id: 'improvement',
    labelKey: 'dimImprove',
    valueKey: 'delta',
    format: 'int',
    descKey: 'dimImproveDesc',
  },
  {
    id: 'cc_dial_depth',
    labelKey: 'dimCCDial',
    valueKey: 'cc_dial_count',
    format: 'int',
    descKey: 'dimCCDialDesc',
  },
  {
    id: 'role_split_new',
    labelKey: 'dimRoleSplitNew',
    valueKey: 'cc_new_count',
    format: 'int',
    descKey: 'dimRoleSplitNewDesc',
  },
  {
    id: 'role_split_paid',
    labelKey: 'dimRoleSplitPaid',
    valueKey: 'cc_new_paid',
    format: 'int',
    descKey: 'dimRoleSplitPaidDesc',
  },
  {
    id: 'd3_funnel',
    labelKey: 'dimD3Funnel',
    valueKey: 'd3_invitations',
    format: 'int',
    descKey: 'dimD3FunnelDesc',
  },
  {
    id: 'historical_total',
    labelKey: 'dimHistorical',
    valueKey: 'total_historical_registrations',
    format: 'int',
    descKey: 'dimHistoricalDesc',
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
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning-token text-white font-bold text-sm">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-subtle text-white font-bold text-sm">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning-token text-white font-bold text-sm">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 text-muted-token text-sm tabular-nums">
      {rank}
    </span>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface OpsStudentRankingProps {
  configJson: string;
}

export function OpsStudentRanking({ configJson }: OpsStudentRankingProps) {
  const t = useTranslations('OpsStudentRanking');
  const [dimension, setDimension] = useState<string>('checkin_days');

  const apiUrl = `/api/checkin/ops-student-ranking?dimension=${dimension}&role_config=${encodeURIComponent(configJson)}&limit=50`;

  const { data, isLoading, error, mutate } = useFilteredSWR<OpsStudentRankingResponse>(apiUrl, {
    refreshInterval: 60_000,
  });

  const currentDimDef = DIMENSIONS.find((d) => d.id === dimension) ?? DIMENSIONS[0];

  // ── loading 态 ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-token">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── 错误态 ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <EmptyState
        title={t('loadFail')}
        description={t('loadFailDesc')}
        action={{ label: t('retry'), onClick: () => mutate() }}
      />
    );
  }

  // ── 空态 ───────────────────────────────────────────────────────────────────
  if (!data || data.total_students === 0) {
    return (
      <div className="space-y-4">
        {/* 维度切换 pill bar（空态仍然可以切换） */}
        <DimensionPillBar current={dimension} onSelect={setDimension} t={t} />
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      </div>
    );
  }

  const students = data.students ?? [];
  const nonZeroCount = students.filter((s) => (s[currentDimDef.valueKey] as number) > 0).length;
  const nonZeroPct = students.length > 0 ? Math.round((nonZeroCount / students.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 维度切换 pill bar */}
      <DimensionPillBar current={dimension} onSelect={setDimension} t={t} />

      {/* 当前维度说明 */}
      <div className="flex items-center gap-2 text-xs text-muted-token px-1">
        <span className="font-medium text-secondary-token">{t(currentDimDef.labelKey)}：</span>
        <span>{t(currentDimDef.descKey)}</span>
      </div>

      {/* 排行表 */}
      <div className="card-base overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">{t('rankCol')}</th>
                <th className="slide-th">{t('studentCol')}</th>
                <th className="slide-th text-center">{t('enclosureCol')}</th>
                <th className="slide-th">{t('ownerCol')}</th>
                <th className="slide-th font-bold text-right">{t(currentDimDef.labelKey)}</th>
                <th className="slide-th text-right">{t('checkinCol')}</th>
                <th className="slide-th text-right">{t('regCol')}</th>
                <th className="slide-th text-right">{t('payCol')}</th>
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
                      isTop3 && 'bg-warning-surface'
                    )}
                  >
                    <td className="slide-td text-center">
                      <RankBadge rank={s.rank} />
                    </td>
                    <td className="slide-td font-mono text-xs text-secondary-token max-w-[120px] truncate">
                      {s.student_id || '—'}
                    </td>
                    <td className="slide-td text-center">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-subtle text-secondary-token">
                        {s.enclosure}
                      </span>
                    </td>
                    <td className="slide-td text-xs">
                      <div className="truncate max-w-[100px]">{s.cc_name || '—'}</div>
                      {s.team && (
                        <div className="text-muted-token truncate max-w-[100px]">{s.team}</div>
                      )}
                    </td>
                    <td className="slide-td text-right font-bold text-primary-token tabular-nums">
                      {fmtValue(s[currentDimDef.valueKey] as number, currentDimDef.format)}
                    </td>
                    <td className="slide-td text-right tabular-nums">
                      <span>{s.days_this_month}</span>
                      {s.delta !== 0 && (
                        <span
                          className={cn(
                            'ml-1 text-xs',
                            s.delta > 0 ? 'text-success-token' : 'text-danger-token'
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
      <div className="flex items-center justify-between text-xs text-muted-token px-1">
        <span>
          共{' '}
          <span className="font-semibold text-primary-token">
            {data.total_students.toLocaleString()}
          </span>{' '}
          {t('totalStudents')}
        </span>
        <span>
          {t('nonZeroLabel')}：
          <span className="font-semibold text-primary-token ml-1">{nonZeroPct}%</span>（
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
  t,
}: {
  current: string;
  onSelect: (id: string) => void;
  t: (key: string, params?: any) => string;
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
              ? 'bg-action-accent-token text-white border-action-accent-token font-semibold'
              : 'bg-surface text-secondary-token border-default-token hover:bg-subtle'
          )}
          title={t(dim.descKey)}
        >
          {t(dim.labelKey)}
        </button>
      ))}
    </div>
  );
}
