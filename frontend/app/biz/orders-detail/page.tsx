"use client";

import { usePackageMix, useTeamPackageMix, useChannelRevenue } from "@/lib/hooks";
import { formatRevenue } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ProductTrendStackedBar } from "@/components/charts/ProductTrendStackedBar";
import { TeamPackageCompare } from "@/components/charts/TeamPackageCompare";
import { ChannelRevenueWaterfall } from "@/components/charts/ChannelRevenueWaterfall";

export default function OrdersDetailPage() {
  const { data: pkgData, isLoading: pkgLoading, error: pkgError } = usePackageMix();
  const { data: teamPkgData, isLoading: teamLoading, error: teamError } = useTeamPackageMix();
  const { data: chRevData, isLoading: chLoading, error: chError } = useChannelRevenue();

  const isLoading = pkgLoading || teamLoading || chLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const hasError = pkgError || teamError || chError;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">订单高级分析</h1>
        <p className="text-sm text-slate-400 mt-1">
          产品类型堆叠收入 (E4) · 小组套餐雷达对比 (E7) · 渠道收入瀑布图 (E8)
        </p>
      </div>

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          部分数据加载失败，请先运行分析引擎
        </div>
      )}

      {/* E4 — Product type stacked bar */}
      <Card
        title="产品类型收入堆叠图 (E4)"
        actions={
          pkgData ? (
            <span className="text-xs text-slate-400">
              总计 {formatRevenue(pkgData.items.reduce((s: number, i: { revenue_usd: number }) => s + i.revenue_usd, 0))}
            </span>
          ) : null
        }
      >
        {pkgData ? (
          pkgData.items.length > 0 ? (
            <ProductTrendStackedBar items={pkgData.items} />
          ) : (
            <div className="flex items-center justify-center h-40 text-xs text-slate-400">
              E4 数据未接入，请检查 BI-订单_套餐类型占比_D-1 文件
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-40">
            <Spinner />
          </div>
        )}
      </Card>

      {/* Bottom row: E7 radar (left) + E8 waterfall (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E7 — Team package radar */}
        <Card
          title="小组套餐结构雷达图 (E7)"
          actions={
            teamPkgData ? (
              <span className="text-xs text-slate-400">
                {teamPkgData.teams.length} 个小组
              </span>
            ) : null
          }
        >
          {teamPkgData ? (
            teamPkgData.teams.length > 0 ? (
              <TeamPackageCompare teams={teamPkgData.teams} />
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-slate-400">
                E7 数据未接入，请检查 BI-订单_分小组套餐类型占比_D-1 文件
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          )}
        </Card>

        {/* E8 — Channel revenue waterfall */}
        <Card
          title="渠道收入瀑布图 (E8)"
          actions={
            chRevData ? (
              <span className="text-xs text-slate-400">
                总计 {formatRevenue(chRevData.total_usd)}
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
    </div>
  );
}
