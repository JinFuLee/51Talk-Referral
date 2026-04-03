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
} from 'recharts';
import { useLocale } from 'next-intl';
import type { CCContactRankItem } from '@/lib/types/cross-analysis';
import { CHART_PALETTE } from '@/lib/chart-palette';

const I18N = {
  zh: { contactRate: '触达率', callCount: '接通次数' },
  en: { contactRate: 'Contact Rate', callCount: 'Call Count' },
} as const;

interface CCContactRankingProps {
  data: CCContactRankItem[];
}

const COLORS = CHART_PALETTE.series;

export function CCContactRanking({ data }: CCContactRankingProps) {
  const locale = useLocale();
  const t = I18N[locale === 'en' ? 'en' : 'zh'];

  const sorted = [...data].sort((a, b) => b.contact_rate - a.contact_rate);
  const chartData = sorted.map((d) => ({
    name: d.cc_name,
    [t.contactRate]: Math.round(d.contact_rate * 100),
    [t.callCount]: d.contact_count,
    students: d.students,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          domain={[0, 100]}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          width={64}
        />
        <Tooltip
          formatter={(v: number, name: string) => (name === t.contactRate ? `${v}%` : v)}
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
          dataKey={t.contactRate}
          radius={[0, 4, 4, 0]}
          animationDuration={600}
          animationEasing="ease-out"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
