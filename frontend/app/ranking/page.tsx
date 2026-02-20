"use client";

import { useState } from "react";
import { useCCRanking, useSSRanking, useLPRanking } from "@/lib/hooks";
import { RankingTable } from "@/components/ranking/RankingTable";
import { Spinner } from "@/components/ui/Spinner";

type RoleTab = "CC" | "SS" | "LP";

export default function RankingPage() {
  const [activeTab, setActiveTab] = useState<RoleTab>("CC");
  const [topN, setTopN] = useState(10);

  const { data: ccData, isLoading: ccLoading } = useCCRanking(topN);
  const { data: ssData, isLoading: ssLoading } = useSSRanking(topN);
  const { data: lpData, isLoading: lpLoading } = useLPRanking(topN);

  const tabs: RoleTab[] = ["CC", "SS", "LP"];
  const dataMap: Record<RoleTab, unknown[] | undefined> = {
    CC: ccData as unknown[],
    SS: ssData as unknown[],
    LP: lpData as unknown[],
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
        <h1 className="text-2xl font-bold text-slate-800">绩效排名</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">显示前</span>
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              onClick={() => setTopN(n)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                topN === n
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-brand-600 text-white shadow-sm"
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
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <RankingTable data={currentData as Record<string, unknown>[]} role={activeTab} />
      )}
    </div>
  );
}
