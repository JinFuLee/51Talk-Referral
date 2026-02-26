"use client";

import { useSummary, useProductivity, usePrediction, useTranslation } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";
import { formatRevenue } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { PredictionCard } from "@/components/analysis/PredictionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { ProductivityData } from "@/lib/types/analysis";
import type { SummaryData } from "@/lib/types";




export default function BizTeamPage() {
  const { t } = useTranslation();
  const { data: productivityResp, isLoading: pLoading, error: pError } = useProductivity();
  const { data: summaryResp, isLoading: sLoading, error: sError } = useSummary();
  const { data: predResp, isLoading: predLoading } = usePrediction();

  void summaryResp;

  const isError = pError || sError;

  if (pLoading || sLoading || predLoading) {
    return (
      <div className={BIZ_PAGE}>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        数据加载失败，请刷新重试
      </div>
    );
  }

  const prod = productivityResp;
  const ccCount = prod?.roles?.["cc"]?.active_count ?? undefined;
  const ssCount = prod?.roles?.["ss"]?.active_count ?? undefined;
  const ccPerCapita = prod?.roles?.["cc"]?.per_capita ?? 0;
  const ssPerCapita = prod?.roles?.["ss"]?.per_capita ?? 0;
  const dailyTrend = prod?.daily_trend ?? [];

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.team.title")} subtitle={t("biz.team.subtitle")} />

      <ErrorBoundary>
      {/* Team mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">CC 人效</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              📈 趋势正常
            </span>
          </div>
          <div className="text-4xl font-bold text-slate-800">{formatRevenue(ccPerCapita)}/人</div>
          <p className="text-sm text-slate-400 mt-2">{ccCount != null ? `${ccCount} 人在岗` : "人数待更新"} · 前端销售</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">SS 收入人效</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              📈 趋势正常
            </span>
          </div>
          <div className="text-4xl font-bold text-slate-800">{formatRevenue(ssPerCapita)}/人</div>
          <p className="text-sm text-slate-400 mt-2">{ssCount != null ? `${ssCount} 人在岗` : "人数待更新"} · 后端销售（收入人效 = CC 转化 SS leads 产生的收入 / SS 在岗人数）</p>
        </div>
      </div>

      {/* Prediction Cards */}
      <Card title={`🔮 当月业务预测 (E7/E8)`}>
        {predResp ? (
          <PredictionCard data={predResp as Record<string, unknown>} />
        ) : (
          <div className="h-20 flex items-center justify-center text-slate-400 text-sm">暂无预测数据</div>
        )}
      </Card>

      {/* Productivity trend */}
      <Card title="📊 人效日趋势">
        {dailyTrend.length > 0 ? (
          <TrendLineChart
            data={dailyTrend}
            xKey="date"
            lineKeys={["cc_revenue", "ss_revenue"]}
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            暂无日趋势数据
          </div>
        )}
      </Card>

      {/* Achievement overview — 待后端 Achievement API 对接后激活 */}
      <Card title={`✅ ${t("biz.team.card.achievement")}`}>
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <p className="text-sm font-medium text-slate-600 mb-1">达标率评定数据暂未就绪</p>
          <p className="text-xs text-slate-400">待后端聚合接口输出各角色达标指标后自动渲染（24H打卡 / 外呼 / 课前跟进 / 付费覆盖）</p>
        </div>
      </Card>
      </ErrorBoundary>
    </div>
  );
}
