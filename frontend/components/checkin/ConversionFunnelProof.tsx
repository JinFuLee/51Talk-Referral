'use client';

import { useTranslations } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { ConversionFunnelItem } from '@/lib/types/checkin-student';
interface ConversionFunnelProofProps {
  /** 打卡频段×转化漏斗交叉数据，4 段（0次/1-2次/3-4次/5-6次） */
  data: ConversionFunnelItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CustomTooltipProps extends TooltipProps<number, string> {
  labels: Record<string, any>;
}

/** 自定义 Tooltip */
function CustomTooltip({ active, payload, label, labels }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload as ConversionFunnelItem | undefined;
  if (!item) return null;

  return (
    <div className="bg-white border border-default-token rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-primary-token border-b border-subtle-token pb-1 mb-1">
        {labels.freqBand}
        {label}
      </p>
      <p className="text-secondary-token">
        {labels.regRate}
        <span className="font-mono tabular-nums font-semibold text-primary-token ml-1">
          {((item.has_registration_pct ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-secondary-token">
        {labels.payRate}
        <span className="font-mono tabular-nums font-semibold text-primary-token ml-1">
          {((item.has_payment_pct ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-muted-token border-t border-subtle-token pt-1 mt-1">
        {labels.avgStats(
          (item.avg_registrations ?? 0).toFixed(2),
          (item.avg_payments ?? 0).toFixed(2)
        )}
      </p>
      <p className="text-muted-token">
        {labels.studentCount((item.students ?? 0).toLocaleString())}
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
 * <ConversionFunnelProof data={analysis.conversion_funnel} />
 */
export function ConversionFunnelProof({ data }: ConversionFunnelProofProps) {
  const t = useTranslations('ConversionFunnelProof');

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-token">
        {t('noData')}
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success-surface border border-success-token text-xs text-success-token">
          <span className="text-base" aria-hidden="true">
            💡
          </span>
          <span
            dangerouslySetInnerHTML={{
              __html: t('calloutText', { band: `<strong>${highFreqItem.band}</strong>`,
                mult: `<strong class="font-mono tabular-nums text-success-token">${multiplier.toFixed(1)}</strong>`
              }),
            }}
          />
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
          <Tooltip
            content={(props: TooltipProps<number, string>) => (
              <CustomTooltip {...props} labels={t as Record<string, any>} />
            )}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            wrapperStyle={{ fontSize: 11, color: CHART_PALETTE.axisLabel }}
          />
          <Bar
            dataKey="reg_pct_display"
            name={t('regBarName')}
            fill={CHART_PALETTE.c2}
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="pay_pct_display"
            name={t('payBarName')}
            fill={CHART_PALETTE.c4}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
