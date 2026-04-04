'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
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

const I18N = {
  zh: {
    title: '日常触达监控',
    subtitle: 'CC / SS / LP 每日触达率 · 围场分布 · 排行 · 漏斗',
    gaugeCC: 'CC 触达率',
    gaugeSS: 'SS 触达率',
    gaugeLP: 'LP 触达率',
    cardRoleCompare: 'CC / SS / LP 角色触达对比',
    cardFunnel: '转介绍漏斗',
    funnelRegistrations: '注册数',
    funnelInvitations: '邀约数',
    funnelAttendance: '出席数',
    funnelPayments: '付费数',
    funnelRevenue: '业绩 (USD)',
    funnelCheckinRate: '打卡率',
    cardSegment: '围场段触达率分布（堆叠）',
    cardRanking: '接通排行（触达率）',
    rankingTabs: ['CC 排行', 'SS 排行', 'LP 排行'],
    cardScatter: '触达率 × 转化率 散点图',
    scatterDesc: '横轴：触达率 · 纵轴：转化率 · 右上角为最优区间',
    emptyStats: '暂无触达数据',
    emptyStatsDesc: '上传包含通话记录的数据文件后自动刷新',
    emptyRanking: '暂无排行数据',
    emptyRankingDesc: '上传含通话记录的数据文件后自动刷新',
  },
  'zh-TW': {
    title: '日常觸達監控',
    subtitle: 'CC / SS / LP 每日觸達率 · 圍場分布 · 排行 · 漏斗',
    gaugeCC: 'CC 觸達率',
    gaugeSS: 'SS 觸達率',
    gaugeLP: 'LP 觸達率',
    cardRoleCompare: 'CC / SS / LP 角色觸達對比',
    cardFunnel: '轉介紹漏斗',
    funnelRegistrations: '註冊數',
    funnelInvitations: '邀約數',
    funnelAttendance: '出席數',
    funnelPayments: '付費數',
    funnelRevenue: '業績 (USD)',
    funnelCheckinRate: '打卡率',
    cardSegment: '圍場段觸達率分布（堆疊）',
    cardRanking: '接通排行（觸達率）',
    rankingTabs: ['CC 排行', 'SS 排行', 'LP 排行'],
    cardScatter: '觸達率 × 轉化率 散點圖',
    scatterDesc: '橫軸：觸達率 · 縱軸：轉化率 · 右上角為最優區間',
    emptyStats: '暫無觸達資料',
    emptyStatsDesc: '上傳包含通話記錄的資料檔案後自動刷新',
    emptyRanking: '暫無排行資料',
    emptyRankingDesc: '上傳含通話記錄的資料檔案後自動刷新',
  },
  en: {
    title: 'Daily Contact Monitor',
    subtitle: 'CC / SS / LP Daily Contact Rate · Enclosure Distribution · Ranking · Funnel',
    gaugeCC: 'CC Contact Rate',
    gaugeSS: 'SS Contact Rate',
    gaugeLP: 'LP Contact Rate',
    cardRoleCompare: 'CC / SS / LP Role Contact Comparison',
    cardFunnel: 'Referral Funnel',
    funnelRegistrations: 'Registrations',
    funnelInvitations: 'Invitations',
    funnelAttendance: 'Attendance',
    funnelPayments: 'Payments',
    funnelRevenue: 'Revenue (USD)',
    funnelCheckinRate: 'Check-in Rate',
    cardSegment: 'Enclosure Contact Rate Distribution (Stacked)',
    cardRanking: 'Contact Ranking (Contact Rate)',
    rankingTabs: ['CC Ranking', 'SS Ranking', 'LP Ranking'],
    cardScatter: 'Contact Rate × Conversion Rate Scatter',
    scatterDesc: 'X-axis: Contact Rate · Y-axis: Conversion Rate · Top-right = optimal zone',
    emptyStats: 'No Contact Data',
    emptyStatsDesc: 'Upload data file with call records to auto-refresh',
    emptyRanking: 'No Ranking Data',
    emptyRankingDesc: 'Upload data file with call records to auto-refresh',
  },
  th: {
    title: 'การติดตามการติดต่อประจำวัน',
    subtitle: 'อัตราการติดต่อรายวัน CC / SS / LP · การกระจาย Enclosure · การจัดอันดับ · ช่องทาง',
    gaugeCC: 'อัตราการติดต่อ CC',
    gaugeSS: 'อัตราการติดต่อ SS',
    gaugeLP: 'อัตราการติดต่อ LP',
    cardRoleCompare: 'การเปรียบเทียบการติดต่อ CC / SS / LP',
    cardFunnel: 'ช่องทางการแนะนำ',
    funnelRegistrations: 'การลงทะเบียน',
    funnelInvitations: 'คำเชิญ',
    funnelAttendance: 'การเข้าร่วม',
    funnelPayments: 'การชำระเงิน',
    funnelRevenue: 'รายได้ (USD)',
    funnelCheckinRate: 'อัตราเช็คอิน',
    cardSegment: 'การกระจายอัตราการติดต่อ Enclosure (แบบซ้อน)',
    cardRanking: 'การจัดอันดับการติดต่อ (อัตราการติดต่อ)',
    rankingTabs: ['อันดับ CC', 'อันดับ SS', 'อันดับ LP'],
    cardScatter: 'กราฟกระจายอัตราการติดต่อ × อัตราการแปลง',
    scatterDesc: 'แกน X: อัตราการติดต่อ · แกน Y: อัตราการแปลง · มุมขวาบน = โซนที่ดีที่สุด',
    emptyStats: 'ไม่มีข้อมูลการติดต่อ',
    emptyStatsDesc: 'อัปโหลดไฟล์ข้อมูลที่มีบันทึกการโทรเพื่อรีเฟรชอัตโนมัติ',
    emptyRanking: 'ไม่มีข้อมูลการจัดอันดับ',
    emptyRankingDesc: 'อัปโหลดไฟล์ข้อมูลที่มีบันทึกการโทรเพื่อรีเฟรชอัตโนมัติ',
  },
};

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
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono font-medium text-[var(--text-primary)]">
          {(value ?? 0).toLocaleString()}
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
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const RANKING_TABS: { key: RankingRole; label: string }[] = [
    { key: 'cc', label: t.rankingTabs[0] },
    { key: 'ss', label: t.rankingTabs[1] },
    { key: 'lp', label: t.rankingTabs[2] },
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
    return <EmptyState title={t.emptyStats} description={t.emptyStatsDesc} />;
  }

  const scatterData = Array.isArray(scatter) ? scatter : [];
  const funnelMax = stats.funnel.registrations || 1;

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div>
        <h1 className="page-title">{t.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t.subtitle}</p>
      </div>

      {/* 顶部大数字：三角色触达率 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ContactGauge label={t.gaugeCC} rate={stats.cc_contact_rate} />
        <ContactGauge label={t.gaugeSS} rate={stats.ss_contact_rate} />
        <ContactGauge label={t.gaugeLP} rate={stats.lp_contact_rate} />
      </div>

      {/* 中间两列：角色对比 + 漏斗 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* CC/SS/LP 角色对比 */}
        <Card title={t.cardRoleCompare}>
          <RoleCompare
            ccRate={stats.cc_contact_rate}
            ssRate={stats.ss_contact_rate}
            lpRate={stats.lp_contact_rate}
          />
        </Card>

        {/* 转介绍漏斗 */}
        <Card title={t.cardFunnel}>
          <div className="space-y-3 py-2">
            <FunnelBar
              label={t.funnelRegistrations}
              value={stats.funnel.registrations}
              max={funnelMax}
              color="bg-action-accent"
            />
            <FunnelBar
              label={t.funnelInvitations}
              value={stats.funnel.invitations}
              max={funnelMax}
              color="bg-indigo-500"
            />
            <FunnelBar
              label={t.funnelAttendance}
              value={stats.funnel.attendance}
              max={funnelMax}
              color="bg-purple-500"
            />
            <FunnelBar
              label={t.funnelPayments}
              value={stats.funnel.payments}
              max={funnelMax}
              color="bg-green-500"
            />
            <div className="pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t.funnelRevenue}</span>
                <span className="font-mono font-semibold text-[var(--color-success)]">
                  ${(stats.funnel?.revenue_usd ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-[var(--text-muted)]">{t.funnelCheckinRate}</span>
                <span className="font-mono font-medium">{formatRate(stats.checkin_rate)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 围场段触达堆叠柱图 */}
      {stats.by_segment.length > 0 && (
        <Card title={t.cardSegment}>
          <SegmentContactBar data={stats.by_segment} />
        </Card>
      )}

      {/* CC / SS / LP 接通排行（Tab 切换） */}
      <Card title={t.cardRanking}>
        <div className="flex gap-1 bg-[var(--bg-subtle)] p-1 rounded-lg w-fit mb-3">
          {RANKING_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRankingRole(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                rankingRole === tab.key
                  ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeRankingData.length === 0 ? (
          <EmptyState
            title={`${t.emptyRanking} (${rankingRole.toUpperCase()})`}
            description={t.emptyRankingDesc}
          />
        ) : (
          <CCContactRanking data={activeRankingData} />
        )}
      </Card>

      {/* 触达 × 转化散点图 */}
      {scatterData.length > 0 && (
        <Card title={t.cardScatter}>
          <p className="text-xs text-[var(--text-muted)] mb-2">{t.scatterDesc}</p>
          <ContactConversionScatter data={scatterData} />
        </Card>
      )}
    </div>
  );
}
