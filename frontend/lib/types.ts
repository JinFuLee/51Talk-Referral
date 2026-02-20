/**
 * 共享类型定义 — mk-frontend-charts 从此处导入，禁止自行定义
 * 对应后端 backend/models/analysis.py AnalysisResult
 */

// ── 通用 ─────────────────────────────────────────────────────────────────────

export interface APIResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// ── 分析结果完整结构 ──────────────────────────────────────────────────────────

export interface AnalysisResult {
  meta: Record<string, unknown>;
  summary: SummaryData;
  time_progress: number;
  funnel: FunnelData;
  channel_comparison: ChannelComparisonData;
  team_data: TeamMemberData[];
  unit_price: Record<string, unknown>;
  risk_alerts: RiskAlert[];
  roi_estimate: ROIData;
  trend: TrendData;
  attribution: AttributionData;
  prediction: PredictionData;
  cohort_analysis: CohortData;
  checkin_analysis: CheckinData;
  leads_achievement: LeadsData;
  followup_analysis: FollowupData;
  order_analysis: OrderData;
  mom_trend: TrendData;
  yoy_trend: TrendData;
  cc_ranking: RankingData;
  ss_ranking: RankingData;
  lp_ranking: RankingData;
  attended_not_paid: Record<string, unknown>;
  anomalies: AnomalyItem[];
  ltv: LTVData;
  cc_growth: CCGrowthData;
  ai_root_cause: Record<string, unknown>;
  ai_insights: Record<string, unknown>;
  report_paths: Record<string, string>;
  generated_at?: string;
}

// ── Summary / 进度看板 ────────────────────────────────────────────────────────

export interface SummaryData {
  registrations?: SummaryMetric;
  payments?: SummaryMetric;
  revenue?: SummaryMetric;
  leads?: SummaryMetric;
  [key: string]: SummaryMetric | undefined;
}

export interface SummaryMetric {
  actual: number;
  target: number;
  progress: number;       // 0.0 ~ 1.0
  status: "green" | "yellow" | "red";
  label?: string;
}

// ── 漏斗 ─────────────────────────────────────────────────────────────────────

export interface FunnelData {
  narrow?: FunnelChannel;
  wide?: FunnelChannel;
  total?: FunnelChannel;
  [key: string]: FunnelChannel | undefined;
}

export interface FunnelChannel {
  valid_students: number;
  contact_rate: number;     // 触达率 0~1
  participation_rate: number;
  checkin_rate: number;
  new_coefficient: number;
  referral_ratio: number;
  registrations: number;
  payments: number;
  conversion_rate: number;
}

// ── 渠道对比 ──────────────────────────────────────────────────────────────────

export interface ChannelComparisonData {
  channels: ChannelStat[];
}

export interface ChannelStat {
  channel: string;          // "narrow" | "wide"
  label: string;
  registrations: number;
  payments: number;
  conversion_rate: number;
  revenue?: number;
}

// ── CC/SS/LP 团队成员 ─────────────────────────────────────────────────────────

export interface TeamMemberData {
  name: string;
  role: "CC" | "SS" | "LP";
  registrations?: number;
  payments?: number;
  revenue?: number;
  composite_score?: number;
  rank?: number;
  [key: string]: unknown;
}

// ── 排名 ─────────────────────────────────────────────────────────────────────

export interface RankingData {
  items: RankingItem[];
  updated_at?: string;
}

export interface RankingItem {
  rank: number;
  name: string;
  composite_score: number;
  registrations?: number;
  payments?: number;
  revenue?: number;
  contact_rate?: number;
  checkin_rate?: number;
  [key: string]: unknown;
}

// ── 风险预警 ──────────────────────────────────────────────────────────────────

export interface RiskAlert {
  level: "critical" | "warning" | "info";
  metric: string;
  message: string;
  value?: number;
  threshold?: number;
}

// ── ROI ───────────────────────────────────────────────────────────────────────

export interface ROIData {
  total_cost: number;
  total_revenue: number;
  roi_ratio: number;
  cost_breakdown?: Record<string, number>;
  currency?: string;
}

