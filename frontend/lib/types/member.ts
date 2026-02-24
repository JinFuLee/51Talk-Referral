export interface BadgeDetail {
  id: string;
  label: string;
  triggered: boolean;
  trigger_value: number;
  threshold: string;
}

export interface MemberProfileResponse {
  identity: {
    name: string;
    team: string;
    hire_days: number;
    badges: string[];
    badge_details: BadgeDetail[];
  };
  radar: {
    personal: number[];
    benchmark: number[];
    dimensions: string[];
  };
  anomaly: {
    daily_calls: { date: string; count: number; flag: "normal" | "yellow" | "red" | "rest" }[];
    red_flags: string[];
    yellow_flags: string[];
  };
  revenue: {
    mtd_usd: number;
    mtd_thb: number;
    rank_in_team: number;
    team_size: number;
    package_mix: { type: string; pct: number; count: number }[];
    asp_usd: number;
  };
}
