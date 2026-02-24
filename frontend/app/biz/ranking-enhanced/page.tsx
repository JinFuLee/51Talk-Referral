"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { EnhancedRankingTable } from "@/components/charts/EnhancedRankingTable";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function RankingEnhancedPage() {
  const { t } = useTranslation();
  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("biz.ranking-enhanced.title")} subtitle={t("biz.ranking-enhanced.subtitle")} />
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
