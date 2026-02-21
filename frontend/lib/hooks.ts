/**
 * SWR hooks — 封装 API 请求，供页面使用
 */
import useSWR, { type SWRConfiguration } from "swr";
import {
  analysisAPI,
  datasourcesAPI,
  snapshotsAPI,
  reportsAPI,
  configAPI,
} from "./api";
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
} from "./types";

const REFRESH_30S: SWRConfiguration = { refreshInterval: 30_000 };

// ── Health ─────────────────────────────────────────────────────────────────────

export function useHealth() {
  return useSWR("health", () =>
    fetch("/api/health").then((r) => r.json())
  );
}

// ── Analysis summary ──────────────────────────────────────────────────────────

export function useSummary() {
  return useSWR(
    "analysis/summary",
    () => analysisAPI.getSummary(),
    REFRESH_30S
  );
}

export function useFunnel() {
  return useSWR("analysis/funnel", () => analysisAPI.getFunnel());
}

export function useChannelComparison() {
  return useSWR("analysis/channel-comparison", () =>
    analysisAPI.getChannelComparison()
  );
}

export function useTeamData() {
  return useSWR("analysis/team-data", () => analysisAPI.getTeamData());
}

export function useAnomalies() {
  return useSWR<AnomalyItem[]>("analysis/anomalies", () =>
    analysisAPI.getAnomalies() as Promise<AnomalyItem[]>
  );
}

export function useRiskAlerts() {
  return useSWR<RiskAlert[]>("analysis/risk-alerts", () =>
    analysisAPI.getRiskAlerts() as Promise<RiskAlert[]>
  );
}

export function useROI() {
  return useSWR("analysis/roi", () => analysisAPI.getROI());
}

export function useROICostBreakdown() {
  return useSWR("analysis/roi/cost-breakdown", () =>
    analysisAPI.getROICostBreakdown()
  );
}

export function usePrediction() {
  return useSWR("analysis/prediction", () => analysisAPI.getPrediction());
}

export function useAttribution() {
  return useSWR("analysis/attribution", () => analysisAPI.getAttribution());
}

export function useCCRanking(topN = 10) {
  return useSWR(["analysis/cc-ranking", topN], () =>
    analysisAPI.getCCRanking(topN)
  );
}

export function useSSRanking(topN = 10) {
  return useSWR(["analysis/ss-ranking", topN], () =>
    analysisAPI.getSSRanking(topN)
  );
}

export function useLPRanking(topN = 10) {
  return useSWR(["analysis/lp-ranking", topN], () =>
    analysisAPI.getLPRanking(topN)
  );
}

export function useCohort() {
  return useSWR("analysis/cohort", () => analysisAPI.getCohort());
}

export function useCheckin() {
  return useSWR("analysis/checkin", () => analysisAPI.getCheckin());
}

export function useLeads() {
  return useSWR("analysis/leads", () => analysisAPI.getLeads());
}

export function useFollowup() {
  return useSWR("analysis/followup", () => analysisAPI.getFollowup());
}

export function useTrialFollowup() {
  return useSWR("analysis/trial-followup", () =>
    fetch("/api/analysis/trial-followup").then((r) => r.json())
  );
}

export function useOrders() {
  return useSWR("analysis/orders", () => analysisAPI.getOrders());
}

export function useTrend(compareType: "mom" | "yoy" | "wow" = "mom") {
  return useSWR(["analysis/trend", compareType], () =>
    analysisAPI.getTrend(compareType)
  );
}

export function useLTV() {
  return useSWR("analysis/ltv", () => analysisAPI.getLTV());
}

// ── Biz-view hooks ─────────────────────────────────────────────────────────────

export function useCohortROI() {
  return useSWR("analysis/cohort-roi", () =>
    fetch("/api/analysis/cohort-roi").then((r) => r.json())
  );
}

export function useEnclosure() {
  return useSWR("analysis/enclosure", () =>
    fetch("/api/analysis/enclosure").then((r) => r.json())
  );
}

export function useEnclosureCompare() {
  return useSWR("analysis/enclosure-compare", () =>
    fetch("/api/analysis/enclosure-compare").then((r) => r.json())
  );
}

export function useEnclosureCombined() {
  return useSWR("analysis/enclosure-combined", () =>
    fetch("/api/analysis/enclosure-combined").then((r) => r.json())
  );
}

export function useCheckinImpact() {
  return useSWR("analysis/checkin-impact", () =>
    fetch("/api/analysis/checkin-impact").then((r) => r.json())
  );
}

export function useProductivity() {
  return useSWR("analysis/productivity", () =>
    fetch("/api/analysis/productivity").then((r) => r.json())
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
    () => reportsAPI.list() as Promise<ReportFile[]>
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
  return useSWR<ImpactChainData>("analysis/impact-chain", () =>
    analysisAPI.getImpactChain()
  );
}

export function useRootCause() {
  return useSWR<RootCauseData>("analysis/root-cause", () =>
    analysisAPI.getRootCause()
  );
}

export function useStageEvaluation() {
  return useSWR<StageEvaluation>("analysis/stage-evaluation", () =>
    analysisAPI.getStageEvaluation()
  );
}

export function usePyramidReport() {
  return useSWR<PyramidReport>("analysis/pyramid-report", () =>
    analysisAPI.getPyramidReport()
  );
}

export function usePackageMix() {
  return useSWR("analysis/package-mix", () => analysisAPI.getPackageMix());
}

export function useTeamPackageMix() {
  return useSWR("analysis/team-package-mix", () => analysisAPI.getTeamPackageMix());
}

export function useChannelRevenue() {
  return useSWR("analysis/channel-revenue", () => analysisAPI.getChannelRevenue());
}

export function useOutreachCoverage() {
  return useSWR("analysis/outreach-coverage", () => analysisAPI.getOutreachCoverage());
}

export function useFunnelDetail() {
  return useSWR("analysis/funnel-detail", () => analysisAPI.getFunnelDetail());
}

export function useSectionEfficiency() {
  return useSWR("analysis/section-efficiency", () => analysisAPI.getSectionEfficiency());
}

export function useChannelMoM() {
  return useSWR("analysis/channel-mom", () => analysisAPI.getChannelMoM());
}

export function useRetentionContribution() {
  return useSWR("analysis/retention-contribution", () => analysisAPI.getRetentionContribution());
}

export function useEnclosureChannelMatrix() {
  return useSWR("analysis/enclosure-channel-matrix", () => analysisAPI.getEnclosureChannelMatrix());
}

export function useTimeInterval() {
  return useSWR("analysis/time-interval", () => analysisAPI.getTimeInterval());
}
