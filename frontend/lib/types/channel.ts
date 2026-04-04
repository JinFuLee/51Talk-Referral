export interface ChannelMetrics {
  channel: string;
  registrations: number | null;
  appointments: number | null;
  attendance: number | null;
  payments: number | null;
  revenue_usd: number | null;
  share_pct: number | null;
}

export interface RevenueContribution {
  channel: string;
  revenue: number | null;
  share: number | null;
  per_capita: number | null;
}

export interface ThreeFactorComparison {
  channel: string;
  expected_volume: number | null;
  actual_volume: number | null;
  gap: number | null;
  appt_factor: number | null;
  show_factor: number | null;
  pay_factor: number | null;
}
