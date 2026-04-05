'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
interface TeamDataItem {
  cc_name: string;
  cc_group: string;
  students: number;
  participation_rate: number;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

interface TeamCompareChartProps {
  teams: TeamDataItem[];
}

export function TeamCompareChart({ teams }: TeamCompareChartProps) {
  const t = useTranslations('TeamCompareChart');

  if (teams.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-token">{t('empty')}</div>;
  }

  const chartData = teams.map((item) => ({
    name: item.cc_name,
    [t('participationRate')]: Math.round((item.participation_rate ?? 0) * 100),
    [t('registrations')]: item.registrations,
    [t('payments')]: item.payments,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-token mb-3">{t('participationTitle')}</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_PALETTE.axisTick }}
              axisLine={false}
              tickLine={false}
              unit="%"
              width={36}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, t('participationRate')]}
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--shadow-medium)',
                fontSize: '12px',
              }}
              cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
            />
            <Bar
              dataKey={t('participationRate')}
              fill={CHART_PALETTE.series[6]}
              radius={[4, 4, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs text-muted-token mb-3">{t('regVsPayTitle')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_PALETTE.grid} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_PALETTE.axisTick }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--shadow-medium)',
                fontSize: '12px',
              }}
              cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
            />
            <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" iconSize={8} />
            <Bar
              dataKey={t('registrations')}
              fill={CHART_PALETTE.series[0]}
              radius={[4, 4, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
            <Bar
              dataKey={t('payments')}
              fill={CHART_PALETTE.success}
              radius={[4, 4, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
