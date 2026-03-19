/**
 * API client — 所有对 FastAPI 后端（127.0.0.1:8100）的请求封装
 * 通过 Next.js rewrites: /api/* → http://127.0.0.1:8100/api/*
 */
import type {
  MonthlyTarget,
  MonthlyTargetV2,
  TargetRecommendation,
  ImpactChainData,
  WhatIfResult,
  RootCauseData,
  StageEvaluation,
  PyramidReport,
  ComparisonResponse,
  LeadsOverviewData,
  AnalysisResult,
  FunnelData,
  ChannelComparisonData,
  TeamMemberData,
  AnomalyItem,
  RiskAlert,
  ROIData,
  ROICostBreakdownData,
  PredictionData,
  AttributionData,
  RankingItem,
  CohortData,
  CheckinData,
  LeadsData,
  FollowupData,
  OrderData,
  TrendData,
  LTVData,
  DataSourceStatus,
  SnapshotStats,
  DailyKPIPoint,
  CCGrowthAPIPoint,
  FunnelDetailData,
  SectionEfficiencyData,
  ChannelMoMData,
  OutreachCoverageData,
  OutreachGapData,
  EnclosureHealthData,
  CCRankingEnhancedData,
  RetentionContributionData,
  EnclosureChannelMatrixData,
  TimeIntervalData,
  ProductivityHistoryData,
} from "./types";
import { errorLogger } from "./error-logger";

const BASE = "/api";

export function periodQuery(
  period?: string,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams();
  if (period && period !== "this_month") {
    params.set("period", period);
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null) params.set(k, v);
    }
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    errorLogger.capture({
      type: "api_error",
      message: `API ${res.status}: ${text}`,
      api: path,
      status: res.status,
      response: text.slice(0, 500),
    });
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────

export const healthAPI = {
  get: () => request<{ status: string; version: string }>("/health"),
};

// ── Analysis ─────────────────────────────────────────────────────────────────

