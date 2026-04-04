'use client';

import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import Link from 'next/link';
import { User, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useConfigStore } from '@/lib/stores/config-store';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import type { RankingData } from '@/lib/types';

const I18N = {
  zh: {
    myWorkbench: '我的工作台',
    selectCC: '在顶部全局筛选栏中选择一位 CC，查看个人工作台',
    loadingPersonal: '加载个人数据...',
    monthlyRank: '本月排名',
    total: '共',
    persons: '人',
    compositeScore: '综合得分',
    newReferralRank: '带新数排名',
    paymentRank: '付费数排名',
    noRankData: '暂无该 CC 的排名数据',
    noData: '暂无数据',
    monthlyProgress: '本月带新进度',
    newReferralCount: '带新数：',
    targetUnavailable: '（目标数据不可用）',
    highPotentialStudents: '待跟进高潜学员',
    responsibleHP: '负责高潜学员数：',
    viewDetails: '查看详情',
  },
  'zh-TW': {
    myWorkbench: '我的工作台',
    selectCC: '在頂部全局篩選欄中選擇一位 CC，查看個人工作台',
    loadingPersonal: '載入個人資料...',
    monthlyRank: '本月排名',
    total: '共',
    persons: '人',
    compositeScore: '綜合得分',
    newReferralRank: '帶新數排名',
    paymentRank: '付費數排名',
    noRankData: '暫無該 CC 的排名資料',
    noData: '暫無資料',
    monthlyProgress: '本月帶新進度',
    newReferralCount: '帶新數：',
    targetUnavailable: '（目標資料不可用）',
    highPotentialStudents: '待跟進高潛學員',
    responsibleHP: '負責高潛學員數：',
    viewDetails: '查看詳情',
  },
  en: {
    myWorkbench: 'My Workbench',
    selectCC: 'Select a CC from the top filter bar to view personal workbench',
    loadingPersonal: 'Loading personal data...',
    monthlyRank: 'Monthly Rank',
    total: 'Total',
    persons: '',
    compositeScore: 'Composite Score',
    newReferralRank: 'Referral Rank',
    paymentRank: 'Payment Rank',
    noRankData: 'No ranking data for this CC',
    noData: 'No data',
    monthlyProgress: 'Monthly Referral Progress',
    newReferralCount: 'Referrals: ',
    targetUnavailable: '(Target unavailable)',
    highPotentialStudents: 'High Potential Students',
    responsibleHP: 'Responsible HP students: ',
    viewDetails: 'View Details',
  },
  th: {
    myWorkbench: 'แผงงานของฉัน',
    selectCC: 'เลือก CC จากแถบกรองด้านบนเพื่อดูแผงงานส่วนตัว',
    loadingPersonal: 'กำลังโหลดข้อมูลส่วนตัว...',
    monthlyRank: 'อันดับประจำเดือน',
    total: 'ทั้งหมด',
    persons: 'คน',
    compositeScore: 'คะแนนรวม',
    newReferralRank: 'อันดับการแนะนำ',
    paymentRank: 'อันดับการชำระเงิน',
    noRankData: 'ไม่มีข้อมูลอันดับสำหรับ CC นี้',
    noData: 'ไม่มีข้อมูล',
    monthlyProgress: 'ความคืบหน้าการแนะนำประจำเดือน',
    newReferralCount: 'จำนวนแนะนำ: ',
    targetUnavailable: '(ไม่มีข้อมูลเป้าหมาย)',
    highPotentialStudents: 'นักเรียนศักยภาพสูงที่รอติดตาม',
    responsibleHP: 'จำนวนนักเรียนศักยภาพสูงที่รับผิดชอบ: ',
    viewDetails: 'ดูรายละเอียด',
  },
} as const;
type Locale = keyof typeof I18N;

interface HighPotentialCountResponse {
  total?: number;
  students?: unknown[];
  count?: number;
}

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const isTop3 = rank <= 3;
  const badgeClass = isTop3
    ? 'bg-[var(--color-warning-surface)] text-[var(--color-warning)] border border-[var(--color-warning)] font-bold'
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
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;
  if (rank === null) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-xs text-[var(--text-muted)]">{t.noData}</span>
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
  const barColor = overTarget
    ? 'bg-[var(--color-success)]'
    : pct >= 70
      ? 'bg-[var(--color-warning)]'
      : 'bg-[var(--color-danger)]';

  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
        <span className="font-semibold text-[var(--text-primary)]">{value}</span>
        <span className="font-semibold text-[var(--text-secondary)]">{target}</span>
        <span
          className={`font-semibold ${overTarget ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'}`}
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
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;
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
      <Card title={t.myWorkbench}>
        <div className="flex items-center gap-3 py-4 text-sm text-[var(--text-muted)]">
          <User className="w-5 h-5 shrink-0 opacity-40" />
          <span>{t.selectCC}</span>
        </div>
      </Card>
    );
  }

  const isLoading = rankLoading || hpLoading;

  return (
    <Card title={`${t.myWorkbench} — ${focusCC}`}>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-xs text-[var(--text-muted)]">{t.loadingPersonal}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 月度排名 */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                {t.monthlyRank}
              </span>
              {totalRanked > 0 && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  （{t.total} {totalRanked} {t.persons}）
                </span>
              )}
            </div>
            {myRankItem ? (
              <div className="divide-y divide-[var(--border-default)]">
                <RankRow
                  label={t.compositeScore}
                  rank={myRankItem.rank}
                  total={totalRanked}
                  score={myRankItem.composite_score}
                />
                {myRankItem.registrations !== undefined && (
                  <RankRow
                    label={t.newReferralRank}
                    rank={myRankItem.rank}
                    total={totalRanked}
                    score={myRankItem.registrations as number}
                  />
                )}
                {myRankItem.payments !== undefined && (
                  <RankRow
                    label={t.paymentRank}
                    rank={myRankItem.rank}
                    total={totalRanked}
                    score={myRankItem.payments as number}
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] py-2">{t.noRankData}</p>
            )}
          </section>

          {/* 月度进度条 */}
          {myRankItem && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  {t.monthlyProgress}
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
                  {t.newReferralCount}
                  <span className="font-semibold text-[var(--text-primary)] ml-1">
                    {myRankItem.registrations as number}
                  </span>
                  <span className="ml-1 opacity-60">{t.targetUnavailable}</span>
                </div>
              ) : null}
            </section>
          )}

          {/* 待跟进高潜学员 */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                {t.highPotentialStudents}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                {t.responsibleHP}
                <span className="font-semibold text-[var(--text-primary)] ml-1">
                  {hpCount !== null ? hpCount : '—'}
                </span>
              </span>
              <Link
                href={`/high-potential?cc=${encodeURIComponent(focusCC)}`}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
              >
                {t.viewDetails}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}
