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
import { useLocale } from 'next-intl';
import { fmtEnc } from '@/lib/utils';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { EnclosureDistItem } from '@/lib/types/checkin-student';

const I18N = {
  zh: {
    enclosureLabel: '围场：',
    participationRate: '参与率：',
    avgCheckin: '人均打卡：',
    daysSuffix: ' 天',
    enclosureStudents: '该围场学员数：',
    noData: '暂无围场分布数据',
  },
  en: {
    enclosureLabel: 'Enclosure: ',
    participationRate: 'Participation: ',
    avgCheckin: 'Avg Check-ins: ',
    daysSuffix: ' days',
    enclosureStudents: 'Students: ',
    noData: 'No enclosure distribution data',
  },
  'zh-TW': {
    enclosureLabel: '圍場：',
    participationRate: '參與率：',
    avgCheckin: '人均打卡：',
    daysSuffix: ' 天',
    enclosureStudents: '該圍場學員數：',
    noData: '暫無圍場分佈數據',
  },
  th: {
    enclosureLabel: 'กลุ่ม: ',
    participationRate: 'อัตราการมีส่วนร่วม: ',
    avgCheckin: 'เช็คอินเฉลี่ย: ',
    daysSuffix: ' วัน',
    enclosureStudents: 'นักเรียนในกลุ่ม: ',
    noData: 'ไม่มีข้อมูลการกระจายกลุ่ม',
  },
} as const;

interface EnclosureChartRow {
  label: string;
  participation_pct: number;
  avg_days: number;
  total: number;
}

type TStrings = (typeof I18N)[keyof typeof I18N];

function EnclosureTooltip({
  active,
  payload,
  label,
  t,
}: TooltipProps<number, string> & { t: TStrings }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as EnclosureChartRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-white border border-default-token rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-primary-token border-b border-subtle-token pb-1 mb-1">
        {t.enclosureLabel}
        {label}
      </p>
      <p className="text-secondary-token">
        {t.participationRate}
        <span className="font-mono tabular-nums font-semibold text-primary-token ml-1">
          {(row.participation_pct ?? 0).toFixed(1)}%
        </span>
      </p>
      <p className="text-secondary-token">
        {t.avgCheckin}
        <span className="font-mono tabular-nums ml-1">
          {(row.avg_days ?? 0).toFixed(2)}
          {t.daysSuffix}
        </span>
      </p>
      <p className="text-muted-token">
        {t.enclosureStudents}
        {(row.total ?? 0).toLocaleString()}
      </p>
    </div>
  );
}

export function EnclosureParticipationChart({ data }: { data: EnclosureDistItem[] }) {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] ?? I18N.zh;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-muted-token">
        {t.noData}
      </div>
    );
  }

  const chartData: EnclosureChartRow[] = data.map((item) => ({
    label: fmtEnc(item.enclosure),
    participation_pct: parseFloat(((item.participation_rate ?? 0) * 100).toFixed(1)),
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
        <Tooltip content={<EnclosureTooltip t={t} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
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
