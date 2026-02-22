"use client";

import { useState } from "react";
import { useCCRanking, useSSRanking, useLPRanking, useTranslation } from "@/lib/hooks";
import { RankingTable } from "@/components/ranking/RankingTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

type RoleTab = "CC" | "SS" | "LP";

export default function RankingPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<RoleTab>("CC");
  const [topN, setTopN] = useState(10);

  const { data: ccData, isLoading: ccLoading } = useCCRanking(topN);
  const { data: ssData, isLoading: ssLoading } = useSSRanking(topN);
  const { data: lpData, isLoading: lpLoading } = useLPRanking(topN);

  const tabs: RoleTab[] = ["CC", "SS", "LP"];
  const dataMap: Record<RoleTab, unknown[] | undefined> = {
    CC: ccData,
    SS: ssData,
    LP: lpData,
  };
  const loadingMap: Record<RoleTab, boolean> = {
    CC: ccLoading,
    SS: ssLoading,
    LP: lpLoading,
  };

  const currentData = dataMap[activeTab] ?? [];
  const isLoading = loadingMap[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("ranking.title")}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500" id="topn-label">{t("ranking.label.showTop")}</span>
          <div role="group" aria-labelledby="topn-label" className="flex gap-1">
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                aria-pressed={topN === n}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  topN === n
                    ? "bg-primary text-primary-foreground"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab}
            {tab === "SS" && (
              <span className="ml-1 text-xs opacity-60">(EA)</span>
            )}
            {tab === "LP" && (
              <span className="ml-1 text-xs opacity-60">(CM)</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <ErrorBoundary>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <RankingTable data={currentData as Record<string, unknown>[]} role={activeTab} />
        )}
      </ErrorBoundary>
    </div>
  );
}
