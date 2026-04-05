'use client';

import { useTranslations } from 'next-intl';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import { formatRate } from '@/lib/utils';
export interface CCRadarData {
  cc_name: string;
  participation: number;
  conversion: number;
  checkin: number;
  reach: number;
  cargo_ratio: number;
}

interface CCRadarChartProps {
  data: CCRadarData;
  onClose?: () => void;
}

export function CCRadarChart({ data, onClose }: CCRadarChartProps) {
    const t = useTranslations('CCRadarChart');

  const LABELS: { key: keyof Omit<CCRadarData, 'cc_name'>; label: string }[] = [
    { key: 'participation', label: t('labels.participation') },
    { key: 'conversion', label: t('labels.conversion') },
    { key: 'checkin', label: t('labels.checkin') },
    { key: 'reach', label: t('labels.reach') },
    { key: 'cargo_ratio', label: t('labels.cargo_ratio') },
  ];

  const chartData = LABELS.map(({ key, label }) => ({
    subject: label,
    value: Math.round((data[key] ?? 0) * 100),
    fullMark: 100,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface border border-default-token rounded-xl shadow-2xl p-5 w-[360px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-primary-token">
            {data.cc_name} — {t('title')}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-token hover:text-primary-token text-lg leading-none transition-colors"
            aria-label={t('close')}
          >
            ×
          </button>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="var(--border-subtle)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              tickCount={4}
            />
            <Radar
              name={data.cc_name}
              dataKey="value"
              stroke={CHART_PALETTE.info}
              fill={CHART_PALETTE.info}
              fillOpacity={0.3}
            />
            <Tooltip
              formatter={(v: number) => [`${v}%`, '']}
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--shadow-medium)',
                fontSize: '12px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-1 mt-2">
          {LABELS.map(({ key, label }) => (
            <div key={key} className="text-center">
              <div className="text-xs text-muted-token">{label}</div>
              <div className="text-sm font-semibold font-mono text-primary-token">
                {formatRate(data[key] ?? 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
