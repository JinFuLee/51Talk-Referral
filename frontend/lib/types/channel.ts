export interface ChannelMetrics {
  channel: string
  registrations: number
  appointments: number
  attendance: number
  payments: number
  revenue_usd: number
  share_pct: number
}

export interface RevenueContribution {
  channel: string
  revenue: number
  share: number
  per_capita: number
}

export interface ThreeFactorComparison {
  channel: string
  expected_volume: number
  actual_volume: number
  gap: number
  appt_factor: number
  show_factor: number
  pay_factor: number
}
