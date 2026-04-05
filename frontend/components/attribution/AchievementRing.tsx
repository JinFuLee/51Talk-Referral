'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell } from 'recharts';
import { cn, formatRate } from '@/lib/utils';
interface AchievementRingProps {
  label: string;
  actual: number;
  target: number;
  rate: number; // 0~1
}

function rateColor(rate: number): string {
  if (rate >= 1) return 'var(--chart-4-hex)'; // success
  if (rate >= 0.5) return 'var(--chart-1-hex)'; // mid
  return 'var(--chart-5-hex)'; // danger
}

function rateLabel(rate: number): string {
  if (rate >= 1) return 'text-success-token';
  if (rate >= 0.5) return 'text-action-accent';
  return 'text-danger-token';
}

export function AchievementRing({ label, actual, target, rate }: AchievementRingProps) {
    const t = useTranslations('AchievementRing');
  const pct = Math.min(rate, 1); // cap at 100% for ring display
  const color = rateColor(rate);
  const pctDisplay = formatRate(rate);

  const data = [{ value: pct }, { value: 1 - pct }];

  return (
    <div className="flex flex-col items-center gap-1 p-3 bg-surface rounded-xl border border-default-token shadow-[var(--shadow-subtle)]">
      <p className="text-xs text-secondary-token font-medium">{label}</p>

      {/* 环形图 */}
      <div className="relative">
        <PieChart width={120} height={120}>
          <Pie
            data={data}
            cx={56}
            cy={56}
            innerRadius={40}
            outerRadius={54}
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
          <span className={cn('text-base font-bold tabular-nums', rateLabel(rate))}>
            {pctDisplay}
          </span>
        </div>
      </div>

      {/* 实际/目标 */}
      <div className="text-center">
        <p className="text-base font-bold tabular-nums text-primary-token">
          {actual.toLocaleString()}
        </p>
        <p className="text-xs text-muted-token">
          {t('target')} {target.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
