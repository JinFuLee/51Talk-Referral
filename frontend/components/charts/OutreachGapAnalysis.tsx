"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
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
  by_channel_l3?: Array<{
    name: string;
    total_classes: number;
    call_rate: number;
    connect_rate: number;
    attendance_rate: number;
  }>;
  by_lead_grade?: Array<{
    name: string;
    total_classes: number;
    call_rate: number;
    connect_rate: number;
    attendance_rate: number;
  }>;
  data_source?: string;
  loss_is_estimated?: boolean;
}

export function OutreachGapAnalysis() {
  const { data: raw, isLoading, error } = useSWR<OutreachGapData>("/api/analysis/outreach-gap", swrFetcher, {
    onErrorRetry: (err, _key, _cfg, revalidate, { retryCount }) => {
      if (retryCount >= 1) return;
      setTimeout(() => revalidate({ retryCount }), 3000);
    },
  });

  const isEmpty = !raw || (raw.summary?.total_students ?? 0) === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2">
        数据加载失败: {String(error)}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-slate-400 text-center py-8">
        暂无外呼缺口数据，请先完成当月数据导入
      </div>
    );
  }

  const { summary, loss_estimate, by_cc, by_channel_l3, by_lead_grade } = raw;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <DataSourceBadge source={raw.data_source} />
      </div>

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
      <OutreachGapDetailTable
        by_cc={by_cc}
        loss_estimate={loss_estimate}
        by_channel_l3={by_channel_l3}
        by_lead_grade={by_lead_grade}
      />
    </div>
  );
}
