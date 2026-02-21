"use client";

import { OutreachCoverageGap } from "@/components/biz/OutreachCoverageGap";

export default function OutreachCoveragePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">课前外呼覆盖缺口</h1>
        <p className="text-sm text-slate-400 mt-1">
          F11 课前外呼明细 · 未覆盖学员识别 · 预估收入损失量化
        </p>
      </div>

      {/* Main content */}
      <OutreachCoverageGap />
    </div>
  );
}
