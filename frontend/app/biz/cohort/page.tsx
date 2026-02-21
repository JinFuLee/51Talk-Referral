"use client";

import { useState } from "react";
import { CohortRetentionHeatmap } from "@/components/biz/CohortRetentionHeatmap";
import { CohortDecayCurve } from "@/components/biz/CohortDecayCurve";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import useSWR from "swr";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Local types ───────────────────────────────────────────────────────────────

interface CohortMonthRow {
  cohort: string;
  [metric: string]: number | null | string;
}

interface HeatmapResponse {
  metrics: string[];
  metric_labels: string[];
  months: number[];
  matrix: (number | null)[][];
  cohort_months: CohortMonthRow[];
  data_source: string;
}

interface DecayResponse {
  metric: string;
  metric_label: string;
  by_cohort_month: { cohort: string; series: { month: number; value: number }[] }[];
  summary_decay: { month: number; value: number | null }[];
  data_source: string;
}

interface DetailResponse {
  retention_by_age: { m: number; valid_rate: number; reach_rate: number; bring_new_rate: number }[];
  by_cc: {
    cc: string; team: string; students: number;
    valid_rate: number; reach_rate: number;
    bring_new_rate: number; bring_new_total: number;
  }[];
  churn_by_age: { m: number; first_churn_count: number; first_churn_rate: number; cumulative_churn_rate: number }[];
  top_bringers: { student_id: string; total_new: number; team: string; last_active_m: number; cohort: string }[];
  total_students: number;
  data_source: string;
}

const METRIC_OPTIONS = [
  { key: "reach_rate", label: "触达率" },
  { key: "participation_rate", label: "参与率" },
  { key: "checkin_rate", label: "打卡率" },
  { key: "referral_coefficient", label: "带新系数" },
  { key: "conversion_ratio", label: "带货比" },
];

const TABS = [
  { id: "heatmap", label: "留存热力图" },
  { id: "decay", label: "衰减曲线" },
  { id: "detail", label: "学员留存" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Sub-components ────────────────────────────────────────────────────────────

function DataSourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const isDemo = source === "demo";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isDemo
          ? "bg-amber-50 text-amber-600 border border-amber-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      {isDemo ? "演示数据" : "真实数据"}
    </span>
  );
}

// ── Heatmap Tab ───────────────────────────────────────────────────────────────