export const analysisAPI = {
  run: (params?: {
    input_dir?: string;
    report_date?: string;
    lang?: string;
    period?: string;
    custom_start?: string;
    custom_end?: string;
  }) =>
    request<{ status: string; summary: Record<string, unknown> }>("/analysis/run", {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    }),

  getResult: (period?: string) =>
    request<AnalysisResult>(`/analysis/result${periodQuery(period)}`),
  getSummary: (period?: string) =>
    request<{ summary: AnalysisResult["summary"]; meta: Record<string, unknown>; time_progress: number }>(
      `/analysis/summary${periodQuery(period)}`
    ),
  getFunnel: (period?: string) =>
    request<FunnelData>(`/analysis/funnel${periodQuery(period)}`),
  getChannelComparison: (period?: string) =>
    request<ChannelComparisonData>(`/analysis/channel-comparison${periodQuery(period)}`),
  getTeamData: (period?: string) =>
    request<TeamMemberData[]>(`/analysis/team-data${periodQuery(period)}`),
  getAnomalies: (period?: string) =>
    request<AnomalyItem[]>(`/analysis/anomalies${periodQuery(period)}`),
  getRiskAlerts: (period?: string) =>
    request<RiskAlert[]>(`/analysis/risk-alerts${periodQuery(period)}`),
  getROI: (period?: string) =>
    request<ROIData>(`/analysis/roi${periodQuery(period)}`),
  getROICostBreakdown: (period?: string) =>
    request<ROICostBreakdownData>(`/analysis/roi/cost-breakdown${periodQuery(period)}`),
  getPrediction: (period?: string) =>
    request<PredictionData>(`/analysis/prediction${periodQuery(period)}`),
  getAttribution: (period?: string) =>
    request<AttributionData>(`/analysis/attribution${periodQuery(period)}`),
  getCCRanking: (topN = 10, period?: string) =>
    request<RankingItem[]>(
      `/analysis/cc-ranking${periodQuery(period, { top_n: String(topN) })}`
    ),
  getSSRanking: (topN = 10, period?: string) =>
    request<RankingItem[]>(
      `/analysis/ss-ranking${periodQuery(period, { top_n: String(topN) })}`
    ),
  getLPRanking: (topN = 10, period?: string) =>
    request<RankingItem[]>(
      `/analysis/lp-ranking${periodQuery(period, { top_n: String(topN) })}`
    ),
  getCohort: (period?: string) =>
    request<CohortData>(`/analysis/cohort${periodQuery(period)}`),
  getCheckin: (period?: string) =>
    request<CheckinData>(`/analysis/checkin${periodQuery(period)}`),
  getLeads: (period?: string) =>
    request<LeadsData>(`/analysis/leads${periodQuery(period)}`),
  getFollowup: (period?: string) =>
    request<FollowupData>(`/analysis/followup${periodQuery(period)}`),
  getOrders: (period?: string) =>
    request<OrderData>(`/analysis/orders${periodQuery(period)}`),
  getTrend: (compareType: "mom" | "yoy" | "wow" = "mom", period?: string) =>
    request<TrendData>(
      `/analysis/trend${periodQuery(period, { compare_type: compareType })}`
    ),
  getLTV: (period?: string) =>
    request<LTVData>(`/analysis/ltv${periodQuery(period)}`),
  getImpactChain: (period?: string) =>
    request<ImpactChainData>(`/analysis/impact-chain${periodQuery(period)}`),
  postWhatIf: (metric: string, newValue: number, period?: string) =>
    request<WhatIfResult>("/analysis/what-if", {
      method: "POST",
      body: JSON.stringify({
        metric,
        new_value: newValue,
        ...(period && period !== "this_month" ? { period } : {}),
      }),
    }),
  getRootCause: (period?: string) =>
    request<RootCauseData>(`/analysis/root-cause${periodQuery(period)}`),
  getStageEvaluation: (period?: string) =>
    request<StageEvaluation>(`/analysis/stage-evaluation${periodQuery(period)}`),
  getPyramidReport: (period?: string) =>
    request<PyramidReport>(`/analysis/pyramid-report${periodQuery(period)}`),
  getPackageMix: (period?: string) =>
    request<{
      items: Array<{
        product_type: string;
        count: number;
        revenue_usd: number;
        percentage: number;
      }>;
    }>(`/analysis/package-mix${periodQuery(period)}`),
  getTeamPackageMix: (period?: string) =>
    request<{
      teams: Array<{
        team: string;
        items: Array<{ product_type: string; ratio: number }>;
      }>;
    }>(`/analysis/team-package-mix${periodQuery(period)}`),
  getChannelRevenue: (period?: string) =>
    request<{
      channels: Array<{
        channel: string;
        revenue_usd: number;
        revenue_thb: number;
        percentage: number;
      }>;
      total_usd: number;
    }>(`/analysis/channel-revenue${periodQuery(period)}`),
  getOutreachCoverage: (period?: string) =>
    request<OutreachCoverageData>(`/analysis/outreach-coverage${periodQuery(period)}`),
  getFunnelDetail: (period?: string) =>
    request<FunnelDetailData>(`/analysis/funnel-detail${periodQuery(period)}`),
  getSectionEfficiency: (period?: string) =>
    request<SectionEfficiencyData>(`/analysis/section-efficiency${periodQuery(period)}`),
  getChannelMoM: (period?: string) =>
    request<ChannelMoMData>(`/analysis/channel-mom${periodQuery(period)}`),
  getRetentionContribution: (period?: string) =>
    request<RetentionContributionData>(`/analysis/retention-contribution${periodQuery(period)}`),
  getEnclosureChannelMatrix: (period?: string) =>
    request<EnclosureChannelMatrixData>(`/analysis/enclosure-channel-matrix${periodQuery(period)}`),
  getTimeInterval: (period?: string) =>
    request<TimeIntervalData>(`/analysis/time-interval${periodQuery(period)}`),
  getProductivityHistory: (period?: string) =>
    request<ProductivityHistoryData>(`/analysis/productivity-history${periodQuery(period)}`),
  getOutreachGap: (period?: string) =>
    request<OutreachGapData>(`/analysis/outreach-gap${periodQuery(period)}`),
  getEnclosureHealth: (period?: string) =>
    request<EnclosureHealthData>(`/analysis/enclosure-health${periodQuery(period)}`),
  getCCRankingEnhanced: (topN = 20, period?: string) =>
    request<CCRankingEnhancedData>(
      `/analysis/cc-ranking-enhanced${periodQuery(period, { top_n: String(topN) })}`
    ),
  getCompareSummary: (period?: string, mode?: string) =>
    request<ComparisonResponse>(
      `/analysis/compare-summary${periodQuery(period, { mode: mode ?? 'pop' })}`
    ),
  getKPISparkline: (days = 14) =>
    request<{
      available: boolean;
      days: number;
      metrics: Record<string, {
        daily: { date: string; value: number }[];
        peak: { date: string; value: number } | null;
        valley: { date: string; value: number } | null;
      }>;
      unavailable_reason: string | null;
    }>(`/analysis/kpi-sparkline?days=${days}`),
  getLeadsOverview: (scope = 'total', period?: string) =>
    request<LeadsOverviewData>(
      `/analysis/leads-overview?scope=${scope}${period ? `&period=${period}` : ''}`
    ),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsAPI = {
  generate: () =>
    request<{ status: string; report: { markdown: string; generated_at: string; ai_commentary: string } }>(
      "/reports/generate",
      { method: "POST", body: JSON.stringify({}) }
    ),
  latest: () => request<{ markdown: string; generated_at: string } | null>("/reports/latest"),
  list: async () => {
    const raw = await request<
      | { reports: { filename: string; report_type?: string; date: string; size_bytes?: number; path?: string }[] }
      | { filename: string; report_type?: string; date: string; size_bytes?: number; path?: string }[]
    >("/reports/list");
    // 后端可能返回数组或 {reports:[...]}，统一为 {reports:[...]}，保留 report_type 等字段
    if (Array.isArray(raw)) return { reports: raw.map((r) => ({ filename: r.filename, report_type: r.report_type, date: r.date ?? "", size_bytes: r.size_bytes, path: r.path })) };
    return raw;
  },
  getLatest: () => request<{ ops: unknown; exec: unknown }>("/reports/latest"),
  getContent: (reportType: "ops" | "exec", date: string) =>
    request<{ filename: string; report_type: string; date: string; content: string }>(
      `/reports/${reportType}/${date}`
    ),
  downloadURL: (filename: string) => `${BASE}/reports/download/${encodeURIComponent(filename)}`,
};

// ── Data Sources ──────────────────────────────────────────────────────────────

export const datasourcesAPI = {
  getStatus: () => request<DataSourceStatus[]>("/datasources/status"),
  getRegistry: () => request<DataSourceStatus[]>("/datasources/registry"),
  refresh: () =>
    request<{ status: string; refreshed: number }>("/datasources/refresh", { method: "POST" }),
  upload: async (sourceId: string, file: File) => {
    const form = new FormData();
    form.append("source_id", sourceId);
    form.append("file", file);
    const res = await fetch(`${BASE}/datasources/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Upload ${res.status}: ${text}`);
    }
    return res.json();
  },
};

