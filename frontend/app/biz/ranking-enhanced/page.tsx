"use client";

import { Card } from "@/components/ui/Card";
import { EnhancedRankingTable } from "@/components/charts/EnhancedRankingTable";

export default function RankingEnhancedPage() {
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">增强排名</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          A4 CC 排名增强 — 约课率/出席率/综合评分维度
        </p>
      </div>
      <Card title="CC 增强排名表">
        <EnhancedRankingTable />
      </Card>
    </div>
  );
}
