/**
 * M33 运营分析报告 — 前端 TypeScript 类型定义
 * 与后端 backend/core/report_engine.py 输出契约对齐
 * 百分比字段统一用 0-1 范围（如 0.87 = 87%），日期用 YYYY-MM-DD 字符串
 */

// ────────────────────────────────────────────────
// 通用复用类型
// ────────────────────────────────────────────────

/** 同比/环比对比结果（单指标，单维度） */
export interface ComparisonResult {
  current: number;
  previous: number;
  delta: number;
  delta_pct: number;
  /** 判断符号：↑ 上升 | ↓ 下降 | → 持平 */
  judgment: '↑' | '↓' | '→';
}

/** 单个渠道的漏斗指标 */
export interface ChannelMetrics {
  /** 渠道名称：CC窄 | SS窄 | LP窄 | 宽口 | 其它 | total */
  channel: string;
  registrations: number;
  appointments: number;
  attendance: number;
  payments: number;
  revenue_usd: number;
  asp: number;
  appt_rate: number;
  attend_rate: number;
  paid_rate: number;
  reg_to_pay_rate: number;
}

/** 三档目标推荐（单档） */
export interface TargetRecommendation {
  /** 档位：conservative=保守 | moderate=持平 | aggressive=激进 */
  tier: 'conservative' | 'moderate' | 'aggressive';
  registrations: number;
  appointments: number;
  payments: number;
  revenue_usd: number;
  appt_rate: number;
  attend_rate: number;
  paid_rate: number;
  asp: number;
  /** 口径拆分目标 */
  channel_targets: Record<string, number>;
}

/** 收入杠杆评分（区块 9 单条目） */
export interface LeverageScore {
  channel: string;
  /** 漏斗阶段：appt_rate | attend_rate | paid_rate */
  stage: string;
  actual_rate: number;
  target_rate: number;
  gap: number;
  /** 补齐 gap 带来的增量收入（USD） */
  revenue_impact: number;
  /** 可行性：0-1 */
  feasibility: number;
  /** 紧迫度系数：1.5 下降 | 1.0 平 | 0.7 上升 */
  urgency: number;
  /** 综合杠杆分 = impact × feasibility × urgency */
  leverage_score: number;
  /** 是否为该渠道最大瓶颈 */
  is_bottleneck: boolean;
  /** 人工可读判断：高潜力🟢 | 待改善🟡 | 已饱和⚪ */
  potential_label: string;
}

/** Laspeyres 三因素加法分解结果 */
export interface LaspeyrersDecomposition {
  /** 量贡献（注册数变化） */
  vol_delta: number;
  /** 率贡献（综合转化率变化） */
  conv_delta: number;
  /** 价贡献（客单价变化） */
  price_delta: number;
  /** 交叉残差 */
  residual: number;
  /** 实际总增量（= 四项之和） */
  actual_delta: number;
  /** 残差率（residual / actual_delta）；超 3% 前端自动切换展示 LMDI */
  residual_pct: number;
}

/** LMDI 对数分解结果（零残差） */
export interface LMDIDecomposition {
  vol_lmdi: number;
  conv_lmdi: number;
  price_lmdi: number;
  /** 始终为 0 */
  residual: number;
  actual_delta: number;
}

// ────────────────────────────────────────────────
// 11 区块 interface
// ────────────────────────────────────────────────

/** 区块 1: 月度总览 */
export interface MonthlyOverview {
  /** 当前工作日进度（0-1） */
  bm_pct: number;
  /** 月度目标（按指标名索引） */
  targets: Record<string, number>;
  /** 当前实际值（按指标名索引） */
  actuals: Record<string, number>;
  /** 效率进度 = actual / (target × bm_pct)，1.0 = 恰好跟上进度 */
  bm_efficiency: Record<string, number>;
  /** 进度 GAP = bm_efficiency - 1.0（负值=落后） */
  gap: Record<string, number>;
  /** 达标需日均（按指标） */
  remaining_daily_avg: Record<string, number>;
  /** 追进度需日均（按指标） */
  pace_daily_needed: Record<string, number>;
}

/** 区块 2: 目标分解 + 各类缺口 */
export interface GapDashboard {
  /** 各渠道口径目标（注册数） */
  channel_targets: Record<string, number>;
  gaps: {
    /** 业绩缺口（USD，负值=落后） */
    revenue_gap: number;
    /** 客单价缺口（USD） */
    asp_gap: number;
    /** 补齐业绩需要新增的付费数 */
    bill_gap: number;
    /** 补齐付费数需要新增的出席数 */
    showup_gap: number;
    /** 补齐出席数需要新增的预约数 */
    appt_gap: number;
    /** 补齐预约数需要新增的注册数 */
    lead_gap: number;
    /** 各渠道注册缺口 */
    channel_lead_gaps: Record<string, number>;
  };
}

/** 区块 3: 效率提升推演（复用 ScenarioEngine） */
export interface ScenarioAnalysis {
  /** 推演场景列表 */
  scenarios: Array<{
    /** 推演名称，如"预约率提升至目标" */
    name: string;
    stage: string;
    current_rate: number;
    target_rate: number;
    impact_registrations: number;
    impact_payments: number;
    impact_revenue: number;
    /** 是否为口径级推演 */
    channel?: string;
  }>;
}

/** 区块 4: 效率不变-月底达标测算 */
export interface Projection {
  projected_registrations: number;
  projected_appointments: number;
  projected_attendance: number;
  projected_payments: number;
  projected_revenue_usd: number;
  /** 与月目标的差距（USD） */
  revenue_gap_to_target: number;
  /** 客单价每跌 $1 的收入影响（USD） */
  asp_sensitivity_per_dollar: number;
  /** 当前日均各指标 */
  current_daily_avg: Record<string, number>;
}

