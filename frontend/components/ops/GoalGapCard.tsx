"use client";

interface GoalGapCardProps {
  title: string;
  actual: number;
  target: number;
  unit?: string;
}

export function GoalGapCard({ title, actual, target, unit = "" }: GoalGapCardProps) {
  const gap = target - actual;
  const isPositive = gap <= 0;
  const gapPct = target > 0 ? ((actual / target) * 100).toFixed(1) : "0";

  return (
    <div className="rounded-2xl border border-border/40 bg-white/95 backdrop-blur-md p-4 shadow-flash hover:shadow-flash-lg hover:-translate-y-1 transition-all duration-500">
      <p className="text-xs text-slate-500 mb-1">{title} 缺口</p>
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? "+" : ""}{(-gap).toLocaleString()}{unit}
        </span>
        <span className="text-xs text-slate-400">{gapPct}% 完成</span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        实际 {actual.toLocaleString()}{unit} / 目标 {target.toLocaleString()}{unit}
      </p>
    </div>
  );
}
