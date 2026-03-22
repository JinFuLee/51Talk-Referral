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

const METRICS = [
  { key: 'participation', label: '参与率', color: '#3b82f6' },
  { key: 'conversion', label: '转化率', color: '#22c55e' },
  { key: 'checkin', label: '打卡率', color: '#f59e0b' },
  { key: 'reach', label: '触达率', color: '#a855f7' },
] as const;

export function SegmentBenchmark({ data }: SegmentBenchmarkProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        暂无对标数据
      </div>
    );
  }

  const chartData = data.map((row) => ({
    name: row.segment,
    参与率: Math.round(row.participation * 100),
    转化率: Math.round(row.conversion * 100),
    打卡率: Math.round(row.checkin * 100),
    触达率: Math.round(row.reach * 100),
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
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {METRICS.map(({ key, label, color }) => (
          <Bar key={key} dataKey={label} fill={color} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
