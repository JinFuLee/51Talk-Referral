"use client";

import { OutreachGapAnalysis } from "@/components/charts/OutreachGapAnalysis";

export default function OutreachGapPage() {
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">课前外呼覆盖缺口</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          F11 覆盖率 vs 目标 · CC 粒度缺口排名 · 未覆盖学员预估 $ 损失
        </p>
      </div>
      <OutreachGapAnalysis />
    </div>
  );
}
