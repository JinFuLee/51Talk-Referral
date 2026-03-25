'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { User, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { swrFetcher } from '@/lib/api';
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
    ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]';

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
  if (rank === null) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-xs text-[var(--text-muted)]">暂无数据</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        {score !== null && score !== undefined && (
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
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
  const barColor = overTarget ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
        <span>
          实际 <span className="font-semibold text-[var(--text-primary)]">{value}</span>
        </span>
        <span>
          目标 <span className="font-semibold text-[var(--text-secondary)]">{target}</span>
        </span>
        <span
          className={`font-semibold ${overTarget ? 'text-emerald-800' : 'text-[var(--text-primary)]'}`}
        >
          {pct}%
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-[var(--border-default)] overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PersonalWorkbench() {
  const focusCC = useConfigStore((s) => s.focusCC);
  const period = useConfigStore((s) => s.period);

  // CC 排名数据
  const rankKey = focusCC
    ? `/api/analysis/cc-ranking?top_n=50&period=${period}&cc_name=${encodeURIComponent(focusCC)}`
    : null;
  const { data: rankData, isLoading: rankLoading } = useSWR<RankingData>(rankKey, swrFetcher);

  // 高潜学员数
  const hpKey = focusCC ? `/api/high-potential?cc=${encodeURIComponent(focusCC)}` : null;
  const { data: hpData, isLoading: hpLoading } = useSWR<HighPotentialCountResponse>(
    hpKey,
    swrFetcher
  );

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
      <Card title="我的工作台">
        <div className="flex items-center gap-3 py-4 text-sm text-[var(--text-muted)]">
          <User className="w-5 h-5 shrink-0 opacity-40" />
          <span>在顶部全局筛选栏中选择一位 CC，查看个人工作台</span>
        </div>
      </Card>
    );
  }

  const isLoading = rankLoading || hpLoading;

  return (
    <Card title={`我的工作台 — ${focusCC}`}>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-xs text-[var(--text-muted)]">加载个人数据...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 月度排名 */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                本月排名
              </span>
              {totalRanked > 0 && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  （共 {totalRanked} 人）
                </span>
              )}
            </div>
            {myRankItem ? (
              <div className="divide-y divide-[var(--border-default)]">
                <RankRow
                  label="综合得分"
                  rank={myRankItem.rank}
                  total={totalRanked}
                  score={myRankItem.composite_score}
                />
                {myRankItem.registrations !== undefined && (
                  <RankRow
                    label="带新数排名"
                    rank={myRankItem.rank}
                    total={totalRanked}
                    score={myRankItem.registrations as number}
                  />
                )}
                {myRankItem.payments !== undefined && (
                  <RankRow
                    label="付费数排名"
                    rank={myRankItem.rank}
                    total={totalRanked}
                    score={myRankItem.payments as number}
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] py-2">暂无该 CC 的排名数据</p>
            )}
          </section>

          {/* 月度进度条 */}
          {myRankItem && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  本月带新进度
                </span>
              </div>
              {myRankItem.registrations !== undefined &&
              myRankItem.target_registrations !== undefined ? (
                <ProgressBar
                  value={myRankItem.registrations as number}
                  target={myRankItem.target_registrations as number}
                />
              ) : myRankItem.registrations !== undefined ? (
                <div className="text-xs text-[var(--text-muted)]">
                  带新数：
                  <span className="font-semibold text-[var(--text-primary)] ml-1">
                    {myRankItem.registrations as number}
                  </span>
                  <span className="ml-1 opacity-60">（目标数据不可用）</span>
                </div>
              ) : null}
            </section>
          )}

          {/* 待跟进高潜学员 */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                待跟进高潜学员
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                负责高潜学员数：
                <span className="font-semibold text-[var(--text-primary)] ml-1">
                  {hpCount !== null ? hpCount : '—'}
                </span>
              </span>
              <Link
                href={`/high-potential?cc=${encodeURIComponent(focusCC)}`}
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 transition-colors"
              >
                查看详情
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}
