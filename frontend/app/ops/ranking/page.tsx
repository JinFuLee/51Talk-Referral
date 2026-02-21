"use client";

import { useState } from "react";
import { useCCRanking, useSSRanking, useLPRanking } from "@/lib/hooks";
import { RadarChart360 } from "@/components/charts/RadarChart360";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { RankingItem } from "@/lib/types";
// RankingData used locally for shape detection
interface RankingData { items: RankingItem[] }

type RoleTab = "CC" | "SS" | "LP";

function toRadarData(item: RankingItem) {
  const detail = (item.detail ?? {}) as Record<string, number>;
  return [
    { subject: "触达率", value: Math.round(((detail.contact_rate ?? item.contact_rate ?? 0) as number) * 100) },
    { subject: "打卡率", value: Math.round(((detail.checkin_rate ?? item.checkin_rate ?? 0) as number) * 100) },
    { subject: "参与率", value: Math.round(((detail.participation_rate ?? 0) as number) * 100) },
    { subject: "转化率", value: Math.round(((detail.conversion_rate ?? 0) as number) * 100) },
    { subject: "注册", value: Math.min(Math.round((((detail.registrations ?? item.registrations ?? 0) as number) / 50) * 100), 100) },
    { subject: "付费", value: Math.min(Math.round((((detail.payments ?? item.payments ?? 0) as number) / 20) * 100), 100) },
    { subject: "带新系数", value: Math.min(Math.round(((detail.new_coefficient ?? 0) as number) * 50), 100) },
    { subject: "综合", value: Math.round(Math.min(item.composite_score ?? 0, 100)) },
  ];
}

export default function OpsRankingPage() {
  const [activeTab, setActiveTab] = useState<RoleTab>("CC");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const { data: ccRaw, isLoading: loadingCC } = useCCRanking(20);
  const { data: ssRaw, isLoading: loadingSS } = useSSRanking(20);
  const { data: lpRaw, isLoading: loadingLP } = useLPRanking(20);

  // API returns RankingData (with .items) or RankingItem[] array directly
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-none space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">人员排名</h1>
          <p className="text-xs text-slate-400 mt-0.5">CC / SS / LP 综合得分排行</p>
        </div>
      </div>

      {/* Role tabs */}
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

      {/* Table + Radar grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["排名", "姓名", "综合分", "注册", "付费", "触达率", "打卡率", "参与率", "带新系数", "转化率"].map((h) => (
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
                        暂无排名数据，请先运行分析
                      </td>
                    </tr>
                  ) : (
                    items.map((item, i) => (
                      <tr
                        key={i}
                        onClick={() => setSelectedIndex(i)}
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
                          {item.contact_rate !== undefined ? `${(item.contact_rate * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.checkin_rate !== undefined ? `${(item.checkin_rate * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(item as Record<string, unknown>).participation_rate !== undefined
                            ? `${(((item as Record<string, unknown>).participation_rate as number) * 100).toFixed(1)}%`
                            : (item.detail as Record<string, number> | undefined)?.participation_rate !== undefined
                            ? `${(((item.detail as Record<string, number>).participation_rate) * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(item.detail as Record<string, number> | undefined)?.new_coefficient !== undefined
                            ? ((item.detail as Record<string, number>).new_coefficient).toFixed(2)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(item as Record<string, unknown>).conversion_rate !== undefined
                            ? `${(((item as Record<string, unknown>).conversion_rate as number) * 100).toFixed(1)}%`
                            : (item.detail as Record<string, number> | undefined)?.conversion_rate !== undefined
                            ? `${(((item.detail as Record<string, number>).conversion_rate) * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Radar */}
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
    </div>
  );
}
