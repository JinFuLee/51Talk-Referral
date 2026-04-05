'use client';

import { useLocale } from 'next-intl';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { EnclosureCCMetrics } from '@/lib/types/enclosure';
import { CHART_PALETTE } from '@/lib/chart-palette';

const I18N = {
  zh: {
    title: '指标雷达图',
    participationRate: '参与率',
    newCoefficient: '带新系数',
    cargoRatio: '带货比',
    checkinRate: '打卡率',
    reachRate: '触达率',
  },
  'zh-TW': {
    title: '指標雷達圖',
    participationRate: '參與率',
    newCoefficient: '帶新係數',
    cargoRatio: '帶貨比',
    checkinRate: '打卡率',
    reachRate: '觸達率',
  },
  en: {
    title: 'Metric Radar',
    participationRate: 'Participation',
    newCoefficient: 'New Coeff.',
    cargoRatio: 'Referral Ratio',
    checkinRate: 'Check-in Rate',
    reachRate: 'Reach Rate',
  },
  th: {
    title: 'แผนภูมิเรดาร์ตัวชี้วัด',
    participationRate: 'การมีส่วนร่วม',
    newCoefficient: 'สัมประสิทธิ์ใหม่',
    cargoRatio: 'อัตราการแนะนำ',
    checkinRate: 'อัตราเช็คอิน',
    reachRate: 'อัตราการเข้าถึง',
  },
} as const;

interface MetricRadarProps {
  metrics: EnclosureCCMetrics;
}

export function MetricRadar({ metrics }: MetricRadarProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  const data = [
    {
      subject: t.participationRate,
      value: Math.round(metrics.participation_rate * 100),
      fullMark: 100,
    },
    {
      subject: t.newCoefficient,
      value: Math.min(Math.round(metrics.new_coefficient * 50), 100),
      fullMark: 100,
    },
    { subject: t.cargoRatio, value: Math.round(metrics.cargo_ratio * 100), fullMark: 100 },
    { subject: t.checkinRate, value: Math.round(metrics.checkin_rate * 100), fullMark: 100 },
    { subject: t.reachRate, value: Math.round(metrics.cc_reach_rate * 100), fullMark: 100 },
  ];

  return (
    <div className="w-full">
      <p className="text-xs text-muted-token mb-2 text-center">
        {metrics.cc_name} — {t.title}
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data}>
          <PolarGrid stroke={CHART_PALETTE.border} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: CHART_PALETTE.axisTick }}
            tickCount={4}
          />
          <Radar
            name={metrics.cc_name}
            dataKey="value"
            stroke={CHART_PALETTE.info}
            fill={CHART_PALETTE.info}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            contentStyle={{ fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
