'use client';

import { useTranslations } from 'next-intl';
export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { mutate } from 'swr';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import {
  Zap,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  DollarSign,
  Users,
  Package,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { BIZ_PAGE } from '@/lib/layout';

const SWR_KEY = '/api/live-orders';

interface Order {
  index: number;
  ts: string;
  cc_name: string;
  team: string;
  student: string;
  product: string;
  amount_thb: number | null;
}

interface CCRow {
  cc_name: string;
  team: string;
  count: number;
  confirmed_count: number;
  t1_thb: number;
  today_thb: number;
  total_thb: number;
  order_indices: number[];
}

interface Summary {
  total_orders: number;
  confirmed_orders: number;
  unconfirmed_orders: number;
  total_thb: number;
  t1_actual_thb: number;
  realtime_thb: number;
  target_thb: number;
  bm_pct: number;
  bm_gap_thb: number;
  month_gap_thb: number;
}

interface LiveData {
  date: string;
  summary: Summary;
  by_cc: CCRow[];
  orders: Order[];
}

function fmt(n: number): string {
  return `฿${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtTime(ts: string): string {
  if (!ts) return '—';
  return ts.slice(11, 16);
}

export default function LiveOrdersPage() {
    const t = useTranslations('liveOrdersPage');

  const { data, error, isLoading } = useFilteredSWR<LiveData>(SWR_KEY, {
    refreshInterval: 15000,
  });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [resetting, setResetting] = useState(false);

  const updateAmount = useCallback(
    async (idx: number) => {
      const val = parseFloat(editAmount);
      if (isNaN(val) && editAmount !== '') return;
      await fetch(`/api/live-orders/${idx}/amount`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_thb: editAmount === '' ? null : val }),
      });
      setEditingIdx(null);
      mutate((key) => typeof key === 'string' && key.startsWith(SWR_KEY));
    },
    [editAmount]
  );

  const deleteOrder = useCallback(async (idx: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    await fetch(`/api/live-orders/${idx}`, { method: 'DELETE' });
    mutate(SWR_KEY);
  }, []);

  const resetAll = useCallback(async () => {
    if (!confirm(t('resetConfirm'))) return;
    setResetting(true);
    await fetch(`/api/live-orders/reset`, { method: 'POST' });
    mutate(SWR_KEY);
    setResetting(false);
  }, []);

  if (isLoading)
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title="Live Orders" subtitle={t('loadingSubtitle')} icon={Zap} />
        <div className="animate-pulse h-60 rounded-xl bg-subtle" />
      </div>
    );

  if (error || !data)
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title="Live Orders" subtitle={t('loadingSubtitle')} icon={Zap} />
        <Card>
          <p className="text-muted-token">{t('loadFailed')}</p>
        </Card>
      </div>
    );

  const { summary: s, by_cc, orders } = data;

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title="Live Orders" subtitle={t('subtitleFmt', { date: data.date })} icon={Zap} />

      {/* ── 摘要卡片 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label={t('todayOrders')}
          value={`${s.total_orders} ${t('orderUnit')}`}
          sub={t('confirmedN', { n: s.confirmed_orders, u: s.unconfirmed_orders })}
          icon={Package}
          color="text-accent-token"
        />
        <SummaryCard
          label={t('todayAmount')}
          value={fmt(s.total_thb)}
          sub={t('ocrConfirmed', { n: s.confirmed_orders })}
          icon={DollarSign}
          color="text-warning-token"
        />
        <SummaryCard
          label={t('todayBm')}
          value={
            s.bm_gap_thb >= 0
              ? t('overTarget', { v: fmt(s.bm_gap_thb) })
              : t('belowTarget', { v: fmt(Math.abs(s.bm_gap_thb)) })
          }
          sub={t('t1Plus', { t1: fmt(s.t1_actual_thb), today: fmt(s.total_thb) })}
          icon={s.bm_gap_thb >= 0 ? TrendingUp : TrendingDown}
          color={s.bm_gap_thb >= 0 ? 'text-success-token' : 'text-danger-token'}
        />
        <SummaryCard
          label={t('monthTarget')}
          value={
            s.month_gap_thb >= 0
              ? t('exceeded', { v: fmt(s.month_gap_thb) })
              : t('remaining', { v: fmt(Math.abs(s.month_gap_thb)) })
          }
          sub={`${fmt(s.realtime_thb)} / ${fmt(s.target_thb)}`}
          icon={s.month_gap_thb >= 0 ? TrendingUp : AlertTriangle}
          color={s.month_gap_thb >= 0 ? 'text-success-token' : 'text-warning-token'}
        />
      </div>

      {/* ── CC 排行 ── */}
      <Card title={t('ccRanking')}>
        {by_cc.length === 0 ? (
          <p className="text-muted-token text-sm py-4">{t('noOrdersToday')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-subtle">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    {t('rank')}
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    CC
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    {t('team')}
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    {t('orders')}
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    {t('confirmed')}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-token uppercase">
                    {t('t1Amount')}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    {t('todayAmountCol')}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-primary-token uppercase">
                    {t('totalAmount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {by_cc.map((cc, i) => (
                  <tr key={cc.cc_name} className="hover:bg-subtle transition-colors">
                    <td className="px-4 py-2.5 font-medium">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-primary-token">{cc.cc_name}</td>
                    <td className="px-4 py-2.5 text-muted-token">{cc.team}</td>
                    <td className="px-4 py-2.5 text-center">{cc.count}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={
                          cc.confirmed_count === cc.count
                            ? 'text-success-token'
                            : 'text-warning-token'
                        }
                      >
                        {cc.confirmed_count}/{cc.count}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-token">
                      {fmt(cc.t1_thb || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-secondary-token">
                      {fmt(cc.today_thb || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-primary-token">
                      {fmt(cc.total_thb || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 订单明细 ── */}
      <Card
        title={t('allOrders')}
        actions={
          <button
            onClick={resetAll}
            disabled={resetting || orders.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
 bg-danger-surface text-danger-token hover:bg-danger-surface disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            {t('clearAll')}
          </button>
        }
      >
        {orders.length === 0 ? (
          <p className="text-muted-token text-sm py-4">{t('noOrdersEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-subtle">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-secondary-token uppercase w-[50px]">
                    {t('rank')}
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-secondary-token uppercase w-[60px]">
                    {t('time')}
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    CC
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    {t('student')}
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-secondary-token uppercase">
                    {t('product')}
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-secondary-token uppercase w-[140px]">
                    {t('amountThb')}
                  </th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-token uppercase w-[80px]">
                    {t('manage')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {orders.map((o) => (
                  <tr key={o.index} className="hover:bg-subtle transition-colors">
                    <td className="px-3 py-2.5 text-muted-token">{o.index + 1}</td>
                    <td className="px-3 py-2.5 text-muted-token">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtTime(o.ts)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-primary-token">{o.cc_name}</td>
                    <td className="px-3 py-2.5">{o.student || '—'}</td>
                    <td className="px-3 py-2.5 text-secondary-token">{o.product || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {editingIdx === o.index ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-muted-token">฿</span>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-0.5 text-sm text-right border border-default-token rounded
 bg-bg-primary focus:outline-none focus:ring-1 focus:ring-action-token"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateAmount(o.index);
                              if (e.key === 'Escape') setEditingIdx(null);
                            }}
                          />
                          <button
                            onClick={() => updateAmount(o.index)}
                            className="p-0.5 text-success-token hover:bg-success-surface rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingIdx(null)}
                            className="p-0.5 text-muted-token hover:bg-subtle rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`cursor-pointer hover:text-action-token ${o.amount_thb ? 'font-semibold text-primary-token' : 'text-warning-token'}`}
                          onClick={() => {
                            setEditingIdx(o.index);
                            setEditAmount(o.amount_thb?.toString() || '');
                          }}
                          title={t('clickToEdit')}
                        >
                          {o.amount_thb ? fmt(o.amount_thb) : t('pendingAmount')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingIdx(o.index);
                            setEditAmount(o.amount_thb?.toString() || '');
                          }}
                          className="p-1 text-muted-token hover:text-action-token hover:bg-subtle rounded transition-colors"
                          title="แก้ไขยอดเงิน / 编辑金额"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteOrder(o.index)}
                          className="p-1 text-muted-token hover:text-danger-token hover:bg-danger-surface rounded transition-colors"
                          title="ลบ / 删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-subtle font-semibold">
                  <td
                    colSpan={5}
                    className="px-3 py-2.5 text-right text-xs uppercase text-secondary-token"
                  >
                    {t('total')}
                  </td>
                  <td className="px-3 py-2.5 text-right text-primary-token">
                    {s.total_thb > 0 ? fmt(s.total_thb) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof TrendingUp;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-default-token bg-surface">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-token">{label}</span>
      </div>
      <p className="text-lg font-semibold text-primary-token">{value}</p>
      <p className="text-xs text-muted-token mt-1">{sub}</p>
    </div>
  );
}
