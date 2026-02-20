"use client";

interface TimeProgressBarProps {
  progress: number; // 0~1
  label?: string;
}

export function TimeProgressBar({ progress, label = "月度时间进度" }: TimeProgressBarProps) {
  const pct = Math.min(Math.round(progress * 100), 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">{label}</p>
        <span className="text-xs font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1.5">本月已过 {pct}% 时间</p>
    </div>
  );
}
