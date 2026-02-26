/**
 * SWR hooks — 封装 API 请求，供页面使用
 */
import useSWR, { type SWRConfiguration } from "swr";
import { useCallback } from "react";
import { zhTranslations, thTranslations } from "./translations";
import {
  analysisAPI,
  datasourcesAPI,
  snapshotsAPI,
  reportsAPI,
  configAPI,
  swrFetcher,
  periodQuery,
} from "./api";
import { useConfigStore } from "./stores/config-store";
import type {
  DataSourceStatus,
  SnapshotStats,
  DailyKPIPoint,
  CCGrowthAPIPoint,
  ReportFile,
  MonthlyTarget,
  ExchangeRate,
  AnomalyItem,
  RiskAlert,
  MonthlyTargetV2,
  TargetRecommendation,
  ImpactChainData,
  RootCauseData,
  StageEvaluation,
  PyramidReport,
  ComparisonResponse,
  LeadsOverviewData,
} from "./types";
import type { CCDetailData } from "./types/analysis";

const REFRESH_30S: SWRConfiguration = { refreshInterval: 30_000 };

// ── Health ─────────────────────────────────────────────────────────────────────

export function useHealth() {
  return useSWR("/api/health", swrFetcher);
}

// ── Analysis summary ──────────────────────────────────────────────────────────

export function useSummary() {
  const period = useConfigStore((s) => s.period);
  return useSWR(
    ["analysis/summary", period],
    () => analysisAPI.getSummary(period),
    REFRESH_30S
  );
}

export function useFunnel() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/funnel", period], () => analysisAPI.getFunnel(period));
}

export function useChannelComparison() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/channel-comparison", period], () =>
    analysisAPI.getChannelComparison(period)
  );
}

export function useTeamData() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/team-data", period], () =>
    analysisAPI.getTeamData(period)
  );
}

export function useAnomalies() {
  const period = useConfigStore((s) => s.period);
  return useSWR<AnomalyItem[]>(["analysis/anomalies", period], () =>
    analysisAPI.getAnomalies(period) as Promise<AnomalyItem[]>
  );
}

export function useRiskAlerts() {
  const period = useConfigStore((s) => s.period);
  return useSWR<RiskAlert[]>(["analysis/risk-alerts", period], () =>
    analysisAPI.getRiskAlerts(period) as Promise<RiskAlert[]>
  );
}

export function useROI() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/roi", period], () => analysisAPI.getROI(period));
}

export function useROICostBreakdown() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/roi/cost-breakdown", period], () =>
    analysisAPI.getROICostBreakdown(period)
  );
}

export function usePrediction() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/prediction", period], () =>
    analysisAPI.getPrediction(period)
  );
}

export function useAttribution() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/attribution", period], () =>
    analysisAPI.getAttribution(period)
  );
}

export function useCCRanking(topN = 10) {
  const period = useConfigStore((s) => s.period);
  const focusCC = useConfigStore((s) => s.focusCC);
  const params = new URLSearchParams({ top_n: String(topN), period });
  if (focusCC) params.set("cc_name", focusCC);
  const key = `/api/analysis/cc-ranking?${params.toString()}`;
  return useSWR(["analysis/cc-ranking", topN, period, focusCC], () =>
    swrFetcher(key)
  );
}

export function useSSRanking(topN = 10) {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/ss-ranking", topN, period], () =>
    analysisAPI.getSSRanking(topN, period)
  );
}

export function useLPRanking(topN = 10) {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/lp-ranking", topN, period], () =>
    analysisAPI.getLPRanking(topN, period)
  );
}

export function useCohort() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/cohort", period], () => analysisAPI.getCohort(period));
}

export function useCheckin() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/checkin", period], () =>
    analysisAPI.getCheckin(period)
  );
}

export function useLeads() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/leads", period], () => analysisAPI.getLeads(period));
}

export function useFollowup() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/followup", period], () =>
    analysisAPI.getFollowup(period)
  );
}

export function useTrialFollowup() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/trial-followup", period], () =>
    swrFetcher(`/api/analysis/trial-followup${periodQuery(period)}`)
  );
}

export function useOrders() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/orders", period], () =>
    analysisAPI.getOrders(period)
  );
}

export function useTrend(compareType: "mom" | "yoy" | "wow" = "mom") {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/trend", compareType, period], () =>
    analysisAPI.getTrend(compareType, period)
  );
}

export function useLTV() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/ltv", period], () => analysisAPI.getLTV(period));
}

