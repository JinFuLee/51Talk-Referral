'use client';

import { PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface AchievementRingProps {
  label: string;
  actual: number;
  target: number;
  rate: number; // 0~1
}

function rateColor(rate: number): string {
  if (rate >= 1) return '#16a34a'; // green-600
  if (rate >= 0.5) return 'var(--color-accent)'; // action-accent (mid-achievement)
  return '#dc2626'; // red-600
}

function rateLabel(rate: number): string {
  if (rate >= 1) return 'text-green-600';
  if (rate >= 0.5) return 'text-action-accent';
  return 'text-red-600';
}

export function AchievementRing({ label, actual, target, rate }: AchievementRingProps) {
  const pct = Math.min(rate, 1); // cap at 100% for ring display
  const color = rateColor(rate);
  const pctDisplay = `${(rate * 100).toFixed(1)}%`;

  const data = [{ value: pct }, { value: 1 - pct }];

  return (
    <div className="flex flex-col items-center gap-1 p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-[var(--shadow-subtle)]">
      <p className="text-xs text-[var(--text-secondary)] font-medium">{label}</p>

      {/* 环形图 */}
      <div className="relative">
        <PieChart width={96} height={96}>
          <Pie
            data={data}
            cx={44}
            cy={44}
            innerRadius={32}
            outerRadius={44}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="var(--border-default)" />
          </Pie>
        </PieChart>

        {/* 中心数字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-sm font-bold tabular-nums', rateLabel(rate))}>
            {pctDisplay}
          </span>
        </div>
      </div>

      {/* 实际/目标 */}
      <div className="text-center">
        <p className="text-base font-bold tabular-nums text-[var(--text-primary)]">
          {actual.toLocaleString()}
        </p>
        <p className="text-xs text-[var(--text-muted)]">目标 {target.toLocaleString()}</p>
      </div>
    </div>
  );
}
