'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
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
const RANKING_TABS: { key: RankingRole; label: string }[] = [
  { key: 'cc', label: 'CC 排行' },
  { key: 'ss', label: 'SS 排行' },
  { key: 'lp', label: 'LP 排行' },
];

function FunnelBar({
  label,
  value,
  max,
  color = 'bg-navy-400',
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
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono font-medium text-[var(--text-primary)]">
          {value.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export default function DailyMonitorPage() {
  const [rankingRole, setRankingRole] = useState<RankingRole>('cc');

  const { data: stats, isLoading: l1 } = useSWR<DailyMonitorStats>(
    '/api/daily-monitor/stats',
    swrFetcher
  );
  const { data: ccRanking, isLoading: l2 } = useSWR<CCContactRankItem[]>(
    '/api/daily-monitor/cc-ranking?role=cc',
    swrFetcher
  );
  const { data: ssRanking, isLoading: l4 } = useSWR<CCContactRankItem[]>(
    '/api/daily-monitor/cc-ranking?role=ss',
    swrFetcher
  );
  const { data: lpRanking, isLoading: l5 } = useSWR<CCContactRankItem[]>(
    '/api/daily-monitor/cc-ranking?role=lp',
    swrFetcher
  );
  const { data: scatter, isLoading: l3 } = useSWR<ContactConversionItem[]>(
    '/api/daily-monitor/contact-vs-conversion',
    swrFetcher
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
    return <EmptyState title="暂无触达数据" description="上传包含通话记录的数据文件后自动刷新" />;
  }

  const scatterData = Array.isArray(scatter) ? scatter : [];
  const funnelMax = stats.funnel.registrations || 1;

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">日常触达监控</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          CC / SS / LP 每日触达率 · 围场分布 · 排行 · 漏斗
        </p>
      </div>

      {/* 顶部大数字：三角色触达率 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ContactGauge label="CC 触达率" rate={stats.cc_contact_rate} />
        <ContactGauge label="SS 触达率" rate={stats.ss_contact_rate} />
        <ContactGauge label="LP 触达率" rate={stats.lp_contact_rate} />
      </div>

      {/* 中间两列：角色对比 + 漏斗 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* CC/SS/LP 角色对比 */}
        <Card title="CC / SS / LP 角色触达对比">
          <RoleCompare
            ccRate={stats.cc_contact_rate}
            ssRate={stats.ss_contact_rate}
            lpRate={stats.lp_contact_rate}
          />
        </Card>

        {/* 转介绍漏斗 */}
        <Card title="转介绍漏斗">
          <div className="space-y-3 py-2">
            <FunnelBar
              label="注册数"
              value={stats.funnel.registrations}
              max={funnelMax}
              color="bg-navy-400"
            />
            <FunnelBar
              label="邀约数"
              value={stats.funnel.invitations}
              max={funnelMax}
              color="bg-indigo-500"
            />
            <FunnelBar
              label="出席数"
              value={stats.funnel.attendance}
              max={funnelMax}
              color="bg-purple-500"
            />
            <FunnelBar
              label="付费数"
              value={stats.funnel.payments}
              max={funnelMax}
              color="bg-green-500"
            />
            <div className="pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">业绩 (USD)</span>
                <span className="font-mono font-semibold text-green-600">
                  ${stats.funnel.revenue_usd.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-[var(--text-muted)]">打卡率</span>
                <span className="font-mono font-medium">
                  {(stats.checkin_rate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 围场段触达堆叠柱图 */}
      {stats.by_segment.length > 0 && (
        <Card title="围场段触达率分布（堆叠）">
          <SegmentContactBar data={stats.by_segment} />
        </Card>
      )}

      {/* CC / SS / LP 接通排行（Tab 切换） */}
      <Card title="接通排行（触达率）">
        <div className="flex gap-1 bg-[var(--bg-subtle)] p-1 rounded-lg w-fit mb-3">
          {RANKING_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setRankingRole(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                rankingRole === t.key
                  ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {activeRankingData.length === 0 ? (
          <EmptyState
            title={`暂无 ${rankingRole.toUpperCase()} 排行数据`}
            description="上传含通话记录的数据文件后自动刷新"
          />
        ) : (
          <CCContactRanking data={activeRankingData} />
        )}
      </Card>

      {/* 触达 × 转化散点图 */}
      {scatterData.length > 0 && (
        <Card title="触达率 × 转化率 散点图">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            横轴：触达率 · 纵轴：转化率 · 右上角为最优区间
          </p>
          <ContactConversionScatter data={scatterData} />
        </Card>
      )}
    </div>
  );
}
