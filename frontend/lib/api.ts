/**
 * API client — 所有对 FastAPI 后端（localhost:8000）的请求封装
 * 通过 Next.js rewrites: /api/* → http://localhost:8000/api/*
 */
import type { MonthlyTargetV2, TargetRecommendation, ImpactChainData, WhatIfResult, RootCauseData, StageEvaluation, PyramidReport, ComparisonResponse, LeadsOverviewData } from "./types";
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
    request<{ status: string; summary: unknown }>("/analysis/run", {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    }),

  getResult: (period?: string) =>
    request<Record<string, unknown>>(`/analysis/result${periodQuery(period)}`),
  getSummary: (period?: string) =>
    request<{ summary: unknown; meta: unknown; time_progress: number }>(
      `/analysis/summary${periodQuery(period)}`
    ),
  getFunnel: (period?: string) =>
    request<unknown>(`/analysis/funnel${periodQuery(period)}`),
  getChannelComparison: (period?: string) =>
    request<unknown>(`/analysis/channel-comparison${periodQuery(period)}`),
  getTeamData: (period?: string) =>
    request<unknown[]>(`/analysis/team-data${periodQuery(period)}`),
  getAnomalies: (period?: string) =>
    request<unknown[]>(`/analysis/anomalies${periodQuery(period)}`),
  getRiskAlerts: (period?: string) =>
    request<unknown[]>(`/analysis/risk-alerts${periodQuery(period)}`),
  getROI: (period?: string) =>
    request<unknown>(`/analysis/roi${periodQuery(period)}`),
  getROICostBreakdown: (period?: string) =>
    request<unknown>(`/analysis/roi/cost-breakdown${periodQuery(period)}`),
  getPrediction: (period?: string) =>
    request<unknown>(`/analysis/prediction${periodQuery(period)}`),
  getAttribution: (period?: string) =>
    request<unknown>(`/analysis/attribution${periodQuery(period)}`),
  getCCRanking: (topN = 10, period?: string) =>
    request<unknown[]>(
      `/analysis/cc-ranking${periodQuery(period, { top_n: String(topN) })}`
    ),
  getSSRanking: (topN = 10, period?: string) =>
    request<unknown[]>(
      `/analysis/ss-ranking${periodQuery(period, { top_n: String(topN) })}`
    ),
  getLPRanking: (topN = 10, period?: string) =>
    request<unknown[]>(
      `/analysis/lp-ranking${periodQuery(period, { top_n: String(topN) })}`
    ),
  getCohort: (period?: string) =>
    request<unknown>(`/analysis/cohort${periodQuery(period)}`),
  getCheckin: (period?: string) =>
    request<unknown>(`/analysis/checkin${periodQuery(period)}`),
  getLeads: (period?: string) =>
    request<unknown>(`/analysis/leads${periodQuery(period)}`),
  getFollowup: (period?: string) =>
    request<unknown>(`/analysis/followup${periodQuery(period)}`),
  getOrders: (period?: string) =>
    request<unknown>(`/analysis/orders${periodQuery(period)}`),
  getTrend: (compareType: "mom" | "yoy" | "wow" = "mom", period?: string) =>
    request<unknown>(
      `/analysis/trend${periodQuery(period, { compare_type: compareType })}`
    ),
  getLTV: (period?: string) =>
    request<unknown>(`/analysis/ltv${periodQuery(period)}`),
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
    request<unknown>(`/analysis/outreach-coverage${periodQuery(period)}`),
  getFunnelDetail: (period?: string) =>
    request<unknown>(`/analysis/funnel-detail${periodQuery(period)}`),
  getSectionEfficiency: (period?: string) =>
    request<unknown>(`/analysis/section-efficiency${periodQuery(period)}`),
  getChannelMoM: (period?: string) =>
    request<unknown>(`/analysis/channel-mom${periodQuery(period)}`),
  getRetentionContribution: (period?: string) =>
    request<unknown>(`/analysis/retention-contribution${periodQuery(period)}`),
  getEnclosureChannelMatrix: (period?: string) =>
    request<unknown>(`/analysis/enclosure-channel-matrix${periodQuery(period)}`),
  getTimeInterval: (period?: string) =>
    request<unknown>(`/analysis/time-interval${periodQuery(period)}`),
  getProductivityHistory: (period?: string) =>
    request<unknown>(`/analysis/productivity-history${periodQuery(period)}`),
  getOutreachGap: (period?: string) =>
    request<unknown>(`/analysis/outreach-gap${periodQuery(period)}`),
  getEnclosureHealth: (period?: string) =>
    request<unknown>(`/analysis/enclosure-health${periodQuery(period)}`),
  getCCRankingEnhanced: (topN = 20, period?: string) =>
    request<unknown>(
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
  list: () => request<{ reports: { filename: string; date: string }[] }>("/reports/list"),
  getLatest: () => request<{ ops: unknown; exec: unknown }>("/reports/latest"),
  getContent: (reportType: "ops" | "exec", date: string) =>
    request<{ filename: string; report_type: string; date: string; content: string }>(
      `/reports/${reportType}/${date}`
    ),
  downloadURL: (filename: string) => `${BASE}/reports/download/${encodeURIComponent(filename)}`,
};

// ── Data Sources ──────────────────────────────────────────────────────────────

export const datasourcesAPI = {
  getStatus: () => request<unknown[]>("/datasources/status"),
  getRegistry: () => request<unknown[]>("/datasources/registry"),
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
  getMonthlyTargets: () => request<unknown[]>("/config/monthly-targets"),
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
  getStats: () => request<unknown>("/snapshots/stats"),
  getDailyKPI: (params?: { date_from?: string; date_to?: string; metric?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    if (params?.metric) qs.set("metric", params.metric);
    const q = qs.toString();
    return request<unknown[]>(`/snapshots/daily-kpi${q ? `?${q}` : ""}`);
  },
  getCCGrowth: (ccName: string, params?: { date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    const q = qs.toString();
    return request<unknown[]>(`/snapshots/cc-growth/${encodeURIComponent(ccName)}${q ? `?${q}` : ""}`);
  },
  importHistory: () =>
    request<{ status: string; result: unknown }>("/snapshots/import-history", { method: "POST" }),
  cleanup: (days = 90) =>
    request<{ status: string; deleted_rows: number }>(`/snapshots/cleanup?days=${days}`, {
      method: "DELETE",
    }),
};

// ── SWR fetcher ──────────────────────────────────────────────────────────────
export const swrFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

