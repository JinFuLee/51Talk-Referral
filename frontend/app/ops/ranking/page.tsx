"use client";

import { useState } from "react";
import { useCCRanking, useSSRanking, useLPRanking, useTranslation } from "@/lib/hooks";
import { RadarChart360 } from "@/components/charts/RadarChart360";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { useConfigStore } from "@/lib/stores/config-store";
import type { RankingItem } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

interface RankingData { items: RankingItem[] }

type RoleTab = "CC" | "SS" | "LP";

function getDetailVal(detail: any, key: string, fallback: any = 0): number {
  if (!detail || detail[key] == null) return fallback;
  const val = detail[key];
  const res = (typeof val === "object" && val !== null && "raw" in val) ? val.raw : val;
  return res == null ? fallback : Number(res) || 0;
}

function toRadarData(item: RankingItem) {
  const detail = item.detail ?? {};
  return [
    { subject: "触达率", value: Math.round((getDetailVal(detail, "contact_rate", item.contact_rate) as number) * 100) },
    { subject: "打卡率", value: Math.round((getDetailVal(detail, "checkin_rate", item.checkin_rate) as number) * 100) },
    { subject: "参与率", value: Math.round((getDetailVal(detail, "participation_rate") as number) * 100) },
    { subject: "转化率", value: Math.round((getDetailVal(detail, "conversion_rate") as number) * 100) },
    { subject: "注册", value: Math.min(Math.round(((getDetailVal(detail, "registrations", item.registrations) as number) / 50) * 100), 100) },
    { subject: "付费", value: Math.min(Math.round(((getDetailVal(detail, "paid_count", item.payments) as number) / 20) * 100), 100) },
    { subject: "带新系数", value: Math.min(Math.round((getDetailVal(detail, "bring_new_coeff", getDetailVal(detail, "new_coefficient")) as number) * 50), 100) },
    { subject: "综合", value: Math.round(Math.min(item.composite_score ?? 0, 100)) },
  ];
}

export default function OpsRankingPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<RoleTab>("CC");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const setSelectionContext = useConfigStore((s) => s.setSelectionContext);

  const { data: ccRaw, isLoading: loadingCC } = useCCRanking(100);
  const { data: ssRaw, isLoading: loadingSS } = useSSRanking(100);
  const { data: lpRaw, isLoading: loadingLP } = useLPRanking(100);

  function extractItems(raw: unknown): RankingItem[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as RankingItem[];
    const d = raw as RankingData;
    if (Array.isArray(d.items)) return d.items;
    return [];
  }

  const roleMap: Record<RoleTab, RankingItem[]> = {
    CC: extractItems(ccRaw),
    SS: extractItems(ssRaw),
    LP: extractItems(lpRaw),
  };

  const isLoading = loadingCC || loadingSS || loadingLP;
  const items = roleMap[activeTab];
  const selected = items[selectedIndex];

  const headers = [
    t("ops.ranking.table.rank"),
    t("ops.ranking.table.name"),
    t("ops.ranking.table.score"),
    t("ops.ranking.table.registrations"),
    t("ops.ranking.table.payments"),
    t("ops.ranking.table.contactRate"),
    t("ops.ranking.table.checkinRate"),
    t("ops.ranking.table.participationRate"),
    t("ops.ranking.table.newCoeff"),
    t("ops.ranking.table.convRate"),
  ];

  if (isLoading) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="lg:col-span-3 h-64" />
          <Skeleton className="lg:col-span-2 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.ranking.title")} subtitle={t("ops.ranking.subtitle")} />

      <div className="flex gap-1 border-b border-slate-200">
        {(["CC", "SS", "LP"] as RoleTab[]).map((role) => (
          <button
            key={role}
            onClick={() => { setActiveTab(role); setSelectedIndex(0); }}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === role
                ? "bg-white border border-b-white border-slate-200 text-blue-600 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {role}
            <span className="ml-1.5 text-xs text-slate-400">({roleMap[role].length})</span>
          </button>
        ))}
      </div>

      <ErrorBoundary>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-xs">
                          {t("ops.ranking.label.noData")}
                        </td>
                      </tr>
                    ) : (
                      items.map((item, i) => (
                        <tr
                          key={(item as Record<string, unknown>).cc_name as string ?? item.name ?? i}
                          onClick={() => {
                            setSelectedIndex(i);
                            const name = (item as Record<string, unknown>).cc_name as string ?? item.name;
                            if (name) setSelectionContext({ type: 'cc', value: name });
                          }}
                          className={`border-b border-slate-100 cursor-pointer transition-colors ${
                            selectedIndex === i ? "bg-blue-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-slate-800">#{item.rank}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{(item as Record<string, unknown>).cc_name as string ?? item.name}</td>
                          <td className="px-4 py-3 text-slate-700">{(item.composite_score ?? 0).toFixed(1)}</td>
                          <td className="px-4 py-3 text-slate-600">{item.registrations ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{item.payments ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.contact_rate !== undefined ? `${(item.contact_rate * 100).toFixed(1)}%` : `${(getDetailVal(item.detail, "contact_rate") * 100).toFixed(1)}%`}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.checkin_rate !== undefined ? `${(item.checkin_rate * 100).toFixed(1)}%` : `${(getDetailVal(item.detail, "checkin_rate") * 100).toFixed(1)}%`}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(item as Record<string, unknown>).participation_rate !== undefined
                              ? `${(((item as Record<string, unknown>).participation_rate as number) * 100).toFixed(1)}%`
                              : `${((getDetailVal(item.detail, "participation_rate")) * 100).toFixed(1)}%`}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(getDetailVal(item.detail, "bring_new_coeff", getDetailVal(item.detail, "new_coefficient"))).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(item as Record<string, unknown>).conversion_rate !== undefined
                              ? `${(((item as Record<string, unknown>).conversion_rate as number) * 100).toFixed(1)}%`
                              : `${((getDetailVal(item.detail, "conversion_rate")) * 100).toFixed(1)}%`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card title={selected ? `${((selected as Record<string, unknown>).cc_name as string) ?? selected.name} — 360° 指标` : "360° 雷达图"}>
              <RadarChart360
                data={selected ? toRadarData(selected) : []}
                name={selected?.name ?? ""}
                color="hsl(var(--chart-2))"
              />
              {selected && (
                <p className="text-xs text-slate-400 text-center mt-1">
                  综合得分 {(selected.composite_score ?? 0).toFixed(1)} · 过程 {(((selected as Record<string, unknown>).process_score as number) ?? 0).toFixed(1)} · 结果 {(((selected as Record<string, unknown>).result_score as number) ?? 0).toFixed(1)} · 效率 {(((selected as Record<string, unknown>).efficiency_score as number) ?? 0).toFixed(1)}
                </p>
              )}
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
