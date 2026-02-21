"use client";

import { useState, useEffect } from "react";
import CoverageGapSummary from "./coverage/CoverageGapSummary";
import CoverageGapChart from "./coverage/CoverageGapChart";
import CoverageGapTable from "./coverage/CoverageGapTable";

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
  estimated_revenue_loss: number | null;
}

interface GradeRow {
  grade: string;
  total: number;
  covered: number;
  uncovered: number;
  covered_rate: number;
  connect_rate: number;
  attendance_rate: number;
}

interface CCRow {
  cc_name: string;
  team: string | null;
  total: number;
  covered: number;
  connected: number;
  attended: number;
  call_rate: number;
  connect_rate: number;
  attendance_rate: number;
}

interface CoverageData {
  summary: {
    total_records: number;
    total_pre_called: number;
    total_pre_connected: number;
    total_attended: number;
    overall_call_rate: number;
    overall_connect_rate: number;
    overall_attendance_rate: number;
  };
  coverage_gap: {
    uncovered_students: number;
    uncovered_rate: number;
    estimated_lost_attendance: number;
    estimated_lost_paid: number;
    estimated_lost_revenue_usd: number;
  };
  assumptions: {
    avg_order_usd: number;
    attend_to_paid_rate: number;
  };
  funnel: FunnelStage[];
  by_grade: GradeRow[];
  by_cc: CCRow[];
}

export function OutreachCoverageGap() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grade" | "cc">("grade");

  useEffect(() => {
    fetch("/api/analysis/outreach-coverage")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: CoverageData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        加载中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
        {error ? `数据加载失败: ${error}` : "暂无覆盖缺口数据，请先运行分析引擎"}
      </div>
    );
  }

  const { summary, coverage_gap, assumptions, funnel, by_grade, by_cc } = data;

  return (
    <div className="space-y-8">
      <CoverageGapSummary summary={summary} coverage_gap={coverage_gap} assumptions={assumptions} />
      <CoverageGapChart funnel={funnel} />
      <CoverageGapTable
        by_grade={by_grade}
        by_cc={by_cc}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
