"use client";

interface RateCardProps {
  label: string;
  rate: number; // 0~1
  sub?: string;
  target?: number; // 0~1
}

export function RateCard({ label, rate, sub, target }: RateCardProps) {
  const pct = Math.round(rate * 100);
  const targetPct = target !== undefined ? Math.round(target * 100) : undefined;
  const status =
    targetPct === undefined
      ? "slate"
      : pct >= targetPct
      ? "green"
      : pct >= targetPct * 0.85
      ? "yellow"
      : "red";

  const textColor =
    status === "green"
      ? "text-green-600"
      : status === "yellow"
      ? "text-yellow-600"
      : status === "red"
      ? "text-red-600"
      : "text-slate-700";

  const barColor =
    status === "green"
      ? "bg-green-500"
      : status === "yellow"
      ? "bg-yellow-400"
      : status === "red"
      ? "bg-red-500"
      : "bg-blue-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{pct}%</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {targetPct !== undefined && (
        <>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">目标 {targetPct}%</p>
        </>
      )}
    </div>
  );
}
