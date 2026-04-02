/**
 * API client — 所有对 FastAPI 后端（127.0.0.1:8100）的请求封装
 * 通过 Next.js rewrites: /api/* → http://127.0.0.1:8100/api/*
 */
import type {
  MonthlyTarget,
  MonthlyTargetV2,
  TargetRecommendation,
  DataSourceStatus,
  SnapshotStats,
  DailyKPIPoint,
  CCGrowthAPIPoint,
} from './types';
import { errorLogger } from './error-logger';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    errorLogger.capture({
      type: 'api_error',
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
  get: () => request<{ status: string; version: string }>('/health'),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsAPI = {
  generate: () =>
    request<{
      status: string;
      report: { markdown: string; generated_at: string; ai_commentary: string };
    }>('/reports/generate', { method: 'POST', body: JSON.stringify({}) }),
  latest: () => request<{ markdown: string; generated_at: string } | null>('/reports/latest'),
  list: async () => {
    const raw = await request<
      | {
          reports: {
            filename: string;
            report_type?: string;
            date: string;
            size_bytes?: number;
            path?: string;
          }[];
        }
      | {
          filename: string;
          report_type?: string;
          date: string;
          size_bytes?: number;
          path?: string;
        }[]
    >('/reports/list');
    // 后端可能返回数组或 {reports:[...]}，统一为 {reports:[...]}，保留 report_type 等字段
    if (Array.isArray(raw))
      return {
        reports: raw.map((r) => ({
          filename: r.filename,
          report_type: r.report_type,
          date: r.date ?? '',
          size_bytes: r.size_bytes,
          path: r.path,
        })),
      };
    return raw;
  },
  getLatest: () => request<{ ops: unknown; exec: unknown }>('/reports/latest'),
  getContent: (reportType: 'ops' | 'exec', date: string) =>
    request<{ filename: string; report_type: string; date: string; content: string }>(
      `/reports/${reportType}/${date}`
    ),
  downloadURL: (filename: string) => `${BASE}/reports/download/${encodeURIComponent(filename)}`,
};

// ── Data Sources ──────────────────────────────────────────────────────────────

export const datasourcesAPI = {
  getStatus: () => request<DataSourceStatus[]>('/datasources/status'),
  getRegistry: () => request<DataSourceStatus[]>('/datasources/registry'),
  refresh: () =>
    request<{ status: string; refreshed: number }>('/datasources/refresh', { method: 'POST' }),
  upload: async (sourceId: string, file: File) => {
    const form = new FormData();
    form.append('source_id', sourceId);
    form.append('file', file);
    const res = await fetch(`${BASE}/datasources/upload`, {
      method: 'POST',
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
  getPanelConfig: () => request<Record<string, unknown>>('/config/panel'),
  putPanelConfig: (data: Record<string, unknown>) =>
    request<{ status: string }>('/config/panel', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getTargets: () => request<Record<string, unknown>>('/config/targets'),
  getMonthlyTargets: () => request<MonthlyTarget[]>('/config/monthly-targets'),
  putTargets: (month: string, data: Record<string, unknown>) =>
    request<{ status: string }>(`/config/targets/${month}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getExchangeRate: () => request<{ rate: number; unit: string }>('/config/exchange-rate'),
  putExchangeRate: (rate: number) =>
    request<{ status: string }>('/config/exchange-rate', {
      method: 'PUT',
      body: JSON.stringify({ rate }),
    }),
  getTargetsV2: (month: string) => request<MonthlyTargetV2>(`/config/targets/${month}/v2`),
  putTargetsV2: (month: string, data: MonthlyTargetV2) =>
    request<{ status: string }>(`/config/targets/${month}/v2`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  calculateTargets: (month: string, partial: Partial<MonthlyTargetV2>) =>
    request<{ v2: MonthlyTargetV2; flat: Record<string, unknown> }>(
      `/config/targets/${month}/calculate`,
      {
        method: 'POST',
        body: JSON.stringify(partial),
      }
    ),
  getRecommendation: (month: string) =>
    request<TargetRecommendation>(`/config/targets/${month}/recommend`),
  getEnclosureRole: () =>
    request<Record<string, Record<string, string[]>>>('/config/enclosure-role'),
  putEnclosureRole: (data: Record<string, Record<string, string[]>>) =>
    request<{ status: string }>('/config/enclosure-role', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getCheckinThresholds: () =>
    request<{ good: number; warning: number }>('/config/checkin-thresholds'),
  putCheckinThresholds: (data: { good: number; warning: number }) =>
    request<{ status: string }>('/config/checkin-thresholds', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getBmCalendar: (month: string) =>
    request<import('./types/bm-calendar').BmCalendarResponse>(`/config/bm-calendar?month=${month}`),
  putBmCalendar: (body: {
    month: string;
    specials: { date: string; weight: number; label: string }[];
    kickoff_date: string | null;
  }) =>
    request<{ status: string }>('/config/bm-calendar', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

// ── Snapshots ─────────────────────────────────────────────────────────────────

export const snapshotsAPI = {
  getStats: () => request<SnapshotStats>('/snapshots/stats'),
  getDailyKPI: (params?: { date_from?: string; date_to?: string; metric?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.metric) qs.set('metric', params.metric);
    const q = qs.toString();
    return request<DailyKPIPoint[]>(`/snapshots/daily-kpi${q ? `?${q}` : ''}`);
  },
  getCCGrowth: (ccName: string, params?: { date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    const q = qs.toString();
    return request<CCGrowthAPIPoint[]>(
      `/snapshots/cc-growth/${encodeURIComponent(ccName)}${q ? `?${q}` : ''}`
    );
  },
  importHistory: () =>
    request<{ status: string; result: unknown }>('/snapshots/import-history', { method: 'POST' }),
  cleanup: (days = 90) =>
    request<{ status: string; deleted_rows: number }>(`/snapshots/cleanup?days=${days}`, {
      method: 'DELETE',
    }),
};

// ── High-Potential Warroom ────────────────────────────────────────────────────

export const warroomAPI = {
  getStudents: (params?: { urgency?: 'red' | 'yellow' | 'green'; cc_names?: string }) => {
    const qs = new URLSearchParams();
    if (params?.urgency) qs.set('urgency', params.urgency);
    if (params?.cc_names) qs.set('cc_names', params.cc_names);
    const q = qs.toString();
    return request<import('./types/cross-analysis').WarroomStudent[]>(
      `/high-potential/warroom${q ? `?${q}` : ''}`
    );
  },
  getTimeline: (stdtId: string) =>
    request<import('./types/cross-analysis').WarroomTimeline>(
      `/high-potential/${encodeURIComponent(stdtId)}/timeline`
    ),
};

// ── Attribution ───────────────────────────────────────────────────────────────

export const attributionAPI = {
  getSummary: () =>
    request<import('./types/cross-analysis').AttributionSummary>('/attribution/summary'),

  getBreakdown: (groupBy: 'enclosure' | 'cc' | 'channel' | 'lifecycle') =>
    request<import('./types/cross-analysis').AttributionBreakdownItem[]>(
      `/attribution/breakdown?group_by=${groupBy}`
    ),

  getSimulation: (segment: string, newRate: number) =>
    request<import('./types/cross-analysis').SimulationResult>(
      `/attribution/simulation?segment=${encodeURIComponent(segment)}&new_rate=${newRate}`
    ),
};

// ── Daily Monitor ─────────────────────────────────────────────────────────────

export const dailyMonitorAPI = {
  getStats: () =>
    request<import('./types/cross-analysis').DailyMonitorStats>('/daily-monitor/stats'),

  getCCRanking: (role: 'cc' | 'ss' | 'lp' = 'cc') =>
    request<import('./types/cross-analysis').CCContactRankItem[]>(
      `/daily-monitor/cc-ranking?role=${role}`
    ),

  getContactVsConversion: () =>
    request<import('./types/cross-analysis').ContactConversionItem[]>(
      '/daily-monitor/contact-vs-conversion'
    ),
};

// ── Student 360 ───────────────────────────────────────────────────────────────

export const student360API = {
  search: (params: import('./types/cross-analysis').Student360SearchParams) => {
    const qs = new URLSearchParams();
    if (params.query) qs.set('query', params.query);
    if (params.segment) qs.set('segment', params.segment);
    if (params.lifecycle) qs.set('lifecycle', params.lifecycle);
    if (params.cc_name) qs.set('cc_name', params.cc_name);
    if (params.is_hp !== undefined) qs.set('is_hp', String(params.is_hp));
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.page_size) qs.set('page_size', String(params.page_size));
    const q = qs.toString();
    return request<import('./types/cross-analysis').Student360SearchResponse>(
      `/students/360/search${q ? `?${q}` : ''}`
    );
  },

  getDetail: (stdtId: string) =>
    request<import('./types/cross-analysis').Student360Detail>(
      `/students/360/${encodeURIComponent(stdtId)}`
    ),

  getNetwork: (stdtId: string, depth = 2) =>
    request<import('./types/cross-analysis').Student360Network>(
      `/students/360/${encodeURIComponent(stdtId)}/network?depth=${depth}`
    ),
};

// ── CC 战力图 ─────────────────────────────────────────────────────────────────

export const ccMatrixAPI = {
  getHeatmap: (metric = 'coefficient') =>
    request<import('./types/cross-analysis').CCHeatmapResponse>(
      `/cc-matrix/heatmap?metric=${metric}`
    ),
  getRadar: (ccName: string) =>
    request<import('./types/cross-analysis').CCRadarData>(
      `/cc-matrix/radar/${encodeURIComponent(ccName)}`
    ),
  getDrilldown: (ccName: string, segment: string) =>
    request<import('./types/cross-analysis').CCDrilldownRow[]>(
      `/cc-matrix/drilldown?cc_name=${encodeURIComponent(ccName)}&segment=${encodeURIComponent(segment)}`
    ),
};

// ── 围场健康 ──────────────────────────────────────────────────────────────────

export const enclosureHealthAPI = {
  getScores: () =>
    request<import('./types/cross-analysis').EnclosureHealthScore[]>('/enclosure-health/scores'),
  getBenchmark: () =>
    request<import('./types/cross-analysis').EnclosureBenchmarkRow[]>(
      '/enclosure-health/benchmark'
    ),
  getVariance: () =>
    request<import('./types/cross-analysis').EnclosureVarianceRow[]>('/enclosure-health/variance'),
};

// ── Indicator Matrix ──────────────────────────────────────────────────────────

export const indicatorMatrixAPI = {
  getRegistry: () =>
    request<import('./types/indicator-matrix').IndicatorDef[]>('/indicator-matrix/registry'),
  getMatrix: () =>
    request<import('./types/indicator-matrix').IndicatorMatrix>('/indicator-matrix/matrix'),
  putMatrix: (role: 'SS' | 'LP', active: string[]) =>
    request<{ status: string }>(`/indicator-matrix/matrix/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ active }),
    }),
  resetMatrix: (role: 'SS' | 'LP') =>
    request<{ status: string }>(`/indicator-matrix/matrix/${role}/reset`, {
      method: 'POST',
    }),
};

// ── SWR fetcher ──────────────────────────────────────────────────────────────
export const swrFetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    // 自动上报 API 错误到崩溃日志
    const { errorLogger } = await import('./error-logger');
    errorLogger.capture({
      type: 'api_error',
      message: `HTTP ${r.status} ${r.statusText}`,
      api: url,
      status: r.status,
      response: body.slice(0, 500),
    });
    throw new Error(`HTTP ${r.status}`);
  }
  return r.json();
};
