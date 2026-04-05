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
import { useTranslations } from 'next-intl';
import { CHART_PALETTE } from '@/lib/chart-palette';

type RoleCompareI18N = { todayRate: string };
interface RoleCompareProps {
  ccRate: number;
  ssRate: number;
  lpRate: number;
}

export function RoleCompare({ ccRate, ssRate, lpRate }: RoleCompareProps) {
  const t = useTranslations('RoleCompare');

  const data = [
    {
      name: t('todayRate'),
      CC: Math.round(ccRate * 100),
      SS: Math.round(ssRate * 100),
      LP: Math.round(lpRate * 100),
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          domain={[0, 100]}
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
          fill={CHART_PALETTE.series[0]}
          name="CC"
          radius={[4, 4, 0, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="SS"
          fill={CHART_PALETTE.series[1]}
          name="SS"
          radius={[4, 4, 0, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="LP"
          fill={CHART_PALETTE.series[2]}
          name="LP"
          radius={[4, 4, 0, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
