"use client";

import { Card } from "@/components/ui/Card";
import { EnhancedRankingTable } from "@/components/charts/EnhancedRankingTable";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";

export default function RankingEnhancedPage() {
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">增强排名</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          A4 CC 排名增强 — 约课率/出席率/综合评分维度
        </p>
      </div>
      <GlossaryBanner terms={[
        { term: "CC", definition: "前端销售" },
        { term: "触达率", definition: "有效通话(≥120s)学员/有效学员" },
        { term: "带新系数", definition: "B注册数/带来注册的A学员数" },
        { term: "预约率", definition: "预约课次/外呼接通数" },
        { term: "出席率", definition: "实际出席/预约课次" },
      ]} />
      <Card title="CC 增强排名表">
        <EnhancedRankingTable />
      </Card>
    </div>
  );
}
