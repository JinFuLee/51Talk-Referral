"use client";

interface SummaryCardsProps {
  summary: Record<string, unknown>;
  timeProgress: number;
  meta: Record<string, unknown>;
}

function pct(actual: number, target: number) {
  if (!target) return 0;
  return Math.round((actual / target) * 100);
}

function statusColor(p: number) {
  if (p >= 100) return "text-green-600 bg-green-50 border-green-200";
  if (p >= 95) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export function SummaryCards({ summary, timeProgress }: SummaryCardsProps) {
  const reg = summary as { registrations?: { actual: number; target: number }; payments?: { actual: number; target: number }; revenue?: { actual: number; target: number }; leads?: { actual: number; target: number } };
  const progress = Math.round((timeProgress ?? 0) * 100);

  const cards = [
    { label: "注册", data: reg.registrations, unit: "人" },
    { label: "付费", data: reg.payments, unit: "人" },
    { label: "收入", data: reg.revenue, unit: "THB" },
    { label: "Leads", data: reg.leads, unit: "条" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>时间进度：{progress}%</span>
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cards.map(({ label, data, unit }) => {
          const actual = data?.actual ?? 0;
          const target = data?.target ?? 0;
          const p = pct(actual, target);
          const color = statusColor(p);
          return (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <p className="text-xs font-medium opacity-70">{label}</p>
              <p className="text-2xl font-bold mt-1">{actual.toLocaleString()}</p>
              <p className="text-xs mt-1 opacity-60">目标 {target.toLocaleString()} {unit} · {p}%</p>
              <div className="mt-2 h-1 bg-white/40 rounded-full overflow-hidden">
                <div className="h-full bg-current opacity-60 rounded-full" style={{ width: `${Math.min(p, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
