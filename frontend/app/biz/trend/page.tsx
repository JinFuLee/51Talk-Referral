"use client";

import { useState } from "react";
import { useTrend, usePrediction } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { PredictionBandChart } from "@/components/charts/PredictionBandChart";
import { CheckinImpactCard } from "@/components/biz/CheckinImpactCard";
import { Spinner } from "@/components/ui/Spinner";
import type { TrendData, PredictionData } from "@/lib/types";

const METRIC_TABS = [
  { key: "registrations", label: "注册" },
  { key: "payments", label: "付费" },
  { key: "revenue", label: "收入" },
];

export default function BizTrendPage() {
  const [compareType, setCompareType] = useState<"mom" | "yoy">("mom");
  const [metricTab, setMetricTab] = useState("payments");

  const { data: trendResp, isLoading: tLoading } = useTrend(compareType);
  const { data: predResp, isLoading: pLoading } = usePrediction();

  if (tLoading || pLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const trend = trendResp as TrendData | undefined;
  const prediction = predResp as PredictionData | undefined;

  const eomReg = prediction?.eom_registrations ?? 0;
  const eomPay = prediction?.eom_payments ?? 0;
  const eomRev = prediction?.eom_revenue ?? 0;
  const model = prediction?.model_used ?? "EWM";
  const conf = prediction?.confidence ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">趋势 & 预测</h1>
          <p className="text-sm text-slate-400 mt-1">月度环比/预测区间 · 打卡因果分析</p>
        </div>
        {/* Compare type toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["mom", "yoy"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCompareType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                compareType === t
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "mom" ? "月环比" : "月同比"}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly trend */}
      <Card title="📈 月度趋势">
        {/* Metric tabs */}
        <div className="flex gap-2 mb-4">
          {METRIC_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMetricTab(tab.key)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                metricTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <TrendLineChart
          data={trend}
          xKey="date"
          yKey={metricTab}
          lineKeys={[metricTab]}
        />
      </Card>

      {/* Prediction + Checkin impact side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="🔮 月底预测区间">
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">预测注册</p>
              <p className="text-2xl font-bold text-indigo-700">{eomReg.toLocaleString()}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">预测付费</p>
              <p className="text-2xl font-bold text-indigo-700">{eomPay.toLocaleString()}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">置信度</p>
              <p className="text-2xl font-bold text-indigo-700">{(conf * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mb-2 px-1">
            <span>模型：{model}</span>
            <span>预测收入：¥{(eomRev / 1000).toFixed(0)}k</span>
          </div>
          <PredictionBandChart />
        </Card>

        <Card title="✅ 打卡→带新因果">
          <CheckinImpactCard />
        </Card>
      </div>

      {/* Model info */}
      <Card title="🧠 预测模型说明">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { name: "线性回归", used: model === "LINEAR", desc: "适合稳定增长" },
            { name: "EWM 指数加权", used: model === "EWM" || !model, desc: "适合近期波动" },
            { name: "季节性分解", used: model === "SEASONAL", desc: "适合周期规律" },
          ].map((m) => (
            <div
              key={m.name}
              className={`rounded-xl border-2 p-4 ${
                m.used
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              {m.used && (
                <div className="text-xs font-semibold text-indigo-600 mb-1">当前选用</div>
              )}
              <p className="font-semibold text-slate-700 text-sm">{m.name}</p>
              <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
