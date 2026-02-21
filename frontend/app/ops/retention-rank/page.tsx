"use client";

import { Card } from "@/components/ui/Card";
import { RetentionContributionRank } from "@/components/charts/RetentionContributionRank";

export default function RetentionRankPage() {
  return (
    <div className="max-w-none space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">CC 留存贡献排名</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          F9 各 CC 付费学员留存跟进效果 · 留存收入贡献占比
        </p>
      </div>

      {/* Main ranking */}
      <Card title="留存贡献排名">
        <RetentionContributionRank />
      </Card>
    </div>
  );
}
