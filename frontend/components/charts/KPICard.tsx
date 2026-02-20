"use client";

interface KPICardProps {
  title: string;
  actual: number;
  target: number;
  unit?: string;
  status: "green" | "yellow" | "red";
  progress: number; // 0~1
}

const STATUS_COLORS = {
  green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", bar: "bg-green-500" },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", bar: "bg-yellow-400" },
  red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", bar: "bg-red-500" },
};

const STATUS_EMOJI = { green: "🟢", yellow: "🟡", red: "🔴" };

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function KPICard({ title, actual, target, unit, status, progress }: KPICardProps) {
  const colors = STATUS_COLORS[status];
  const pct = Math.min(Math.round(progress * 100), 100);

  return (
    <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <span>{STATUS_EMOJI[status]}</span>
      </div>

      <div className="flex items-end gap-1 mb-3">
        <span className={`text-2xl font-bold ${colors.text}`}>
          {formatNumber(actual)}
        </span>
        {unit && <span className="text-sm text-gray-400 mb-0.5">{unit}</span>}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>{pct}%</span>
        <span>目标 {formatNumber(target)}{unit}</span>
      </div>
    </div>
  );
}
