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

// 风险等级展示配置（行为模式分层）
export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string; emoji: string; action: string }
> = {
  gold: {
    label: '金牌推荐人',
    color: '#b45309',
    bgColor: '#fef3c7',
    emoji: '⭐',
    action: 'VIP 专属活动 + 升级激励',
  },
  effective: {
    label: '有效推荐',
    color: '#16a34a',
    bgColor: '#dcfce7',
    emoji: '✅',
    action: '维护关系 + 持续激励',
  },
  stuck_pay: {
    label: '成交待跟进',
    color: '#ca8a04',
    bgColor: '#fef9c3',
    emoji: '🔄',
    action: 'CC 加强 B 的成交话术',
  },
  stuck_show: {
    label: '出席待跟进',
    color: '#ea580c',
    bgColor: '#ffedd5',
    emoji: '🔄',
    action: 'CC 跟进 B 学员到场试听',
  },
  potential: {
    label: '高潜待激活',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    emoji: '👀',
    action: '话术引导推荐（认可产品但缺推荐动力）',
  },
  freeloader: {
    label: '纯消耗',
    color: '#dc2626',
    bgColor: '#fee2e2',
    emoji: '⚠️',
    action: '评估激励规则调整',
  },
  newcomer: {
    label: '新人观望',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    emoji: '🆕',
    action: '正常观察期',
  },
  casual: {
    label: '低频参与',
    color: '#9ca3af',
    bgColor: '#f9fafb',
    emoji: '💤',
    action: '标准沟通',
  },
};

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
