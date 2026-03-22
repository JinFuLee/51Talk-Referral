'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import type { ContactConversionItem } from '@/lib/types/cross-analysis';

interface ContactConversionScatterProps {
  data: ContactConversionItem[];
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ContactConversionItem;
}

function CustomDot({ cx = 0, cy = 0, payload }: CustomDotProps) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#3b82f6"
        fillOpacity={0.7}
        stroke="#2563eb"
        strokeWidth={1}
      />
      <text
        x={cx + 9}
        y={cy + 4}
        fontSize={10}
        fill="var(--text-secondary)"
        style={{ userSelect: 'none' }}
      >
        {payload?.cc_name ?? ''}
      </text>
    </g>
  );
}

export function ContactConversionScatter({ data }: ContactConversionScatterProps) {
  const chartData = data.map((d) => ({
    ...d,
    x: Math.round(d.contact_rate * 100),
    y: Math.round(d.conversion_rate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 12, right: 24, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          name="触达率"
        >
          <Label
            value="触达率 (%)"
            offset={-8}
            position="insideBottom"
            style={{ fontSize: 11, fill: 'var(--text-muted)' }}
          />
        </XAxis>
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          width={36}
          name="转化率"
        >
          <Label
            value="转化率 (%)"
            angle={-90}
            position="insideLeft"
            style={{ fontSize: 11, fill: 'var(--text-muted)' }}
          />
        </YAxis>
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(v: number, name: string) => [`${v}%`, name]}
          contentStyle={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Scatter data={chartData} shape={(props: CustomDotProps) => <CustomDot {...props} />} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
