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
      ? "text-green-600"
      : achievePct >= 80
      ? "text-yellow-600"
      : "text-red-500";

  return (
    <div className="rounded-xl border border-slate-100 bg-[var(--bg-surface)] p-4 shadow-sm">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{name}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-[var(--text-primary)]">
          {actual.toLocaleString()}
        </span>
        <span className={`text-sm font-semibold ${achieveColor}`}>
          {achievePct.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>目标 {target.toLocaleString()}</span>
        <span
          className={`font-medium ${isAbove ? "text-green-600" : "text-red-500"}`}
        >
          {isAbove ? "+" : ""}
          {gap.toLocaleString()}
        </span>
      </div>
      {/* Achievement bar */}
      <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-200 ${
            achievePct >= 100
              ? "bg-green-500"
              : achievePct >= 80
              ? "bg-yellow-400"
              : "bg-red-400"
          }`}
          style={{ width: `${Math.min(100, achievePct)}%` }}
        />
      </div>
    </div>
  );
}
