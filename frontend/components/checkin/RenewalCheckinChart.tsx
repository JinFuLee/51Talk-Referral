'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { RenewalCorrelation } from '@/lib/types/checkin-student';

interface RenewalCheckinChartProps {
  /** 续费×打卡关联数据 */
  data: RenewalCorrelation;
}

interface ChartRow {
  band: string;
  avg_renewals: number;
  has_renewal_pct: number;
  renewal_pct_display: number;
  students: number;
}

/** 自定义 Tooltip */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mb-1">
        打卡频段：{label}
      </p>
      <p className="text-[var(--text-secondary)]">
        有续费学员比例：
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {(row.has_renewal_pct * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        人均续费订单数：
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {(row.avg_renewals ?? 0).toFixed(2)}
        </span>
      </p>
      <p className="text-[var(--text-muted)]">
        该频段学员数：{(row.students ?? 0).toLocaleString()}
      </p>
    </div>
  );
}

/**
 * 续费×打卡关联图
 *
 * 用分组柱图展示不同打卡频段的续费关联指标：
 * - 人均续费订单数（左轴，金黄色）
 * - 有续费学员比例 %（右轴逻辑，实为同轴展示，绿色）
 *
 * 使用示例：
 *   <RenewalCheckinChart data={analysis.renewal_checkin_correlation} />
 */
export function RenewalCheckinChart({ data }: RenewalCheckinChartProps) {
  if (!data?.by_band || data.by_band.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        暂无续费关联数据
      </div>
    );
  }

  const chartData: ChartRow[] = data.by_band.map((item) => ({
    band: item.band,
    avg_renewals: item.avg_renewals,
    has_renewal_pct: item.has_renewal_pct,
    renewal_pct_display: parseFloat((item.has_renewal_pct * 100).toFixed(1)),
    students: item.students,
  }));

  // 所有数据都为 0 时提示（数据源可能无续费字段）
  const hasData = chartData.some((r) => r.avg_renewals > 0 || r.has_renewal_pct > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        暂无续费数据（需要&ldquo;总续费订单数&rdquo;字段）
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
        barCategoryGap="25%"
        barGap={2}
      >
        <XAxis
          dataKey="band"
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
          axisLine={{ stroke: CHART_PALETTE.border }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisTick }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend
          verticalAlign="bottom"
          height={28}
          wrapperStyle={{ fontSize: 11, color: CHART_PALETTE.axisLabel }}
        />
        <Bar
          dataKey="avg_renewals"
          name="人均续费订单数"
          fill={CHART_PALETTE.c1}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="renewal_pct_display"
          name="有续费比例 %"
          fill={CHART_PALETTE.c4}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