// ── Config ────────────────────────────────────────────────────────────────────

export const configAPI = {
  getPanelConfig: () => request<Record<string, unknown>>("/config/panel"),
  putPanelConfig: (data: Record<string, unknown>) =>
    request<{ status: string }>("/config/panel", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getTargets: () => request<Record<string, unknown>>("/config/targets"),
  getMonthlyTargets: () => request<MonthlyTarget[]>("/config/monthly-targets"),
  putTargets: (month: string, data: Record<string, unknown>) =>
    request<{ status: string }>(`/config/targets/${month}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getExchangeRate: () => request<{ rate: number; unit: string }>("/config/exchange-rate"),
  putExchangeRate: (rate: number) =>
    request<{ status: string }>("/config/exchange-rate", {
      method: "PUT",
      body: JSON.stringify({ rate }),
    }),
  getTargetsV2: (month: string) =>
    request<MonthlyTargetV2>(`/config/targets/${month}/v2`),
  putTargetsV2: (month: string, data: MonthlyTargetV2) =>
    request<{ status: string }>(`/config/targets/${month}/v2`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  calculateTargets: (month: string, partial: Partial<MonthlyTargetV2>) =>
    request<{ v2: MonthlyTargetV2; flat: Record<string, unknown> }>(`/config/targets/${month}/calculate`, {
      method: "POST",
      body: JSON.stringify(partial),
    }),
  getRecommendation: (month: string) =>
    request<TargetRecommendation>(`/config/targets/${month}/recommend`),
};

// ── Snapshots ─────────────────────────────────────────────────────────────────

export const snapshotsAPI = {
  getStats: () => request<SnapshotStats>("/snapshots/stats"),
  getDailyKPI: (params?: { date_from?: string; date_to?: string; metric?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    if (params?.metric) qs.set("metric", params.metric);
    const q = qs.toString();
    return request<DailyKPIPoint[]>(`/snapshots/daily-kpi${q ? `?${q}` : ""}`);
  },
  getCCGrowth: (ccName: string, params?: { date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    const q = qs.toString();
    return request<CCGrowthAPIPoint[]>(`/snapshots/cc-growth/${encodeURIComponent(ccName)}${q ? `?${q}` : ""}`);
  },
  importHistory: () =>
    request<{ status: string; result: unknown }>("/snapshots/import-history", { method: "POST" }),
  cleanup: (days = 90) =>
    request<{ status: string; deleted_rows: number }>(`/snapshots/cleanup?days=${days}`, {
      method: "DELETE",
    }),
};

// ── SWR fetcher ──────────────────────────────────────────────────────────────
export const swrFetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    // 自动上报 API 错误到崩溃日志
    const { errorLogger } = await import("./error-logger");
    errorLogger.capture({
      type: "api_error",
      message: `HTTP ${r.status} ${r.statusText}`,
      api: url,
      status: r.status,
      response: body.slice(0, 500),
    });
    throw new Error(`HTTP ${r.status}`);
  }
  return r.json();
};

