'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
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
import { swrFetcher } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { BIZ_PAGE } from '@/lib/layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100';
const SWR_KEY = `${API}/api/live-orders`;

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
  const { data, error, isLoading } = useSWR<LiveData>(SWR_KEY, swrFetcher, {
    refreshInterval: 15000,
  });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [resetting, setResetting] = useState(false);

  const updateAmount = useCallback(
    async (idx: number) => {
      const val = parseFloat(editAmount);
      if (isNaN(val) && editAmount !== '') return;
      await fetch(`${API}/api/live-orders/${idx}/amount`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_thb: editAmount === '' ? null : val }),
      });
      setEditingIdx(null);
      mutate(SWR_KEY);
    },
    [editAmount]
  );

  const deleteOrder = useCallback(async (idx: number) => {
    if (!confirm('ลบออเดอร์นี้?')) return;
    await fetch(`${API}/api/live-orders/${idx}`, { method: 'DELETE' });
    mutate(SWR_KEY);
  }, []);

  const resetAll = useCallback(async () => {
    if (!confirm('ล้างข้อมูลวันนี้ทั้งหมด? (ยืนยัน)')) return;
    setResetting(true);
    await fetch(`${API}/api/live-orders/reset`, { method: 'POST' });
    mutate(SWR_KEY);
    setResetting(false);
  }, []);

  if (isLoading)
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title="Live Orders" subtitle="今日实时成交" icon={Zap} />
        <div className="animate-pulse h-60 rounded-xl bg-[var(--bg-subtle)]" />
      </div>
    );

  if (error || !data)
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title="Live Orders" subtitle="今日实时成交" icon={Zap} />
        <Card>
          <p className="text-[var(--text-muted)]">加载失败</p>
        </Card>
      </div>
    );

  const { summary: s, by_cc, orders } = data;

  return (
    <div className={BIZ_PAGE}>
      <PageHeader
        title="Live Orders"
        subtitle={`今日实时成交 — ${data.date}（每 15 秒自动刷新）`}
        icon={Zap}
      />

      {/* ── 摘要卡片 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="วันนี้ / 今日"
          value={`${s.total_orders} ออเดอร์`}
          sub={`ยืนยันแล้ว ${s.confirmed_orders} / ไม่ยืนยัน ${s.unconfirmed_orders}`}
          icon={Package}
          color="text-blue-600"
        />
        <SummaryCard
          label="ยอดวันนี้ / 今日金额"
          value={fmt(s.total_thb)}
          sub={`OCR ยืนยันแล้ว ${s.confirmed_orders} รายการ`}
          icon={DollarSign}
          color="text-amber-600"
        />
        <SummaryCard
          label="BM วันนี้ / 今日 BM"
          value={
            s.bm_gap_thb >= 0
              ? `เกินเป้า ${fmt(s.bm_gap_thb)}`
              : `ต่ำกว่า ${fmt(Math.abs(s.bm_gap_thb))}`
          }
          sub={`T-1 ${fmt(s.t1_actual_thb)} + วันนี้ ${fmt(s.total_thb)}`}
          icon={s.bm_gap_thb >= 0 ? TrendingUp : TrendingDown}
          color={s.bm_gap_thb >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard
          label="เป้าเดือน / 月目标"
          value={
            s.month_gap_thb >= 0
              ? `เกิน ${fmt(s.month_gap_thb)}`
              : `เหลือ ${fmt(Math.abs(s.month_gap_thb))}`
          }
          sub={`${fmt(s.realtime_thb)} / ${fmt(s.target_thb)}`}
          icon={s.month_gap_thb >= 0 ? TrendingUp : AlertTriangle}
          color={s.month_gap_thb >= 0 ? 'text-green-600' : 'text-amber-600'}
        />
      </div>

      {/* ── CC 排行 ── */}
      <Card title="CC 排行 / จัดอันดับ CC วันนี้">
        {by_cc.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm py-4">ยังไม่มีออเดอร์วันนี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    #
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    CC
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    ทีม / 团队
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    ออเดอร์
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    ยืนยัน
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    ยอดเงิน / 金额
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
                          cc.confirmed_count === cc.count ? 'text-green-600' : 'text-amber-600'
                        }
                      >
                        {cc.confirmed_count}/{cc.count}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {cc.total_thb > 0 ? fmt(cc.total_thb) : '—'}
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
        title="ออเดอร์ทั้งหมด / 订单明细"
        actions={
          <button
            onClick={resetAll}
            disabled={resetting || orders.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                       bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            ล้างทั้งหมด / 一键清算
          </button>
        }
      >
        {orders.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm py-4">
            ยังไม่มีออเดอร์วันนี้ — รอ CC @机器人 ในกลุ่ม
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase w-[50px]">
                    #
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase w-[60px]">
                    เวลา
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    CC
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    นักเรียน
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    แพ็กเกจ
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase w-[140px]">
                    ยอดเงิน (฿)
                  </th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--text-muted)] uppercase w-[80px]">
                    จัดการ
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
                            className="p-0.5 text-green-600 hover:bg-green-50 rounded"
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
                          className={`cursor-pointer hover:text-[var(--action)] ${o.amount_thb ? 'font-semibold text-[var(--text-primary)]' : 'text-amber-500'}`}
                          onClick={() => {
                            setEditingIdx(o.index);
                            setEditAmount(o.amount_thb?.toString() || '');
                          }}
                          title="คลิกเพื่อแก้ไข / 点击编辑"
                        >
                          {o.amount_thb ? fmt(o.amount_thb) : 'รอยืนยัน'}
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
                          className="p-1 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                    รวมทั้งหมด / 总计
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
