"use client";

import Link from "next/link";

interface GoalGapCardProps {
  title: string;
  actual: number;
  target: number;
  unit?: string;
  drilldownHref?: string;
  drilldownLabel?: string;
}

export function GoalGapCard({ title, actual, target, unit = "", drilldownHref, drilldownLabel = "查看明细 →" }: GoalGapCardProps) {
  const gap = target - actual;
  const isPositive = gap <= 0;
  const gapPct = target > 0 ? ((actual / target) * 100).toFixed(1) : "0";

  const content = (
    <div className={`relative group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${drilldownHref ? "cursor-pointer pb-6" : ""}`}>
      <p className="text-xs text-slate-500 mb-1">{title} 缺口</p>
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-bold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
          {isPositive ? "+" : ""}{(-gap).toLocaleString()}{unit}
        </span>
        <span className="text-xs text-slate-400">{gapPct}% 完成</span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        实际 {actual.toLocaleString()}{unit} / 目标 {target.toLocaleString()}{unit}
      </p>

      {drilldownHref && (
        <div className="absolute inset-x-0 bottom-1 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100/80 backdrop-blur-sm text-slate-500">
            {drilldownLabel}
          </span>
        </div>
      )}
    </div>
  );

  if (drilldownHref) {
    return <Link href={drilldownHref} className="block no-underline">{content}</Link>;
  }
  
  return content;
}
