'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
interface ScatterPoint {
  cc_name: string;
  x: number; // 带新系数
  y: number; // 付费金额 (USD)
}

interface EfficiencyScatterProps {
  data: ScatterPoint[];
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ScatterPoint;
  hoveredName?: string | null;
  onHover?: (name: string | null) => void;
}

function CustomDot({ cx = 0, cy = 0, payload, hoveredName, onHover }: CustomDotProps) {
  const isHovered = hoveredName === payload?.cc_name;
  const r = isHovered ? 10 : 6;
  const opacity = hoveredName && !isHovered ? 0.4 : 0.85;

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
        stroke={isHovered ? CHART_PALETTE.secondary : CHART_PALETTE.secondary}
        strokeWidth={isHovered ? 2 : 1}
        style={{ transition: 'r 0.15s ease, fill-opacity 0.15s ease' }}
      />
      {/* 仅 hover 时显示名字标签 */}
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
          {payload?.cc_name?.split('_')[0] ?? ''}
        </text>
      )}
    </g>
  );
}

export function EfficiencyScatter({ data }: EfficiencyScatterProps) {
  const [hoveredName, setHoveredName] = useState<string | null>(null);
    const t = useTranslations('EfficiencyScatter');

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-token">
        {t('noData')}
      </div>
    );
  }

  const xMid = data.reduce((s, d) => s + d.x, 0) / data.length;
  const yMid = data.reduce((s, d) => s + d.y, 0) / data.length;

  const quadrantLabels = [
    {
      x: xMid * 0.5,
      y: yMid * 1.5,
      text: t('quadrants.lowEff'),
      color: CHART_PALETTE.quadrant.lowEff,
    },
    { x: xMid * 1.5, y: yMid * 1.5, text: t('quadrants.star'), color: CHART_PALETTE.quadrant.star },
    {
      x: xMid * 0.5,
      y: yMid * 0.5,
      text: t('quadrants.inactive'),
      color: CHART_PALETTE.quadrant.inactive,
    },
    {
      x: xMid * 1.5,
      y: yMid * 0.5,
      text: t('quadrants.latent'),
      color: CHART_PALETTE.quadrant.latent,
    },
  ];

  return (
    <div>
      <div className="h-[280px] md:h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              type="number"
              dataKey="x"
              name={t('xAxis')}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            >
              <Label
                value={t('xAxis')}
                offset={-10}
                position="insideBottom"
                style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              name={t('paidAmt')}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            >
              <Label
                value={t('yAxis')}
                angle={-90}
                position="insideLeft"
                offset={15}
                style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              />
            </YAxis>
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as ScatterPoint;
                return (
                  <div className="bg-surface border border-default-token rounded p-2 text-xs shadow">
                    <div className="font-semibold">{d.cc_name}</div>
                    <div>
                      {t('newCoeff')}: {(d.x ?? 0).toFixed(2)}
                    </div>
                    <div>
                      {t('paidAmt')}: ${(d.y ?? 0).toLocaleString()}
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine x={xMid} stroke="var(--border-default)" strokeDasharray="4 2" />
            <ReferenceLine y={yMid} stroke="var(--border-default)" strokeDasharray="4 2" />
            <Scatter
              data={data}
              shape={(props: CustomDotProps) => (
                <CustomDot {...props} hoveredName={hoveredName} onHover={setHoveredName} />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* 象限标注图例 */}
      <div className="flex flex-wrap gap-3 mt-1 justify-center">
        {quadrantLabels.map((q) => (
          <div key={q.text} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: q.color }} />
            <span className="text-xs text-muted-token">{q.text}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-token mt-1">{t('hoverHint')}</p>
    </div>
  );
}
