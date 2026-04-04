'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { useLocale } from 'next-intl';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { RenewalCorrelation } from '@/lib/types/checkin-student';

const I18N = {
  zh: {
    bandLabel: '打卡频段：',
    hasRenewalPct: '有续费学员比例：',
    avgRenewals: '人均续费订单数：',
    bandStudents: '该频段学员数：',
    noCorrelation: '暂无续费关联数据',
    noRenewal: '暂无续费数据（需要"总续费订单数"字段）',
    legendAvg: '人均续费订单数',
    legendPct: '有续费比例 %',
  },
  en: {
    bandLabel: 'Band: ',
    hasRenewalPct: 'Renewal Rate: ',
    avgRenewals: 'Avg Renewals: ',
    bandStudents: 'Students in Band: ',
    noCorrelation: 'No renewal correlation data',
    noRenewal: 'No renewal data (requires "total_renewal_orders" field)',
    legendAvg: 'Avg Renewals',
    legendPct: 'Has Renewal %',
  },
  'zh-TW': {
    bandLabel: '打卡頻段：',
    hasRenewalPct: '有續費學員比例：',
    avgRenewals: '人均續費訂單數：',
    bandStudents: '該頻段學員數：',
    noCorrelation: '暫無續費關聯數據',
    noRenewal: '暫無續費數據（需要「總續費訂單數」欄位）',
    legendAvg: '人均續費訂單數',
    legendPct: '有續費比例 %',
  },
  th: {
    bandLabel: 'กลุ่มความถี่: ',
    hasRenewalPct: 'อัตราการต่ออายุ: ',
    avgRenewals: 'ต่ออายุเฉลี่ย: ',
    bandStudents: 'นักเรียนในกลุ่ม: ',
    noCorrelation: 'ไม่มีข้อมูลความสัมพันธ์การต่ออายุ',
    noRenewal: 'ไม่มีข้อมูลการต่ออายุ (ต้องการฟิลด์ "จำนวนคำสั่งซื้อต่ออายุทั้งหมด")',
    legendAvg: 'ต่ออายุเฉลี่ย',
    legendPct: 'มีการต่ออายุ %',
  },
} as const;

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

type TStrings = (typeof I18N)[keyof typeof I18N];

/** 自定义 Tooltip */
function CustomTooltip({
  active,
  payload,
  label,
  t,
}: TooltipProps<number, string> & { t: TStrings }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mb-1">
        {t.bandLabel}
        {label}
      </p>
      <p className="text-[var(--text-secondary)]">
        {t.hasRenewalPct}
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {((row.has_renewal_pct ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        {t.avgRenewals}
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {(row.avg_renewals ?? 0).toFixed(2)}
        </span>
      </p>
      <p className="text-[var(--text-muted)]">
        {t.bandStudents}
        {(row.students ?? 0).toLocaleString()}
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
 * <RenewalCheckinChart data={analysis.renewal_checkin_correlation} />
 */
export function RenewalCheckinChart({ data }: RenewalCheckinChartProps) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  if (!data?.by_band || data.by_band.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        {t.noCorrelation}
      </div>
    );
  }

  const chartData: ChartRow[] = data.by_band.map((item) => ({
    band: item.band,
    avg_renewals: item.avg_renewals,
    has_renewal_pct: item.has_renewal_pct,
    renewal_pct_display: parseFloat(((item.has_renewal_pct ?? 0) * 100).toFixed(1)),
    students: item.students,
  }));

  // 所有数据都为 0 时提示（数据源可能无续费字段）
  const hasData = chartData.some((r) => r.avg_renewals > 0 || r.has_renewal_pct > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        {t.noRenewal}
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
        <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend
          verticalAlign="bottom"
          height={28}
          wrapperStyle={{ fontSize: 11, color: CHART_PALETTE.axisLabel }}
        />
        <Bar
          dataKey="avg_renewals"
          name={t.legendAvg}
          fill={CHART_PALETTE.c1}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="renewal_pct_display"
          name={t.legendPct}
          fill={CHART_PALETTE.c4}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
