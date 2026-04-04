export interface FunnelStage {
  name: string;
  target: number;
  actual: number;
  gap: number;
  achievement_rate: number;
  conversion_rate?: number;
  target_rate?: number;
  rate_gap?: number;
}

export interface FunnelResult {
  date: string;
  stages: FunnelStage[];
  target_revenue: number;
  actual_revenue: number;
  revenue_gap: number;
  revenue_achievement: number;
}

export interface ScenarioResult {
  stage: string;
  current_rate: number;
  scenario_rate: number;
  impact_registrations: number;
  impact_payments: number;
  impact_revenue: number;
}
