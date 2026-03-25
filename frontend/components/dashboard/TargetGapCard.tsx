import { formatRate } from '@/lib/utils';

interface TargetGapCardProps {
  name: string;
  target: number;
  actual: number;
  gap: number;
  achievement_rate: number;
}

export function TargetGapCard({ name, target, actual, gap, achievement_rate }: TargetGapCardProps) {
  const isAbove = gap >= 0;
  const achievePct = achievement_rate * 100;
  const achieveColor =
    achievePct >= 100
      ? 'text-emerald-800'
      : achievePct >= 80
        ? 'text-amber-800'
        : 'text-[var(--color-danger)]';

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{name}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-[var(--text-primary)]">
          {actual.toLocaleString()}
        </span>
        <span className={`text-sm font-semibold ${achieveColor}`}>
          {formatRate(achievement_rate)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>目标 {target.toLocaleString()}</span>
        <span
          className={`font-medium ${isAbove ? 'text-emerald-800' : 'text-[var(--color-danger)]'}`}
        >
          {isAbove ? '+' : ''}
          {gap.toLocaleString()}
        </span>
      </div>
      {/* Achievement bar */}
      <div className="mt-3 w-full bg-[var(--bg-subtle)] rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-200 ${
            achievePct >= 100
              ? 'bg-emerald-600'
              : achievePct >= 80
                ? 'bg-amber-500'
                : 'bg-[var(--color-danger)]'
          }`}
          style={{ width: `${Math.min(100, achievePct)}%` }}
        />
      </div>
    </div>
  );
}
