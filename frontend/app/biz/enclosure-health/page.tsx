"use client";

import { EnclosureHealthDashboard } from "@/components/charts/EnclosureHealthDashboard";

export default function EnclosureHealthPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">围场健康度仪表盘</h1>
        <p className="text-sm text-slate-400 mt-1">
          2026年2月 · 跨源联动 F7 付费跟进 + F8 围场月度跟进 + D3 转介绍围场
        </p>
      </div>

      <EnclosureHealthDashboard />
    </div>
  );
}
