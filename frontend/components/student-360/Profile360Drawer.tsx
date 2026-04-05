'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/Spinner';
import { DailyLogTab } from './DailyLogTab';
import { ReferralNetwork } from './ReferralNetwork';
import type { Student360Detail, Student360Network } from '@/lib/types/cross-analysis';
import { X } from 'lucide-react';
import { formatRevenue, formatRate } from '@/lib/utils';
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
  const t = useTranslations('Profile360Drawer');

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
        aria-label={t('title')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle-token shrink-0">
          <div>
            <h2 className="text-sm font-bold text-primary-token">
              {t('title')}
              {p?.name && <span className="ml-2 text-secondary-token">{p.name}</span>}
            </h2>
            {stdtId && <p className="text-xs text-muted-token font-mono mt-0.5">{stdtId}</p>}
          </div>
          <div className="flex items-center gap-2">
            {detail?.is_high_potential && (
              <Badge className="text-white border-0 text-xs" style={{ backgroundColor: '#f97316' }}>
                {t('highPotential')}
              </Badge>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-subtle text-muted-token hover:text-primary-token transition-colors"
              aria-label={t('close')}
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
              {t('loadError')}
            </div>
          ) : (
            <Tabs defaultValue="profile" className="h-full">
              <TabsList className="w-full rounded-none border-b border-subtle-token bg-transparent h-auto px-4 py-0 justify-start gap-0 overflow-x-auto">
                {(
                  [
                    { value: 'profile', label: t('tabs.profile') },
                    { value: 'learning', label: t('tabs.learning') },
                    { value: 'referral', label: t('tabs.referral') },
                    { value: 'cc', label: t('tabs.cc') },
                    { value: 'payment', label: t('tabs.payment') },
                    { value: 'new_result', label: t('tabs.new_result') },
                    { value: 'daily_log', label: t('tabs.daily_log') },
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
                    <InfoRow label={t('fields.stdtId')} value={p?.stdt_id} />
                    <InfoRow label={t('fields.name')} value={p?.name} />
                    <InfoRow label={t('fields.region')} value={p?.region} />
                    <InfoRow label={t('fields.enclosure')} value={p?.enclosure} />
                    <InfoRow label={t('fields.lifecycle')} value={p?.lifecycle} />
                    <InfoRow label={t('fields.referrerId')} value={p?.referrer_stdt_id} />
                    <InfoRow label={t('fields.ccName')} value={p?.cc_name} />
                    <InfoRow label={t('fields.ccGroup')} value={p?.cc_group} />
                    <InfoRow label={t('fields.ssName')} value={p?.ss_name} />
                    <InfoRow label={t('fields.lpName')} value={p?.lp_name} />
                    <InfoRow label={t('fields.channelL3')} value={p?.channel_l3} />
                    {detail.is_high_potential && detail.hp_info && (
                      <>
                        <InfoRow label={t('fields.hpScore')} value={detail.hp_info.score} />
                        <InfoRow
                          label={t('fields.urgency')}
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
                                ? t('fields.urgent')
                                : detail.hp_info.urgency_level === 'yellow'
                                  ? t('fields.watch')
                                  : t('fields.normal')}
                            </span>
                          }
                        />
                        <InfoRow label={t('fields.checkin7d')} value={detail.hp_info.checkin_7d} />
                        <InfoRow
                          label={t('fields.contact7d')}
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
                      <span>{t('learning.metric')}</span>
                      <span>{t('learning.thisMonth')}</span>
                      <span>{t('learning.lastMonth')}</span>
                      <span className="text-right">{t('learning.mom')}</span>
                    </div>
                  </div>
                  <CompareRow
                    label={t('learning.checkinDays')}
                    current={p?.checkin_days}
                    lastMonth={p?.checkin_days_last_month}
                  />
                  <CompareRow
                    label={t('learning.referralCode')}
                    current={p?.referral_code_count}
                    lastMonth={p?.referral_code_count_last_month}
                  />
                  <CompareRow
                    label={t('learning.lessonConsumed')}
                    current={p?.lesson_consumed}
                    lastMonth={p?.lesson_consumed_last_month}
                  />
                  {detail.avg_lesson_consumed_3m != null && (
                    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-subtle-token last:border-0">
                      <span className="text-xs text-muted-token">{t('learning.avg3m')}</span>
                      <span className="text-xs font-mono tabular-nums">
                        {detail.avg_lesson_consumed_3m.toFixed(1)}
                      </span>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: referral */}
                <TabsContent value="referral">
                  <div className="space-y-0">
                    <InfoRow label={t('referral.paidCount')} value={p?.referral_paid_count} />
                    <InfoRow
                      label={t('referral.rewardStatus')}
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
                    <InfoRow label={t('referral.referrerId')} value={p?.referrer_stdt_id} />
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-secondary-token mb-2">
                      {t('referral.network')}
                    </div>
                    <ReferralNetwork network={network ?? null} isLoading={networkLoading} />
                  </div>
                </TabsContent>

                {/* Tab 4: cc */}
                <TabsContent value="cc">
                  <div className="space-y-0">
                    <InfoRow label={t('cc.ccName')} value={p?.cc_name} />
                    <InfoRow label={t('cc.ccGroup')} value={p?.cc_group} />
                    <InfoRow label={t('cc.lastCall')} value={p?.cc_last_call_date} />
                    <InfoRow label={t('cc.totalCalls')} value={p?.cc_call_total} />
                    <InfoRow
                      label={t('cc.note')}
                      value={
                        p?.cc_note ? <span className="whitespace-pre-wrap">{p.cc_note}</span> : '—'
                      }
                    />
                  </div>
                </TabsContent>

                {/* Tab 5: payment */}
                <TabsContent value="payment">
                  <div className="space-y-0">
                    <InfoRow label={t('payment.paidAmount')} value={formatRevenue(p?.paid_amount)} />
                    <InfoRow label={t('payment.channelL3')} value={p?.channel_l3} />
                    <InfoRow
                      label={t('payment.avg3m')}
                      value={
                        detail.avg_lesson_consumed_3m != null
                          ? `${detail.avg_lesson_consumed_3m.toFixed(1)}${t('payment.lessonsPerMonth')}`
                          : '—'
                      }
                    />
                    <InfoRow
                      label={t('payment.cardExpiry')}
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
                            {t('payment.days')}
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <InfoRow
                      label={t('payment.lastRenewal')}
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
                            {t('payment.daysAgo')}
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <InfoRow
                      label={t('payment.totalRenewal')}
                      value={
                        detail.total_renewal_orders != null
                          ? `${detail.total_renewal_orders}${t('payment.orders')}`
                          : '—'
                      }
                    />
                  </div>
                </TabsContent>

                {/* Tab 6: new_result */}
                <TabsContent value="new_result">
                  <div className="mb-3">
                    <div className="grid grid-cols-[80px_1fr_1fr_60px] gap-2 py-1 text-[10px] uppercase tracking-wider text-muted-token font-semibold">
                      <span>{t('newResult.channel')}</span>
                      <span>{t('newResult.newCount')}</span>
                      <span>{t('newResult.paidCount')}</span>
                      <span className="text-right">{t('newResult.convRate')}</span>
                    </div>
                  </div>
                  <NewResultRow role="CC" newCount={p?.cc_new} paidCount={p?.cc_paid} />
                  <NewResultRow role="SS" newCount={p?.ss_new} paidCount={p?.ss_paid} />
                  <NewResultRow role="LP" newCount={p?.lp_new} paidCount={p?.lp_paid} />
                  <NewResultRow
                    role={t('newResult.wide')}
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
