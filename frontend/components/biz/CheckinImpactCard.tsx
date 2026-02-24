"use client";

import useSWR from "swr";
import type { CheckinImpact } from "@/lib/types/analysis";
import { swrFetcher } from "@/lib/api";

interface CheckinImpactCardProps {
  data?: CheckinImpact;
}

export function CheckinImpactCard({ data: propData }: CheckinImpactCardProps) {
  const { data: apiData, isLoading, error } = useSWR(
    propData ? null : "/api/analysis/checkin-impact",
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
        打卡影响数据加载失败，请稍后重试
      </div>
    );
  }

  const data: CheckinImpact | undefined = propData ?? apiData?.data;

  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
        暂无数据
      </div>
    );
  }

  const p = data.participation_lift;
  const c = data.coefficient_lift;

  return (
    <div className="space-y-4">
      {/* Participation lift */}
      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium">参与率对比</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-success/10 rounded-lg p-3">
            <p className="text-xs text-slate-500">打卡组</p>
            <p className="text-xl font-bold text-success00">{(p.checkin * 100).toFixed(0)}%</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{p.multiplier.toFixed(1)}x</div>
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
          <div className="bg-success/10 rounded-lg p-3">
            <p className="text-xs text-slate-500">打卡组</p>
            <p className="text-xl font-bold text-success00">{c.checkin.toFixed(1)}</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{c.multiplier.toFixed(1)}x</div>
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
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
        <p className="text-sm font-semibold text-primary">{data.conclusion}</p>
      </div>
    </div>
  );
}