// ── Biz-view hooks ─────────────────────────────────────────────────────────────

export function useCohortROI() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/cohort-roi", period], () =>
    swrFetcher(`/api/analysis/cohort-roi${periodQuery(period)}`)
  );
}

export function useEnclosure() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/enclosure", period], () =>
    swrFetcher(`/api/analysis/enclosure${periodQuery(period)}`)
  );
}

export function useEnclosureCompare() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/enclosure-compare", period], () =>
    swrFetcher(`/api/analysis/enclosure-compare${periodQuery(period)}`)
  );
}

export function useEnclosureCombined() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/enclosure-combined", period], () =>
    swrFetcher(`/api/analysis/enclosure-combined${periodQuery(period)}`)
  );
}

export function useCheckinImpact() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/checkin-impact", period], () =>
    swrFetcher(`/api/analysis/checkin-impact${periodQuery(period)}`)
  );
}

export function useProductivity() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/productivity", period], () =>
    swrFetcher(`/api/analysis/productivity${periodQuery(period)}`)
  );
}

// ── Data Sources ──────────────────────────────────────────────────────────────

export function useDataSources() {
  return useSWR<DataSourceStatus[]>(
    "datasources/status",
    () => datasourcesAPI.getStatus() as Promise<DataSourceStatus[]>,
    REFRESH_30S
  );
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export function useSnapshotStats() {
  return useSWR<SnapshotStats>(
    "snapshots/stats",
    () => snapshotsAPI.getStats() as Promise<SnapshotStats>
  );
}

export function useDailyKPI(params?: {
  date_from?: string;
  date_to?: string;
  metric?: string;
}) {
  return useSWR<DailyKPIPoint[]>(
    ["snapshots/daily-kpi", params],
    () => snapshotsAPI.getDailyKPI(params) as Promise<DailyKPIPoint[]>
  );
}

export function useCCGrowth(
  ccName: string,
  params?: { date_from?: string; date_to?: string }
) {
  return useSWR<CCGrowthAPIPoint[]>(
    ccName ? ["snapshots/cc-growth", ccName, params] : null,
    () =>
      snapshotsAPI.getCCGrowth(ccName, params) as Promise<CCGrowthAPIPoint[]>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function useReportList() {
  return useSWR<ReportFile[]>(
    "reports/list",
    async (): Promise<ReportFile[]> => {
      const res = await reportsAPI.list();
      // API returns { reports: [{filename, date}] }; backfill optional fields for ReportFile
      return res.reports.map((r) => ({
        filename: r.filename,
        report_type: "unknown" as const,
        date: r.date,
        size_bytes: 0,
        path: r.filename,
      }));
    }
  );
}

export function useLatestReports() {
  return useSWR("reports/latest", () => reportsAPI.getLatest());
}

// ── Config ────────────────────────────────────────────────────────────────────

export function useMonthlyTargets() {
  return useSWR<MonthlyTarget[]>(
    "config/monthly-targets",
    () => configAPI.getMonthlyTargets() as Promise<MonthlyTarget[]>
  );
}

export function useExchangeRate() {
  return useSWR<ExchangeRate>(
    "config/exchange-rate",
    () => configAPI.getExchangeRate()
  );
}

// ── V2 目标计算 Hook ──────────────────────────────────────────────────────────

export function useTargetsV2(month: string | null) {
  return useSWR<MonthlyTargetV2>(
    month ? ["config/targets-v2", month] : null,
    () => configAPI.getTargetsV2(month!)
  );
}

export function useTargetRecommendation(month: string | null) {
  return useSWR<TargetRecommendation>(
    month ? ["config/targets-recommend", month] : null,
    () => configAPI.getRecommendation(month!)
  );
}

export function useImpactChain() {
  const period = useConfigStore((s) => s.period);
  return useSWR<ImpactChainData>(["analysis/impact-chain", period], () =>
    analysisAPI.getImpactChain(period)
  );
}

export function useRootCause() {
  const period = useConfigStore((s) => s.period);
  return useSWR<RootCauseData>(["analysis/root-cause", period], () =>
    analysisAPI.getRootCause(period)
  );
}

export function useStageEvaluation() {
  const period = useConfigStore((s) => s.period);
  return useSWR<StageEvaluation>(["analysis/stage-evaluation", period], () =>
    analysisAPI.getStageEvaluation(period)
  );
}

export function usePyramidReport() {
  const period = useConfigStore((s) => s.period);
  return useSWR<PyramidReport>(["analysis/pyramid-report", period], () =>
    analysisAPI.getPyramidReport(period)
  );
}

export function usePackageMix() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/package-mix", period], () =>
    analysisAPI.getPackageMix(period)
  );
}

export function useTeamPackageMix() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/team-package-mix", period], () =>
    analysisAPI.getTeamPackageMix(period)
  );
}

