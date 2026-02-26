/**
 * RSC 示例页面 — 使用 getServerTranslations() 替代 useTranslation() hook。
 * 页面本身无客户端状态，去除 "use client" 后可在服务端渲染。
 * 子组件 OutreachCoverageGap / GlossaryBanner / PageHeader 保留各自的 "use client"，不受影响。
 */

import { getServerTranslations } from "@/lib/i18n-server";
import { OutreachCoverageGap } from "@/components/biz/OutreachCoverageGap";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default async function OutreachCoveragePage() {
  const t = await getServerTranslations();
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
