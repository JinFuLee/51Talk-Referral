"use client";

import { useState } from "react";
import { usePackageMix, useTeamPackageMix, useChannelRevenue } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { PackageMixChart } from "@/components/biz/PackageMixChart";
import { ChannelRevenueWaterfall } from "@/components/biz/ChannelRevenueWaterfall";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function OrdersAnalysisPage() {
  const { data: pkgData, isLoading: pkgLoading, error: pkgError } = usePackageMix();
  const { data: teamPkgData, isLoading: teamLoading } = useTeamPackageMix();
  const { data: chRevData, isLoading: chLoading, error: chError } = useChannelRevenue();
  const [teamExpanded, setTeamExpanded] = useState(false);

  const isLoading = pkgLoading || chLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const hasError = pkgError || chError;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">订单结构分析</h1>
        <p className="text-sm text-slate-400 mt-1">
          套餐类型占比 (E6) · 小组套餐结构 (E7) · 渠道收入 Waterfall (E8)
        </p>
      </div>

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          部分数据加载失败，请先运行分析引擎
        </div>
      )}

      {/* Top row: package mix (left) + channel revenue waterfall (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="套餐结构分析 (E6)" actions={
          <span className="text-xs text-slate-400">按套餐类型收入占比</span>
        }>
          {pkgData ? (
            pkgData.items.length > 0 ? (
              <PackageMixChart items={pkgData.items} />
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-slate-400">
                E6 数据未接入，请检查 BI-订单_套餐类型占比_D-1 文件
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          )}
        </Card>

        <Card title="渠道收入瀑布图 (E8)" actions={
          chRevData ? (
            <span className="text-xs text-slate-400">
              总计 {formatRevenue(chRevData.total_usd)}
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
                E8 数据未接入，请检查 BI-订单_套餐分渠道金额_D-1 文件
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          )}
        </Card>
      </div>

      {/* Team package breakdown (collapsible) */}
      <Card
        title="小组套餐结构 (E7)"
        actions={
          <button
            onClick={() => setTeamExpanded((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            {teamExpanded ? "收起 ▲" : "展开 ▼"}
          </button>
        }
      >
        {teamExpanded ? (
          teamLoading ? (
            <div className="flex items-center justify-center h-24">
              <Spinner />
            </div>
          ) : teamPkgData && teamPkgData.teams.length > 0 ? (
            <TeamPackageTable teams={teamPkgData.teams} />
          ) : (
            <div className="flex items-center justify-center h-24 text-xs text-slate-400">
              E7 数据未接入，请检查 BI-订单_分小组套餐类型占比_D-1 文件
            </div>
          )
        ) : (
          <p className="text-xs text-slate-400 py-2">
            {teamPkgData && teamPkgData.teams.length > 0
              ? `${teamPkgData.teams.length} 个小组的套餐占比数据，点击展开查看`
              : "E7 数据待接入"}
          </p>
        )}
      </Card>
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
