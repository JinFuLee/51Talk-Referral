'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { AttributionBreakdownItem } from '@/lib/types/cross-analysis';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRate } from '@/lib/utils';
import { useLabel, CHANNEL_LABELS } from '@/lib/label-maps';
interface ContributionBreakdownProps {
  data: AttributionBreakdownItem[];
  title: string;
}

function barColor(pct: number): string {
  if (pct >= 1) return 'var(--chart-4-hex)';
  if (pct >= 0.5) return 'var(--chart-2-hex)';
  return 'var(--chart-5-hex)';
}

export function ContributionBreakdown({ data, title }: ContributionBreakdownProps) {
    const t = useTranslations('ContributionBreakdown');
  const label = useLabel();

  if (data.length === 0) {
    return <EmptyState title={t('noData')} description={t('noDataDesc')} />;
  }

  // 按 paid_count 降序排序
  const sorted = [...data].sort((a, b) => b.paid_count - a.paid_count).slice(0, 10);

  return (
    <div>
      <p className="text-xs text-muted-token mb-2">
        {title} {t('suffix')}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 36)}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 0, right: 64, bottom: 0, left: 8 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="group_key"
            width={100}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            tickFormatter={(v: string) => label(CHANNEL_LABELS, v)}
          />
          <Tooltip
            labelFormatter={(v: string) => label(CHANNEL_LABELS, v)}
            formatter={(val: number, name: string) => {
              if (name === 'paid_count') return [`${val} ${t('paidUnit')}`, t('paidLabel')];
              return [val, name];
            }}
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
            dataKey="paid_count"
            radius={[0, 4, 4, 0]}
            animationDuration={600}
            animationEasing="ease-out"
          >
            {sorted.map((entry, idx) => (
              <Cell key={idx} fill={barColor(entry.pct_of_target)} />
            ))}
            <LabelList
              dataKey="pct_of_target"
              position="right"
              formatter={(v: number) => formatRate(v)}
              style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 图例 */}
      <div className="flex gap-4 mt-2 text-xs text-muted-token">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-success-token" /> {t('legend100')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-action-accent" /> {t('legend50')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-danger-token" /> {t('legend0')}
        </span>
      </div>
    </div>
  );
}
