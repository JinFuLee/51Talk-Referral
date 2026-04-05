'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import Link from 'next/link';
import { User, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useConfigStore } from '@/lib/stores/config-store';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import type { RankingData } from '@/lib/types';
interface HighPotentialCountResponse {
  total?: number;
  students?: unknown[];
  count?: number;
}

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const isTop3 = rank <= 3;
  const badgeClass = isTop3
    ? 'bg-warning-surface text-warning-token border border-warning-token font-bold'
    : 'bg-subtle text-secondary-token border border-default-token';

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs ${badgeClass}`}
    >
      #{rank}
    </span>
  );
}

function RankRow({
  label,
  rank,
  total,
  score,
}: {
  label: string;
  rank: number | null;
  total: number;
  score?: number | null;
}) {
  const t = useTranslations('PersonalWorkbench');
  if (rank === null) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-xs text-muted-token">{label}</span>
        <span className="text-xs text-muted-token">{t('noData')}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-secondary-token">{label}</span>
      <div className="flex items-center gap-2">
        {score !== null && score !== undefined && (
          <span className="text-xs text-muted-token tabular-nums">
            {typeof score === 'number' ? score.toFixed(1) : score}
          </span>
        )}
        <RankBadge rank={rank} total={total} />
      </div>
    </div>
  );
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0;
  const overTarget = target > 0 && value >= target;
  const barColor = overTarget
    ? 'bg-success-token'
    : pct >= 70
      ? 'bg-warning-token'
      : 'bg-danger-token';

  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-muted-token mb-0.5">
        <span className="font-semibold text-primary-token">{value}</span>
        <span className="font-semibold text-secondary-token">{target}</span>
        <span
          className={`font-semibold ${overTarget ? 'text-success-token' : 'text-primary-token'}`}
        >
          {pct}%
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-n-200 overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PersonalWorkbench() {
  const t = useTranslations('PersonalWorkbench');
  const focusCC = useConfigStore((s) => s.focusCC);
  const selectedMonth = useConfigStore((s) => s.selectedMonth);

  // CC 排名数据（selectedMonth null = 当前月，后端默认处理）
  const rankKey = focusCC
    ? `/api/analysis/cc-ranking?top_n=50${selectedMonth ? `&month=${selectedMonth}` : ''}&cc_name=${encodeURIComponent(focusCC)}`
    : null;
  const { data: rankData, isLoading: rankLoading } = useFilteredSWR<RankingData>(rankKey);

  // 高潜学员数
  const hpKey = focusCC ? `/api/high-potential?cc=${encodeURIComponent(focusCC)}` : null;
  const { data: hpData, isLoading: hpLoading } = useFilteredSWR<HighPotentialCountResponse>(hpKey);

  // 找出该 CC 在排名中的条目
  const myRankItem = rankData?.items?.find((item) => item.name === focusCC);
  const totalRanked = rankData?.items?.length ?? 0;

  // 高潜学员总数
  const hpCount =
    hpData?.total ??
    (Array.isArray(hpData?.students) ? hpData!.students!.length : null) ??
    hpData?.count ??
    null;

  if (!focusCC) {
    return (
      <Card title={t('myWorkbench')}>
        <div className="flex items-center gap-3 py-4 text-sm text-muted-token">
          <User className="w-5 h-5 shrink-0 opacity-40" />
          <span>{t('selectCC')}</span>
        </div>
      </Card>
    );
  }

  const isLoading = rankLoading || hpLoading;

  return (
    <Card title={`${t('myWorkbench')} — ${focusCC}`}>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-xs text-muted-token">{t('loadingPersonal')}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 月度排名 */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-muted-token" />
              <span className="text-xs font-semibold text-secondary-token uppercase tracking-wide">
                {t('monthlyRank')}
              </span>
              {totalRanked > 0 && (
                <span className="text-[10px] text-muted-token">
                  （{t('total')} {totalRanked} {t('persons')}）
                </span>
              )}
            </div>
            {myRankItem ? (
              <div className="divide-y divide-[var(--border-default)]">
                <RankRow
                  label={t('compositeScore')}
                  rank={myRankItem.rank}
                  total={totalRanked}
                  score={myRankItem.composite_score}
                />
                {myRankItem.registrations !== undefined && (
                  <RankRow
                    label={t('newReferralRank')}
                    rank={myRankItem.rank}
                    total={totalRanked}
                    score={myRankItem.registrations as number}
                  />
                )}
                {myRankItem.payments !== undefined && (
                  <RankRow
                    label={t('paymentRank')}
                    rank={myRankItem.rank}
                    total={totalRanked}
                    score={myRankItem.payments as number}
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-token py-2">{t('noRankData')}</p>
            )}
          </section>

          {/* 月度进度条 */}
          {myRankItem && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-muted-token" />
                <span className="text-xs font-semibold text-secondary-token uppercase tracking-wide">
                  {t('monthlyProgress')}
                </span>
              </div>
              {myRankItem.registrations !== undefined &&
              myRankItem.target_registrations !== undefined ? (
                <ProgressBar
                  value={myRankItem.registrations as number}
                  target={myRankItem.target_registrations as number}
                />
              ) : myRankItem.registrations !== undefined ? (
                <div className="text-xs text-muted-token">
                  {t('newReferralCount')}
                  <span className="font-semibold text-primary-token ml-1">
                    {myRankItem.registrations as number}
                  </span>
                  <span className="ml-1 opacity-60">{t('targetUnavailable')}</span>
                </div>
              ) : null}
            </section>
          )}

          {/* 待跟进高潜学员 */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-muted-token" />
              <span className="text-xs font-semibold text-secondary-token uppercase tracking-wide">
                {t('highPotentialStudents')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-token">
                {t('responsibleHP')}
                <span className="font-semibold text-primary-token ml-1">
                  {hpCount !== null ? hpCount : '—'}
                </span>
              </span>
              <Link
                href={`/high-potential?cc=${encodeURIComponent(focusCC)}`}
                className="inline-flex items-center gap-1 text-[11px] text-accent-token hover:text-accent-token transition-colors"
              >
                {t('viewDetails')}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}
