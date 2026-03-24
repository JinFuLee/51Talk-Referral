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
import { CHART_PALETTE } from '@/lib/chart-palette';

interface RoleCompareProps {
  ccRate: number;
  ssRate: number;
  lpRate: number;
}

export function RoleCompare({ ccRate, ssRate, lpRate }: RoleCompareProps) {
  const data = [
    {
      name: '今日触达率',
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
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="CC" fill={CHART_PALETTE.series[0]} name="CC" radius={[4, 4, 0, 0]} />
        <Bar dataKey="SS" fill={CHART_PALETTE.series[1]} name="SS" radius={[4, 4, 0, 0]} />
        <Bar dataKey="LP" fill={CHART_PALETTE.series[2]} name="LP" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
