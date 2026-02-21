"use client";

import { TeamFunnelComparison } from "@/components/ops/TeamFunnelComparison";

export default function FunnelTeamPage() {
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">团队漏斗对比</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          A1 数据源 · 各团队注册 → 预约 → 出席 → 付费漏斗
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <TeamFunnelComparison />
      </div>
    </div>
  );
}
