/**
 * 分析引擎输出类型定义 — biz/ops 视图专用
 * 与 backend/models/analysis.py 对应
 *
 * 注意：带 "referral-specific" 注释的类型含转介绍业务语义，
 * 不适合跨业务域复用。通用类型已提取至 ./core.ts。
 */

export type { Status, MetricWithTarget, PredictionBand, RiskAlertBiz } from "./core";

// referral-specific: 角色类型
export type RoleType = "CC" | "SS" | "LP";

// referral-specific: 围场分段
export type EnclosureBand = "0-30" | "31-60" | "61-90" | "91-180" | "181+";

// ─── 模块 1: summary ─────────────────────────────────────────────────────────

export interface AnalysisSummary {
  registration: { actual: number; target: number; progress: number; gap: number };
  payment: { actual: number; target: number; progress: number };
  revenue: { cny: number; usd: number; thb: number };
  checkin_24h: { rate: number; target: number; achievement: number };
  time_progress: number;
  status: import("./core").Status;
}

// ─── 模块 2: funnel ───────────────────────────────────────────────────────────

export interface FunnelChannel {
  register: number;
  reserve: number;
  attend: number;
  paid: number;
  rates: {
    reserve_rate: number;
    attend_rate: number;
    paid_rate: number;
  };
}

/**
 * referral-specific: 转介绍漏斗数据
 * channels 使用泛型 Record 以支持动态渠道键（cc_narrow / ss_narrow / lp_narrow / wide 等）
 */
export interface FunnelDataBiz {
  total: FunnelChannel;
  channels: Record<string, FunnelChannel>;
}

// ─── 模块 3: CC360 ────────────────────────────────────────────────────────────

// referral-specific: CC 个人 360 画像
export interface CC360Profile {
  cc_name: string;
  team: string;
  checkin_24h: number;
  outreach_score: number;
  conversion_rate: number;
  revenue: number;
  composite_score: number;
  rank: number;
  strengths: string[];
  weaknesses: string[];
}

// ─── 模块 4: cohort_roi ───────────────────────────────────────────────────────

export interface CohortROIPoint {
  cohort_month: string;
  reach_rate_m1: number;
  participation_m1: number;
  ltv_12m: number;
  acquisition_cost: number;
  roi: number;
}

export interface CohortROIData {
  by_month: CohortROIPoint[];
  optimal_months: number[];
  decay_summary: {
    reach_half_life: number;
    participation_half_life: number;
  };
}

// ─── 模块 5: enclosure ────────────────────────────────────────────────────────

// referral-specific: 围场分段
export interface EnclosureSegment {
  segment: string;
  students: number;
  conversion_rate: number;
  followup_rate: number;
  roi_index: number;
  recommendation: string;
}

// referral-specific: 围场分析结果
export interface EnclosureData {
  by_enclosure: EnclosureSegment[];
  resource_allocation: { optimal: Record<string, number> };
}

// ─── 模块 6: checkin_impact ──────────────────────────────────────────────────

export interface CheckinImpact {
  participation_lift: {
    checkin: number;
    no_checkin: number;
    multiplier: number;
  };
  coefficient_lift: {
    checkin: number;
    no_checkin: number;
    multiplier: number;
  };
  conclusion: string;
}

// ─── 模块 7: productivity ─────────────────────────────────────────────────────

/** 单角色人效指标 */
export interface ProductivityMetrics {
  active_count: number | null;
  total_revenue: number;
  per_capita: number;
}

/**
 * referral-specific: 人效分析数据
 * roles 使用 Record 支持任意角色键（"cc" / "ss" / "lp" 等）
 */
export interface ProductivityData {
  roles: Record<string, ProductivityMetrics>;
  daily_trend: Array<{
    date: string;
    [roleMetric: string]: string | number;
  }>;
}

// ─── 模块 8: prediction ───────────────────────────────────────────────────────

export interface PredictionDataBiz {
  revenue: { predicted: number; model: string; confidence: number };
  registration: { predicted: number; model: string; confidence: number };
  payment: { predicted: number; model: string; confidence: number };
  band?: import("./core").PredictionBand[];
}

// ─── 模块 9: risk_alerts ─────────────────────────────────────────────────────

// Re-exported via core.ts as RiskAlertBiz

// ─── CC Drawer: CC 人员详情抽屉数据 ───────────────────────────────────────────

export interface CCFollowupHistoryItem {
  date: string;
  type: "outreach" | "trial" | "paid";
  count: number;
  effective: number;
}

export interface CCMonthlyTrendItem {
  month: string;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

export interface CCRadarScores {
  process: number;
  result: number;
  efficiency: number;
}

export interface CCDetailData {
  cc_name: string;
  rank: number;
  composite_score: number;
  followup_history: CCFollowupHistoryItem[];
  monthly_trend: CCMonthlyTrendItem[];
  radar_scores: CCRadarScores;
  // 附加字段（来自 cc_ranking 原始数据）
  team?: string;
  registrations?: number;
  payments?: number;
  revenue_usd?: number;
  checkin_rate?: number;
  conversion_rate?: number;
}

// ─── 模块 10: student_journey ────────────────────────────────────────────────

export interface StudentJourney {
  journey_funnel: {
    registered: number;
    outreached: number;
    reserved: number;
    attended: number;
    paid: number;
  };
  conversion_rates: Record<string, number>;
  drop_off_analysis: Record<string, number>;
  outreach_impact: {
    outreached_conversion: number;
    non_outreached_conversion: number;
    lift: number;
  };
}