// ── 趋势 ─────────────────────────────────────────────────────────────────────

export interface TrendData {
  series: TrendPoint[];
  compare_type?: "mom" | "yoy";
}

export interface TrendPoint {
  date: string;             // YYYY-MM or YYYY-MM-DD
  registrations?: number;
  payments?: number;
  revenue?: number;
  [key: string]: unknown;
}

// ── 归因分析 ──────────────────────────────────────────────────────────────────

export interface AttributionData {
  factors: AttributionFactor[];
}

export interface AttributionFactor {
  factor: string;
  contribution: number;   // 0~1
  label?: string;
}

// ── 预测模型 ──────────────────────────────────────────────────────────────────

export interface PredictionData {
  eom_registrations?: number;
  eom_payments?: number;
  eom_revenue?: number;
  model_used?: string;
  confidence?: number;
  daily_series?: TrendPoint[];
}

// ── 围场分析 ──────────────────────────────────────────────────────────────────

export interface CohortData {
  segments: CohortSegment[];
}

export interface CohortSegment {
  range: string;            // "0-30" | "31-60" | ...
  count: number;
  conversion_rate: number;
  payments: number;
}

// ── 打卡率 ────────────────────────────────────────────────────────────────────

export interface CheckinData {
  overall_rate: number;
  by_cc?: Array<{ name: string; rate: number; count: number }>;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export interface LeadsData {
  total_leads: number;
  achieved: number;
  achievement_rate: number;
  by_source?: Array<{ source: string; leads: number; rate: number }>;
}

// ── 跟进效率 ──────────────────────────────────────────────────────────────────

export interface FollowupData {
  avg_followup_days?: number;
  followup_rate?: number;
  by_stage?: Array<{ stage: string; count: number; rate: number }>;
}

// ── 订单分析 ──────────────────────────────────────────────────────────────────

export interface OrderData {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  by_type?: Array<{ type: string; count: number; revenue: number }>;
}

// ── 异常检测 ──────────────────────────────────────────────────────────────────

export interface AnomalyItem {
  metric: string;
  date?: string;
  value: number;
  expected?: number;
  z_score?: number;
  severity: "high" | "medium" | "low";
  description?: string;
}

// ── LTV ───────────────────────────────────────────────────────────────────────

export interface LTVData {
  avg_ltv?: number;
  by_cohort?: Array<{ cohort: string; ltv: number; count: number }>;
}

// ── CC 成长曲线 ───────────────────────────────────────────────────────────────

export interface CCGrowthData {
  by_cc?: Record<string, CCGrowthPoint[]>;
}

export interface CCGrowthPoint {
  date: string;
  composite_score: number;
  registrations?: number;
  payments?: number;
}

// ── 数据源状态 ────────────────────────────────────────────────────────────────

export interface DataSourceStatus {
  id: string;
  name_zh: string;
  priority: "P0" | "P1" | "P2" | "P3";
  update_frequency: "daily" | "weekly" | "monthly";
  is_single_point: boolean;
  dir: string;
  has_file: boolean;
  latest_file: string | null;
  latest_date: string | null;
  is_t1: boolean;
  file_count: number;
}

// ── 快照 ─────────────────────────────────────────────────────────────────────

export interface SnapshotStats {
  total_daily_snapshots: number;
  total_cc_snapshots: number;
  date_range?: { from: string; to: string };
}

export interface DailyKPIPoint {
  date: string;
  metric: string;
  value: number;
}

export interface CCGrowthAPIPoint {
  date: string;
  composite_score: number;
  registrations?: number;
  payments?: number;
}

// ── 报告 ─────────────────────────────────────────────────────────────────────

export interface ReportFile {
  filename: string;
  report_type: "ops" | "exec" | "unknown";
  date: string | null;
  size_bytes: number;
  path: string;
}

// ── 配置 ─────────────────────────────────────────────────────────────────────

export interface MonthlyTarget {
  month: string;
  registrations?: number;
  payments?: number;
  revenue?: number;
  [key: string]: unknown;
}

export interface ExchangeRate {
  rate: number;
  unit: string;
}
