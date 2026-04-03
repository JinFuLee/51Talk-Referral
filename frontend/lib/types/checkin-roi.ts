// ROI 分析模块类型定义
// 对应后端 backend/api/checkin_roi.py 返回结构

export type RiskLevel =
  | 'gold' // ⭐ 金牌推荐人（付费≥2 或 二级裂变>0）
  | 'effective' // ✅ 有效推荐（付费≥1）
  | 'stuck_pay' // 🔄 漏斗卡在付费（出席>0 付费=0）
  | 'stuck_show' // 🔄 漏斗卡在出席（注册>0 出席=0）
  | 'potential' // 👀 高潜待激活（打卡≥4 课耗≥5 零推荐）
  | 'freeloader' // ⚠️ 纯消耗（打卡≥4 课耗<5 连续2月零推荐）
  | 'newcomer' // 🆕 新人观望（M0-M1）
  | 'casual'; // 💤 低频参与

export interface RiskDistributionItem {
  count: number;
  pct: number;
}

export interface RoiSummary {
  total_students: number;
  total_cost_usd: number;
  total_revenue_usd: number;
  overall_roi: number | null;
  risk_distribution: Record<RiskLevel, RiskDistributionItem>;
}

export interface RoiStudentRow {
  student_id: string;
  enclosure: string;
  cc_name: string;
  team: string;
  activity_cards: number;
  binding_cards: number;
  attendance_cards: number;
  payment_cards: number;
  total_cards: number;
  total_cost_usd: number;
  revenue_usd: number;
  roi: number | null;
  /** 2 月累计 ROI（消除时间差偏差） */
  cumulative_roi: number | null;
  risk_level: RiskLevel;
  days_this_month: number;
  referral_registrations: number;
  referral_payments: number;
  lesson_this_month: number;
}

export interface ChannelRoiItem {
  new_count: number;
  new_paid: number;
  cost_cards: number;
  cost_usd: number;
  revenue_approx_usd: number;
  roi: number | null;
}

export interface RoiAnalysisResponse {
  summary: RoiSummary;
  students: RoiStudentRow[];
  channel_roi: Record<string, ChannelRoiItem>;
}

type RiskLocale = 'zh' | 'zh-TW' | 'en' | 'th';

// 风险等级展示配置（行为模式分层）
export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  {
    /** 中文标签（后端 key 原文，供 BEHAVIOR_TIER_LABELS 映射使用） */
    label: string;
    labels: Record<RiskLocale, string>;
    color: string;
    bgColor: string;
    emoji: string;
    action: string;
  }
> = {
  gold: {
    label: '金牌推荐人',
    labels: {
      zh: '金牌推荐人',
      'zh-TW': '金牌推薦人',
      en: 'Gold Referrer',
      th: 'ผู้แนะนำระดับทอง',
    },
    color: '#b45309',
    bgColor: '#fef3c7',
    emoji: '⭐',
    action: 'VIP 专属活动 + 升级激励',
  },
  effective: {
    label: '有效推荐',
    labels: {
      zh: '有效推荐',
      'zh-TW': '有效推薦',
      en: 'Effective Referrer',
      th: 'ผู้แนะนำที่มีประสิทธิภาพ',
    },
    color: '#16a34a',
    bgColor: '#dcfce7',
    emoji: '✅',
    action: '维护关系 + 持续激励',
  },
  stuck_pay: {
    label: '成交待跟进',
    labels: {
      zh: '成交待跟进',
      'zh-TW': '成交待跟進',
      en: 'Pending Conversion',
      th: 'รอปิดการขาย',
    },
    color: '#ca8a04',
    bgColor: '#fef9c3',
    emoji: '🔄',
    action: 'CC 加强 B 的成交话术',
  },
  stuck_show: {
    label: '出席待跟进',
    labels: {
      zh: '出席待跟进',
      'zh-TW': '出席待跟進',
      en: 'Pending Attendance',
      th: 'รอติดตามเข้าร่วม',
    },
    color: '#ea580c',
    bgColor: '#ffedd5',
    emoji: '🔄',
    action: 'CC 跟进 B 学员到场试听',
  },
  potential: {
    label: '高潜待激活',
    labels: {
      zh: '高潜待激活',
      'zh-TW': '高潛待激活',
      en: 'High-Pot to Activate',
      th: 'ศักยภาพสูงรอกระตุ้น',
    },
    color: '#7c3aed',
    bgColor: '#ede9fe',
    emoji: '👀',
    action: '话术引导推荐（认可产品但缺推荐动力）',
  },
  freeloader: {
    label: '纯消耗',
    labels: { zh: '纯消耗', 'zh-TW': '純消耗', en: 'Pure Consumer', th: 'บริโภคอย่างเดียว' },
    color: '#dc2626',
    bgColor: '#fee2e2',
    emoji: '⚠️',
    action: '评估激励规则调整',
  },
  newcomer: {
    label: '新人观望',
    labels: { zh: '新人观望', 'zh-TW': '新人觀望', en: 'New Observer', th: 'มือใหม่รอดู' },
    color: '#6b7280',
    bgColor: '#f3f4f6',
    emoji: '🆕',
    action: '正常观察期',
  },
  casual: {
    label: '低频参与',
    labels: { zh: '低频参与', 'zh-TW': '低頻參與', en: 'Low Frequency', th: 'มีส่วนร่วมน้อย' },
    color: '#9ca3af',
    bgColor: '#f9fafb',
    emoji: '💤',
    action: '标准沟通',
  },
};

/** 取当前 locale 的风险等级标签，无匹配回退到中文 */
export function getRiskLabel(level: RiskLevel, locale: string): string {
  const cfg = RISK_LEVEL_CONFIG[level];
  if (!cfg) return level;
  const l = locale as RiskLocale;
  return cfg.labels[l] ?? cfg.labels.zh;
}

// 图表用颜色（与 RISK_LEVEL_CONFIG 对齐，Recharts 需要 hex）
export const RISK_PIE_COLORS: Record<RiskLevel, string> = {
  gold: '#f59e0b',
  effective: '#22c55e',
  stuck_pay: '#eab308',
  stuck_show: '#f97316',
  potential: '#8b5cf6',
  freeloader: '#ef4444',
  newcomer: '#6b7280',
  casual: '#d1d5db',
};
