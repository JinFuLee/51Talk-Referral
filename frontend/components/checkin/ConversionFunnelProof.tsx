'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { ConversionFunnelItem } from '@/lib/types/checkin-student';

interface ConversionFunnelProofProps {
  /** 打卡频段×转化漏斗交叉数据，4 段（0次/1-2次/3-4次/5-6次） */
  data: ConversionFunnelItem[];
}

/** 自定义 Tooltip */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload as ConversionFunnelItem | undefined;
  if (!item) return null;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mb-1">
        频段：{label}
      </p>
      <p className="text-[var(--text-secondary)]">
        有推荐注册率：
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {((item.has_registration_pct ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        有推荐付费率：
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {((item.has_payment_pct ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-1 mt-1">
        人均注册 {(item.avg_registrations ?? 0).toFixed(2)} | 人均付费{' '}
        {(item.avg_payments ?? 0).toFixed(2)}
      </p>
      <p className="text-[var(--text-muted)]">
        该频段学员数：{(item.students ?? 0).toLocaleString()}
      </p>
    </div>
  );
}

/**
 * 三级转化漏斗证明图
 *
 * 用分组柱图展示不同打卡频段学员的推荐转化率差异，
 * 证明"打卡越多 → 推荐率越高"的正相关关系。
 * 顶部 callout banner 显示倍率差异（5-6次 vs 0次）。
 *
 * 使用示例：
 *   <ConversionFunnelProof data={analysis.conversion_funnel} />
 */
export function ConversionFunnelProof({ data }: ConversionFunnelProofProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        暂无转化漏斗数据
      </div>
    );
  }

  // 计算倍率：最高频段 vs 0 次频段
  const highFreqItem = data[data.length - 1];
  const zeroItem = data.find((d) => d.band === '0次') ?? data[0];
  const multiplier =
    zeroItem && zeroItem.has_registration_pct > 0 && highFreqItem
      ? highFreqItem.has_registration_pct / zeroItem.has_registration_pct
      : null;

  const chartData = data.map((item) => ({
    ...item,
    reg_pct_display: parseFloat(((item.has_registration_pct ?? 0) * 100).toFixed(1)),
    pay_pct_display: parseFloat(((item.has_payment_pct ?? 0) * 100).toFixed(1)),
  }));

  return (
    <div className="space-y-3">
      {/* Callout Banner */}
      {multiplier !== null && multiplier > 1.5 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <span className="text-base" aria-hidden="true">
            💡
          </span>
          <span>
            <strong>{highFreqItem.band}</strong> 打卡学员推荐注册率是零打卡的{' '}
            <strong className="font-mono tabular-nums text-emerald-800">
              {multiplier.toFixed(1)}x
            </strong>{' '}
            — 打卡频次是推荐转化的强预测因子
          </span>
        </div>
      )}

      {/* 分组柱图 */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          barCategoryGap="25%"
          barGap={2}
        >
          <XAxis
            dataKey="band"
            tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
            axisLine={{ stroke: CHART_PALETTE.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_PALETTE.axisTick }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            verticalAlign="bottom"
            height={28}
            wrapperStyle={{ fontSize: 11, color: CHART_PALETTE.axisLabel }}
          />
          <Bar
            dataKey="reg_pct_display"
            name="有推荐注册率 %"
            fill={CHART_PALETTE.c2}
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="pay_pct_display"
            name="有推荐付费率 %"
            fill={CHART_PALETTE.c4}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
