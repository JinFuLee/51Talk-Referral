'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/* ── 类型定义 ─────────────────────────────────────────────── */

interface ContributorRow {
  stdt_id: string;
  enclosure: string;
  cc_new_count: number;
  ss_new_count: number;
  lp_new_count: number;
  wide_new_count: number;
  cc_paid_count: number;
  ss_paid_count: number;
  lp_paid_count: number;
  wide_paid_count: number;
  total_new: number;
  total_paid: number;
  conversion_rate: number;
  historical_coding_count: number;
}

interface ReferralContributorResponse {
  total_contributors: number;
  top_contributors: ContributorRow[];
}

/* ── 工具函数 ─────────────────────────────────────────────── */

type SortKey = keyof ContributorRow;

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—';
  if (decimals > 0) return v.toFixed(decimals);
  return v.toLocaleString();
}

function pct(v: number | null | undefined): string {
  if (v == null) return '—';
  return (v * 100).toFixed(1) + '%';
}

/* ── 主页面 ─────────────────────────────────────────────── */

export default function ReferralContributorPage() {
  const { data, isLoading, error } = useSWR<ReferralContributorResponse>(
    '/api/analysis/referral-contributor',
    swrFetcher
  );

  const [sortKey, setSortKey] = useState<SortKey>('total_new');
  const [sortAsc, setSortAsc] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取推荐者贡献数据，请检查后端服务是否正常运行"
      />
    );
  }

  const contributors = data?.top_contributors ?? [];

  if (contributors.length === 0) {
    return (
      <EmptyState
        title="暂无推荐者数据"
        description="当前数据源无推荐记录，上传含转介绍明细的数据文件后自动解析"
      />
    );
  }

  /* 汇总计算 */
  const totalNew = contributors.reduce((s, r) => s + r.total_new, 0);
  const totalPaid = contributors.reduce((s, r) => s + r.total_paid, 0);
  const ccNew = contributors.reduce((s, r) => s + r.cc_new_count, 0);
  const ssNew = contributors.reduce((s, r) => s + r.ss_new_count, 0);
  const lpNew = contributors.reduce((s, r) => s + r.lp_new_count, 0);
  const wideNew = contributors.reduce((s, r) => s + r.wide_new_count, 0);
  const ccPaid = contributors.reduce((s, r) => s + r.cc_paid_count, 0);
  const ssPaid = contributors.reduce((s, r) => s + r.ss_paid_count, 0);
  const lpPaid = contributors.reduce((s, r) => s + r.lp_paid_count, 0);
  const widePaid = contributors.reduce((s, r) => s + r.wide_paid_count, 0);

  /* 渠道条形图数据 */
  const channelChartData = [
    { channel: 'CC 窄口', 带新: ccNew, 付费: ccPaid },
    { channel: 'SS 窄口', 带新: ssNew, 付费: ssPaid },
    { channel: 'LP 窄口', 带新: lpNew, 付费: lpPaid },
    { channel: '宽口', 带新: wideNew, 付费: widePaid },
  ];

  /* 排序 */
  const sorted = [...contributors].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-[var(--text-muted)] ml-0.5">⇅</span>;
    return <span className="text-[var(--text-primary)] ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
  }

  return (
    <div className="space-y-3">
      {/* 页头 */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">推荐者价值贡献</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          高价值推荐者识别 · 四渠道贡献拆分 · 历史转码汇总
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          窄口：CC/SS/LP 绑定 UserB 推荐 · 宽口：UserA 学员链接绑定 UserB 推荐
        </p>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">贡献者总数</p>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {(data?.total_contributors ?? contributors.length).toLocaleString()}
            </p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">总带新付费</p>
            <p className="text-3xl font-bold text-green-600">{totalPaid.toLocaleString()}</p>
          </div>
        </Card>
        <Card title="">
          <div className="text-center py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">总带新注册</p>
            <p className="text-3xl font-bold text-navy-500">{totalNew.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              整体转化率 {totalNew > 0 ? ((totalPaid / totalNew) * 100).toFixed(1) + '%' : '—'}
            </p>
          </div>
        </Card>
      </div>

      {/* 渠道汇总条形图 */}
      <Card title="四渠道带新 / 付费对比">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={channelChartData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="带新" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="付费" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* TOP 推荐者排行表 */}
      <Card
        title={`TOP 推荐者排行（共 ${(data?.total_contributors ?? contributors.length).toLocaleString()} 人，展示前 ${sorted.length} 名）`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">排名</th>
                <th className="slide-th text-left">学员 ID</th>
                <th
                  className="slide-th text-center cursor-pointer select-none"
                  onClick={() => handleSort('enclosure')}
                >
                  围场{sortIcon('enclosure')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('cc_new_count')}
                >
                  CC带新{sortIcon('cc_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('ss_new_count')}
                >
                  SS带新{sortIcon('ss_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('lp_new_count')}
                >
                  LP带新{sortIcon('lp_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('wide_new_count')}
                >
                  宽口带新{sortIcon('wide_new_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_new')}
                >
                  总带新{sortIcon('total_new')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_paid')}
                >
                  总付费{sortIcon('total_paid')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('conversion_rate')}
                >
                  转化率{sortIcon('conversion_rate')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('historical_coding_count')}
                >
                  历史转码{sortIcon('historical_coding_count')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.stdt_id} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td text-center text-[var(--text-muted)] font-mono">
                    {i + 1}
                  </td>
                  <td className="slide-td font-mono text-xs text-[var(--text-secondary)]">
                    {r.stdt_id}
                  </td>
                  <td className="slide-td text-center">
                    <span className="text-xs bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
                      {r.enclosure}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.cc_new_count > 0 ? (
                      <span className="text-navy-500 font-semibold">{r.cc_new_count}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.ss_new_count > 0 ? (
                      <span className="text-purple-600 font-semibold">{r.ss_new_count}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.lp_new_count > 0 ? (
                      <span className="text-orange-600 font-semibold">{r.lp_new_count}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    {r.wide_new_count > 0 ? (
                      <span className="text-cyan-600 font-semibold">{r.wide_new_count}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">
                    {r.total_new}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums font-bold text-green-600">
                    {r.total_paid > 0 ? (
                      r.total_paid
                    ) : (
                      <span className="text-[var(--text-muted)] font-normal">0</span>
                    )}
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums">
                    <span
                      className={
                        r.conversion_rate >= 0.3
                          ? 'text-green-600 font-semibold'
                          : r.conversion_rate > 0
                            ? 'text-yellow-600'
                            : 'text-[var(--text-muted)]'
                      }
                    >
                      {pct(r.conversion_rate)}
                    </span>
                  </td>
                  <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {fmt(r.historical_coding_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 px-1">
          点击列标题排序 · CC/SS/LP 为窄口渠道 · 宽口为学员自发传播 · 历史转码 = 累计带新付费总数
        </p>
      </Card>
    </div>
  );
}
