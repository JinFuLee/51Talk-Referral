/**
 * 交叉分析类型定义 — 达成归因 + 高潜作战室
 * 供 /attribution 和 /high-potential/warroom 页面复用
 */

// ── 达成率归因 ────────────────────────────────────────────────────────────────

export interface AttributionSummary {
  /** 漏斗绝对量 */
  registrations: number;
  appointments: number;
  attendances: number;
  payments: number;

  /** 客单价 & 业绩 */
  avg_order_value: number;
  total_revenue: number;

  /** 漏斗转化率 */
  reg_to_appt_rate: number;
  appt_to_attend_rate: number;
  attend_to_pay_rate: number;
  registration_conversion_rate: number;

  /** 月度目标 */
  monthly_target_units: number;
  monthly_target_revenue: number;
  target_order_value: number;

  /** 达成率 */
  unit_achievement_rate: number;
  revenue_achievement_rate: number;
  order_value_achievement_rate: number;
}

export interface AttributionBreakdownItem {
  group_key: string;
  paid_count: number;
  revenue: number;
  pct_of_target: number;
}

export interface SimulationResult {
  segment: string;
  current_rate: number;
  new_rate: number;
  current_paid: number;
  new_paid: number;
  predicted_achievement: number;
}

// ── Warroom 相关（供后续高潜作战室复用） ──────────────────────────────────────

export interface WatchlistStudent {
  student_id: string;
  name: string;
  enclosure: string;
  cc_name: string;
  registration_days: number;
  participation_rate: number;
  last_contact_days: number;
  potential_score: number;
  status: 'hot' | 'warm' | 'cold';
}

export interface WatchlistStats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  predicted_registrations: number;
}

// ── 高潜作战室专用类型 ────────────────────────────────────────────────────────

export interface WarroomStudent {
  stdt_id: string;
  cc_name: string;
  ss_name: string;
  lp_name: string;
  total_new: number;
  attendance: number;
  payments: number;
  urgency_level: 'red' | 'yellow' | 'green';
  days_remaining: number;
  last_contact_date: string | null;
  checkin_7d: number;
  contact_count_7d: number;
}

export interface DailyContact {
  date: string;
  cc_connected: boolean;
  ss_connected: boolean;
  lp_connected: boolean;
  valid_checkin: boolean;
  new_reg: number;
  new_attend: number;
  new_paid: number;
}

export interface WarroomTimeline {
  stdt_id: string;
  profile: {
    cc_name: string;
    ss_name: string;
    enclosure: string;
  };
  daily_log: DailyContact[];
  is_high_potential: boolean;
}
