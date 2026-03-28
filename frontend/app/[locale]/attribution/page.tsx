'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useLocale } from 'next-intl';
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

const I18N = {
  zh: {
    title: '达成率归因分析',
    subtitle: '漏斗各阶段达成率 · 贡献拆解 · 缺口模拟',
    subtitleSub: '各渠道对整体业绩的贡献度分解：围场 / CC / 渠道 / 生命周期四维视角',
    cardFunnelTitle: '漏斗达成率',
    ringRegistrations: '注册达成',
    ringAppointments: '预约达成',
    ringAttendances: '出席达成',
    ringPayments: '付费达成',
    revenueRate: '业绩达成率',
    orderValueRate: '客单价达成率',
    regConvRate: '注册转化率',
    attendPayRate: '出席→付费率',
    cardBreakdown: '贡献拆解',
    breakdownTabs: ['围场', 'CC', '渠道', '生命周期'],
    cardGap: '缺口模拟器',
    errorTitle: '数据加载失败',
    errorDesc: '无法获取归因汇总数据，请检查后端服务是否正常运行',
    errorRetry: '重试',
    emptyTitle: '暂无归因数据',
    emptyDesc: '请先上传数据文件，然后刷新页面',
  },
  'zh-TW': {
    title: '達成率歸因分析',
    subtitle: '漏斗各階段達成率 · 貢獻拆解 · 缺口模擬',
    subtitleSub: '各渠道對整體業績的貢獻度分解：圍場 / CC / 渠道 / 生命週期四維視角',
    cardFunnelTitle: '漏斗達成率',
    ringRegistrations: '註冊達成',
    ringAppointments: '預約達成',
    ringAttendances: '出席達成',
    ringPayments: '付費達成',
    revenueRate: '業績達成率',
    orderValueRate: '客單價達成率',
    regConvRate: '註冊轉化率',
    attendPayRate: '出席→付費率',
    cardBreakdown: '貢獻拆解',
    breakdownTabs: ['圍場', 'CC', '渠道', '生命週期'],
    cardGap: '缺口模擬器',
    errorTitle: '資料載入失敗',
    errorDesc: '無法取得歸因彙總資料，請檢查後端服務是否正常運行',
    errorRetry: '重試',
    emptyTitle: '暫無歸因資料',
    emptyDesc: '請先上傳資料檔案，然後重新整理頁面',
  },
  en: {
    title: 'Achievement Attribution Analysis',
    subtitle: 'Funnel Stage Achievement Rates · Contribution Breakdown · GAP Simulator',
    subtitleSub:
      'Contribution breakdown by channel: Enclosure / CC / Channel / Lifecycle four-dimensional view',
    cardFunnelTitle: 'Funnel Achievement Rates',
    ringRegistrations: 'Registration Achievement',
    ringAppointments: 'Appointment Achievement',
    ringAttendances: 'Attendance Achievement',
    ringPayments: 'Payment Achievement',
    revenueRate: 'Revenue Achievement Rate',
    orderValueRate: 'Order Value Achievement Rate',
    regConvRate: 'Registration Conversion Rate',
    attendPayRate: 'Attendance → Payment Rate',
    cardBreakdown: 'Contribution Breakdown',
    breakdownTabs: ['Enclosure', 'CC', 'Channel', 'Lifecycle'],
    cardGap: 'GAP Simulator',
    errorTitle: 'Load Failed',
    errorDesc: 'Cannot load attribution summary data, please check backend service',
    errorRetry: 'Retry',
    emptyTitle: 'No Attribution Data',
    emptyDesc: 'Please upload data files first, then refresh the page',
  },
  th: {
    title: 'การวิเคราะห์สาเหตุอัตราความสำเร็จ',
    subtitle: 'อัตราความสำเร็จแต่ละขั้นตอน · การแยกส่วนการมีส่วนร่วม · เครื่องจำลอง GAP',
    subtitleSub: 'การแยกส่วนการมีส่วนร่วมตามช่องทาง: Enclosure / CC / ช่องทาง / วงจรชีวิต',
    cardFunnelTitle: 'อัตราความสำเร็จช่องทาง',
    ringRegistrations: 'ความสำเร็จการลงทะเบียน',
    ringAppointments: 'ความสำเร็จการนัดหมาย',
    ringAttendances: 'ความสำเร็จการเข้าร่วม',
    ringPayments: 'ความสำเร็จการชำระเงิน',
    revenueRate: 'อัตราความสำเร็จรายได้',
    orderValueRate: 'อัตราความสำเร็จมูลค่าคำสั่งซื้อ',
    regConvRate: 'อัตราการแปลงการลงทะเบียน',
    attendPayRate: 'อัตราเข้าร่วม → ชำระเงิน',
    cardBreakdown: 'การแยกส่วนการมีส่วนร่วม',
    breakdownTabs: ['ระยะเวลา', 'CC', 'ช่องทาง', 'วงจรชีวิต'],
    cardGap: 'เครื่องจำลอง GAP',
    errorTitle: 'โหลดข้อมูลล้มเหลว',
    errorDesc: 'ไม่สามารถโหลดข้อมูลสรุปการระบุสาเหตุได้ กรุณาตรวจสอบบริการ backend',
    errorRetry: 'ลองใหม่',
    emptyTitle: 'ไม่มีข้อมูลการระบุสาเหตุ',
    emptyDesc: 'กรุณาอัปโหลดไฟล์ข้อมูลก่อน แล้วรีเฟรชหน้า',
  },
};

