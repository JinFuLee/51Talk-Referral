"use client";

import { useTranslation } from "@/lib/hooks";
import { OutreachGapAnalysis } from "@/components/charts/OutreachGapAnalysis";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

export default function OutreachGapPage() {
  const { t } = useTranslation();
  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.outreach-gap.title")} subtitle={t("ops.outreach-gap.subtitle")} />
      <GlossaryBanner terms={[
        { term: "有效接通", definition: "通话≥120秒" },
        { term: "覆盖缺口", definition: "目标覆盖率 - 实际覆盖率" },
        { term: "CC", definition: "前端销售" },
        { term: "有效学员", definition: "次卡>0且在有效期内" },
      ]} />
      <ErrorBoundary>
        <OutreachGapAnalysis />
      </ErrorBoundary>
    </div>
  );
}
