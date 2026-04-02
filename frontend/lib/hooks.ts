/**
 * SWR hooks — 封装 API 请求，供页面使用
 * period-based hooks 已在重构中移除（dead code，0 活跃页面消费者）
 */
import useSWR, { type SWRConfiguration } from 'swr';
import { datasourcesAPI, snapshotsAPI, reportsAPI, configAPI, swrFetcher } from './api';
import { useFilteredSWR } from './hooks/use-filtered-swr';
import type {
  DataSourceStatus,
  SnapshotStats,
  DailyKPIPoint,
  CCGrowthAPIPoint,
  ReportFile,
  MonthlyTarget,
  ExchangeRate,
  MonthlyTargetV2,
  TargetRecommendation,
} from './types';

const REFRESH_30S: SWRConfiguration = { refreshInterval: 30_000 };

// ── Health ─────────────────────────────────────────────────────────────────────

export function useHealth() {
  return useFilteredSWR<{ status: string }>('/api/health');
}

// ── Data Sources ──────────────────────────────────────────────────────────────

export function useDataSources() {
  return useSWR<DataSourceStatus[]>(
    'datasources/status',
    () => datasourcesAPI.getStatus() as Promise<DataSourceStatus[]>,
    REFRESH_30S
  );
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export function useSnapshotStats() {
  return useSWR<SnapshotStats>(
    'snapshots/stats',
    () => snapshotsAPI.getStats() as Promise<SnapshotStats>
  );
}

export function useDailyKPI(params?: { date_from?: string; date_to?: string; metric?: string }) {
  return useSWR<DailyKPIPoint[]>(
    ['snapshots/daily-kpi', params],
    () => snapshotsAPI.getDailyKPI(params) as Promise<DailyKPIPoint[]>
  );
}

export function useCCGrowth(ccName: string, params?: { date_from?: string; date_to?: string }) {
  return useSWR<CCGrowthAPIPoint[]>(
    ccName ? ['snapshots/cc-growth', ccName, params] : null,
    () => snapshotsAPI.getCCGrowth(ccName, params) as Promise<CCGrowthAPIPoint[]>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function useReportList() {
  return useSWR<ReportFile[]>('reports/list', async (): Promise<ReportFile[]> => {
    const res = await reportsAPI.list();
    // API returns { reports: [{filename, report_type, date, ...}] }; backfill optional fields for ReportFile
    return res.reports.map((r) => ({
      filename: r.filename,
      report_type: (r.report_type ?? 'unknown') as ReportFile['report_type'],
      date: r.date,
      size_bytes: r.size_bytes ?? 0,
      path: r.path ?? r.filename,
    }));
  });
}

export function useLatestReports() {
  return useSWR('reports/latest', () => reportsAPI.getLatest());
}

// ── Config ────────────────────────────────────────────────────────────────────

export function useMonthlyTargets() {
  return useSWR<MonthlyTarget[]>(
    'config/monthly-targets',
    () => configAPI.getMonthlyTargets() as Promise<MonthlyTarget[]>
  );
}

export function useExchangeRate() {
  return useSWR<ExchangeRate>('config/exchange-rate', () => configAPI.getExchangeRate());
}

// ── V2 目标计算 Hook ──────────────────────────────────────────────────────────

export function useTargetsV2(month: string | null) {
  return useSWR<MonthlyTargetV2>(month ? ['config/targets-v2', month] : null, () =>
    configAPI.getTargetsV2(month!)
  );
}

export function useTargetRecommendation(month: string | null) {
  return useSWR<TargetRecommendation>(month ? ['config/targets-recommend', month] : null, () =>
    configAPI.getRecommendation(month!)
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

export { useNotificationStore } from './stores/notification-store';
import { useNotificationStore as _useNotificationStore } from './stores/notification-store';

export function useNotifications() {
  return _useNotificationStore();
}

// ── SWR 通用 fetcher（供外部直接 useSWR 时使用）─────────────────────────────
export { swrFetcher } from './api';
