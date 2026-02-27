"use client";

/**
 * 回退为客户端组件（Next.js 14 兼容）。
 * getServerTranslations() 依赖 next/headers cookies()，在 Next.js 14 中
 * 会导致 webpack RSC 模块边界错误。升级到 Next.js 15 后可移除 "use client" 重新启用 RSC。
 */

import { useTranslation } from "@/lib/hooks";
import { EnclosureHealthDashboard } from "@/components/charts/EnclosureHealthDashboard";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default function EnclosureHealthPage() {
  const { t } = useTranslation();
  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.enclosure-health.title")} subtitle={t("biz.enclosure-health.subtitle")} />

      <ErrorBoundary>
        <EnclosureHealthDashboard />
      </ErrorBoundary>
    </div>
  );
}
