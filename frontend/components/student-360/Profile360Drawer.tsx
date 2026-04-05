'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/Spinner';
import { DailyLogTab } from './DailyLogTab';
import { ReferralNetwork } from './ReferralNetwork';
import type { Student360Detail, Student360Network } from '@/lib/types/cross-analysis';
import { X } from 'lucide-react';
import { formatRevenue, formatRate } from '@/lib/utils';

const I18N = {
  zh: {
    title: '学员360档案',
    highPotential: '高潜',
    close: '关闭',
    loading: '加载中...',
    loadError: '数据加载失败，请稍后重试',
    tabs: {
      profile: '基本信息',
      learning: '学习行为',
      referral: '推荐行为',
      cc: 'CC跟进',
      payment: '付费信息',
      new_result: '带新成果',
      daily_log: '日报轨迹',
    },
    fields: {
      stdtId: '学员ID',
      name: '姓名',
      region: '区域',
      enclosure: '围场',
      lifecycle: '生命周期',
      referrerId: '推荐人ID',
      ccName: 'CC姓名',
      ccGroup: 'CC组',
      ssName: 'SS姓名',
      lpName: 'LP姓名',
      channelL3: '三级渠道',
      hpScore: '高潜评分',
      urgency: '紧迫等级',
      checkin7d: '7天打卡',
      contact7d: '7天接触',
      urgent: '紧急',
      watch: '关注',
      normal: '正常',
    },
    learning: {
      metric: '指标',
      thisMonth: '本月',
      lastMonth: '上月',
      mom: '环比',
      checkinDays: '打卡天数',
      referralCode: '转码次数',
      lessonConsumed: '课耗',
      avg3m: '近3月均课耗',
    },
    referral: {
      paidCount: '推荐付费数',
      rewardStatus: '奖励状态',
      referrerId: '推荐人ID',
      network: '推荐网络',
    },
    cc: {
      ccName: 'CC姓名',
      ccGroup: 'CC组',
      lastCall: '末次拨打',
      totalCalls: '总拨打次数',
      note: '跟进备注',
    },
    payment: {
      paidAmount: '付费金额',
      channelL3: '三级渠道',
      avg3m: '近3月均课耗',
      cardExpiry: '次卡距到期',
      lastRenewal: '末次续费距今',
      totalRenewal: '总续费订单',
      days: '天',
      daysAgo: '天前',
      lessonsPerMonth: '节/月',
      orders: '单',
    },
    newResult: {
      channel: '渠道',
      newCount: '带新数',
      paidCount: '付费数',
      convRate: '转化率',
      wide: '宽口',
    },
  },
  'zh-TW': {
    title: '學員360檔案',
    highPotential: '高潛',
    close: '關閉',
    loading: '載入中...',
    loadError: '資料載入失敗，請稍後重試',
    tabs: {
      profile: '基本資訊',
      learning: '學習行為',
      referral: '推薦行為',
      cc: 'CC跟進',
      payment: '付費資訊',
      new_result: '帶新成果',
      daily_log: '日報軌跡',
    },
    fields: {
      stdtId: '學員ID',
      name: '姓名',
      region: '區域',
      enclosure: '圍場',
      lifecycle: '生命週期',
      referrerId: '推薦人ID',
      ccName: 'CC姓名',
      ccGroup: 'CC組',
      ssName: 'SS姓名',
      lpName: 'LP姓名',
      channelL3: '三級渠道',
      hpScore: '高潛評分',
      urgency: '緊迫等級',
      checkin7d: '7天打卡',
      contact7d: '7天接觸',
      urgent: '緊急',
      watch: '關注',
      normal: '正常',
    },
    learning: {
      metric: '指標',
      thisMonth: '本月',
      lastMonth: '上月',
      mom: '環比',
      checkinDays: '打卡天數',
      referralCode: '轉碼次數',
      lessonConsumed: '課耗',
      avg3m: '近3月均課耗',
    },
    referral: {
      paidCount: '推薦付費數',
      rewardStatus: '獎勵狀態',
      referrerId: '推薦人ID',
      network: '推薦網絡',
    },
    cc: {
      ccName: 'CC姓名',
      ccGroup: 'CC組',
      lastCall: '末次撥打',
      totalCalls: '總撥打次數',
      note: '跟進備註',
    },
    payment: {
      paidAmount: '付費金額',
      channelL3: '三級渠道',
      avg3m: '近3月均課耗',
      cardExpiry: '次卡距到期',
      lastRenewal: '末次續費距今',
      totalRenewal: '總續費訂單',
      days: '天',
      daysAgo: '天前',
      lessonsPerMonth: '節/月',
      orders: '單',
    },
    newResult: {
      channel: '渠道',
      newCount: '帶新數',
      paidCount: '付費數',
      convRate: '轉化率',
      wide: '寬口',
    },
  },
  en: {
    title: 'Student 360 Profile',
    highPotential: 'High Potential',
    close: 'Close',
    loading: 'Loading...',
    loadError: 'Failed to load data, please try again',
    tabs: {
      profile: 'Profile',
      learning: 'Learning',
      referral: 'Referral',
      cc: 'CC Follow-up',
      payment: 'Payment',
      new_result: 'New Results',
      daily_log: 'Daily Log',
    },
    fields: {
      stdtId: 'Student ID',
      name: 'Name',
      region: 'Region',
      enclosure: 'Enclosure',
      lifecycle: 'Lifecycle',
      referrerId: 'Referrer ID',
      ccName: 'CC Name',
      ccGroup: 'CC Group',
      ssName: 'SS Name',
      lpName: 'LP Name',
      channelL3: 'Channel L3',
      hpScore: 'HP Score',
      urgency: 'Urgency',
      checkin7d: '7d Check-ins',
      contact7d: '7d Contacts',
      urgent: 'Urgent',
      watch: 'Watch',
      normal: 'Normal',
    },
    learning: {
      metric: 'Metric',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      mom: 'MoM',
      checkinDays: 'Check-in Days',
      referralCode: 'Referral Codes',
      lessonConsumed: 'Lessons',
      avg3m: '3M Avg Lessons',
    },
    referral: {
      paidCount: 'Referral Paid',
      rewardStatus: 'Reward Status',
      referrerId: 'Referrer ID',
      network: 'Referral Network',
    },
    cc: {
      ccName: 'CC Name',
      ccGroup: 'CC Group',
      lastCall: 'Last Call',
      totalCalls: 'Total Calls',
      note: 'CC Note',
    },
    payment: {
      paidAmount: 'Paid Amount',
      channelL3: 'Channel L3',
      avg3m: '3M Avg Lessons',
      cardExpiry: 'Card Expiry',
      lastRenewal: 'Last Renewal',
      totalRenewal: 'Total Renewals',
      days: 'd',
      daysAgo: 'd ago',
      lessonsPerMonth: ' lessons/mo',
      orders: ' orders',
    },
    newResult: {
      channel: 'Channel',
      newCount: 'New',
      paidCount: 'Paid',
      convRate: 'Conv. Rate',
      wide: 'Wide',
    },
  },
  th: {
    title: 'โปรไฟล์นักเรียน 360',
    highPotential: 'ศักยภาพสูง',
    close: 'ปิด',
    loading: 'กำลังโหลด...',
    loadError: 'โหลดข้อมูลล้มเหลว โปรดลองอีกครั้ง',
    tabs: {
      profile: 'ข้อมูลพื้นฐาน',
      learning: 'พฤติกรรมการเรียน',
      referral: 'พฤติกรรมการแนะนำ',
      cc: 'CC ติดตาม',
      payment: 'ข้อมูลการชำระ',
      new_result: 'ผลการนำนักเรียนใหม่',
      daily_log: 'บันทึกรายวัน',
    },
    fields: {
      stdtId: 'รหัสนักเรียน',
      name: 'ชื่อ',
      region: 'ภูมิภาค',
      enclosure: 'คอก',
      lifecycle: 'วงจรชีวิต',
      referrerId: 'รหัสผู้แนะนำ',
      ccName: 'ชื่อ CC',
      ccGroup: 'กลุ่ม CC',
      ssName: 'ชื่อ SS',
      lpName: 'ชื่อ LP',
      channelL3: 'ช่องทาง L3',
      hpScore: 'คะแนน HP',
      urgency: 'ระดับความเร่งด่วน',
      checkin7d: 'เช็คอิน 7 วัน',
      contact7d: 'ติดต่อ 7 วัน',
      urgent: 'เร่งด่วน',
      watch: 'ติดตาม',
      normal: 'ปกติ',
    },
    learning: {
      metric: 'ตัวชี้วัด',
      thisMonth: 'เดือนนี้',
      lastMonth: 'เดือนที่แล้ว',
      mom: 'MoM',
      checkinDays: 'วันเช็คอิน',
      referralCode: 'โค้ดแนะนำ',
      lessonConsumed: 'บทเรียน',
      avg3m: 'เฉลี่ย 3 เดือน',
    },
    referral: {
      paidCount: 'ผู้แนะนำชำระแล้ว',
      rewardStatus: 'สถานะรางวัล',
      referrerId: 'รหัสผู้แนะนำ',
      network: 'เครือข่ายการแนะนำ',
    },
    cc: {
      ccName: 'ชื่อ CC',
      ccGroup: 'กลุ่ม CC',
      lastCall: 'โทรล่าสุด',
      totalCalls: 'โทรทั้งหมด',
      note: 'บันทึก CC',
    },
    payment: {
      paidAmount: 'ยอดชำระ',
      channelL3: 'ช่องทาง L3',
      avg3m: 'เฉลี่ย 3 เดือน',
      cardExpiry: 'หมดอายุบัตร',
      lastRenewal: 'ต่ออายุล่าสุด',
      totalRenewal: 'ต่ออายุทั้งหมด',
      days: ' วัน',
      daysAgo: ' วันที่แล้ว',
      lessonsPerMonth: ' บทเรียน/เดือน',
      orders: ' ออเดอร์',
    },
    newResult: {
      channel: 'ช่องทาง',
      newCount: 'นักเรียนใหม่',
      paidCount: 'ชำระแล้ว',
      convRate: 'อัตราแปลง',
      wide: 'Wide',
    },
  },
} as const;

