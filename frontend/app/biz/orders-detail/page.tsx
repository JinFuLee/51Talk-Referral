"use client";

import { usePackageMix, useTeamPackageMix, useChannelRevenue, useTranslation } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";
import { formatRevenue } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { ProductTrendStackedBar } from "@/components/charts/ProductTrendStackedBar";
import { TeamPackageCompare } from "@/components/charts/TeamPackageCompare";
import { ChannelRevenueWaterfall } from "@/components/charts/ChannelRevenueWaterfall";

export default function OrdersDetailPage() {
  const { t } = useTranslation();
  const { data: pkgData, isLoading: pkgLoading, error: pkgError } = usePackageMix();
  const { data: teamPkgData, isLoading: teamLoading, error: teamError } = useTeamPackageMix();
  const { data: chRevData, isLoading: chLoading, error: chError } = useChannelRevenue();

  const isLoading = pkgLoading || teamLoading || chLoading;

  if (isLoading) {
    return (
      <div className={BIZ_PAGE}>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const hasError = pkgError || teamError || chError;

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.orders-detail.title")} subtitle={t("biz.orders-detail.subtitle")} />

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {t("biz.orders-detail.label.loadError")}
        </div>
      )}

      {/* E4 — Product type stacked bar */}
      <ErrorBoundary>
      <Card
        title={`${t("biz.orders-detail.card.stackedBar")} (E4)`}
        actions={
          pkgData ? (
            <span className="text-xs text-slate-400">
              {t("biz.orders-detail.label.total")} {formatRevenue(pkgData.items.reduce((s: number, i: { revenue_usd: number }) => s + i.revenue_usd, 0))}
            </span>
          ) : null
        }
      >
        {pkgData ? (
          pkgData.items.length > 0 ? (
            <ProductTrendStackedBar items={pkgData.items} />
          ) : (
            <div className="flex items-center justify-center h-40 text-xs text-slate-400">
              {t("biz.orders-detail.label.noE4")}
            </div>
          )
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </Card>

      {/* Bottom row: E7 radar (left) + E8 waterfall (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E7 — Team package radar */}
        <Card
          title={`${t("biz.orders-detail.card.teamRadar")} (E7)`}
          actions={
            teamPkgData ? (
              <span className="text-xs text-slate-400">
                {teamPkgData.teams.length} {t("biz.orders-detail.label.teams")}
              </span>
            ) : null
          }
        >
          {teamPkgData ? (
            teamPkgData.teams.length > 0 ? (
              <TeamPackageCompare teams={teamPkgData.teams} />
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-slate-400">
                {t("biz.orders-detail.label.noE7")}
              </div>
            )
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </Card>

        {/* E8 — Channel revenue waterfall */}
        <Card
          title={`${t("biz.orders-detail.card.channelWaterfall")} (E8)`}
          actions={
            chRevData ? (
              <span className="text-xs text-slate-400">
                {t("biz.orders-detail.label.total")} {formatRevenue(chRevData.total_usd)}
              </span>
            ) : null
          }
        >
          {chRevData ? (
            chRevData.channels.length > 0 ? (
              <ChannelRevenueWaterfall
                channels={chRevData.channels}
                total_usd={chRevData.total_usd}
              />
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-slate-400">
                {t("biz.orders-detail.label.noE8")}
              </div>
            )
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </Card>
      </div>
      </ErrorBoundary>
    </div>
  );
}
