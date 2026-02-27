"use client";

/**
 * 回退为客户端组件（Next.js 14 兼容）。
 * getServerTranslations() 依赖 next/headers cookies()，在 Next.js 14 中
 * 会导致 webpack RSC 模块边界错误。升级到 Next.js 15 后可移除 "use client" 重新启用 RSC。
 */

import { useTranslation } from "@/lib/hooks";
import { OutreachCoverageGap } from "@/components/biz/OutreachCoverageGap";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default function OutreachCoveragePage() {
  const { t } = useTranslation();
  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.coverage.title")} subtitle={t("biz.coverage.subtitle")} />

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
