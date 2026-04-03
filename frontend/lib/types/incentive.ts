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
  stage_label?: string;
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
    name: string;
    name_th: string;
    start_date: string;
    end_date: string;
  } | null;
  actionable?: boolean;
  action_note?: string;
}

export interface IncentiveBudget {
  indoor_budget_thb: number;
  outdoor_budget_thb: number;
  updated_at: string;
}

// 指标名多语言映射
export const METRIC_LABELS: Record<string, Record<string, string>> = {
  paid: { zh: '付费单量', 'zh-TW': '付費單量', en: 'Paid Orders', th: 'คำสั่งซื้อที่ชำระ' },
  leads: { zh: '转介绍注册数', 'zh-TW': '轉介紹注冊數', en: 'Referral Leads', th: 'ลีดแนะนำ' },
  showup: { zh: '出席人数', 'zh-TW': '出席人數', en: 'Attendees', th: 'ผู้เข้าร่วม' },
  revenue: { zh: '业绩(USD)', 'zh-TW': '業績(USD)', en: 'Revenue (USD)', th: 'รายได้ (USD)' },
  checkin_rate: { zh: '打卡率', 'zh-TW': '打卡率', en: 'Check-in Rate', th: 'อัตราเช็คอิน' },
  participation_rate: {
    zh: '参与率',
    'zh-TW': '參與率',
    en: 'Participation Rate',
    th: 'อัตราการมีส่วนร่วม',
  },
  cc_reach_rate: {
    zh: 'CC触达率',
    'zh-TW': 'CC觸達率',
    en: 'CC Reach Rate',
    th: 'อัตราการติดต่อ CC',
  },
  registrations: { zh: '注册数', 'zh-TW': '注冊數', en: 'Registrations', th: 'การลงทะเบียน' },
  payments: { zh: '付费数', 'zh-TW': '付費數', en: 'Payments', th: 'การชำระเงิน' },
  revenue_usd: { zh: '业绩(USD)', 'zh-TW': '業績(USD)', en: 'Revenue (USD)', th: 'รายได้ (USD)' },
  cargo_ratio: { zh: '带货比', 'zh-TW': '帶貨比', en: 'Cargo Ratio', th: 'อัตราสินค้า' },
};

/** 根据 locale 获取指标标签，fallback 到 metric key */
export function getMetricLabel(metric: string, locale: string): string {
  const map = METRIC_LABELS[metric];
  if (!map) return metric;
  return map[locale] ?? map['zh'] ?? metric;
}

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