function HeatmapTab() {
  const { data, isLoading, error } = useSWR<HeatmapResponse>(
    `${API}/api/analysis/cohort-heatmap`,
    fetcher
  );

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error || !data) {
    return (
      <p className="text-sm text-red-500 py-8 text-center">
        数据加载失败，请先运行分析（POST /api/analysis/run）
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            X轴 = 月龄 (M1-M12)，Y轴 = 指标，色深 = 值高低
          </p>
        </div>
        <DataSourceBadge source={data.data_source} />
      </div>
      <Card className="overflow-hidden">
        <CohortRetentionHeatmap
          metrics={data.metrics}
          metricLabels={data.metric_labels}
          months={data.months}
          matrix={data.matrix}
        />
      </Card>

      {/* Cohort-month × metric summary table */}
      {data.cohort_months.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">入组月别 M1 指标对比</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-1.5 text-slate-500 font-medium">入组月</th>
                  {data.metrics.map((m, i) => (
                    <th key={m} className="px-3 py-1.5 text-center text-slate-500 font-medium">
                      {data.metric_labels[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohort_months.map((row) => (
                  <tr key={row.cohort} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-700">{row.cohort}</td>
                    {data.metrics.map((m) => {
                      const val = row[m];
                      const numVal = typeof val === "number" ? val : null;
                      return (
                        <td key={m} className="px-3 py-1.5 text-center text-slate-600">
                          {numVal != null
                            ? m === "referral_coefficient"
                              ? numVal.toFixed(2)
                              : `${(numVal * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Decay Tab ─────────────────────────────────────────────────────────────────

function DecayTab() {
  const [selectedMetric, setSelectedMetric] = useState("reach_rate");
  const { data, isLoading, error } = useSWR<DecayResponse>(
    `${API}/api/analysis/cohort-decay?metric=${selectedMetric}`,
    fetcher
  );

  return (
    <div className="space-y-4">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSelectedMetric(opt.key)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${
              selectedMetric === opt.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:border-indigo-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-16"><Spinner /></div>}
      {error && (
        <p className="text-sm text-red-500 py-8 text-center">
          数据加载失败，请先运行分析
        </p>
      )}
      {data && !isLoading && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              {data.metric_label} — Cohort 月龄衰减曲线
            </h3>
            <DataSourceBadge source={data.data_source} />
          </div>
          <CohortDecayCurve
            cohortGroups={data.by_cohort_month}
            summaryDecay={data.summary_decay}
            metric={data.metric}
            metricLabel={data.metric_label}
            showPercentage={data.metric !== "referral_coefficient"}
          />
        </Card>
      )}
    </div>
  );
}

// ── Detail Tab ────────────────────────────────────────────────────────────────

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function DetailTab() {
  const { data, isLoading, error } = useSWR<DetailResponse>(
    `${API}/api/analysis/cohort-detail`,
    fetcher
  );

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error || !data) {
    return (
      <p className="text-sm text-red-500 py-8 text-center">数据加载失败</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          共 {data.total_students.toLocaleString()} 条学员级记录 (C6)
        </span>
        <DataSourceBadge source={data.data_source} />
      </div>

      {/* Retention curve summary */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">月龄留存率 + 流失漏斗</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-1.5 text-slate-500 font-medium">月龄</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">有效留存率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">触达率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">带新率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">当月新流失</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">累计流失率</th>
              </tr>
            </thead>
            <tbody>
              {data.retention_by_age.map((row) => {
                const churn = data.churn_by_age.find((c) => c.m === row.m);
                const isHighChurn = (churn?.first_churn_rate ?? 0) >= 0.07;
                return (
                  <tr
                    key={row.m}
                    className={`border-b border-slate-50 hover:bg-slate-50 ${isHighChurn ? "bg-red-50/30" : ""}`}
                  >
                    <td className="px-3 py-1.5 font-medium text-slate-700">M{row.m}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span
                        className={`font-medium ${
                          row.valid_rate >= 0.7
                            ? "text-emerald-600"
                            : row.valid_rate >= 0.5
                            ? "text-amber-600"
                            : "text-red-500"
                        }`}
                      >
                        {pct(row.valid_rate)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{pct(row.reach_rate)}</td>
                    <td className="px-3 py-1.5 text-center text-slate-600">{pct(row.bring_new_rate)}</td>
                    <td className="px-3 py-1.5 text-center">
                      {churn ? (
                        <span className={isHighChurn ? "text-red-500 font-medium" : "text-slate-500"}>
                          {churn.first_churn_count} ({pct(churn.first_churn_rate)})
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-center text-slate-500">
                      {churn ? pct(churn.cumulative_churn_rate) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-red-400 mt-2 px-3">红色行 = 高流失月龄，建议在此月龄前加强干预</p>
      </Card>

      {/* CC Bring-New ranking */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">CC 真实带新效率排行（C6 学员级）</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-1.5 text-slate-500 font-medium w-6">#</th>
                <th className="text-left px-3 py-1.5 text-slate-500 font-medium">CC</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">团队</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">学员数</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">有效率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">触达率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">带新率</th>
                <th className="px-3 py-1.5 text-center text-slate-500 font-medium">带新总数</th>
              </tr>
            </thead>
            <tbody>
              {data.by_cc.map((cc, idx) => (
                <tr key={cc.cc} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-700">{cc.cc}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{cc.team}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{cc.students}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{pct(cc.valid_rate)}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{pct(cc.reach_rate)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span
                      className={`font-medium ${
                        cc.bring_new_rate >= 0.25
                          ? "text-emerald-600"
                          : cc.bring_new_rate >= 0.18
                          ? "text-amber-600"
                          : "text-red-500"
                      }`}
                    >
                      {pct(cc.bring_new_rate)}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center font-medium text-indigo-600">
                    {cc.bring_new_total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top bringers */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">带新主力学员 Top 5</h3>
        <div className="space-y-2">
          {data.top_bringers.map((s, idx) => (
            <div key={s.student_id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-50">
              <span className="text-xs font-bold text-indigo-400 w-4">#{idx + 1}</span>
              <span className="text-xs font-mono text-slate-500 w-16">{s.student_id}</span>
              <span className="text-xs text-slate-400">{s.team}</span>
              <span className="text-xs text-slate-400">入组: {s.cohort}</span>
              <span className="text-xs text-slate-400">最后活跃: M{s.last_active_m}</span>
              <span className="ml-auto text-xs font-semibold text-emerald-600">
                +{s.total_new} 新注册
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CohortPage() {
  const [activeTab, setActiveTab] = useState<TabId>("heatmap");

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Cohort 分析中心</h1>
        <p className="text-sm text-slate-500 mt-1">
          C1-C5 触达率/参与率/打卡率/带新系数/带货比月龄衰减 · C6 学员级留存与带新
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "heatmap" && <HeatmapTab />}
      {activeTab === "decay" && <DecayTab />}
      {activeTab === "detail" && <DetailTab />}
    </div>
  );
}
