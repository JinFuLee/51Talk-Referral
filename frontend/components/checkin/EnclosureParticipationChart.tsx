'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { fmtEnc } from '@/lib/utils';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { EnclosureDistItem } from '@/lib/types/checkin-student';

interface EnclosureChartRow {
  label: string;
  participation_pct: number;
  avg_days: number;
  total: number;
}

function EnclosureTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as EnclosureChartRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mb-1">
        围场：{label}
      </p>
      <p className="text-[var(--text-secondary)]">
        参与率：
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {row.participation_pct.toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        人均打卡：
        <span className="font-mono tabular-nums ml-1">{row.avg_days.toFixed(2)} 天</span>
      </p>
      <p className="text-[var(--text-muted)]">该围场学员数：{row.total.toLocaleString()}</p>
    </div>
  );
}

export function EnclosureParticipationChart({ data }: { data: EnclosureDistItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-[var(--text-muted)]">
        暂无围场分布数据
      </div>
    );
  }

  const chartData: EnclosureChartRow[] = data.map((item) => ({
    label: fmtEnc(item.enclosure),
    participation_pct: parseFloat((item.participation_rate * 100).toFixed(1)),
    avg_days: item.avg_days,
    total: item.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        barCategoryGap="30%"
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisTick }}
          axisLine={{ stroke: CHART_PALETTE.border }}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<EnclosureTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="participation_pct" radius={[0, 4, 4, 0]}>
          {chartData.map((row, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                row.participation_pct >= 50
                  ? CHART_PALETTE.success
                  : row.participation_pct >= 30
                    ? CHART_PALETTE.warning
                    : CHART_PALETTE.danger
              }
            />
          ))}
          <LabelList
            dataKey="participation_pct"
            position="right"
            style={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
            formatter={(v: number) => `${v}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
