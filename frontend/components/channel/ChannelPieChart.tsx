'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatRevenue, formatRate } from '@/lib/utils';
import { CHART_PALETTE } from '@/lib/chart-palette';

const I18N = {
  zh: { empty: '暂无渠道数据', revenue: '业绩' },
  'zh-TW': { empty: '暫無渠道資料', revenue: '業績' },
  en: { empty: 'No channel data', revenue: 'Revenue' },
  th: { empty: 'ไม่มีข้อมูลช่องทาง', revenue: 'รายได้' },
} as const;

interface ChannelPieEntry {
  channel: string;
  revenue_usd: number;
}

interface ChannelPieChartProps {
  channels: ChannelPieEntry[];
  height?: number;
  locale?: string;
}

const CHANNEL_COLORS = CHART_PALETTE.series;

export function ChannelPieChart({ channels, height = 320, locale = 'zh' }: ChannelPieChartProps) {
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  if (channels.length === 0) {
    return <p className="text-sm text-muted-token text-center py-6">{t.empty}</p>;
  }

  const pieData = channels.map((c) => ({
    name: c.channel,
    value: c.revenue_usd,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="45%"
          outerRadius={90}
          innerRadius={50}
          dataKey="value"
          label={({ name, percent, x, y, textAnchor }) => (
            <text
              x={x}
              y={y}
              textAnchor={textAnchor}
              fill="var(--text-secondary)"
              fontSize={11}
              fontWeight={500}
            >
              {`${name} ${formatRate(percent, 0)}`}
            </text>
          )}
          labelLine={{ stroke: 'var(--border-hover)', strokeWidth: 1 }}
          animationDuration={600}
          animationEasing="ease-out"
        >
          {pieData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val: number) => [formatRevenue(val), t.revenue]}
          contentStyle={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md, 10px)',
            boxShadow: 'var(--shadow-medium)',
            fontSize: '12px',
          }}
          cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
