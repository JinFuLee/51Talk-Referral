'use client';

import { useState } from 'react';
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
import { CHART_PALETTE } from '@/lib/chart-palette';

interface ContactConversionScatterProps {
  data: ContactConversionItem[];
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ContactConversionItem & { x: number; y: number };
  hoveredName?: string | null;
  onHover?: (name: string | null) => void;
}

function CustomDot({ cx = 0, cy = 0, payload, hoveredName, onHover }: CustomDotProps) {
  const isHovered = hoveredName === payload?.cc_name;
  const r = isHovered ? 10 : 6;
  const opacity = hoveredName && !isHovered ? 0.4 : 0.8;

  return (
    <g
      onMouseEnter={() => onHover?.(payload?.cc_name ?? null)}
      onMouseLeave={() => onHover?.(null)}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={CHART_PALETTE.info}
        fillOpacity={opacity}
        stroke={CHART_PALETTE.secondary}
        strokeWidth={isHovered ? 2 : 1}
        style={{ transition: 'r 0.15s ease, fill-opacity 0.15s ease' }}
      />
      {isHovered && (
        <text
          x={cx + 13}
          y={cy + 4}
          fontSize={10}
          fill="var(--text-primary)"
          fontWeight="600"
          textAnchor="start"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {payload?.cc_name ?? ''}
        </text>
      )}
    </g>
  );
}

export function ContactConversionScatter({ data }: ContactConversionScatterProps) {
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const chartData = data.map((d) => ({
    ...d,
    x: Math.round(d.contact_rate * 100),
    y: Math.round(d.conversion_rate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
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
        <Scatter
          data={chartData}
          shape={(props: CustomDotProps) => (
            <CustomDot {...props} hoveredName={hoveredName} onHover={setHoveredName} />
          )}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
