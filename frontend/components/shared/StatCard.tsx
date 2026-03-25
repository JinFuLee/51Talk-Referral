import { cn } from '@/lib/utils';
import { MiniSparkline } from '@/components/ui/MiniSparkline';

interface StatCardProps {
  label: string;
  value: string | number;
  target?: string | number;
  achievement?: number;
  className?: string;
  /** "warn" = 达成率落后时间进度，卡片边框变橙色 */
  highlight?: 'warn';
  /** 7 天 sparkline 数据点（null = 当日无数据） */
  sparkline?: (number | null)[];
  /** MoM 环比变化率（正=上涨，负=下跌，null=无数据） */
  momChange?: number | null;
}

function achievementBarColor(rate: number): string {
  if (rate >= 1) return 'var(--color-success)';
  if (rate >= 0.8) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function achievementTextColor(rate: number): string {
  if (rate >= 1) return 'var(--color-success)';
  if (rate >= 0.8) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function MomBadge({ change }: { change: number }) {
  const pct = (change * 100).toFixed(1);
  if (change > 0.001) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--color-success)]">
        ↑ {pct}%
      </span>
    );
  }
  if (change < -0.001) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--color-danger)]">
        ↓ {Math.abs(Number(pct))}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] text-[var(--text-muted)]">— 持平</span>
  );
}

export function StatCard({
  label,
  value,
  target,
  achievement,
  className,
  highlight,
  sparkline,
  momChange,
}: StatCardProps) {
  const pct = achievement !== undefined ? Math.round(achievement * 100) : null;
  const hasSparkline = sparkline && sparkline.filter((v) => v !== null).length >= 2;

  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        highlight === 'warn'
          ? 'border-orange-400 dark:border-orange-500'
          : 'border-[var(--border-default)]',
        className
      )}
      style={{
        background: 'var(--bg-surface)',
        boxShadow: 'var(--shadow-subtle)',
        transition: 'box-shadow 0.2s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-medium)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-subtle)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">{label}</p>

      {/* 数值行：数字 + sparkline 并排 */}
      <div className="flex items-end justify-between gap-2">
        <div className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
          {value}
        </div>
        {hasSparkline && (
          <div className="flex flex-col items-end gap-0.5 pb-0.5">
            <MiniSparkline data={sparkline!} width={56} height={18} />
            {momChange !== null && momChange !== undefined && <MomBadge change={momChange} />}
          </div>
        )}
      </div>

      {/* MoM（无 sparkline 时仍可显示） */}
      {!hasSparkline && momChange !== null && momChange !== undefined && (
        <div className="mt-0.5">
          <MomBadge change={momChange} />
        </div>
      )}

      {target !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-[var(--text-muted)]">目标 {target}</span>
          {pct !== null && (
            <span
              className="text-xs font-medium"
              style={{ color: achievementTextColor(achievement ?? 0) }}
            >
              {achievement !== undefined && achievement >= 1
                ? `↑${((achievement - 1) * 100).toFixed(1)}%`
                : achievement !== undefined
                  ? `↓${((1 - achievement) * 100).toFixed(1)}%`
                  : ''}
            </span>
          )}
        </div>
      )}
      {pct !== null && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">达成率</span>
            <span
              className="font-semibold"
              style={{ color: achievementTextColor(achievement ?? 0) }}
            >
              {pct}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-[var(--n-200)]">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, pct)}%`,
                backgroundColor: achievementBarColor(achievement ?? 0),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
