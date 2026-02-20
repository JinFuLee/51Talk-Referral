"use client";

import type { CheckinImpact } from "@/lib/types/analysis";

interface CheckinImpactCardProps {
  data?: CheckinImpact;
}

const MOCK: CheckinImpact = {
  participation_lift: { checkin: 0.15, no_checkin: 0.03, multiplier: 5.0 },
  coefficient_lift: { checkin: 1.8, no_checkin: 0.6, multiplier: 3.0 },
  conclusion: "打卡使参与率提升 5 倍",
};

export function CheckinImpactCard({ data = MOCK }: CheckinImpactCardProps) {
  const p = data.participation_lift;
  const c = data.coefficient_lift;

  return (
    <div className="space-y-4">
      {/* Participation lift */}
      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium">参与率对比</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">打卡组</p>
            <p className="text-xl font-bold text-emerald-700">{(p.checkin * 100).toFixed(0)}%</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{p.multiplier.toFixed(1)}x</div>
              <div className="text-xs text-slate-400 mt-0.5">倍率</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">未打卡组</p>
            <p className="text-xl font-bold text-slate-500">{(p.no_checkin * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Coefficient lift */}
      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium">带新系数对比</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">打卡组</p>
            <p className="text-xl font-bold text-emerald-700">{c.checkin.toFixed(1)}</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{c.multiplier.toFixed(1)}x</div>
              <div className="text-xs text-slate-400 mt-0.5">倍率</div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">未打卡组</p>
            <p className="text-xl font-bold text-slate-500">{c.no_checkin.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Conclusion */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
        <p className="text-sm font-semibold text-indigo-700">{data.conclusion}</p>
      </div>
    </div>
  );
}
