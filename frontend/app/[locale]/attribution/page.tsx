'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import type { AttributionSummary, AttributionBreakdownItem } from '@/lib/types/cross-analysis';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AchievementRing } from '@/components/attribution/AchievementRing';
import { ContributionBreakdown } from '@/components/attribution/ContributionBreakdown';
import { GapSimulator } from '@/components/attribution/GapSimulator';

type GroupBy = 'enclosure' | 'cc' | 'channel' | 'lifecycle';

interface BreakdownResponse {
  data?: AttributionBreakdownItem[];
}

export default function AttributionPage() {
  const locale = useLocale();
  const t = useTranslations('attribution');

  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    channel: true,
  });

  const BREAKDOWN_TABS = [
    { value: 'enclosure' as GroupBy, label: t('breakdownTabs')[0] },
    { value: 'cc' as GroupBy, label: t('breakdownTabs')[1] },
    { value: 'channel' as GroupBy, label: t('breakdownTabs')[2] },
    { value: 'lifecycle' as GroupBy, label: t('breakdownTabs')[3] },
  ];

  const [groupBy, setGroupBy] = useState<GroupBy>('enclosure');

  // 汇总数据
  const {
    data: summary,
    isLoading: loadingSummary,
    error: errSummary,
    mutate: mutateSummary,
  } = useFilteredSWR<AttributionSummary>('/api/attribution/summary');

  // 分组明细
  const { data: breakdownRaw, isLoading: loadingBreakdown } = useFilteredSWR<
    BreakdownResponse | AttributionBreakdownItem[]
  >('/api/attribution/breakdown', undefined, { group_by: groupBy });

  const breakdown: AttributionBreakdownItem[] = Array.isArray(breakdownRaw)
    ? breakdownRaw
    : (breakdownRaw?.data ?? []);

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (errSummary) {
    return (
      <EmptyState
        title={t('errorTitle')}
        description={t('errorDesc')}
        action={{ label: t('errorRetry'), onClick: () => mutateSummary() }}
      />
    );
  }

  if (!summary) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />;
  }

  return (
    <div className="space-y-3">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t('subtitle')}</p>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('subtitleSub')}</p>
      </div>

      {/* 区域1：4个漏斗阶段达成率环形图 */}
      <Card title={t('cardFunnelTitle')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AchievementRing
            label={t('ringRegistrations')}
            actual={summary.registrations}
            target={summary.monthly_target_units}
            rate={summary.registrations / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label={t('ringAppointments')}
            actual={summary.appointments}
            target={summary.monthly_target_units}
            rate={summary.appointments / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label={t('ringAttendances')}
            actual={summary.attendances}
            target={summary.monthly_target_units}
            rate={summary.attendances / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label={t('ringPayments')}
            actual={summary.payments}
            target={summary.monthly_target_units}
            rate={summary.unit_achievement_rate}
          />
        </div>

        {/* 业绩达成概览行 */}
        <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <span className="text-[var(--text-muted)]">
            {t('revenueRate')}{' '}
            <span
              className={`font-semibold ${
                summary.revenue_achievement_rate >= 1
                  ? 'text-[var(--color-success)]'
                  : summary.revenue_achievement_rate >= 0.5
                    ? 'text-action-accent'
                    : 'text-[var(--color-danger)]'
              }`}
            >
              {formatRate(summary.revenue_achievement_rate)}
            </span>
          </span>
          <span className="text-[var(--text-muted)]">
            {t('orderValueRate')}{' '}
            <span
              className={`font-semibold ${
                summary.order_value_achievement_rate >= 1
                  ? 'text-[var(--color-success)]'
                  : summary.order_value_achievement_rate >= 0.5
                    ? 'text-action-accent'
                    : 'text-[var(--color-danger)]'
              }`}
            >
              {formatRate(summary.order_value_achievement_rate)}
            </span>
          </span>
          <span className="text-[var(--text-muted)]">
            {t('regConvRate')}{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatRate(summary.registration_conversion_rate)}
            </span>
          </span>
          <span className="text-[var(--text-muted)]">
            {t('attendPayRate')}{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatRate(summary.attend_to_pay_rate)}
            </span>
          </span>
        </div>
      </Card>

      {/* 区域2：贡献拆解 Tabs */}
      <Card title={t('cardBreakdown')}>
        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <TabsList className="mb-3">
            {BREAKDOWN_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {BREAKDOWN_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {loadingBreakdown ? (
                <div className="flex items-center justify-center h-32">
                  <Spinner size="md" />
                </div>
              ) : (
                <ContributionBreakdown
                  data={groupBy === tab.value ? breakdown : []}
                  title={tab.label}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* 区域3：缺口模拟器 */}
      <Card title={t('cardGap')}>
        <GapSimulator />
      </Card>
    </div>
  );
}
