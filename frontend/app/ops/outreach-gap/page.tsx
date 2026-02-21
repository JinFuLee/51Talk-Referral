"use client";

import { useTranslation } from "@/lib/hooks";
import { OutreachGapAnalysis } from "@/components/charts/OutreachGapAnalysis";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function OutreachGapPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.outreach-gap.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.outreach-gap.subtitle")}</p>
      </div>
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
