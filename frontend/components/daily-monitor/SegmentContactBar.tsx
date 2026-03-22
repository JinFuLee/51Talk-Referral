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
import type { SegmentContactItem } from '@/lib/types/cross-analysis';

interface SegmentContactBarProps {
  data: SegmentContactItem[];
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function SegmentContactBar({ data }: SegmentContactBarProps) {
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
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="CC" stackId="a" fill="#3b82f6" name="CC 触达率" />
        <Bar dataKey="SS" stackId="a" fill="#8b5cf6" name="SS 触达率" />
        <Bar dataKey="LP" stackId="a" fill="#f59e0b" name="LP 触达率" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
