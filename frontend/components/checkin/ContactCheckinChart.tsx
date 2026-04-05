'use client';

import { useTranslations } from 'next-intl';
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
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { ContactCheckinResponse } from '@/lib/types/checkin-student';
interface ContactCheckinChartProps {
  /** CC 触达×打卡响应数据 */
  data: ContactCheckinResponse;
}

interface ChartRow {
  label: string;
  students: number;
  avg_days: number;
  participation_rate: number;
  rate_pct: number;
  color: string;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  labels: Record<string, string> | ((key: string) => string);
}

/** 自定义 Tooltip */
function CustomTooltip({ active, payload, label, labels }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  const l = (key: string) => typeof labels === 'function' ? labels(key) : labels[key];

  return (
    <div className="bg-white border border-default-token rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-primary-token border-b border-subtle-token pb-1 mb-1">
        {label}
      </p>
      <p className="text-secondary-token">
        {l('participated')}
        <span className="font-mono tabular-nums font-semibold text-primary-token ml-1">
          {((row.participation_rate ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-secondary-token">
        {l('students')}
        <span className="font-mono tabular-nums ml-1">{(row.students ?? 0).toLocaleString()}</span>
      </p>
      <p className="text-secondary-token">
        {l('avgDays')}
        <span className="font-mono tabular-nums ml-1">
          {(row.avg_days ?? 0).toFixed(2)}
          {l('avgDaysSuffix')}
        </span>
      </p>
    </div>
  );
}

// 颜色根据参与率语义化
function rateColor(rate: number): string {
  if (rate >= 0.5) return CHART_PALETTE.success;
  if (rate >= 0.3) return CHART_PALETTE.warning;
  return CHART_PALETTE.danger;
}

/**
 * CC 触达×打卡响应图
 *
 * 水平柱图展示 4 个联系频次分组（近7天/近14天/14天+/从未）的打卡参与率，
 * 帮助 CC 了解联系频率与学员打卡行为的关联。
 * 柱色根据参与率（≥50% 绿 / 30-50% 橙 / <30% 红）语义化着色。
 *
 * 使用示例：
 * <ContactCheckinChart data={analysis.contact_checkin_response} />
 */
export function ContactCheckinChart({ data }: ContactCheckinChartProps) {
  const t = useTranslations('ContactCheckinChart');

  const rows: ChartRow[] = [
    {
      label: t('contacted7d'),
      students: data.contacted_7d.students,
      avg_days: data.contacted_7d.avg_days,
      participation_rate: data.contacted_7d.participation_rate,
      rate_pct: parseFloat(((data.contacted_7d.participation_rate ?? 0) * 100).toFixed(1)),
      color: rateColor(data.contacted_7d.participation_rate ?? 0),
    },
    {
      label: t('contacted14d'),
      students: data.contacted_14d.students,
      avg_days: data.contacted_14d.avg_days,
      participation_rate: data.contacted_14d.participation_rate,
      rate_pct: parseFloat(((data.contacted_14d.participation_rate ?? 0) * 100).toFixed(1)),
      color: rateColor(data.contacted_14d.participation_rate ?? 0),
    },
    {
      label: t('contacted14dPlus'),
      students: data.contacted_14d_plus.students,
      avg_days: data.contacted_14d_plus.avg_days,
      participation_rate: data.contacted_14d_plus.participation_rate,
      rate_pct: parseFloat(((data.contacted_14d_plus.participation_rate ?? 0) * 100).toFixed(1)),
      color: rateColor(data.contacted_14d_plus.participation_rate ?? 0),
    },
    {
      label: t('neverContacted'),
      students: data.never_contacted.students,
      avg_days: data.never_contacted.avg_days,
      participation_rate: data.never_contacted.participation_rate,
      rate_pct: parseFloat(((data.never_contacted.participation_rate ?? 0) * 100).toFixed(1)),
      color: rateColor(data.never_contacted.participation_rate),
    },
  ];

  // 过滤掉学员数为 0 的分组（数据不完整时）
  const visibleRows = rows.filter((r) => r.students > 0);

  if (visibleRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-token">
        {t('noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={visibleRows}
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
          width={120}
        />
        <Tooltip
          content={(props: TooltipProps<number, string>) => (
            <CustomTooltip {...props} labels={((key: string) => t(key)) as (key: string) => string} />
          )}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="rate_pct" radius={[0, 4, 4, 0]}>
          {visibleRows.map((row, index) => (
            <Cell key={`cell-${index}`} fill={row.color} />
          ))}
          <LabelList
            dataKey="rate_pct"
            position="right"
            style={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
            formatter={(v: number) => `${v}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
