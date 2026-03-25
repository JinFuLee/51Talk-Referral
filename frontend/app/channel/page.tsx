'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  ChannelMetrics,
  RevenueContribution,
  ThreeFactorComparison,
} from '@/lib/types/channel';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';

interface TopContributor {
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
}

interface ContributorResponse {
  total_contributors: number;
  top_contributors: TopContributor[];
  channel_summary: Record<string, { new_total: number; paid_total: number }>;
}

const CHANNEL_KEY_MAP: Record<string, { paid: keyof TopContributor; label: string }> = {
  CC窄: { paid: 'cc_paid_count', label: 'CC窄' },
  SS窄: { paid: 'ss_paid_count', label: 'SS窄' },
  LP窄: { paid: 'lp_paid_count', label: 'LP窄' },
  宽口: { paid: 'wide_paid_count', label: '宽口' },
};

const CHANNEL_COLORS = CHART_PALETTE.series;
const TABS = ['业绩贡献', '净拆解', '三因素对标', '渠道推荐者'] as const;
type Tab = (typeof TABS)[number];

// Render a cell: null → "—", number → formatted
function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString();
}

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '—';
  return `$${v.toLocaleString()}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return formatRate(v);
}

function fmtGap(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toLocaleString()}`;
}

// Tooltip for limited-scope columns
function HeaderWithTip({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1 group relative cursor-default">
      {children}
      <span
        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
        title={tip}
      >
        ⓘ
      </span>
      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10
        bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg"
      >
        {tip}
      </span>
    </span>
  );
}

interface ChannelResponse {
  channels: ChannelMetrics[];
}
interface AttributionResponse {
  contributions: RevenueContribution[];
}
interface ThreeFactorResponse {
  comparisons: ThreeFactorComparison[];
}

