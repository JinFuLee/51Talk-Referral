'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/Spinner';
import { DailyLogTab } from './DailyLogTab';
import { ReferralNetwork } from './ReferralNetwork';
import type { Student360Detail, Student360Network } from '@/lib/types/cross-analysis';
import { X } from 'lucide-react';

interface Profile360DrawerProps {
  stdtId: string | null;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-xs text-[var(--text-primary)]">{value ?? '—'}</span>
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
    <div className="grid grid-cols-[120px_1fr_1fr_60px] gap-2 py-1.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-xs font-mono tabular-nums">
        {current != null ? `${current}${unit}` : '—'}
      </span>
      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
        {lastMonth != null ? `${lastMonth}${unit}` : '—'}
      </span>
      <span
        className={`text-xs font-mono tabular-nums text-right ${
          diff == null
            ? ''
            : diff > 0
              ? 'text-green-600'
              : diff < 0
                ? 'text-red-500'
                : 'text-[var(--text-muted)]'
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
  return (
    <div className="grid grid-cols-[80px_1fr_1fr] gap-2 py-1.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-xs text-[var(--text-muted)]">{role}</span>
      <span className="text-xs font-mono tabular-nums">{newCount ?? '—'}</span>
      <span className="text-xs font-mono tabular-nums">{paidCount ?? '—'}</span>
    </div>
  );
}

export function Profile360Drawer({ stdtId, onClose }: Profile360DrawerProps) {
  // 关闭时 ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data: detail, isLoading } = useSWR<Student360Detail>(
    stdtId ? `/api/students/360/${encodeURIComponent(stdtId)}` : null,
    swrFetcher
  );

  const { data: network, isLoading: networkLoading } = useSWR<Student360Network>(
    stdtId ? `/api/students/360/${encodeURIComponent(stdtId)}/network?depth=2` : null,
    swrFetcher
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
        className="fixed right-0 top-0 h-full z-50 w-full max-w-2xl bg-[var(--bg-surface)] shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="学员360档案"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              学员360档案
              {p?.name && <span className="ml-2 text-[var(--text-secondary)]">{p.name}</span>}
            </h2>
            {stdtId && (
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{stdtId}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {detail?.is_high_potential && (
              <Badge className="text-white border-0 text-xs" style={{ backgroundColor: '#f97316' }}>
                高潜
              </Badge>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="关闭"
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
            <div className="flex justify-center items-center py-16 text-sm text-[var(--text-muted)]">
              数据加载失败，请稍后重试
            </div>
          ) : (
            <Tabs defaultValue="profile" className="h-full">
              <TabsList className="w-full rounded-none border-b border-[var(--border-subtle)] bg-transparent h-auto px-4 py-0 justify-start gap-0 overflow-x-auto">
                {[
                  { value: 'profile', label: '基本信息' },
                  { value: 'learning', label: '学习行为' },
                  { value: 'referral', label: '推荐行为' },
                  { value: 'cc', label: 'CC跟进' },
                  { value: 'payment', label: '付费信息' },
                  { value: 'new_result', label: '带新成果' },
                  { value: 'daily_log', label: '日报轨迹' },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-3 py-2.5 text-xs shrink-0"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="p-5">
                {/* Tab 1: 基本信息 */}
                <TabsContent value="profile">
                  <div className="space-y-0">
                    <InfoRow label="学员ID" value={p?.stdt_id} />
                    <InfoRow label="姓名" value={p?.name} />
                    <InfoRow label="区域" value={p?.region} />
                    <InfoRow label="围场" value={p?.enclosure} />
                    <InfoRow label="生命周期" value={p?.lifecycle} />
                    <InfoRow label="推荐人ID" value={p?.referrer_stdt_id} />
                    <InfoRow label="CC姓名" value={p?.cc_name} />
                    <InfoRow label="CC组" value={p?.cc_group} />
                    <InfoRow label="SS姓名" value={p?.ss_name} />
                    <InfoRow label="LP姓名" value={p?.lp_name} />
                    <InfoRow label="三级渠道" value={p?.channel_l3} />
                    {detail.is_high_potential && detail.hp_info && (
                      <>
                        <InfoRow label="高潜评分" value={detail.hp_info.score} />
                        <InfoRow
                          label="紧迫等级"
                          value={
                            <span
                              className={`font-medium ${
                                detail.hp_info.urgency_level === 'red'
                                  ? 'text-red-500'
                                  : detail.hp_info.urgency_level === 'yellow'
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                              }`}
                            >
                              {detail.hp_info.urgency_level === 'red'
                                ? '紧急'
                                : detail.hp_info.urgency_level === 'yellow'
                                  ? '关注'
                                  : '正常'}
                            </span>
                          }
                        />
                        <InfoRow label="7天打卡" value={detail.hp_info.checkin_7d} />
                        <InfoRow label="7天接触" value={detail.hp_info.contact_count_7d} />
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 2: 学习行为 */}
                <TabsContent value="learning">
                  <div className="mb-3">
                    <div className="grid grid-cols-[120px_1fr_1fr_60px] gap-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      <span>指标</span>
                      <span>本月</span>
                      <span>上月</span>
                      <span className="text-right">环比</span>
                    </div>
                  </div>
                  <CompareRow
                    label="打卡天数"
                    current={p?.checkin_days}
                    lastMonth={p?.checkin_days_last_month}
                  />
                  <CompareRow
                    label="转码次数"
                    current={p?.referral_code_count}
                    lastMonth={p?.referral_code_count_last_month}
                  />
                  <CompareRow
                    label="课耗"
                    current={p?.lesson_consumed}
                    lastMonth={p?.lesson_consumed_last_month}
                  />
                </TabsContent>

                {/* Tab 3: 推荐行为 */}
                <TabsContent value="referral">
                  <div className="space-y-0">
                    <InfoRow label="推荐付费数" value={p?.referral_paid_count} />
                    <InfoRow label="奖励状态" value={p?.referral_reward_status} />
                    <InfoRow label="推荐人ID" value={p?.referrer_stdt_id} />
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                      推荐网络
                    </div>
                    <ReferralNetwork network={network ?? null} isLoading={networkLoading} />
                  </div>
                </TabsContent>

                {/* Tab 4: CC跟进 */}
                <TabsContent value="cc">
                  <div className="space-y-0">
                    <InfoRow label="CC姓名" value={p?.cc_name} />
                    <InfoRow label="CC组" value={p?.cc_group} />
                    <InfoRow label="末次拨打" value={p?.cc_last_call_date} />
                    <InfoRow label="总拨打次数" value={p?.cc_call_total} />
                    <InfoRow
                      label="跟进备注"
                      value={
                        p?.cc_note ? <span className="whitespace-pre-wrap">{p.cc_note}</span> : '—'
                      }
                    />
                  </div>
                </TabsContent>

                {/* Tab 5: 付费信息 */}
                <TabsContent value="payment">
                  <div className="space-y-0">
                    <InfoRow
                      label="付费金额"
                      value={p?.paid_amount != null ? `$${p.paid_amount.toLocaleString()}` : '—'}
                    />
                    <InfoRow label="三级渠道" value={p?.channel_l3} />
                  </div>
                </TabsContent>

                {/* Tab 6: 带新成果 */}
                <TabsContent value="new_result">
                  <div className="mb-3">
                    <div className="grid grid-cols-[80px_1fr_1fr] gap-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      <span>渠道</span>
                      <span>带新数</span>
                      <span>付费数</span>
                    </div>
                  </div>
                  <NewResultRow role="CC" newCount={p?.cc_new} paidCount={p?.cc_paid} />
                  <NewResultRow role="SS" newCount={p?.ss_new} paidCount={p?.ss_paid} />
                  <NewResultRow role="LP" newCount={p?.lp_new} paidCount={p?.lp_paid} />
                  <NewResultRow role="宽口" newCount={p?.wide_new} paidCount={p?.wide_paid} />
                </TabsContent>

                {/* Tab 7: 日报轨迹 */}
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
