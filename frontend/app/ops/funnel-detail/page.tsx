"use client";

import { Card } from "@/components/ui/Card";
import { FunnelEfficiencyPanel } from "@/components/charts/FunnelEfficiencyPanel";
import { SectionEfficiencyQuadrant } from "@/components/charts/SectionEfficiencyQuadrant";

export default function FunnelDetailPage() {
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">漏斗跟进效率</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          F1 CC 级别漏斗转化 · F2 截面效率四象限分析
        </p>
      </div>

      <Card title="F1 各 CC 漏斗跟进效率">
        <FunnelEfficiencyPanel />
      </Card>

      <Card title="F2 截面效率四象限">
        <SectionEfficiencyQuadrant />
      </Card>
    </div>
  );
}
