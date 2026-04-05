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
import { useTranslations } from 'next-intl';
import type { ContactConversionItem } from '@/lib/types/cross-analysis';
import { CHART_PALETTE } from '@/lib/chart-palette';

type ScatterI18N = {
  contactRate: string;
  conversionRate: string;
  contactRateLabel: string;
  conversionRateLabel: string;
};
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
  const t = useTranslations('ContactConversionScatter');
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const chartData = data.map((d) => ({
    ...d,
    x: Math.round(d.contact_rate * 100),
    y: Math.round(d.conversion_rate * 100),
  }));

  return (
    <div className="h-[260px] md:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 24, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            name={t('contactRate')}
          >
            <Label
              value={t('contactRateLabel')}
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
            name={t('conversionRate')}
          >
            <Label
              value={t('conversionRateLabel')}
              angle={-90}
              position="insideLeft"
              style={{ fontSize: 11, fill: 'var(--text-muted)' }}
            />
          </YAxis>
          <Tooltip
            cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
            formatter={(v: number, name: string) => [`${v}%`, name]}
            contentStyle={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md, 10px)',
              boxShadow: 'var(--shadow-medium)',
              fontSize: '12px',
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
    </div>
  );
}
