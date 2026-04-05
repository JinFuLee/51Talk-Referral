'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { mutate } from 'swr';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';

const I18N = {
  zh: {
    subtitleFmt: (date: string) => `今日实时成交 — ${date}（每 15 秒自动刷新）`,
    loadingSubtitle: '今日实时成交',
    loadFailed: '加载失败',
    todayOrders: '今日',
    todayAmount: '今日金额',
    todayBm: '今日 BM',
    monthTarget: '月目标',
    ccRanking: 'CC 排行',
    noOrdersToday: '今日暂无订单',
    team: '团队',
    orders: '订单数',
    confirmed: '确认',
    amount: '金额',
    allOrders: '订单明细',
    clearAll: '一键清算',
    noOrdersEmpty: '今日暂无订单 — 等待 CC @机器人 报单',
    total: '总计',
    rank: '#',
    time: '时间',
    student: '学员',
    product: '套餐',
    amountThb: '金额 (฿)',
    manage: '操作',
    clickToEdit: '点击编辑',
    t1Amount: 'T-1 金额',
    todayAmountCol: '今日金额',
    totalAmount: '总额',
    orderUnit: '单',
    confirmedN: (n: number, u: number) => `已确认 ${n} / 未确认 ${u}`,
    ocrConfirmed: (n: number) => `OCR 已确认 ${n} 笔`,
    overTarget: (v: string) => `超额 ${v}`,
    belowTarget: (v: string) => `落后 ${v}`,
    t1Plus: (t1: string, today: string) => `T-1 ${t1} + 今日 ${today}`,
    remaining: (v: string) => `还差 ${v}`,
    exceeded: (v: string) => `超额 ${v}`,
    pendingAmount: '等待系统确认',
    deleteConfirm: '删除这笔订单？',
    resetConfirm: '清空今日所有数据？（确认）',
  },
  'zh-TW': {
    subtitleFmt: (date: string) => `今日即時成交 — ${date}（每 15 秒自動刷新）`,
    loadingSubtitle: '今日即時成交',
    loadFailed: '載入失敗',
    todayOrders: '今日',
    todayAmount: '今日金額',
    todayBm: '今日 BM',
    monthTarget: '月目標',
    ccRanking: 'CC 排行',
    noOrdersToday: '今日暫無訂單',
    team: '團隊',
    orders: '訂單數',
    confirmed: '確認',
    amount: '金額',
    allOrders: '訂單明細',
    clearAll: '一鍵清算',
    noOrdersEmpty: '今日暫無訂單 — 等待 CC @機器人 報單',
    total: '總計',
    rank: '#',
    time: '時間',
    student: '學員',
    product: '套餐',
    amountThb: '金額 (฿)',
    manage: '操作',
    clickToEdit: '點擊編輯',
    t1Amount: 'T-1 金額',
    todayAmountCol: '今日金額',
    totalAmount: '總額',
    orderUnit: '單',
    confirmedN: (n: number, u: number) => `已確認 ${n} / 未確認 ${u}`,
    ocrConfirmed: (n: number) => `OCR 已確認 ${n} 筆`,
    overTarget: (v: string) => `超額 ${v}`,
    belowTarget: (v: string) => `落後 ${v}`,
    t1Plus: (t1: string, today: string) => `T-1 ${t1} + 今日 ${today}`,
    remaining: (v: string) => `還差 ${v}`,
    exceeded: (v: string) => `超額 ${v}`,
    pendingAmount: '等待系統確認',
    deleteConfirm: '刪除這筆訂單？',
    resetConfirm: '清空今日所有數據？（確認）',
  },
  en: {
    subtitleFmt: (date: string) => `Today's Live Orders — ${date} (auto-refresh every 15s)`,
    loadingSubtitle: "Today's Live Orders",
    loadFailed: 'Failed to load',
    todayOrders: 'Today',
    todayAmount: "Today's Amount",
    todayBm: "Today's BM",
    monthTarget: 'Monthly Target',
    ccRanking: 'CC Ranking',
    noOrdersToday: 'No orders today',
    team: 'Team',
    orders: 'Orders',
    confirmed: 'Confirmed',
    amount: 'Amount',
    allOrders: 'All Orders',
    clearAll: 'Clear All',
    noOrdersEmpty: 'No orders today — waiting for CC @bot to report',
    total: 'Total',
    rank: '#',
    time: 'Time',
    student: 'Student',
    product: 'Package',
    amountThb: 'Amount (฿)',
    manage: 'Actions',
    clickToEdit: 'Click to edit',
    t1Amount: 'T-1',
    todayAmountCol: 'Today',
    totalAmount: 'Total',
    orderUnit: 'orders',
    confirmedN: (n: number, u: number) => `Confirmed ${n} / Pending ${u}`,
    ocrConfirmed: (n: number) => `OCR confirmed ${n} items`,
    overTarget: (v: string) => `Over ${v}`,
    belowTarget: (v: string) => `Behind ${v}`,
    t1Plus: (t1: string, today: string) => `T-1 ${t1} + Today ${today}`,
    remaining: (v: string) => `${v} remaining`,
    exceeded: (v: string) => `Exceeded ${v}`,
    pendingAmount: 'Pending',
    deleteConfirm: 'Delete this order?',
    resetConfirm: 'Clear all today data? (confirm)',
  },
  th: {
    subtitleFmt: (date: string) => `ออเดอร์วันนี้ — ${date} (รีเฟรชทุก 15 วินาที)`,
    loadingSubtitle: 'ออเดอร์วันนี้',
    loadFailed: 'โหลดล้มเหลว',
    todayOrders: 'วันนี้',
    todayAmount: 'ยอดวันนี้',
    todayBm: 'BM วันนี้',
    monthTarget: 'เป้าเดือน',
    ccRanking: 'จัดอันดับ CC',
    noOrdersToday: 'ยังไม่มีออเดอร์วันนี้',
    team: 'ทีม',
    orders: 'ออเดอร์',
    confirmed: 'ยืนยัน',
    amount: 'ยอดเงิน',
    allOrders: 'ออเดอร์ทั้งหมด',
    clearAll: 'ล้างทั้งหมด',
    noOrdersEmpty: 'ยังไม่มีออเดอร์วันนี้ — รอ CC @บอท รายงาน',
    total: 'รวมทั้งหมด',
    rank: '#',
    time: 'เวลา',
    student: 'นักเรียน',
    product: 'แพ็กเกจ',
    amountThb: 'ยอดเงิน (฿)',
    manage: 'จัดการ',
    clickToEdit: 'คลิกเพื่อแก้ไข',
    t1Amount: 'T-1',
    todayAmountCol: 'วันนี้',
    totalAmount: 'รวม',
    orderUnit: 'ออเดอร์',
    confirmedN: (n: number, u: number) => `ยืนยันแล้ว ${n} / ไม่ยืนยัน ${u}`,
    ocrConfirmed: (n: number) => `OCR ยืนยันแล้ว ${n} รายการ`,
    overTarget: (v: string) => `เกินเป้า ${v}`,
    belowTarget: (v: string) => `ต่ำกว่า ${v}`,
    t1Plus: (t1: string, today: string) => `T-1 ${t1} + วันนี้ ${today}`,
    remaining: (v: string) => `เหลือ ${v}`,
    exceeded: (v: string) => `เกิน ${v}`,
    pendingAmount: 'รอยืนยัน',
    deleteConfirm: 'ลบออเดอร์นี้?',
    resetConfirm: 'ล้างข้อมูลวันนี้ทั้งหมด? (ยืนยัน)',
  },
} as const;
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
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] || I18N.zh;

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
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/live-orders/${idx}`, { method: 'DELETE' });
    mutate(SWR_KEY);
  }, []);

  const resetAll = useCallback(async () => {
    if (!confirm(t.resetConfirm)) return;
    setResetting(true);
    await fetch(`/api/live-orders/reset`, { method: 'POST' });
    mutate(SWR_KEY);
    setResetting(false);
  }, []);

  if (isLoading)
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title="Live Orders" subtitle={t.loadingSubtitle} icon={Zap} />
        <div className="animate-pulse h-60 rounded-xl bg-[var(--bg-subtle)]" />
      </div>
    );

  if (error || !data)
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title="Live Orders" subtitle={t.loadingSubtitle} icon={Zap} />
        <Card>
          <p className="text-[var(--text-muted)]">{t.loadFailed}</p>
        </Card>
      </div>
    );

  const { summary: s, by_cc, orders } = data;

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title="Live Orders" subtitle={t.subtitleFmt(data.date)} icon={Zap} />

      {/* ── 摘要卡片 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label={t.todayOrders}
          value={`${s.total_orders} ${t.orderUnit}`}
          sub={t.confirmedN(s.confirmed_orders, s.unconfirmed_orders)}
          icon={Package}
          color="text-[var(--color-accent)]"
        />
        <SummaryCard
          label={t.todayAmount}
          value={fmt(s.total_thb)}
          sub={t.ocrConfirmed(s.confirmed_orders)}
          icon={DollarSign}
          color="text-[var(--color-warning)]"
        />
        <SummaryCard
          label={t.todayBm}
          value={
            s.bm_gap_thb >= 0
              ? t.overTarget(fmt(s.bm_gap_thb))
              : t.belowTarget(fmt(Math.abs(s.bm_gap_thb)))
          }
          sub={t.t1Plus(fmt(s.t1_actual_thb), fmt(s.total_thb))}
          icon={s.bm_gap_thb >= 0 ? TrendingUp : TrendingDown}
          color={s.bm_gap_thb >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}
        />
        <SummaryCard
          label={t.monthTarget}
          value={
            s.month_gap_thb >= 0
              ? t.exceeded(fmt(s.month_gap_thb))
              : t.remaining(fmt(Math.abs(s.month_gap_thb)))
          }
          sub={`${fmt(s.realtime_thb)} / ${fmt(s.target_thb)}`}
          icon={s.month_gap_thb >= 0 ? TrendingUp : AlertTriangle}
          color={
            s.month_gap_thb >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
          }
        />
      </div>

      {/* ── CC 排行 ── */}
      <Card title={t.ccRanking}>
        {by_cc.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm py-4">{t.noOrdersToday}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {t.rank}
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    CC
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {t.team}
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {t.orders}
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {t.confirmed}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    {t.t1Amount}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {t.todayAmountCol}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] uppercase">
                    {t.totalAmount}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {by_cc.map((cc, i) => (
                  <tr key={cc.cc_name} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="px-4 py-2.5 font-medium">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                      {cc.cc_name}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{cc.team}</td>
                    <td className="px-4 py-2.5 text-center">{cc.count}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={
                          cc.confirmed_count === cc.count
                            ? 'text-[var(--color-success)]'
                            : 'text-[var(--color-warning)]'
                        }
                      >
                        {cc.confirmed_count}/{cc.count}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">
                      {fmt(cc.t1_thb || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {fmt(cc.today_thb || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">
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
        title={t.allOrders}
        actions={
          <button
            onClick={resetAll}
            disabled={resetting || orders.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
 bg-[var(--color-danger-surface)] text-[var(--color-danger)] hover:bg-[var(--color-danger-surface)] disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            {t.clearAll}
          </button>
        }
      >
        {orders.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm py-4">{t.noOrdersEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase w-[50px]">
                    {t.rank}
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase w-[60px]">
                    {t.time}
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    CC
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {t.student}
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {t.product}
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase w-[140px]">
                    {t.amountThb}
                  </th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--text-muted)] uppercase w-[80px]">
                    {t.manage}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {orders.map((o) => (
                  <tr key={o.index} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{o.index + 1}</td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtTime(o.ts)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">
                      {o.cc_name}
                    </td>
                    <td className="px-3 py-2.5">{o.student || '—'}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{o.product || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {editingIdx === o.index ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[var(--text-muted)]">฿</span>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-0.5 text-sm text-right border border-[var(--border-default)] rounded
 bg-[var(--bg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action)]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateAmount(o.index);
                              if (e.key === 'Escape') setEditingIdx(null);
                            }}
                          />
                          <button
                            onClick={() => updateAmount(o.index)}
                            className="p-0.5 text-[var(--color-success)] hover:bg-[var(--color-success-surface)] rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingIdx(null)}
                            className="p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`cursor-pointer hover:text-[var(--action)] ${o.amount_thb ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--color-warning)]'}`}
                          onClick={() => {
                            setEditingIdx(o.index);
                            setEditAmount(o.amount_thb?.toString() || '');
                          }}
                          title={t.clickToEdit}
                        >
                          {o.amount_thb ? fmt(o.amount_thb) : t.pendingAmount}
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
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--action)] hover:bg-[var(--bg-subtle)] rounded transition-colors"
                          title="แก้ไขยอดเงิน / 编辑金额"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteOrder(o.index)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-surface)] rounded transition-colors"
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
                <tr className="bg-[var(--bg-subtle)] font-semibold">
                  <td
                    colSpan={5}
                    className="px-3 py-2.5 text-right text-xs uppercase text-[var(--text-secondary)]"
                  >
                    {t.total}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-primary)]">
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
    <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>
    </div>
  );
}
