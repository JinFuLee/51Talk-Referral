import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  target?: string | number;
  achievement?: number;
  className?: string;
}

function achievementClass(rate: number) {
  if (rate >= 1) return "text-green-600";
  if (rate >= 0.8) return "text-yellow-600";
  return "text-red-500";
}

export function StatCard({ label, value, target, achievement, className }: StatCardProps) {
  const pct = achievement !== undefined ? Math.round(achievement * 100) : null;

  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)]/95 backdrop-blur-md rounded-[var(--radius-md)] border border-[var(--border-default)]/40 shadow-sm p-5",
        className
      )}
    >
      <p className="text-xs text-[var(--text-muted)] font-medium mb-2">{label}</p>
      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
      {target !== undefined && (
        <p className="text-xs text-[var(--text-muted)] mt-1">目标 {target}</p>
      )}
      {pct !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">达成率</span>
            <span className={cn("font-semibold", achievementClass(achievement ?? 0))}>
              {pct}%
            </span>
          </div>
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                achievement !== undefined && achievement >= 1
                  ? "bg-green-500"
                  : achievement !== undefined && achievement >= 0.8
                  ? "bg-yellow-400"
                  : "bg-red-400"
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
