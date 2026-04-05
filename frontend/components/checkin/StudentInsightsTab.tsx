'use client';

import { useTranslations } from 'next-intl';
// ── 学员洞察 Tab ───────────────────────────────────────────────────────────────
// 从 SummaryTab 移出的学员全景内容 + 从 RankingTab 移出的学员排行
// 包含：频次分布 / 课耗×打卡四象限 / 转化漏斗 / CC触达 / 续费关联 / 学员排行榜

import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatMiniCard } from '@/components/ui/StatMiniCard';
import { StudentFrequencyChart } from '@/components/checkin/StudentFrequencyChart';
import { LessonCheckinCross } from '@/components/checkin/LessonCheckinCross';
import { ConversionFunnelProof } from '@/components/checkin/ConversionFunnelProof';
import { ContactCheckinChart } from '@/components/checkin/ContactCheckinChart';
import { RenewalCheckinChart } from '@/components/checkin/RenewalCheckinChart';
import { StudentRankingPanel } from '@/components/checkin/StudentRankingPanel';
import { EnclosureParticipationChart } from '@/components/checkin/EnclosureParticipationChart';
import { useStudentAnalysis } from '@/lib/hooks/useStudentAnalysis';
import { formatRate } from '@/lib/utils';
interface StudentInsightsTabProps {
  enclosureFilter: string | null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-secondary-token uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

export function StudentInsightsTab({ enclosureFilter }: StudentInsightsTabProps) {
    const t = useTranslations('StudentInsightsTab');
  const { data, isLoading, error } = useStudentAnalysis(
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
    return <EmptyState title={t('loadFailed')} description={t('loadFailedDesc')} />;
  }

  if (!data) {
    return <EmptyState title={t('noData')} description={t('noDataDesc')} />;
  }

  const mc = data.month_comparison;

  const participationTrend: 'up' | 'down' | 'flat' =
    mc.participation_rate_this > mc.participation_rate_last
      ? 'up'
      : mc.participation_rate_this < mc.participation_rate_last
        ? 'down'
        : 'flat';

  const avgDaysTrend: 'up' | 'down' | 'flat' =
    mc.avg_days_this > mc.avg_days_last
      ? 'up'
      : mc.avg_days_this < mc.avg_days_last
        ? 'down'
        : 'flat';

  return (
    <div className="space-y-8">
      {/* 区块 1：月度核心 KPI */}
      <div>
        <SectionTitle>{t('monthlyKpi')}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMiniCard
            label={t('participationRate')}
            value={formatRate(mc.participation_rate_this)}
            sub={`${t('lastMonthPrefix')} ${formatRate(mc.participation_rate_last)}`}
            accent={
              participationTrend === 'up'
                ? 'green'
                : participationTrend === 'down'
                  ? 'red'
                  : 'slate'
            }
            subtitle={t('participationSubtitle')}
          />
          <StatMiniCard
            label={t('avgCheckinDays')}
            value={(mc.avg_days_this ?? 0).toFixed(2)}
            sub={t('lastMonthDays', { v: (mc.avg_days_last ?? 0).toFixed(2) })}
            accent={avgDaysTrend === 'up' ? 'green' : avgDaysTrend === 'down' ? 'red' : 'slate'}
            subtitle={t('avgDaysSubtitle')}
          />
          <StatMiniCard
            label={t('zeroCheckin')}
            value={(mc.zero_this ?? 0).toLocaleString()}
            sub={t('lastMonthPeople', { n: (mc.zero_last ?? 0).toLocaleString() })}
            accent={(mc.zero_this ?? 0) > (mc.zero_last ?? 0) ? 'red' : 'green'}
            subtitle={t('zeroSubtitle')}
          />
          <StatMiniCard
            label={t('superfan')}
            value={(mc.superfan_this ?? 0).toLocaleString()}
            sub={t('lastMonthPeople', { n: (mc.superfan_last ?? 0).toLocaleString() })}
            accent={(mc.superfan_this ?? 0) >= (mc.superfan_last ?? 0) ? 'green' : 'red'}
            subtitle={t('superfanSubtitle')}
          />
        </div>
      </div>

      {/* 区块 2：频次分布 + 课耗×打卡四象限 */}
      <div>
        <SectionTitle>{t('freqQuadrant')}</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-base p-5">
            <p className="text-xs font-medium text-secondary-token mb-3">{t('freqLabel')}</p>
            <StudentFrequencyChart data={data.frequency_distribution} />
          </div>
          <div className="card-base p-5">
            <p className="text-xs font-medium text-secondary-token mb-3">{t('quadrantLabel')}</p>
            <LessonCheckinCross data={data.lesson_checkin_cross} />
          </div>
        </div>
      </div>

      {/* 区块 3：围场参与率 */}
      <div>
        <SectionTitle>{t('enclosureRate')}</SectionTitle>
        <div className="card-base p-5">
          <p className="text-xs text-muted-token mb-3">{t('enclosureDesc')}</p>
          <EnclosureParticipationChart data={data.by_enclosure} />
        </div>
      </div>

      {/* 区块 4：转化漏斗证明 */}
      <div>
        <SectionTitle>{t('conversionFunnel')}</SectionTitle>
        <div className="card-base p-5">
          <p className="text-xs text-muted-token mb-3">{t('conversionDesc')}</p>
          <ConversionFunnelProof data={data.conversion_funnel} />
        </div>
      </div>

      {/* 区块 5：CC触达效果 + 续费关联 */}
      <div>
        <SectionTitle>{t('contactRenewal')}</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-base p-5">
            <p className="text-xs font-medium text-secondary-token mb-3">{t('contactLabel')}</p>
            <ContactCheckinChart data={data.contact_checkin_response} />
          </div>
          <div className="card-base p-5">
            <p className="text-xs font-medium text-secondary-token mb-3">{t('renewalLabel')}</p>
            <RenewalCheckinChart data={data.renewal_checkin_correlation} />
          </div>
        </div>
      </div>

      {/* 区块 6：学员排行榜 */}
      <div>
        <SectionTitle>{t('studentRanking')}</SectionTitle>
        <StudentRankingPanel enclosureFilter={enclosureFilter} />
      </div>
    </div>
  );
}
