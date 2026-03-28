/** BM 节奏日历相关类型 */

/** Overview API 中 bm_comparison.calendar 字段 */
export interface BmCalendarSnapshot {
  bm_today_pct: number;
  bm_yesterday_pct: number;
  bm_mtd_pct: number;
  bm_remaining_pct: number;
  today_type: string;
  reference_date: string;
}

/** Overview API 中 bm_comparison.metrics[key] 字段 */
export interface BmMetricItem {
  actual: number;
  target: number;
  bm_mtd: number;
  bm_gap: number;
  bm_today: number;
  today_required: number;
}

/** Overview API 中 bm_comparison 顶层字段 */
export interface BmComparison {
  calendar: BmCalendarSnapshot;
  metrics: Record<string, BmMetricItem>;
}

/** Settings API: GET /api/config/bm-calendar 返回的单日数据 */
export interface BmCalendarDay {
  date: string;
  day_of_week: number;
  day_type: string;
  raw_weight: number;
  bm_daily_pct: number;
  bm_mtd_pct: number;
  is_override: boolean;
  label: string;
}

/** Settings API: GET /api/config/bm-calendar 完整响应 */
export interface BmCalendarResponse {
  month: string;
  days: BmCalendarDay[];
  total_raw_weight: number;
}