type Locale = keyof typeof I18N;

function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

interface Profile360DrawerProps {
  stdtId: string | null;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-subtle-token last:border-0">
      <span className="text-xs text-muted-token">{label}</span>
      <span className="text-xs text-primary-token">{value ?? '—'}</span>
    </div>
  );
}

function CompareRow({
  label,
  current,
  lastMonth,
  unit = '',
}: {
  label: string;
  current: number | null | undefined;
  lastMonth: number | null | undefined;
  unit?: string;
}) {
  const diff = current != null && lastMonth != null ? current - lastMonth : null;
  return (
    <div className="grid grid-cols-[120px_1fr_1fr_60px] gap-2 py-1.5 border-b border-subtle-token last:border-0">
      <span className="text-xs text-muted-token">{label}</span>
      <span className="text-xs font-mono tabular-nums">
        {current != null ? `${current}${unit}` : '—'}
      </span>
      <span className="text-xs font-mono tabular-nums text-secondary-token">
        {lastMonth != null ? `${lastMonth}${unit}` : '—'}
      </span>
      <span
        className={`text-xs font-mono tabular-nums text-right ${
          diff == null
            ? ''
            : diff > 0
              ? 'text-success-token'
              : diff < 0
                ? 'text-danger-token'
                : 'text-muted-token'
        }`}
      >
        {diff != null ? (diff > 0 ? `+${diff}${unit}` : `${diff}${unit}`) : '—'}
      </span>
    </div>
  );
}

