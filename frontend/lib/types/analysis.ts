/**
 * 分析引擎输出类型定义 — biz/ops 视图专用
 * 与 backend/models/analysis.py 对应
 */

export type Status = "green" | "yellow" | "red";
export type RoleType = "CC" | "SS" | "LP";
export type EnclosureBand = "0-30" | "31-60" | "61-90" | "91-180" | "181+";

export interface MetricWithTarget {
  actual: number;
  target: number;
  unit?: string;
  status?: Status;
}

// ─── 模块 1: summary ─────────────────────────────────────────────────────────

export interface AnalysisSummary {
  registration: { actual: number; target: number; progress: number; gap: number };
  payment: { actual: number; target: number; progress: number };
  revenue: { cny: number; usd: number; thb: number };
  checkin_24h: { rate: number; target: number; achievement: number };
  time_progress: number;
  status: Status;
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

export interface FunnelDataBiz {
  total: FunnelChannel;
  cc_narrow: FunnelChannel;
  ss_narrow: FunnelChannel;
  lp_narrow: FunnelChannel;
  wide: FunnelChannel;
}

// ─── 模块 3: CC360 ────────────────────────────────────────────────────────────

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

export interface EnclosureSegment {
  segment: string;
  students: number;
  conversion_rate: number;
  followup_rate: number;
  roi_index: number;
  recommendation: string;
}

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

export interface ProductivityData {
  cc: { active_count: number; total_revenue: number; per_capita: number };
  ss: { active_count: number; total_revenue: number; per_capita: number };
  daily_trend: Array<{
    date: string;
    cc_active: number;
    ss_active: number;
    cc_revenue: number;
    ss_revenue: number;
  }>;
}

// ─── 模块 8: prediction ───────────────────────────────────────────────────────

export interface PredictionBand {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface PredictionDataBiz {
  revenue: { predicted: number; model: string; confidence: number };
  registration: { predicted: number; model: string; confidence: number };
  payment: { predicted: number; model: string; confidence: number };
  band?: PredictionBand[];
}

// ─── 模块 9: risk_alerts ─────────────────────────────────────────────────────

export interface RiskAlertBiz {
  level: "red" | "yellow" | "green";
  category: string;
  message: string;
  action: string;
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
