"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { EnhancedRankingTable } from "@/components/charts/EnhancedRankingTable";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function RankingEnhancedPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("biz.ranking-enhanced.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("biz.ranking-enhanced.subtitle")}</p>
      </div>
      <GlossaryBanner terms={[
        { term: "CC", definition: "前端销售" },
        { term: "触达率", definition: "有效通话(≥120s)学员/有效学员" },
        { term: "带新系数", definition: "B注册数/带来注册的A学员数" },
        { term: "预约率", definition: "预约课次/外呼接通数" },
        { term: "出席率", definition: "实际出席/预约课次" },
      ]} />
      <ErrorBoundary>
        <Card title={t("biz.ranking-enhanced.card.table")}>
          <EnhancedRankingTable />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