function NewResultRow({
  role,
  newCount,
  paidCount,
}: {
  role: string;
  newCount: number | null | undefined;
  paidCount: number | null | undefined;
}) {
  const rate =
    newCount != null && paidCount != null && newCount > 0 ? formatRate(paidCount / newCount) : '—';
  return (
    <div className="grid grid-cols-[80px_1fr_1fr_60px] gap-2 py-1.5 border-b border-subtle-token last:border-0">
      <span className="text-xs text-muted-token">{role}</span>
      <span className="text-xs font-mono tabular-nums">{newCount ?? '—'}</span>
      <span className="text-xs font-mono tabular-nums">{paidCount ?? '—'}</span>
      <span className="text-xs font-mono tabular-nums text-right text-secondary-token">{rate}</span>
    </div>
  );
}

export function Profile360Drawer({ stdtId, onClose }: Profile360DrawerProps) {
  const t = useT();

  // 关闭时 ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data: detail, isLoading } = useFilteredSWR<Student360Detail>(
    stdtId ? `/api/students/360/${encodeURIComponent(stdtId)}` : null
  );

  const { data: network, isLoading: networkLoading } = useFilteredSWR<Student360Network>(
    stdtId ? `/api/students/360/${encodeURIComponent(stdtId)}/network?depth=2` : null
  );

  if (!stdtId) return null;

  const p = detail?.profile;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 抽屉 */}
      <aside
        className="fixed right-0 top-0 h-full z-50 w-full max-w-2xl bg-surface shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle-token shrink-0">
          <div>
            <h2 className="text-sm font-bold text-primary-token">
              {t.title}
              {p?.name && <span className="ml-2 text-secondary-token">{p.name}</span>}
            </h2>
            {stdtId && <p className="text-xs text-muted-token font-mono mt-0.5">{stdtId}</p>}
          </div>
          <div className="flex items-center gap-2">
            {detail?.is_high_potential && (
              <Badge className="text-white border-0 text-xs" style={{ backgroundColor: '#f97316' }}>
                {t.highPotential}
              </Badge>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-subtle text-muted-token hover:text-primary-token transition-colors"
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          ) : !detail ? (
            <div className="flex justify-center items-center py-16 text-sm text-muted-token">
              {t.loadError}
            </div>
          ) : (
            <Tabs defaultValue="profile" className="h-full">
              <TabsList className="w-full rounded-none border-b border-subtle-token bg-transparent h-auto px-4 py-0 justify-start gap-0 overflow-x-auto">
                {(
                  [
                    { value: 'profile', label: t.tabs.profile },
                    { value: 'learning', label: t.tabs.learning },
                    { value: 'referral', label: t.tabs.referral },
                    { value: 'cc', label: t.tabs.cc },
                    { value: 'payment', label: t.tabs.payment },
                    { value: 'new_result', label: t.tabs.new_result },
                    { value: 'daily_log', label: t.tabs.daily_log },
                  ] as { value: string; label: string }[]
                ).map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-action-accent data-[state=active]:bg-transparent data-[state=active]:text-action-accent data-[state=active]:shadow-none px-3 py-2.5 text-xs shrink-0"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="p-5">
                {/* Tab 1: profile */}
                <TabsContent value="profile">
                  <div className="space-y-0">
                    <InfoRow label={t.fields.stdtId} value={p?.stdt_id} />
                    <InfoRow label={t.fields.name} value={p?.name} />
                    <InfoRow label={t.fields.region} value={p?.region} />
                    <InfoRow label={t.fields.enclosure} value={p?.enclosure} />
                    <InfoRow label={t.fields.lifecycle} value={p?.lifecycle} />
                    <InfoRow label={t.fields.referrerId} value={p?.referrer_stdt_id} />
                    <InfoRow label={t.fields.ccName} value={p?.cc_name} />
                    <InfoRow label={t.fields.ccGroup} value={p?.cc_group} />
                    <InfoRow label={t.fields.ssName} value={p?.ss_name} />
                    <InfoRow label={t.fields.lpName} value={p?.lp_name} />
                    <InfoRow label={t.fields.channelL3} value={p?.channel_l3} />
                    {detail.is_high_potential && detail.hp_info && (
                      <>
                        <InfoRow label={t.fields.hpScore} value={detail.hp_info.score} />
                        <InfoRow
                          label={t.fields.urgency}
                          value={
                            <span
                              className={`font-medium ${
                                detail.hp_info.urgency_level === 'red'
                                  ? 'text-danger-token'
                                  : detail.hp_info.urgency_level === 'yellow'
                                    ? 'text-warning-token'
                                    : 'text-success-token'
                              }`}
                            >
                              {detail.hp_info.urgency_level === 'red'
                                ? t.fields.urgent
                                : detail.hp_info.urgency_level === 'yellow'
                                  ? t.fields.watch
                                  : t.fields.normal}
                            </span>
                          }
                        />
                        <InfoRow label={t.fields.checkin7d} value={detail.hp_info.checkin_7d} />
                        <InfoRow
                          label={t.fields.contact7d}
                          value={detail.hp_info.contact_count_7d}
                        />
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 2: learning */}
                <TabsContent value="learning">
                  <div className="mb-3">
                    <div className="grid grid-cols-[120px_1fr_1fr_60px] gap-2 py-1 text-[10px] uppercase tracking-wider text-muted-token font-semibold">
                      <span>{t.learning.metric}</span>
                      <span>{t.learning.thisMonth}</span>
                      <span>{t.learning.lastMonth}</span>
                      <span className="text-right">{t.learning.mom}</span>
                    </div>
                  </div>
                  <CompareRow
                    label={t.learning.checkinDays}
                    current={p?.checkin_days}
                    lastMonth={p?.checkin_days_last_month}
                  />
                  <CompareRow
                    label={t.learning.referralCode}
                    current={p?.referral_code_count}
                    lastMonth={p?.referral_code_count_last_month}
                  />
                  <CompareRow
                    label={t.learning.lessonConsumed}
                    current={p?.lesson_consumed}
                    lastMonth={p?.lesson_consumed_last_month}
                  />
                  {detail.avg_lesson_consumed_3m != null && (
                    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-subtle-token last:border-0">
                      <span className="text-xs text-muted-token">{t.learning.avg3m}</span>
                      <span className="text-xs font-mono tabular-nums">
                        {detail.avg_lesson_consumed_3m.toFixed(1)}
                      </span>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: referral */}
                <TabsContent value="referral">
                  <div className="space-y-0">
                    <InfoRow label={t.referral.paidCount} value={p?.referral_paid_count} />
                    <InfoRow
                      label={t.referral.rewardStatus}
                      value={
                        detail.referral_reward_status ? (
                          <span
                            className={
                              detail.referral_reward_status.includes('已') ||
                              detail.referral_reward_status.includes('领')
                                ? 'text-success-token font-medium'
                                : 'text-muted-token'
                            }
                          >
                            {detail.referral_reward_status}
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <InfoRow label={t.referral.referrerId} value={p?.referrer_stdt_id} />
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-secondary-token mb-2">
                      {t.referral.network}
                    </div>
                    <ReferralNetwork network={network ?? null} isLoading={networkLoading} />
                  </div>
                </TabsContent>

                {/* Tab 4: cc */}
                <TabsContent value="cc">
                  <div className="space-y-0">
                    <InfoRow label={t.cc.ccName} value={p?.cc_name} />
                    <InfoRow label={t.cc.ccGroup} value={p?.cc_group} />
                    <InfoRow label={t.cc.lastCall} value={p?.cc_last_call_date} />
                    <InfoRow label={t.cc.totalCalls} value={p?.cc_call_total} />
                    <InfoRow
                      label={t.cc.note}
                      value={
                        p?.cc_note ? <span className="whitespace-pre-wrap">{p.cc_note}</span> : '—'
                      }
                    />
                  </div>
                </TabsContent>

                {/* Tab 5: payment */}
                <TabsContent value="payment">
                  <div className="space-y-0">
                    <InfoRow label={t.payment.paidAmount} value={formatRevenue(p?.paid_amount)} />
                    <InfoRow label={t.payment.channelL3} value={p?.channel_l3} />
                    <InfoRow
                      label={t.payment.avg3m}
                      value={
                        detail.avg_lesson_consumed_3m != null
                          ? `${detail.avg_lesson_consumed_3m.toFixed(1)}${t.payment.lessonsPerMonth}`
                          : '—'
                      }
                    />
                    <InfoRow
                      label={t.payment.cardExpiry}
                      value={
                        detail.days_to_card_expiry != null ? (
                          <span
                            className={
                              detail.days_to_card_expiry <= 7
                                ? 'text-danger-token font-medium'
                                : detail.days_to_card_expiry <= 14
                                  ? 'text-warning-token font-medium'
                                  : detail.days_to_card_expiry <= 30
                                    ? 'text-success-token font-medium'
                                    : 'text-primary-token'
                            }
                          >
                            {detail.days_to_card_expiry}
                            {t.payment.days}
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <InfoRow
                      label={t.payment.lastRenewal}
                      value={
                        detail.days_since_last_renewal != null ? (
                          <span
                            className={
                              detail.days_since_last_renewal > 60
                                ? 'text-danger-token font-medium'
                                : detail.days_since_last_renewal > 30
                                  ? 'text-warning-token font-medium'
                                  : 'text-primary-token'
                            }
                          >
                            {detail.days_since_last_renewal}
                            {t.payment.daysAgo}
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <InfoRow
                      label={t.payment.totalRenewal}
                      value={
                        detail.total_renewal_orders != null
                          ? `${detail.total_renewal_orders}${t.payment.orders}`
                          : '—'
                      }
                    />
                  </div>
                </TabsContent>

                {/* Tab 6: new_result */}
                <TabsContent value="new_result">
                  <div className="mb-3">
                    <div className="grid grid-cols-[80px_1fr_1fr_60px] gap-2 py-1 text-[10px] uppercase tracking-wider text-muted-token font-semibold">
                      <span>{t.newResult.channel}</span>
                      <span>{t.newResult.newCount}</span>
                      <span>{t.newResult.paidCount}</span>
                      <span className="text-right">{t.newResult.convRate}</span>
                    </div>
                  </div>
                  <NewResultRow role="CC" newCount={p?.cc_new} paidCount={p?.cc_paid} />
                  <NewResultRow role="SS" newCount={p?.ss_new} paidCount={p?.ss_paid} />
                  <NewResultRow role="LP" newCount={p?.lp_new} paidCount={p?.lp_paid} />
                  <NewResultRow
                    role={t.newResult.wide}
                    newCount={p?.wide_new}
                    paidCount={p?.wide_paid}
                  />
                </TabsContent>

                {/* Tab 7: daily_log */}
                <TabsContent value="daily_log">
                  <DailyLogTab logs={detail.daily_log} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </aside>
    </>
  );
}
