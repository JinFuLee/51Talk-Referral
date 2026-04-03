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
import { CHART_PALETTE } from '@/lib/chart-palette';
import { formatRate } from '@/lib/utils';
import { useLocale } from 'next-intl';

const I18N = {
  zh: {
    title: '5 维战力图',
    close: '关闭',
    labels: {
      participation: '参与率',
      conversion: '转化率',
      checkin: '打卡率',
      reach: '触达率',
      cargo_ratio: '带货比',
    },
  },
  en: {
    title: '5-Dim Radar',
    close: 'Close',
    labels: {
      participation: 'Participation',
      conversion: 'Conversion',
      checkin: 'Check-in',
      reach: 'Reach',
      cargo_ratio: 'Cargo Ratio',
    },
  },
  'zh-TW': {
    title: '5 維戰力圖',
    close: '關閉',
    labels: {
      participation: '參與率',
      conversion: '轉化率',
      checkin: '打卡率',
      reach: '觸達率',
      cargo_ratio: '帶貨比',
    },
  },
  th: {
    title: 'กราฟ 5 มิติ',
    close: 'ปิด',
    labels: {
      participation: 'อัตราเข้าร่วม',
      conversion: 'อัตราแปลง',
      checkin: 'อัตราเช็คอิน',
      reach: 'อัตราเข้าถึง',
      cargo_ratio: 'อัตราสินค้า',
    },
  },
} as const;
type Locale = keyof typeof I18N;

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
  const locale = useLocale();
  const t = I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];

  const LABELS: { key: keyof Omit<CCRadarData, 'cc_name'>; label: string }[] = [
    { key: 'participation', label: t.labels.participation },
    { key: 'conversion', label: t.labels.conversion },
    { key: 'checkin', label: t.labels.checkin },
    { key: 'reach', label: t.labels.reach },
    { key: 'cargo_ratio', label: t.labels.cargo_ratio },
  ];

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
            {data.cc_name} — {t.title}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none transition-colors"
            aria-label={t.close}
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
              <div className="text-xs text-[var(--text-muted)]">{label}</div>
              <div className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                {formatRate(data[key] ?? 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