/** 区块 5: 当月业绩贡献 */
export interface RevenueContribution {
  /** 按渠道分列的贡献明细 */
  channels: ChannelMetrics[];
  /** 窄口小计（CC + SS + LP） */
  narrow_subtotal: ChannelMetrics;
  /** 全部合计 */
  total: ChannelMetrics;
}

/** MoM 归因单行 */
export interface MomAttributionRow {
  /** 指标名，如 revenue | reg | appt_rate */
  metric: string;
  /** 上月实际值 */
  last_month: number;
  /** 本月当前值 */
  this_month: number;
  /** 本月目标 */
  target: number;
  delta: number;
  delta_pct: number;
  /** vs 目标（率类型=差值，量类型=差额） */
  vs_target: number;
  /** 综合判断：↑ | ↓ | → */
  judgment: '↑' | '↓' | '→';
}

/** 区块 6: MoM 增量归因 */
export interface MomAttribution {
  /** 7 指标 × 7 列 */
  rows: MomAttributionRow[];
}

/** 单渠道例子归因行（区块 7） */
export interface LeadAttributionRow {
  channel: string;
  registrations: number;
  reg_share: number;
  appt_rate: number;
  attend_rate: number;
  paid_rate: number;
  reg_to_pay_rate: number;
  payments: number;
  payment_share: number;
  revenue_usd: number;
  revenue_share: number;
}

/** 区块 7: 例子贡献 + 过程指标归因 */
export interface LeadAttribution {
  rows: LeadAttributionRow[];
  total: LeadAttributionRow;
}

/** 区块 8: 增量归因分解（Laspeyres + LMDI 双轨） */
export interface Decomposition {
  laspeyres: LaspeyrersDecomposition;
  lmdi: LMDIDecomposition;
  /**
   * 前端展示策略：
   * - "laspeyres"：残差率 ≤ 3%，展示 Laspeyres
   * - "lmdi"：残差率 > 3%，自动切换 LMDI 并显示标注
   */
  display_method: 'laspeyres' | 'lmdi';
  /** 基期（上月/上周）指标快照 */
  base_period: {
    registrations: number;
    reg_to_pay_rate: number;
    asp: number;
    revenue_usd: number;
  };
  /** 当期指标快照 */
  current_period: {
    registrations: number;
    reg_to_pay_rate: number;
    asp: number;
    revenue_usd: number;
  };
}

/** 区块 9: 过程指标归因（收入杠杆矩阵） */
export interface FunnelLeverage {
  scores: LeverageScore[];
  /** 全局最大瓶颈（leverage_score 最高单条） */
  top_bottleneck: LeverageScore;
}

/** 单渠道 MoM 对比行（区块 10） */
export interface ChannelRevenueRow {
  channel: string;
  last_month_revenue: number;
  this_month_revenue: number;
  delta_revenue: number;
  delta_pct: number;
  /** 核心驱动因素文案（后端生成，如"注册增 +15%，转化稳定"） */
  driver_text: string;
  judgment: '↑' | '↓' | '→';
}

/** 区块 10: 渠道级业绩增量归因 */
export interface ChannelRevenue {
  rows: ChannelRevenueRow[];
}

/** 单渠道三因素分解（区块 11） */
export interface ChannelThreeFactorRow {
  channel: string;
  laspeyres: LaspeyrersDecomposition;
  lmdi: LMDIDecomposition;
  display_method: 'laspeyres' | 'lmdi';
}

/** 区块 11: 渠道三因素分解 */
export interface ChannelThreeFactor {
  /** 每个渠道独立分解结果 */
  channels: ChannelThreeFactorRow[];
}

// ────────────────────────────────────────────────
// 顶层 DailyReport
// ────────────────────────────────────────────────

/** 11 区块容器 */
export interface ReportBlocks {
  monthly_overview: MonthlyOverview;
  gap_dashboard: GapDashboard;
  scenario_analysis: ScenarioAnalysis;
  projection: Projection;
  revenue_contribution: RevenueContribution;
  mom_attribution: MomAttribution;
  lead_attribution: LeadAttribution;
  decomposition: Decomposition;
  funnel_leverage: FunnelLeverage;
  channel_revenue: ChannelRevenue;
  channel_three_factor: ChannelThreeFactor;
}

/** 顶层日报（GET /api/report/daily 返回） */
export interface DailyReport {
  /** T-1 数据日期，YYYY-MM-DD */
  date: string;
  /** 当前工作日进度（0-1，冗余字段方便顶部进度条直接读取） */
  bm_pct: number;
  blocks: ReportBlocks;
  /** 三档目标推荐（Settings 页面消费） */
  target_recommendations: TargetRecommendation[];
  /** 8 维环比汇总（API 扁平化，供摘要卡片快速读取） */
  comparisons: {
    day: ComparisonResult;
    week_td: ComparisonResult;
    week_roll: ComparisonResult;
    month_td: ComparisonResult;
    month_roll: ComparisonResult;
    year_td: ComparisonResult;
    year_roll: ComparisonResult;
  };
}

/** API 报告摘要响应（钉钉 + 首屏快速渲染） */
export interface ReportSummary {
  date: string;
  bm_pct: number;
  /** 注册数月进度 */
  reg_progress: number;
  /** 付费数月进度 */
  payment_progress: number;
  /** 业绩月进度（0-1） */
  revenue_progress: number;
  /** 实际业绩（USD） */
  revenue_usd: number;
  /** 月目标（USD） */
  revenue_target: number;
  top_bottleneck_text: string;
  day_comparison: ComparisonResult;
}