type GroupBy = 'enclosure' | 'cc' | 'channel' | 'lifecycle';

interface BreakdownResponse {
  data?: AttributionBreakdownItem[];
}

export default function AttributionPage() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const BREAKDOWN_TABS = [
    { value: 'enclosure' as GroupBy, label: t.breakdownTabs[0] },
    { value: 'cc' as GroupBy, label: t.breakdownTabs[1] },
    { value: 'channel' as GroupBy, label: t.breakdownTabs[2] },
    { value: 'lifecycle' as GroupBy, label: t.breakdownTabs[3] },
  ];

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
        title={t.errorTitle}
        description={t.errorDesc}
        action={{ label: t.errorRetry, onClick: () => mutateSummary() }}
      />
    );
  }

  if (!summary) {
    return <EmptyState title={t.emptyTitle} description={t.emptyDesc} />;
  }

  return (
    <div className="space-y-3">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">{t.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.subtitleSub}</p>
      </div>

      {/* 区域1：4个漏斗阶段达成率环形图 */}
      <Card title={t.cardFunnelTitle}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AchievementRing
            label={t.ringRegistrations}
            actual={summary.registrations}
            target={summary.monthly_target_units}
            rate={summary.registrations / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label={t.ringAppointments}
            actual={summary.appointments}
            target={summary.monthly_target_units}
            rate={summary.appointments / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label={t.ringAttendances}
            actual={summary.attendances}
            target={summary.monthly_target_units}
            rate={summary.attendances / Math.max(1, summary.monthly_target_units)}
          />
          <AchievementRing
            label={t.ringPayments}
            actual={summary.payments}
            target={summary.monthly_target_units}
            rate={summary.unit_achievement_rate}
          />
        </div>

        {/* 业绩达成概览行 */}
        <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <span className="text-[var(--text-muted)]">
            {t.revenueRate}{' '}
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
            {t.orderValueRate}{' '}
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
            {t.regConvRate}{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatRate(summary.registration_conversion_rate)}
            </span>
          </span>
          <span className="text-[var(--text-muted)]">
            {t.attendPayRate}{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatRate(summary.attend_to_pay_rate)}
            </span>
          </span>
        </div>
      </Card>

      {/* 区域2：贡献拆解 Tabs */}
      <Card title={t.cardBreakdown}>
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
      <Card title={t.cardGap}>
        <GapSimulator />
      </Card>
    </div>
  );
}
