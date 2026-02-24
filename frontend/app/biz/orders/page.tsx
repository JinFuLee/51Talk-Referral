"use client";

import { useState } from "react";
import { usePackageMix, useTeamPackageMix, useChannelRevenue, useTranslation } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";
import { formatRevenue } from "@/lib/utils";
import { clsx } from "clsx";
import { PackageMixChart } from "@/components/biz/PackageMixChart";
import { ChannelRevenueWaterfall } from "@/components/biz/ChannelRevenueWaterfall";
import { ProductTrendStackedBar } from "@/components/charts/ProductTrendStackedBar";
import { TeamPackageCompare } from "@/components/charts/TeamPackageCompare";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { key: "analysis", label: "订单分析" },
  { key: "detail", label: "订单详析" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Shared helper ─────────────────────────────────────────────────────────────

interface TeamItem {
  product_type: string;
  ratio: number;
}

interface TeamRow {
  team: string;
  items: TeamItem[];
}

function TeamPackageTable({ teams }: { teams: TeamRow[] }) {
  const allTypes = Array.from(
    new Set(teams.flatMap((t) => t.items.map((i) => i.product_type)))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-600">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 pr-3 font-medium text-slate-400 whitespace-nowrap">小组</th>
            {allTypes.map((type) => (
              <th key={type} className="text-right py-2 px-2 font-medium text-slate-400 whitespace-nowrap">
                {type}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const itemMap: Record<string, number> = {};
            team.items.forEach((i) => { itemMap[i.product_type] = i.ratio; });
            return (
              <tr key={team.team} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-2 pr-3 font-medium text-slate-700 whitespace-nowrap">{team.team}</td>
                {allTypes.map((type) => {
                  const ratio = itemMap[type];
                  return (
                    <td key={type} className="text-right py-2 px-2">
                      {ratio != null ? (
                        <span className={
                          ratio > 0.3 ? "font-semibold text-blue-600"
                          : ratio > 0.15 ? "text-slate-700"
                          : "text-slate-400"
                        }>
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

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

function AnalysisTab() {
  const { t } = useTranslation();
  const { data: pkgData, isLoading: pkgLoading, error: pkgError } = usePackageMix();
  const { data: teamPkgData, isLoading: teamLoading } = useTeamPackageMix();
  const { data: chRevData, isLoading: chLoading, error: chError } = useChannelRevenue();
  const [teamExpanded, setTeamExpanded] = useState(false);

  const isLoading = pkgLoading || chLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
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
    <div className="space-y-8">
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {t("biz.orders.label.loadError")}
        </div>
      )}

      <ErrorBoundary>
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

function DetailTab() {
  const { t } = useTranslation();
  const { data: pkgData, isLoading: pkgLoading, error: pkgError } = usePackageMix();
  const { data: teamPkgData, isLoading: teamLoading, error: teamError } = useTeamPackageMix();
  const { data: chRevData, isLoading: chLoading, error: chError } = useChannelRevenue();

  const isLoading = pkgLoading || teamLoading || chLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
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
    <div className="space-y-8">
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {t("biz.orders-detail.label.loadError")}
        </div>
      )}

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersAnalysisPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("analysis");

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.orders.title")} subtitle={t("biz.orders.subtitle")} />

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "analysis" && <AnalysisTab />}
      {activeTab === "detail" && <DetailTab />}
    </div>
  );
}
