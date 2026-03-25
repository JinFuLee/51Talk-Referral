'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatRevenue, formatRate } from '@/lib/utils';
import { CHART_PALETTE } from '@/lib/chart-palette';

interface ChannelPieEntry {
  channel: string;
  revenue_usd: number;
}

interface ChannelPieChartProps {
  channels: ChannelPieEntry[];
  height?: number;
}

const CHANNEL_COLORS = CHART_PALETTE.series;

export function ChannelPieChart({ channels, height = 320 }: ChannelPieChartProps) {
  if (channels.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-6">暂无渠道数据</p>;
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
          formatter={(val: number) => [formatRevenue(val), '业绩']}
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
