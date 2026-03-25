'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { AttributionSummary, AttributionBreakdownItem } from '@/lib/types/cross-analysis';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AchievementRing } from '@/components/attribution/AchievementRing';
import { ContributionBreakdown } from '@/components/attribution/ContributionBreakdown';
import { GapSimulator } from '@/components/attribution/GapSimulator';

const BREAKDOWN_TABS = [
  { value: 'enclosure', label: '围场' },
  { value: 'cc', label: 'CC' },
  { value: 'channel', label: '渠道' },
  { value: 'lifecycle', label: '生命周期' },
] as const;

type GroupBy = (typeof BREAKDOWN_TABS)[number]['value'];

interface BreakdownResponse {
  data?: AttributionBreakdownItem[];
}

export default function AttributionPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('enclosure');

  // 汇总数据
  const {
    data: summary,
    isLoading: loadingSummary,
    error: errSummary,
    mutate: mutateSummary,
  } = useSWR<AttributionSummary>('/api/attribution/summary', swrFetcher);

  // 分组明细
  const { data: breakdownRaw, isLoading: loadingBreakdown } = useSWR<
    BreakdownResponse | AttributionBreakdownItem[]
  >(`/api/attribution/breakdown?group_by=${groupBy}`, swrFetcher);

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
        title="数据加载失败"
        description="无法获取归因汇总数据，请检查后端服务是否正常运行"
        action={{ label: '重试', onClick: () => mutateSummary() }}
      />
    );
  }

  if (!summary) {
    return <EmptyState title="暂无归因数据" description="请先上传数据文件，然后刷新页面" />;
  }

  return (
    <div className="space-y-3">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">达成率归因分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          漏斗各阶段达成率 · 贡献拆解 · 缺口模拟
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          各渠道对整体业绩的贡献度分解：围场 / CC / 渠道 / 生命周期四维视角
        </p>
      </div>

      {/* 区域1：4个漏斗阶段达成率环形图 */}
      <Card title="漏斗达成率">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AchievementRing
            label="注册达成"
            actual={summary.registrations}
            target={summary.monthly_target_units}
            rate={summary.registrations / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label="预约达成"
            actual={summary.appointments}
            target={summary.monthly_target_units}
            rate={summary.appointments / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label="出席达成"
            actual={summary.attendances}
            target={summary.monthly_target_units}
            rate={summary.attendances / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label="付费达成"
            actual={summary.payments}
            target={summary.monthly_target_units}
            rate={summary.unit_achievement_rate}
          />
        </div>

        {/* 业绩达成概览行 */}
        <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <span className="text-[var(--text-muted)]">
            业绩达成率{' '}
            <span
              className={`font-semibold ${
                summary.revenue_achievement_rate >= 1
                  ? 'text-green-600'
                  : summary.revenue_achievement_rate >= 0.5
                    ? 'text-action-accent'
                    : 'text-red-600'
              }`}
            >
              {formatRate(summary.revenue_achievement_rate)}
            </span>
          </span>
          <span className="text-[var(--text-muted)]">
            客单价达成率{' '}
            <span
              className={`font-semibold ${
                summary.order_value_achievement_rate >= 1
                  ? 'text-green-600'
                  : summary.order_value_achievement_rate >= 0.5
                    ? 'text-action-accent'
                    : 'text-red-600'
              }`}
            >
              {formatRate(summary.order_value_achievement_rate)}
            </span>
          </span>
          <span className="text-[var(--text-muted)]">
            注册转化率{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatRate(summary.registration_conversion_rate)}
            </span>
          </span>
          <span className="text-[var(--text-muted)]">
            出席→付费率{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatRate(summary.attend_to_pay_rate)}
            </span>
          </span>
        </div>
      </Card>

      {/* 区域2：贡献拆解 Tabs */}
      <Card title="贡献拆解">
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
      <Card title="缺口模拟器">
        <GapSimulator />
      </Card>
    </div>
  );
}