export default function ChannelPage() {
  const [tab, setTab] = useState<Tab>('业绩贡献');
  const {
    data: channelData,
    isLoading: c1,
    error: cerr1,
  } = useSWR<ChannelResponse>('/api/channel', swrFetcher);
  const {
    data: attrData,
    isLoading: c2,
    error: cerr2,
  } = useSWR<AttributionResponse>('/api/channel/attribution', swrFetcher);
  const {
    data: threeData,
    isLoading: c3,
    error: cerr3,
  } = useSWR<ThreeFactorResponse>('/api/channel/three-factor', swrFetcher);
  const {
    data: contributorData,
    isLoading: c4,
    error: cerr4,
  } = useSWR<ContributorResponse>('/api/analysis/referral-contributor?top=200', swrFetcher);

  const isLoading = c1 || c2 || c3 || c4;
  const pageError = cerr1 || cerr2 || cerr3 || cerr4;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        <p>数据加载失败</p>
        <p className="text-xs mt-1">{pageError.message ?? '请检查后端服务是否正常运行'}</p>
      </div>
    );
  }

  const channels = Array.isArray(channelData) ? channelData : (channelData?.channels ?? []);
  const contributions = Array.isArray(attrData) ? attrData : (attrData?.contributions ?? []);
  const comparisons = Array.isArray(threeData) ? threeData : (threeData?.comparisons ?? []);
  const allContributors: TopContributor[] = contributorData?.top_contributors ?? [];

  const pieData = channels
    .filter((c) => c.revenue_usd != null && c.revenue_usd > 0)
    .map((c) => ({
      name: c.channel,
      value: c.revenue_usd as number,
    }));

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="mb-2">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">渠道分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          CC窄/SS窄/LP窄 + CC宽/LP宽/运营宽 · 业绩归因
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '业绩贡献' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <Card title="渠道业绩汇总">
            {channels.length === 0 ? (
              <EmptyState title="暂无渠道数据" description="上传数据后自动刷新" />
            ) : (
              <>
                <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                  各渠道业绩按带新参与数占比分摊。宽口按围场-岗位配置拆分为
                  CC宽/LP宽/运营宽（Settings 可调）。
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="slide-thead-row text-xs">
                        <th className="py-1.5 px-2 border-0 text-left">渠道</th>
                        <th className="py-1.5 px-2 border-0 text-right">注册 / 参与</th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip="CC窄 完整漏斗数据；SS/LP/宽口 无此指标">
                            预约
                          </HeaderWithTip>
                        </th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip="CC窄 完整漏斗数据；SS/LP/宽口 无此指标">
                            出席
                          </HeaderWithTip>
                        </th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip="CC窄 完整漏斗数据；SS/LP/宽口 无此指标">
                            付费
                          </HeaderWithTip>
                        </th>
                        <th className="py-1.5 px-2 border-0 text-right">
                          <HeaderWithTip tip="CC窄 完整漏斗数据；SS/LP/宽口 无此指标">
                            业绩
                          </HeaderWithTip>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((c) => (
                        <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
                          <td className="py-2 px-2 text-xs font-medium">{c.channel}</td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                            {fmtNum(c.registrations)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtNum(c.appointments)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtNum(c.attendance)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtNum(c.payments)}
                          </td>
                          <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                            {fmtUsd(c.revenue_usd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <Card title="渠道业绩占比">
            {pieData.length === 0 ? (
              <EmptyState title="暂无渠道数据" description="上传数据后自动刷新" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${formatRate(percent, 0)}`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '业绩']} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {tab === '净拆解' && (
        <Card title="渠道净业绩拆解">
          {contributions.length === 0 ? (
            <EmptyState title="暂无归因数据" description="上传数据后自动刷新" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row text-xs">
                    <th className="py-1.5 px-2 border-0 text-left">渠道</th>
                    <th className="py-1.5 px-2 border-0 text-right">净业绩 (USD)</th>
                    <th className="py-1.5 px-2 border-0 text-right">占比</th>
                    <th className="py-1.5 px-2 border-0 text-right">人均业绩</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
                      <td className="py-2 px-2 text-xs font-medium">{c.channel}</td>
                      <td className="py-2 px-2 text-xs text-right font-mono tabular-nums font-semibold">
                        {fmtUsd(c.revenue)}
                      </td>
                      <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                        {fmtPct(c.share)}
                      </td>
                      <td className="py-2 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {fmtUsd(c.per_capita)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === '渠道推荐者' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {Object.entries(CHANNEL_KEY_MAP).map(([channelLabel, { paid }]) => {
            const top5 = [...allContributors]
              .filter((c) => (c[paid] as number) > 0)
              .sort((a, b) => (b[paid] as number) - (a[paid] as number))
              .slice(0, 5);
            return (
              <Card key={channelLabel} title={`${channelLabel} · TOP5 推荐者`}>
                {top5.length === 0 ? (
                  <EmptyState title="暂无数据" description="该渠道尚无带新付费记录" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="slide-thead-row">
                          <th className="slide-th text-left">#</th>
                          <th className="slide-th text-left">学员 ID</th>
                          <th className="slide-th text-left">围场</th>
                          <th className="slide-th text-right">该渠道带新付费</th>
                          <th className="slide-th text-right">总带新</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top5.map((c, i) => (
                          <tr
                            key={c.stdt_id || i}
                            className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                          >
                            <td className="slide-td text-[var(--text-muted)] font-mono">{i + 1}</td>
                            <td className="slide-td font-mono text-xs">{c.stdt_id || '—'}</td>
                            <td className="slide-td text-[var(--text-secondary)]">
                              {c.enclosure || '—'}
                            </td>
                            <td className="slide-td text-right font-mono tabular-nums font-semibold text-action-accent">
                              {fmtNum(c[paid] as number)}
                            </td>
                            <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                              {fmtNum(c.total_new)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === '三因素对标' && (
        <Card title="三因素对标：预约 × 出席 × 付费">
          {comparisons.length === 0 ? (
            <EmptyState title="暂无三因素数据" description="上传数据后自动刷新" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="slide-thead-row text-xs">
                    <th className="py-1.5 px-2 border-0 text-left">渠道</th>
                    <th className="py-1.5 px-2 border-0 text-right">预期量</th>
                    <th className="py-1.5 px-2 border-0 text-right">实际量</th>
                    <th className="py-1.5 px-2 border-0 text-right">差距</th>
                    <th className="py-1.5 px-2 border-0 text-right">预约因子</th>
                    <th className="py-1.5 px-2 border-0 text-right">出席因子</th>
                    <th className="py-1.5 px-2 border-0 text-right">付费因子</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c) => {
                    const gap = c.gap;
                    return (
                      <tr key={c.channel} className="even:bg-[var(--bg-subtle)]">
                        <td className="py-2 px-2 text-xs font-medium">{c.channel}</td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtNum(c.expected_volume)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums font-semibold">
                          {fmtNum(c.actual_volume)}
                        </td>
                        <td
                          className={`py-2 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                            gap == null
                              ? 'text-[var(--text-secondary)]'
                              : gap >= 0
                                ? 'text-green-600'
                                : 'text-red-500'
                          }`}
                        >
                          {fmtGap(gap)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtPct(c.appt_factor)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtPct(c.show_factor)}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-mono tabular-nums">
                          {fmtPct(c.pay_factor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
