'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLocale } from 'next-intl';

const I18N = {
  zh: {
    noData: '暂无对标数据',
    participation: '参与率',
    conversion: '转化率',
    checkin: '打卡率',
    reach: '触达率',
  },
  en: {
    noData: 'No benchmark data',
    participation: 'Participation',
    conversion: 'Conversion',
    checkin: 'Check-in',
    reach: 'Reach',
  },
  'zh-TW': {
    noData: '暫無對標數據',
    participation: '參與率',
    conversion: '轉化率',
    checkin: '打卡率',
    reach: '觸達率',
  },
  th: {
    noData: 'ไม่มีข้อมูลเปรียบเทียบ',
    participation: 'เข้าร่วม',
    conversion: 'แปลง',
    checkin: 'เช็คอิน',
    reach: 'เข้าถึง',
  },
} as const;
type Locale = keyof typeof I18N;

export interface BenchmarkRow {
  segment: string;
  participation: number;
  conversion: number;
  checkin: number;
  reach: number;
}

interface SegmentBenchmarkProps {
  data: BenchmarkRow[];
}

const METRIC_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7'] as const;
const METRIC_KEYS = ['participation', 'conversion', 'checkin', 'reach'] as const;

export function SegmentBenchmark({ data }: SegmentBenchmarkProps) {
  const locale = useLocale();
  const t = I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        {t.noData}
      </div>
    );
  }

  const METRICS = [
    { key: 'participation', label: t.participation, color: METRIC_COLORS[0] },
    { key: 'conversion', label: t.conversion, color: METRIC_COLORS[1] },
    { key: 'checkin', label: t.checkin, color: METRIC_COLORS[2] },
    { key: 'reach', label: t.reach, color: METRIC_COLORS[3] },
  ] as const;

  const chartData = data.map((row) => ({
    name: row.segment,
    [t.participation]: Math.round((row.participation ?? 0) * 100),
    [t.conversion]: Math.round((row.conversion ?? 0) * 100),
    [t.checkin]: Math.round((row.checkin ?? 0) * 100),
    [t.reach]: Math.round((row.reach ?? 0) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 16, bottom: 20, left: 0 }}
        barCategoryGap="25%"
        barGap={2}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          interval={0}
          angle={-20}
          textAnchor="end"
        />
        <YAxis unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} domain={[0, 100]} />
        <Tooltip
          formatter={(v: number) => [`${v}%`]}
          contentStyle={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md, 10px)',
            boxShadow: 'var(--shadow-medium)',
            fontSize: 12,
          }}
          cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
        />
        <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
        {METRICS.map(({ key, label, color }) => (
          <Bar
            key={key}
            dataKey={label}
            fill={color}
            radius={[4, 4, 0, 0]}
            animationDuration={600}
            animationEasing="ease-out"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
