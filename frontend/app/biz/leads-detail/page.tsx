"use client";

import { useTranslation } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { EnclosureChannelMatrix } from "@/components/charts/EnclosureChannelMatrix";
import { TimeIntervalHistogram } from "@/components/charts/TimeIntervalHistogram";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function LeadsDetailPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.leads-detail.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.leads-detail.subtitle")}</p>
      </div>

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
