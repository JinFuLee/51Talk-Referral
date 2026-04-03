'use client';

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
import { useLocale } from 'next-intl';
import type { SegmentContactItem } from '@/lib/types/cross-analysis';
import { CHART_PALETTE } from '@/lib/chart-palette';

type SegmentBarI18N = { ccRate: string; ssRate: string; lpRate: string };
const I18N: Record<string, SegmentBarI18N> = {
  zh: { ccRate: 'CC 触达率', ssRate: 'SS 触达率', lpRate: 'LP 触达率' },
  'zh-TW': { ccRate: 'CC 觸達率', ssRate: 'SS 觸達率', lpRate: 'LP 觸達率' },
  en: { ccRate: 'CC Contact Rate', ssRate: 'SS Contact Rate', lpRate: 'LP Contact Rate' },
  th: { ccRate: 'อัตราการติดต่อ CC', ssRate: 'อัตราการติดต่อ SS', lpRate: 'อัตราการติดต่อ LP' },
};

interface SegmentContactBarProps {
  data: SegmentContactItem[];
}

export function SegmentContactBar({ data }: SegmentContactBarProps) {
  const locale = useLocale();
  const t: SegmentBarI18N = I18N[locale] ?? I18N['zh'];

  const chartData = data.map((d) => ({
    name: d.segment,
    CC: Math.round(d.cc_rate * 100),
    SS: Math.round(d.ss_rate * 100),
    LP: Math.round(d.lp_rate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          width={36}
        />
        <Tooltip
          formatter={(v: number) => `${v}%`}
          contentStyle={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md, 10px)',
            boxShadow: 'var(--shadow-medium)',
            fontSize: '12px',
          }}
          cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
        />
        <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
        <Bar
          dataKey="CC"
          stackId="a"
          fill={CHART_PALETTE.series[0]}
          name={t.ccRate}
          animationDuration={600}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="SS"
          stackId="a"
          fill={CHART_PALETTE.series[1]}
          name={t.ssRate}
          animationDuration={600}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="LP"
          stackId="a"
          fill={CHART_PALETTE.series[2]}
          name={t.lpRate}
          radius={[4, 4, 0, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
