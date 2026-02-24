"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { EnclosureChannelMatrix } from "@/components/charts/EnclosureChannelMatrix";
import { TimeIntervalHistogram } from "@/components/charts/TimeIntervalHistogram";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

export default function LeadsDetailPage() {
  const { t } = useTranslation();
  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.leads-detail.title")} subtitle={t("biz.leads-detail.subtitle")} />

      <ErrorBoundary>
        {/* A2: 围场×渠道矩阵 */}
        <Card
          title={`A2 ${t("biz.leads-detail.card.matrix")}`}
          actions={
            <span className="text-xs text-slate-400">{t("biz.leads-detail.label.matrixDesc")}</span>
          }
        >
          <EnclosureChannelMatrix />
        </Card>

        {/* A3: 时间间隔直方图 */}
        <Card
          title={`A3 ${t("biz.leads-detail.card.histogram")}`}
          actions={
            <span className="text-xs text-slate-400">{t("biz.leads-detail.label.histogramDesc")}</span>
          }
        >
          <TimeIntervalHistogram />
        </Card>
      </ErrorBoundary>
    </div>
  );
}
