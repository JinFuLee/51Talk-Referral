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
