/**
 * 交叉分析类型定义 — 达成归因 + 高潜作战室 + 学员360
 * 供 /attribution 和 /high-potential/warroom 和 /students/360 页面复用
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

// ── CC 战力图（/cc-matrix） ────────────────────────────────────────────────────

export interface CCHeatmapCell {
  cc_name: string;
  segment: string;
  value: number;
}

export interface CCHeatmapResponse {
  rows: string[];
  cols: string[];
  data: CCHeatmapCell[];
}

export interface CCRadarData {
  cc_name: string;
  participation: number;
  conversion: number;
  checkin: number;
  reach: number;
  cargo_ratio: number;
}

export interface CCDrilldownRow {
  stdt_id: string;
  name: string;
  paid_amount: number;
  [key: string]: unknown;
}

// ── 围场健康（/enclosure-health） ─────────────────────────────────────────────

export interface EnclosureHealthScore {
  segment: string;
  participation: number;
  conversion: number;
  checkin: number;
  health_score: number;
  level: 'green' | 'yellow' | 'red';
}

export interface EnclosureBenchmarkRow {
  segment: string;
  participation: number;
  conversion: number;
  checkin: number;
  reach: number;
}

export interface EnclosureVarianceRow {
  segment: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
}

// ── 日常触达监控 ───────────────────────────────────────────────────────────────

export interface SegmentContactItem {
  segment: string;
  students: number;
  cc_rate: number;
  ss_rate: number;
  lp_rate: number;
}

export interface FunnelStats {
  registrations: number;
  invitations: number;
  attendance: number;
  payments: number;
  revenue_usd: number;
}

export interface DailyMonitorStats {
  total_students: number;
  cc_contact_rate: number;
  ss_contact_rate: number;
  lp_contact_rate: number;
  by_segment: SegmentContactItem[];
  funnel: FunnelStats;
  checkin_rate: number;
}

export interface CCContactRankItem {
  cc_name: string;
  contact_count: number;
  contact_rate: number;
  students: number;
}

export interface ContactConversionItem {
  cc_name: string;
  contact_rate: number;
  conversion_rate: number;
  students: number;
}

// ── 学员 360 全景档案 ──────────────────────────────────────────────────────────

export interface Student360Brief {
  stdt_id: string;
  name: string;
  region: string;
  enclosure: string;
  lifecycle: string;
  cc_name: string;
  paid_amount: number;
  total_new: number;
  checkin_rate: number;
  is_high_potential: boolean;
  last_contact_date: string | null;
}

export interface Student360SearchResponse {
  items: Student360Brief[];
  total: number;
  page: number;
  page_size: number;
}

export interface Student360Profile {
  stdt_id: string;
  name: string;
  region: string;
  enclosure: string;
  lifecycle: string;
  cc_name: string;
  cc_group: string;
  ss_name: string;
  lp_name: string;
  paid_amount: number;
  channel_l3: string;
  referrer_stdt_id: string | null;
  /** 学习行为 */
  checkin_days: number;
  checkin_days_last_month: number;
  referral_code_count: number;
  referral_code_count_last_month: number;
  lesson_consumed: number;
  lesson_consumed_last_month: number;
  /** 推荐行为 */
  referral_paid_count: number;
  referral_reward_status: string | null;
  /** CC 跟进 */
  cc_last_call_date: string | null;
  cc_note: string | null;
  cc_call_total: number;
  /** 带新成果 */
  cc_new: number;
  ss_new: number;
  lp_new: number;
  wide_new: number;
  cc_paid: number;
  ss_paid: number;
  lp_paid: number;
  wide_paid: number;
  /** 扩展字段（59列全量，按需展示） */
  [key: string]: unknown;
}

export interface Student360DailyLog {
  date: string;
  cc_connected: boolean;
  ss_connected: boolean;
  lp_connected: boolean;
  valid_checkin: boolean;
  new_reg: number;
  new_attend: number;
  new_paid: number;
}

export interface Student360HpInfo {
  score: number;
  urgency_level: 'red' | 'yellow' | 'green';
  days_remaining: number;
  checkin_7d: number;
  contact_count_7d: number;
}

export interface Student360Detail {
  profile: Student360Profile;
  daily_log: Student360DailyLog[];
  is_high_potential: boolean;
  hp_info: Student360HpInfo | null;
  /** D4 补全字段 */
  referral_reward_status: string | null;
  avg_lesson_consumed_3m: number | null;
  days_to_card_expiry: number | null;
  days_since_last_renewal: number | null;
  total_renewal_orders: number | null;
}

export interface Student360NetworkNode {
  stdt_id: string;
  name: string;
  level: number;
  paid_amount: number;
}

export interface Student360Network {
  center: { stdt_id: string; name: string };
  referrals: Student360NetworkNode[];
  referred_by: { stdt_id: string; name: string } | null;
}

export interface Student360SearchParams {
  query?: string;
  segment?: string;
  lifecycle?: string;
  cc_name?: string;
  is_hp?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}
