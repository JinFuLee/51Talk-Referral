/**
 * API client — 所有对 FastAPI 后端（localhost:8000）的请求封装
 * 通过 Next.js rewrites: /api/* → http://localhost:8000/api/*
 */
import type { MonthlyTargetV2, TargetRecommendation, ImpactChainData, WhatIfResult, RootCauseData, StageEvaluation, PyramidReport } from "./types";
import { errorLogger } from "./error-logger";

const BASE = "/api";

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
  run: (params?: { input_dir?: string; report_date?: string; lang?: string }) =>
    request<{ status: string; summary: unknown }>("/analysis/run", {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    }),

  getResult: () => request<Record<string, unknown>>("/analysis/result"),
  getSummary: () =>
    request<{ summary: unknown; meta: unknown; time_progress: number }>("/analysis/summary"),
  getFunnel: () => request<unknown>("/analysis/funnel"),
  getChannelComparison: () => request<unknown>("/analysis/channel-comparison"),
  getTeamData: () => request<unknown[]>("/analysis/team-data"),
  getAnomalies: () => request<unknown[]>("/analysis/anomalies"),
  getRiskAlerts: () => request<unknown[]>("/analysis/risk-alerts"),
  getROI: () => request<unknown>("/analysis/roi"),
  getROICostBreakdown: () => request<unknown>("/analysis/roi/cost-breakdown"),
  getPrediction: () => request<unknown>("/analysis/prediction"),
  getAttribution: () => request<unknown>("/analysis/attribution"),
  getCCRanking: (topN = 10) =>
    request<unknown[]>(`/analysis/cc-ranking?top_n=${topN}`),
  getSSRanking: (topN = 10) =>
    request<unknown[]>(`/analysis/ss-ranking?top_n=${topN}`),
  getLPRanking: (topN = 10) =>
    request<unknown[]>(`/analysis/lp-ranking?top_n=${topN}`),
  getCohort: () => request<unknown>("/analysis/cohort"),
  getCheckin: () => request<unknown>("/analysis/checkin"),
  getLeads: () => request<unknown>("/analysis/leads"),
  getFollowup: () => request<unknown>("/analysis/followup"),
  getOrders: () => request<unknown>("/analysis/orders"),
  getTrend: (compareType: "mom" | "yoy" | "wow" = "mom") =>
    request<unknown>(`/analysis/trend?compare_type=${compareType}`),
  getLTV: () => request<unknown>("/analysis/ltv"),
  getImpactChain: () => request<ImpactChainData>("/analysis/impact-chain"),
  postWhatIf: (metric: string, newValue: number) =>
    request<WhatIfResult>("/analysis/what-if", {
      method: "POST",
      body: JSON.stringify({ metric, new_value: newValue }),
    }),
  getRootCause: () => request<RootCauseData>("/analysis/root-cause"),
  getStageEvaluation: () => request<StageEvaluation>("/analysis/stage-evaluation"),
  getPyramidReport: () => request<PyramidReport>("/analysis/pyramid-report"),
  getPackageMix: () => request<{ items: Array<{ product_type: string; count: number; revenue_usd: number; percentage: number }> }>("/analysis/package-mix"),
  getTeamPackageMix: () => request<{ teams: Array<{ team: string; items: Array<{ product_type: string; ratio: number }> }> }>("/analysis/team-package-mix"),
  getChannelRevenue: () => request<{ channels: Array<{ channel: string; revenue_usd: number; revenue_thb: number; percentage: number }>; total_usd: number }>("/analysis/channel-revenue"),
  getOutreachCoverage: () => request<unknown>("/analysis/outreach-coverage"),
  getFunnelDetail: () => request<unknown>("/analysis/funnel-detail"),
  getSectionEfficiency: () => request<unknown>("/analysis/section-efficiency"),
  getChannelMoM: () => request<unknown>("/analysis/channel-mom"),
  getRetentionContribution: () => request<unknown>("/analysis/retention-contribution"),
  getEnclosureChannelMatrix: () => request<unknown>("/analysis/enclosure-channel-matrix"),
  getTimeInterval: () => request<unknown>("/analysis/time-interval"),
  getProductivityHistory: () => request<unknown>("/analysis/productivity-history"),
  getOutreachGap: () => request<unknown>("/analysis/outreach-gap"),
  getEnclosureHealth: () => request<unknown>("/analysis/enclosure-health"),
  getCCRankingEnhanced: (topN = 20) => request<unknown>(`/analysis/cc-ranking-enhanced?top_n=${topN}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsAPI = {
  list: () => request<unknown[]>("/reports/list"),
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

