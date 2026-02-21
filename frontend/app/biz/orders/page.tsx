"use client";

import { useState } from "react";
import { usePackageMix, useTeamPackageMix, useChannelRevenue, useTranslation } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { PackageMixChart } from "@/components/biz/PackageMixChart";
import { ChannelRevenueWaterfall } from "@/components/biz/ChannelRevenueWaterfall";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function OrdersAnalysisPage() {
  const { t } = useTranslation();
  const { data: pkgData, isLoading: pkgLoading, error: pkgError } = usePackageMix();
  const { data: teamPkgData, isLoading: teamLoading } = useTeamPackageMix();
  const { data: chRevData, isLoading: chLoading, error: chError } = useChannelRevenue();
  const [teamExpanded, setTeamExpanded] = useState(false);

  const isLoading = pkgLoading || chLoading;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  const hasError = pkgError || chError;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("biz.orders.title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("biz.orders.subtitle")}</p>
      </div>

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {t("biz.orders.label.loadError")}
        </div>
      )}

      <ErrorBoundary>
        {/* Top row: package mix (left) + channel revenue waterfall (right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title={`${t("biz.orders.card.packageMix")} (E6)`} actions={
            <span className="text-xs text-slate-400">{t("biz.orders.label.byRevenue")}</span>
          }>
            {pkgData ? (
              pkgData.items.length > 0 ? (
                <PackageMixChart items={pkgData.items} />
              ) : (
                <div className="flex items-center justify-center h-40 text-xs text-slate-400">
                  {t("biz.orders.label.noE6")}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-40">
                <Skeleton className="h-32 w-full" />
              </div>
            )}
          </Card>

          <Card title={`${t("biz.orders.card.channelWaterfall")} (E8)`} actions={
            chRevData ? (
              <span className="text-xs text-slate-400">
                {t("biz.orders.label.total")} {formatRevenue(chRevData.total_usd)}
              </span>
            ) : null
          }>
            {chRevData ? (
              chRevData.channels.length > 0 ? (
                <ChannelRevenueWaterfall
                  channels={chRevData.channels}
                  total_usd={chRevData.total_usd}
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-xs text-slate-400">
                  {t("biz.orders.label.noE8")}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-40">
                <Skeleton className="h-32 w-full" />
              </div>
            )}
          </Card>
        </div>

        {/* Team package breakdown (collapsible) */}
        <Card
          title={`${t("biz.orders.card.teamPackage")} (E7)`}
          actions={
            <button
              onClick={() => setTeamExpanded((v) => !v)}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              {teamExpanded ? t("biz.orders.label.collapse") : t("biz.orders.label.expand")}
            </button>
          }
        >
          {teamExpanded ? (
            teamLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : teamPkgData && teamPkgData.teams.length > 0 ? (
              <TeamPackageTable teams={teamPkgData.teams} />
            ) : (
              <div className="flex items-center justify-center h-24 text-xs text-slate-400">
                {t("biz.orders.label.noE7")}
              </div>
            )
          ) : (
            <p className="text-xs text-slate-400 py-2">
              {teamPkgData && teamPkgData.teams.length > 0
                ? `${teamPkgData.teams.length} ${t("biz.orders.label.teamCount")}`
                : t("biz.orders.label.e7Pending")}
            </p>
          )}
        </Card>
      </ErrorBoundary>
    </div>
  );
}

interface TeamItem {
  product_type: string;
  ratio: number;
}

interface TeamRow {
  team: string;
  items: TeamItem[];
}

function TeamPackageTable({ teams }: { teams: TeamRow[] }) {
  // Collect all product types across all teams
  const allTypes = Array.from(
    new Set(teams.flatMap((t) => t.items.map((i) => i.product_type)))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-600">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 pr-3 font-medium text-slate-400 whitespace-nowrap">
              小组
            </th>
            {allTypes.map((type) => (
              <th
                key={type}
                className="text-right py-2 px-2 font-medium text-slate-400 whitespace-nowrap"
              >
                {type}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team, idx) => {
            const itemMap: Record<string, number> = {};
            team.items.forEach((i) => {
              itemMap[i.product_type] = i.ratio;
            });
            return (
              <tr
                key={idx}
                className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="py-2 pr-3 font-medium text-slate-700 whitespace-nowrap">
                  {team.team}
                </td>
                {allTypes.map((type) => {
                  const ratio = itemMap[type];
                  return (
                    <td key={type} className="text-right py-2 px-2">
                      {ratio != null ? (
                        <span
                          className={
                            ratio > 0.3
                              ? "font-semibold text-blue-600"
                              : ratio > 0.15
                              ? "text-slate-700"
                              : "text-slate-400"
                          }
                        >
                          {(ratio * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
