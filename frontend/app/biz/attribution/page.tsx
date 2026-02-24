"use client";

import { useAttribution, useTranslation } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { AttributionFactor } from "@/lib/types";

function AttributionBar({ factor }: { factor: AttributionFactor }) {
  const pct = Math.round(factor.contribution * 100);
  const barColor =
    pct >= 30 ? "bg-blue-500" : pct >= 15 ? "bg-indigo-400" : "bg-slate-300";

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-28 shrink-0 text-slate-600 text-right text-xs truncate">
        {factor.label ?? factor.factor}
      </div>
      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-12 text-right font-semibold text-slate-700 text-xs">
        {pct}%
      </div>
    </div>
  );
}

export default function AttributionPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useAttribution();

  if (isLoading) {
    return (
      <div className={BIZ_PAGE}>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={BIZ_PAGE}>
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error
            ? `${t("biz.attribution.label.loadError")}: ${error.message}`
            : t("biz.attribution.label.noData")}
        </div>
      </div>
    );
  }

  const attrData = data as { factors?: AttributionFactor[] } | undefined;
  const factors: AttributionFactor[] = attrData?.factors ?? [];
  const sorted = [...factors].sort((a, b) => b.contribution - a.contribution);
  const topFactor = sorted[0];

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.attribution.title")} subtitle={t("biz.attribution.subtitle")} />

      <ErrorBoundary>
        {/* Summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
            <p className="text-xs text-blue-400 font-medium">{t("biz.attribution.label.topFactor")}</p>
            <p className="text-xl font-bold text-blue-700 mt-1">
              {topFactor ? (topFactor.label ?? topFactor.factor) : "—"}
            </p>
            {topFactor && (
              <p className="text-sm text-blue-500 mt-0.5">
                {t("biz.attribution.label.contribution")} {Math.round(topFactor.contribution * 100)}%
              </p>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4">
            <p className="text-xs text-slate-400 font-medium">{t("biz.attribution.label.factorCount")}</p>
            <p className="text-xl font-bold text-slate-700 mt-1">
              {factors.length} 项
            </p>
          </div>
        </div>

        {/* Attribution bar chart */}
        <Card title={t("biz.attribution.card.dist")}>
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400">{t("biz.attribution.label.noData")}</p>
          ) : (
            <div className="space-y-3 py-2">
              {sorted.map((f) => (
                <AttributionBar key={f.factor} factor={f} />
              ))}
            </div>
          )}
        </Card>

        {/* Detail table */}
        <Card title={t("biz.attribution.card.detail")}>
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400">{t("biz.attribution.label.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400 text-left">
                    <th className="pb-2 pr-4">{t("biz.attribution.table.rank")}</th>
                    <th className="pb-2 pr-4">{t("biz.attribution.table.factor")}</th>
                    <th className="pb-2 pr-4">{t("biz.attribution.table.id")}</th>
                    <th className="pb-2 text-right">{t("biz.attribution.table.contribution")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((f, i) => (
                    <tr
                      key={f.factor}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2 pr-4 text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-2 pr-4 font-medium text-slate-700">
                        {f.label ?? f.factor}
                      </td>
                      <td className="py-2 pr-4 text-slate-400 text-xs font-mono">
                        {f.factor}
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-800">
                        {Math.round(f.contribution * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ErrorBoundary>
    </div>
  );
}
