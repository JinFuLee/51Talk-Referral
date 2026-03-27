export interface Campaign {
  id: string;
  name: string;
  name_th: string;
  role: 'CC' | 'SS' | 'LP';
  month: string;
  start_date: string | null;
  end_date: string | null;
  metric: string;
  operator: string;
  threshold: number;
  reward_thb: number;
  leverage_source: {
    stage: string;
    revenue_impact_usd: number;
    leverage_score: number;
  } | null;
  status: 'active' | 'paused' | 'completed' | 'deleted';
  poster_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonProgress {
  person_name: string;
  team: string;
  metric_value: number | null;
  threshold: number;
  gap: number | null;
  progress_pct: number;
  status: 'qualified' | 'close' | 'in_progress' | 'not_started';
  reward_thb: number;
}

export interface CampaignProgress {
  campaign: Campaign;
  records: PersonProgress[];
  qualified_count: number;
  close_count: number;
  total_estimated_thb: number;
}

export interface LeverRecommendation {
  rank: number;
  stage: string;
  leverage_score: number;
  revenue_impact_usd: number;
  current_rate: number | null;
  target_rate: number | null;
  suggested_campaign: {
    role: string;
    metric: string;
    threshold: number;
    reward_thb: number;
    rationale: string;
  } | null;
}

export interface IncentiveBudget {
  indoor_budget_thb: number;
  outdoor_budget_thb: number;
  updated_at: string;
}

// 指标名中文映射
export const METRIC_LABELS: Record<string, string> = {
  paid: '付费单量',
  leads: '转介绍注册数',
  showup: '出席人数',
  revenue: '业绩(USD)',
  checkin_rate: '打卡率',
  participation_rate: '参与率',
  cc_reach_rate: 'CC触达率',
  registrations: '注册数',
  payments: '付费数',
  revenue_usd: '业绩(USD)',
  cargo_ratio: '带货比',
};

export const ROLE_METRICS: Record<string, string[]> = {
  CC: ['paid', 'leads', 'showup', 'revenue', 'checkin_rate', 'participation_rate', 'cc_reach_rate'],
  SS: [
    'registrations',
    'payments',
    'revenue_usd',
    'participation_rate',
    'checkin_rate',
    'cargo_ratio',
  ],
  LP: [
    'registrations',
    'payments',
    'revenue_usd',
    'participation_rate',
    'checkin_rate',
    'cargo_ratio',
  ],
};
