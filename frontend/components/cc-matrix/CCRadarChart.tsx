'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

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

const LABELS: { key: keyof Omit<CCRadarData, 'cc_name'>; label: string }[] = [
  { key: 'participation', label: '参与率' },
  { key: 'conversion', label: '转化率' },
  { key: 'checkin', label: '打卡率' },
  { key: 'reach', label: '触达率' },
  { key: 'cargo_ratio', label: '带货比' },
];

export function CCRadarChart({ data, onClose }: CCRadarChartProps) {
  const chartData = LABELS.map(({ key, label }) => ({
    subject: label,
    value: Math.round((data[key] ?? 0) * 100),
    fullMark: 100,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-2xl p-5 w-[360px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {data.cc_name} — 5 维战力图
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none transition-colors"
            aria-label="关闭"
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
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
            />
            <Tooltip
              formatter={(v: number) => [`${v}%`, '']}
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-1 mt-2">
          {LABELS.map(({ key, label }) => (
            <div key={key} className="text-center">
              <div className="text-xs text-[var(--text-muted)]">{label}</div>
              <div className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                {((data[key] ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
