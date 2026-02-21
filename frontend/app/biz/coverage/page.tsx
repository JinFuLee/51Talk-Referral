"use client";

import { useTranslation } from "@/lib/hooks";
import { OutreachCoverageGap } from "@/components/biz/OutreachCoverageGap";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function OutreachCoveragePage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.coverage.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.coverage.subtitle")}</p>
      </div>

      <GlossaryBanner terms={[
        { term: "有效接通", definition: "通话≥120秒" },
        { term: "覆盖缺口", definition: "目标覆盖率 - 实际覆盖率" },
        { term: "有效学员", definition: "次卡>0且在有效期内" },
        { term: "出席率", definition: "实际出席/预约课次" },
      ]} />

      <ErrorBoundary>
        <OutreachCoverageGap />
      </ErrorBoundary>
    </div>
  );
}
