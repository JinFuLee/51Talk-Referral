'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { FunnelStage } from '@/lib/types/funnel';
import { CHART_PALETTE } from '@/lib/chart-palette';

const I18N = {
  zh: { actual: '实际', target: '目标' },
  'zh-TW': { actual: '實際', target: '目標' },
  en: { actual: 'Actual', target: 'Target' },
  th: { actual: 'จริง', target: 'เป้าหมาย' },
} as const;

interface ConversionRateBarProps {
  stages: FunnelStage[];
  height?: number;
  locale?: string;
}

const RATE_PAIRS = [
  { key: '注册预约率', from: '注册', to: '预约' },
  { key: '预约出席率', from: '预约', to: '出席' },
  { key: '出席付费率', from: '出席', to: '付费' },
] as const;

function gapColor(gap: number | undefined) {
  if (gap === undefined) return CHART_PALETTE.axisTick;
  if (gap > 0) return CHART_PALETTE.success;
  if (gap < 0) return CHART_PALETTE.danger;
  return CHART_PALETTE.axisTick;
}

export function ConversionRateBar({ stages, height = 240, locale = 'zh' }: ConversionRateBarProps) {
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const stageMap = Object.fromEntries(stages.map((s) => [s.name, s]));

  const chartData = RATE_PAIRS.map(({ key, from, to }) => {
    const fromStage = stageMap[from];
    const toStage = stageMap[to];
    const actual =
      fromStage && toStage && fromStage.actual > 0
        ? Number(((toStage.actual / fromStage.actual) * 100).toFixed(1))
        : 0;
    // Use target_rate from the destination stage if available
    const target =
      toStage?.target_rate != null ? Number((toStage.target_rate * 100).toFixed(1)) : null;
    const gap = target != null ? actual - target : undefined;
    return { name: key, actual, target, gap };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
          domain={[0, 'auto']}
        />
        <Tooltip
          formatter={(v: number, name: string) => [
            `${v}%`,
            name === 'actual' ? t.actual : t.target,
          ]}
          contentStyle={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md, 10px)',
            boxShadow: 'var(--shadow-medium)',
            fontSize: '12px',
          }}
          cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
        />
        <Bar
          dataKey="actual"
          name="actual"
          radius={[4, 4, 0, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={gapColor(entry.gap)} />
          ))}
        </Bar>
        {/* Target markers as reference lines per category would need custom shape;
            instead render target as a second bar with low opacity */}
        <Bar
          dataKey="target"
          name="target"
          radius={[4, 4, 0, 0]}
          fill={CHART_PALETTE.info}
          opacity={0.25}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
