"use client";

import { Card } from "@/components/ui/Card";
import { CohortRetentionHeatmap } from "@/components/charts/CohortRetentionHeatmap";
import { NorthStarGauge } from "@/components/charts/NorthStarGauge";

export default function CohortHeatmapPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Cohort 留存热力图</h1>
        <p className="text-sm text-slate-500 mt-1">
          按围场段（付费后天数）× 运营指标的矩阵热力图，颜色深浅反映各段相对表现
        </p>
      </div>

      <Card title="北极星 KPI — 达成率 Gauge">
        <NorthStarGauge />
      </Card>

      <Card title="Cohort 留存热力矩阵（M1 快照）">
        <CohortRetentionHeatmap />
      </Card>
    </div>
  );
}
