'use client';

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
  if (data.length === 0) {
    return <EmptyState title="暂无数据" description="上传数据后自动刷新" />;
  }

  // 按 paid_count 降序排序
  const sorted = [...data].sort((a, b) => b.paid_count - a.paid_count).slice(0, 10);

  return (
    <div>
      <p className="text-xs text-[var(--text-muted)] mb-2">{title} · 按付费人数排名</p>
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
            width={80}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          />
          <Tooltip
            formatter={(val: number, name: string) => {
              if (name === 'paid_count') return [`${val} 人`, '付费'];
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
      <div className="flex gap-4 mt-2 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-green-600" /> &ge;100% 目标
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-action-accent" /> 50~99%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block bg-red-600" /> &lt;50%
        </span>
      </div>
    </div>
  );
}
