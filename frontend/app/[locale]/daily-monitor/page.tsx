'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { formatRate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { ContactGauge } from '@/components/daily-monitor/ContactGauge';
import { SegmentContactBar } from '@/components/daily-monitor/SegmentContactBar';
import { CCContactRanking } from '@/components/daily-monitor/CCContactRanking';
import { RoleCompare } from '@/components/daily-monitor/RoleCompare';
import { ContactConversionScatter } from '@/components/daily-monitor/ContactConversionScatter';
import type {
  DailyMonitorStats,
  CCContactRankItem,
  ContactConversionItem,
} from '@/lib/types/cross-analysis';

type RankingRole = 'cc' | 'ss' | 'lp';

function FunnelBar({
  label,
  value,
  max,
  color = 'bg-action-accent',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-secondary-token">{label}</span>
        <span className="font-mono font-medium text-primary-token">
          {(value ?? 0).toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-subtle rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export default function DailyMonitorPage() {
  const locale = useLocale();
  const t = useTranslations('dailyMonitor');

  const RANKING_TABS: { key: RankingRole; label: string }[] = [
    { key: 'cc', label: t.raw('rankingTabs') as string[][0] },
    { key: 'ss', label: t.raw('rankingTabs') as string[][1] },
    { key: 'lp', label: t.raw('rankingTabs') as string[][2] },
  ];

  usePageDimensions({
    country: true,
    dataRole: true,
    team: true,
    channel: true,
  });

  const [rankingRole, setRankingRole] = useState<RankingRole>('cc');

  const { data: stats, isLoading: l1 } = useFilteredSWR<DailyMonitorStats>(
    '/api/daily-monitor/stats'
  );
  const { data: ccRanking, isLoading: l2 } = useFilteredSWR<CCContactRankItem[]>(
    '/api/daily-monitor/cc-ranking',
    undefined,
    { role: 'cc' }
  );
  const { data: ssRanking, isLoading: l4 } = useFilteredSWR<CCContactRankItem[]>(
    '/api/daily-monitor/cc-ranking',
    undefined,
    { role: 'ss' }
  );
  const { data: lpRanking, isLoading: l5 } = useFilteredSWR<CCContactRankItem[]>(
    '/api/daily-monitor/cc-ranking',
    undefined,
    { role: 'lp' }
  );
  const { data: scatter, isLoading: l3 } = useFilteredSWR<ContactConversionItem[]>(
    '/api/daily-monitor/contact-vs-conversion'
  );

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const rankingDataMap: Record<RankingRole, CCContactRankItem[]> = {
    cc: Array.isArray(ccRanking) ? ccRanking : [],
    ss: Array.isArray(ssRanking) ? ssRanking : [],
    lp: Array.isArray(lpRanking) ? lpRanking : [],
  };
  const activeRankingData = rankingDataMap[rankingRole];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return <EmptyState title={t('emptyStats')} description={t('emptyStatsDesc')} />;
  }

  const scatterData = Array.isArray(scatter) ? scatter : [];
  const funnelMax = stats.funnel.registrations || 1;

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-sm text-secondary-token mt-0.5">{t('subtitle')}</p>
      </div>

      {/* 顶部大数字：三角色触达率 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ContactGauge label={t('gaugeCC')} rate={stats.cc_contact_rate} />
        <ContactGauge label={t('gaugeSS')} rate={stats.ss_contact_rate} />
        <ContactGauge label={t('gaugeLP')} rate={stats.lp_contact_rate} />
      </div>

      {/* 中间两列：角色对比 + 漏斗 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* CC/SS/LP 角色对比 */}
        <Card title={t('cardRoleCompare')}>
          <RoleCompare
            ccRate={stats.cc_contact_rate}
            ssRate={stats.ss_contact_rate}
            lpRate={stats.lp_contact_rate}
          />
        </Card>

        {/* 转介绍漏斗 */}
        <Card title={t('cardFunnel')}>
          <div className="space-y-3 py-2">
            <FunnelBar
              label={t('funnelRegistrations')}
              value={stats.funnel.registrations}
              max={funnelMax}
              color="bg-action-accent"
            />
            <FunnelBar
              label={t('funnelInvitations')}
              value={stats.funnel.invitations}
              max={funnelMax}
              color="bg-indigo-500"
            />
            <FunnelBar
              label={t('funnelAttendance')}
              value={stats.funnel.attendance}
              max={funnelMax}
              color="bg-accent-token"
            />
            <FunnelBar
              label={t('funnelPayments')}
              value={stats.funnel.payments}
              max={funnelMax}
              color="bg-success-token"
            />
            <div className="pt-1 border-t border-subtle-token">
              <div className="flex justify-between text-xs">
                <span className="text-muted-token">{t('funnelRevenue')}</span>
                <span className="font-mono font-semibold text-success-token">
                  ${(stats.funnel?.revenue_usd ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-token">{t('funnelCheckinRate')}</span>
                <span className="font-mono font-medium">{formatRate(stats.checkin_rate)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 围场段触达堆叠柱图 */}
      {stats.by_segment.length > 0 && (
        <Card title={t('cardSegment')}>
          <SegmentContactBar data={stats.by_segment} />
        </Card>
      )}

      {/* CC / SS / LP 接通排行（Tab 切换） */}
      <Card title={t('cardRanking')}>
        <div className="flex gap-1 bg-subtle p-1 rounded-lg w-fit mb-3">
          {RANKING_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRankingRole(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                rankingRole === tab.key
                  ? 'bg-surface shadow-sm text-primary-token'
                  : 'text-secondary-token hover:text-primary-token'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeRankingData.length === 0 ? (
          <EmptyState
            title={`${t('emptyRanking')} (${rankingRole.toUpperCase()})`}
            description={t('emptyRankingDesc')}
          />
        ) : (
          <CCContactRanking data={activeRankingData} />
        )}
      </Card>

      {/* 触达 × 转化散点图 */}
      {scatterData.length > 0 && (
        <Card title={t('cardScatter')}>
          <p className="text-xs text-muted-token mb-2">{t('scatterDesc')}</p>
          <ContactConversionScatter data={scatterData} />
        </Card>
      )}
    </div>
  );
}