export function useChannelRevenue() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/channel-revenue", period], () =>
    analysisAPI.getChannelRevenue(period)
  );
}

export function useOutreachCoverage() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/outreach-coverage", period], () =>
    analysisAPI.getOutreachCoverage(period)
  );
}

export function useFunnelDetail() {
  const period = useConfigStore((s) => s.period);
  const focusCC = useConfigStore((s) => s.focusCC);
  const params = new URLSearchParams();
  if (period && period !== "this_month") params.set("period", period);
  if (focusCC) params.set("cc_name", focusCC);
  const qs = params.toString();
  const key = `/api/analysis/funnel-detail${qs ? "?" + qs : ""}`;
  return useSWR(["analysis/funnel-detail", period, focusCC], () =>
    swrFetcher(key)
  );
}

export function useOutreachHeatmap() {
  const focusCC = useConfigStore((s) => s.focusCC);
  const params = new URLSearchParams();
  if (focusCC) params.set("cc_name", focusCC);
  const qs = params.toString();
  const key = `/api/analysis/outreach-heatmap${qs ? "?" + qs : ""}`;
  return useSWR(["analysis/outreach-heatmap", focusCC], () =>
    swrFetcher(key)
  );
}

export function useSectionEfficiency() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/section-efficiency", period], () =>
    analysisAPI.getSectionEfficiency(period)
  );
}

export function useChannelMoM() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/channel-mom", period], () =>
    analysisAPI.getChannelMoM(period)
  );
}

export function useRetentionContribution() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/retention-contribution", period], () =>
    analysisAPI.getRetentionContribution(period)
  );
}

export function useEnclosureChannelMatrix() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/enclosure-channel-matrix", period], () =>
    analysisAPI.getEnclosureChannelMatrix(period)
  );
}

export function useTimeInterval() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/time-interval", period], () =>
    analysisAPI.getTimeInterval(period)
  );
}

export function useProductivityHistory() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/productivity-history", period], () =>
    analysisAPI.getProductivityHistory(period)
  );
}

export function useOutreachGap() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/outreach-gap", period], () =>
    analysisAPI.getOutreachGap(period)
  );
}

export function useEnclosureHealth() {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/enclosure-health", period], () =>
    analysisAPI.getEnclosureHealth(period)
  );
}

export function useCCRankingEnhanced(topN = 20) {
  const period = useConfigStore((s) => s.period);
  return useSWR(["analysis/cc-ranking-enhanced", topN, period], () =>
    analysisAPI.getCCRankingEnhanced(topN, period)
  );
}

export function useCompareSummary() {
  const period = useConfigStore((s) => s.period);
  const compareMode = useConfigStore((s) => s.compareMode);

  return useSWR<ComparisonResponse>(
    compareMode !== 'off' ? ["analysis/compare-summary", period, compareMode] : null,
    () => analysisAPI.getCompareSummary(period, compareMode)
  );
}

export function useKPISparkline(days = 14) {
  return useSWR(
    ["analysis/kpi-sparkline", days],
    () => analysisAPI.getKPISparkline(days)
  );
}

export function useLeadsOverview(scope: string = 'total') {
  const period = useConfigStore((s) => s.period);
  return useSWR<LeadsOverviewData>(
    ["analysis/leads-overview", scope, period],
    () => analysisAPI.getLeadsOverview(scope, period)
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

export { useNotificationStore } from "./stores/notification-store";
import { useNotificationStore as _useNotificationStore } from "./stores/notification-store";

export function useNotifications() {
  return _useNotificationStore();
}

// ── CC Drawer ─────────────────────────────────────────────────────────────────

export function useCCDetail(ccName: string | null) {
  return useSWR<CCDetailData>(
    ccName ? `/api/analysis/cc-detail/${encodeURIComponent(ccName)}` : null,
    swrFetcher
  );
}

// ── i18n ──────────────────────────────────────────────────────────────────────

export function useTranslation() {
  const language = useConfigStore((s) => s.language);
  const translations = language === "th" ? thTranslations : zhTranslations;
  const t = useCallback(
    (key: string, fallback?: string): string => {
      return (translations as Record<string, string>)[key] ?? fallback ?? key;
    },
    [translations]
  );
  return { t };
}
