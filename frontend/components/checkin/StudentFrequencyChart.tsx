'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useLocale } from 'next-intl';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { FrequencyItem } from '@/lib/types/checkin-student';

const I18N = {
  zh: {
    zeroCheckin: '零打卡',
    thisMonthN: (n: number) => `本月 ${n} 次`,
    students: '学员人数：',
    pct: '占比：',
    noData: '暂无频次数据',
    countSuffix: '次',
  },
  en: {
    zeroCheckin: 'No Check-ins',
    thisMonthN: (n: number) => `${n}× This Month`,
    students: 'Students: ',
    pct: 'Share: ',
    noData: 'No frequency data',
    countSuffix: 'x',
  },
} as const;

interface StudentFrequencyChartProps {
  /** 0-6 次频次分布数组，共 7 项 */
  data: FrequencyItem[];
}

type TStrings = (typeof I18N)[keyof typeof I18N];

/** 自定义 Tooltip */
function CustomTooltip({ active, payload, t }: TooltipProps<number, string> & { t: TStrings }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload as FrequencyItem;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-0.5">
        {item.count === 0 ? t.zeroCheckin : t.thisMonthN(item.count)}
      </p>
      <p className="text-[var(--text-secondary)]">
        {t.students}
        <span className="font-mono tabular-nums font-semibold">
          {item.students.toLocaleString()}
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        {t.pct}
        <span className="font-mono tabular-nums font-semibold">{(item.pct * 100).toFixed(1)}%</span>
      </p>
    </div>
  );
}

/**
 * 学员打卡频次分布柱图
 *
 * 展示 0-6 次精确打卡频次分布。
 * 0 次的柱用危险色（红色），其余用品牌金黄色。
 * 每根柱顶标注人数，tooltip 显示百分比。
 *
 * 使用示例：
 *   <StudentFrequencyChart data={analysis.frequency_distribution} />
 */
export function StudentFrequencyChart({ data }: StudentFrequencyChartProps) {
  const locale = useLocale();
  const t = I18N[locale === 'en' ? 'en' : 'zh'];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        {t.noData}
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: item.count === 0 ? `0${t.countSuffix}` : `${item.count}${t.countSuffix}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
        barCategoryGap="30%"
      >
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: CHART_PALETTE.axisLabel }}
          axisLine={{ stroke: CHART_PALETTE.border }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_PALETTE.axisTick }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v.toLocaleString()}
          width={48}
        />
        <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="students" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell
              key={`cell-${entry.count}`}
              fill={entry.count === 0 ? CHART_PALETTE.danger : CHART_PALETTE.c1}
            />
          ))}
          <LabelList
            dataKey="students"
            position="top"
            style={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
            formatter={(v: number) => v.toLocaleString()}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
