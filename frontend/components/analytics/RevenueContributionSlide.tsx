'use client';

import { formatRate, formatUSD, formatRevenue } from '@/lib/utils';
import type { RevenueContribution } from '@/lib/types/report';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ── I18N ──────────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '当月业绩贡献',
    subtitle: '4 口径（CC窄/SS窄/LP窄/其它）· 付费数 + 金额 + 客单价',
    channel: '渠道',
    payments: '付费数',
    payShare: '付费占比',
    revenue: '业绩',
    revShare: '业绩占比',
    asp: '客单价',
    narrowSubtotal: '窄口小计',
    total: '合计',
    noData: '暂无业绩数据',
    noDataDesc: '请上传本月 Excel 数据源',
    chartTitle: '业绩贡献分布',
  },
  en: {
    title: 'Revenue Contribution',
    subtitle: '4 channels (CC/SS/LP/Other) · Payments + Revenue + ASP',
    channel: 'Channel',
    payments: 'Payments',
    payShare: 'Pay %',
    revenue: 'Revenue',
    revShare: 'Rev %',
    asp: 'ASP',
    narrowSubtotal: 'Narrow Subtotal',
    total: 'Total',
    noData: 'No revenue data',
    noDataDesc: "Please upload this month's Excel data source",
    chartTitle: 'Revenue Distribution',
  },
} as const;

type Lang = keyof typeof I18N;

// 图表色板（从 globals.css --chart-*-hex 映射）
const PIE_COLORS = ['#ffd100', '#1b365d', '#e8932a', '#2d9f6f', '#e05545'];

interface Props {
  data: RevenueContribution | null | undefined;
  lang: Lang;
}

export function RevenueContributionSlide({ data, lang }: Props) {
  const t = I18N[lang];
  const channels = data?.channels ?? [];
  const total = data?.total;
  const narrowSubtotal = data?.narrow_subtotal;

  // 饼图数据
  const pieData = channels
    .map((c) => ({
      name: c.channel,
      value: c.revenue_usd ?? 0,
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-display">{t.title}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
      </div>

      {/* 空态 */}
      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{t.noData}</p>
          <p className="text-xs text-[var(--text-muted)]">{t.noDataDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：饼图 */}
          {pieData.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                {t.chartTitle}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => formatRevenue(val)}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 右侧：详细表格 */}
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t.channel}</th>
                  <th className="slide-th slide-th-right">{t.payments}</th>
                  <th className="slide-th slide-th-right">{t.revShare}</th>
                  <th className="slide-th slide-th-right">{t.revenue}</th>
                  <th className="slide-th slide-th-right">{t.asp}</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => (
                  <tr key={c.channel} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td font-medium text-[var(--text-primary)]">{c.channel}</td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {c.payments != null ? c.payments.toLocaleString() : '—'}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {total?.revenue_usd && c.revenue_usd != null
                        ? formatRate(c.revenue_usd / total.revenue_usd)
                        : '—'}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                      {formatUSD(c.revenue_usd)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--color-accent)]">
                      {formatUSD(c.asp)}
                    </td>
                  </tr>
                ))}

                {/* 窄口小计行 */}
                {narrowSubtotal && (
                  <tr className="slide-tfoot-row border-t-2 border-[var(--border-default)]">
                    <td className="slide-td font-bold">{t.narrowSubtotal}</td>
                    <td className="slide-td text-right font-mono tabular-nums font-bold">
                      {narrowSubtotal.payments != null
                        ? narrowSubtotal.payments.toLocaleString()
                        : '—'}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {total?.revenue_usd && narrowSubtotal.revenue_usd != null
                        ? formatRate(narrowSubtotal.revenue_usd / total.revenue_usd)
                        : '—'}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums font-bold">
                      {formatUSD(narrowSubtotal.revenue_usd)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {formatUSD(narrowSubtotal.asp)}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* 合计行 */}
              {total && (
                <tfoot>
                  <tr className="slide-tfoot-row">
                    <td className="slide-td font-bold">{t.total}</td>
                    <td className="slide-td text-right font-mono tabular-nums font-bold">
                      {total.payments != null ? total.payments.toLocaleString() : '—'}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                      100%
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums font-bold text-[var(--color-accent)]">
                      {formatUSD(total.revenue_usd)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {formatUSD(total.asp)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
