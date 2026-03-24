export interface EnclosureSSMetrics {
  enclosure: string;
  ss_group: string | null;
  ss_name: string | null;
  students: number | null;
  participation_rate: number | null;
  new_coefficient: number | null;
  cargo_ratio: number | null;
  checkin_rate: number | null;
  cc_reach_rate: number | null;
  ss_reach_rate: number | null;
  lp_reach_rate: number | null;
  registrations: number | null;
  payments: number | null;
  revenue_usd: number | null;
  registration_rate: number | null;
}

export interface EnclosureLPMetrics {
  enclosure: string;
  lp_group: string | null;
  lp_name: string | null;
  students: number | null;
  participation_rate: number | null;
  new_coefficient: number | null;
  cargo_ratio: number | null;
  checkin_rate: number | null;
  cc_reach_rate: number | null;
  ss_reach_rate: number | null;
  lp_reach_rate: number | null;
  registrations: number | null;
  payments: number | null;
  revenue_usd: number | null;
  registration_rate: number | null;
}

export interface ExpiryAlertSummary {
  urgent_count: number;
  warning_count: number;
  watch_count: number;
  total: number;
}

export interface ExpiryAlertItem {
  stdt_id: string;
  enclosure: string | null;
  cc_name: string | null;
  days_to_expiry: number | null;
  days_since_last_contact: number | null;
  risk_level: 'high' | 'medium' | 'low' | null;
  current_cards: number | null;
  monthly_referral_registrations: number | null;
  monthly_referral_payments: number | null;
  urgency_tier: string | null;
}
