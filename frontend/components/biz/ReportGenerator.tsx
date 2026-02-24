"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { reportsAPI } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

const MarkdownRenderer = dynamic(
  () => import("@/components/reports/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
  { ssr: false }
);

interface ReportResult {
  markdown: string;
  generated_at: string;
  ai_commentary: string;
}

export function ReportGenerator() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsAPI.generate();
      setReport(res.report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "报告生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="AI 分析报告"
      actions={
        <Button
          onClick={handleGenerate}
          disabled={loading}
          size="sm"
          className="flex items-center gap-2"
        >
          {loading && <Spinner size="sm" className="text-white" />}
          {loading ? "AI 正在分析..." : "一键生成报告"}
        </Button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-sm gap-2">
          <span className="text-3xl opacity-30">📋</span>
          <p>点击&quot;一键生成报告&quot;，AI 将分析当前数据并生成完整运营报告</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-500 text-sm">
          <Spinner size="lg" />
          <p>AI 正在分析数据，生成运营洞察...</p>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>生成时间：{new Date(report.generated_at).toLocaleString("zh-CN")}</span>
          </div>

          {report.ai_commentary && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">AI 核心洞察</p>
              <p className="leading-relaxed">{report.ai_commentary}</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <MarkdownRenderer content={report.markdown} />
          </div>
        </div>
      )}
    </Card>
  );
}
