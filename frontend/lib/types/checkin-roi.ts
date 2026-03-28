// ROI 分析模块类型定义
// 对应后端 backend/api/checkin_roi.py 返回结构

export type RiskLevel =
  | 'high_value' // 🟢 ROI ≥ 200%
  | 'normal' // 🟡 ROI 0-200%
  | 'focus' // 🟠 有推荐但入不敷出
  | 'pure_freeloader' // 🔴-1 低价值白嫖
  | 'high_value_freeloader' // 🔴-2 高课耗白嫖
  | 'newcomer' // 🔴-3 新人观望
  | 'no_cost'; // 灰 无成本

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

// 风险等级展示配置
export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string; emoji: string }
> = {
  high_value: {
    label: '高价值',
    color: '#16a34a',
    bgColor: '#dcfce7',
    emoji: '🟢',
  },
  normal: {
    label: '正常',
    color: '#ca8a04',
    bgColor: '#fef9c3',
    emoji: '🟡',
  },
  focus: {
    label: '重点关注',
    color: '#ea580c',
    bgColor: '#ffedd5',
    emoji: '🟠',
  },
  pure_freeloader: {
    label: '白嫖-低价值',
    color: '#dc2626',
    bgColor: '#fee2e2',
    emoji: '🔴',
  },
  high_value_freeloader: {
    label: '白嫖-高课耗',
    color: '#b91c1c',
    bgColor: '#fecaca',
    emoji: '🔴',
  },
  newcomer: {
    label: '新人观望',
    color: '#9f1239',
    bgColor: '#ffe4e6',
    emoji: '🔴',
  },
  no_cost: {
    label: '无成本',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    emoji: '⚪',
  },
};

// 图表用颜色（与 RISK_LEVEL_CONFIG 对齐，Recharts 需要 hex）
export const RISK_PIE_COLORS: Record<RiskLevel, string> = {
  high_value: '#22c55e',
  normal: '#eab308',
  focus: '#f97316',
  pure_freeloader: '#ef4444',
  high_value_freeloader: '#dc2626',
  newcomer: '#9f1239',
  no_cost: '#9ca3af',
};
