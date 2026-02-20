"use client";

import { useState } from "react";

interface ReportDownloaderProps {
  reportType: "ops" | "exec";
  date?: string;
  lang?: "zh" | "th";
}

export function ReportDownloader({ reportType, date, lang = "zh" }: ReportDownloaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = {
    zh: {
      ops: "下载运营报告",
      exec: "下载管理层报告",
      downloading: "下载中...",
      error: "下载失败",
    },
    th: {
      ops: "ดาวน์โหลดรายงานปฏิบัติการ",
      exec: "ดาวน์โหลดรายงานผู้บริหาร",
      downloading: "กำลังดาวน์โหลด...",
      error: "ดาวน์โหลดล้มเหลว",
    },
  };

  const l = labels[lang];

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      // First, list available reports to find the matching filename
      const listRes = await fetch("/api/reports/list");
      const listData = await listRes.json();

      if (!listData.success || !Array.isArray(listData.data)) {
        throw new Error("Failed to list reports");
      }

      // Find most recent matching report
      const matching = listData.data.filter(
        (r: { report_type: string; date: string | null }) =>
          r.report_type === reportType &&
          (!date || r.date === date)
      );

      if (matching.length === 0) {
        throw new Error("No matching report found");
      }

      // Sort by date descending, pick latest
      matching.sort((a: { date: string | null }, b: { date: string | null }) =>
        (b.date ?? "").localeCompare(a.date ?? "")
      );
      const target = matching[0];

      // Download
      const dlRes = await fetch(`/api/reports/download/${encodeURIComponent(target.filename)}`);
      if (!dlRes.ok) throw new Error("Download request failed");

      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = target.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : l.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-sm font-medium text-gray-700 rounded-lg transition-colors shadow-sm"
      >
        <span className="text-base leading-none">
          {reportType === "ops" ? "📋" : "📈"}
        </span>
        {loading ? l.downloading : (reportType === "ops" ? l.ops : l.exec)}
      </button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
