"use client";

import useSWR from "swr";
import { Spinner } from "@/components/ui/Spinner";
import OutreachGapBarChart from "./outreach-gap/OutreachGapBarChart";
import OutreachGapDetailTable from "./outreach-gap/OutreachGapDetailTable";

interface CCGap {
  cc_name: string;
  total: number;
  called: number;
  not_called: number;
  coverage_rate: number;
  gap_vs_target: number;
}

interface OutreachGapData {
  summary: {
    total_students: number;
    called: number;
    not_called: number;
    coverage_rate: number;
    target_rate: number;
    gap_rate: number;
    gap_students: number;
  };
  loss_estimate: {
    lost_attend: number;
    lost_paid: number;
    lost_revenue_usd: number;
    lost_revenue_thb: number;
  };
  by_cc: CCGap[];
}

const MOCK: OutreachGapData = {
  summary: {
    total_students: 320,
    called: 246,
    not_called: 74,
    coverage_rate: 0.769,
    target_rate: 0.85,
    gap_rate: 0.081,
    gap_students: 26,
  },
  loss_estimate: {
    lost_attend: 22,
    lost_paid: 3,
    lost_revenue_usd: 660,
    lost_revenue_thb: 22440,
  },
  by_cc: [
    { cc_name: "张伟", total: 45, called: 30, not_called: 15, coverage_rate: 0.667, gap_vs_target: 0.183 },
    { cc_name: "李娜", total: 38, called: 27, not_called: 11, coverage_rate: 0.711, gap_vs_target: 0.139 },
    { cc_name: "王芳", total: 52, called: 42, not_called: 10, coverage_rate: 0.808, gap_vs_target: 0.042 },
    { cc_name: "刘洋", total: 40, called: 34, not_called: 6, coverage_rate: 0.85, gap_vs_target: 0.0 },
    { cc_name: "陈静", total: 35, called: 31, not_called: 4, coverage_rate: 0.886, gap_vs_target: -0.036 },
  ],
};

async function fetcher(): Promise<OutreachGapData> {
  const res = await fetch(`/api/analysis/outreach-gap`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function OutreachGapAnalysis() {
  const { data: raw, isLoading, error } = useSWR("outreach-gap", fetcher, {
    onErrorRetry: (err, _key, _cfg, revalidate, { retryCount }) => {
      if (retryCount >= 1) return;
      setTimeout(() => revalidate({ retryCount }), 3000);
    },
  });

  const data: OutreachGapData = raw ?? MOCK;
  const isMock = !raw && !isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Spinner />
      </div>
    );
  }

  const { summary, loss_estimate, by_cc } = data;

  return (
    <div className="space-y-4">
      {isMock && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2">
          当前显示模拟数据（API 不可用）
        </div>
      )}
      {error && !isMock && (
        <div className="text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2">
          数据加载失败: {String(error)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-2xl shadow-flash p-4 transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1">
          <p className="text-xs text-slate-400 mb-1">实际覆盖率 vs 目标</p>
          <p
            className={`text-2xl font-bold ${
              summary.gap_rate > 0.1
                ? "text-red-600"
                : summary.gap_rate > 0.05
                ? "text-orange-500"
                : "text-green-600"
            }`}
          >
            {(summary.coverage_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            目标 {(summary.target_rate * 100).toFixed(0)}% · 缺口{" "}
            {(summary.gap_rate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-2xl shadow-flash p-4 transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1">
          <p className="text-xs text-slate-400 mb-1">缺口学员数</p>
          <p
            className={`text-2xl font-bold ${
              summary.gap_students > 30
                ? "text-red-600"
                : summary.gap_students > 10
                ? "text-orange-500"
                : "text-slate-800"
            }`}
          >
            {summary.gap_students} 人
          </p>
          <p className="text-xs text-slate-400 mt-1">
            未拨 {summary.not_called} 人 / 共 {summary.total_students} 人
          </p>
        </div>
        <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-2xl shadow-flash p-4 transition-all duration-500 hover:shadow-flash-lg hover:-translate-y-1">
          <p className="text-xs text-slate-400 mb-1">预估损失收入</p>
          <p
            className={`text-2xl font-bold ${
              loss_estimate.lost_revenue_usd > 1000
                ? "text-red-600"
                : loss_estimate.lost_revenue_usd > 300
                ? "text-orange-500"
                : "text-slate-800"
            }`}
          >
            ${loss_estimate.lost_revenue_usd.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            → 损失出席 {loss_estimate.lost_attend} 人 · 损失付费 {loss_estimate.lost_paid} 单
          </p>
        </div>
      </div>

      <OutreachGapBarChart by_cc={by_cc} target_rate={summary.target_rate} />
      <OutreachGapDetailTable by_cc={by_cc} loss_estimate={loss_estimate} />
    </div>
  );
}
