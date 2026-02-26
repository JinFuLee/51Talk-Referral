/**
 * RSC 示例页面 — 使用 getServerTranslations() 替代 useTranslation() hook。
 * 页面本身无客户端状态，去除 "use client" 后可在服务端渲染。
 * 子组件 EnclosureHealthDashboard / PageHeader 保留各自的 "use client"，不受影响。
 */

import { getServerTranslations } from "@/lib/i18n-server";
import { EnclosureHealthDashboard } from "@/components/charts/EnclosureHealthDashboard";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default async function EnclosureHealthPage() {
  const t = await getServerTranslations();
  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.enclosure-health.title")} subtitle={t("biz.enclosure-health.subtitle")} />

      <ErrorBoundary>
        <EnclosureHealthDashboard />
      </ErrorBoundary>
    </div>
  );
}
