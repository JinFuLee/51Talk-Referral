/**
 * CC 个人业绩全维度类型 — 对应 Referral Performance 报表
 *
 * 设计原则:
 * - 所有金额字段均为 USD，THB 由前端用 exchange_rate 换算显示
 * - I 组（预约 Apps）已删除：8 个数据源无法计算
 * - 字段名 snake_case（与后端 API 返回一致，项目未启用 camelCase 转换）
 * - 使用 formatRevenue(usd, rate) 展示双币
 * - 使用 formatRate(value) 展示百分比
 */

// ── 复用子类型 ──────────────────────────────────────────

/** 通用绩效指标：目标 → 实际 → 差额 → 达成率 → BM 节奏 */
export interface PerformanceMetric {
  target: number | null;
  actual: number | null;
  gap: number | null; // actual - target（负=落后）
  achievement_pct: number | null; // actual / target（>1=超额）
  // BM（Budget Month）节奏字段——asp 没有（不按时间线性），其余指标均有
  bm_expected: number | null; // target × time_progress（当前时间进度对应的期望值）
  bm_gap: number | null; // actual - bm_expected（正=领先，负=落后）
  bm_pct: number | null; // actual / bm_expected（BM 达成率）
}

/** 转化率指标 */
export interface ConversionRate {
  actual: number | null; // 实际转化率 (0~1)
  target: number | null; // 目标转化率 (from config)
  achievement_pct: number | null; // actual / target
}

/** 触达指标 */
export interface OutreachMetric {
  count: number | null;
  proportion: number | null; // 覆盖率 (0~1)
}

// ── CC 个人记录 ──────────────────────────────────────────

/** 单个 CC 的全维度业绩记录 */
export interface CCPerformanceRecord {
  // A 组：基础信息
  team: string; // TH-CC01Team
  cc_name: string; // thcc-Zen (CRM 账号)

  // B 组：业绩 (USD)
  revenue: PerformanceMetric; // 个人总业绩

  // D 组：BM% 进度差额
  pace_gap_pct: number | null; // actual/target - time_progress

  // F 组：付费单量
  paid: PerformanceMetric;

  // G 组：客单价 (USD)
  asp: PerformanceMetric;

  // H 组：出席 (User B)
  showup: PerformanceMetric;

  // I 组：已删除（预约 Apps — 数据源无法计算）

  // J 组：注册 (Leads)
  leads: PerformanceMetric;
  leads_user_a: number | null; // User A 老学员数

  // 转化率链（跳过 apps 相关率）
  showup_to_paid: ConversionRate; // 出席→付费率
  leads_to_paid: ConversionRate; // 注册→付费率（端到端）

  // K 组：拨打覆盖（从 D4 计算）
  calls_total: number | null; // 总拨打次数
  called_this_month: number | null; // 本月已拨打学员数
  call_target: number | null; // 月度拨打目标
  call_proportion: number | null; // 拨打覆盖率
  call_achievement_pct: number | null; // 达成率

  // L 组：接通覆盖
  connected: OutreachMetric;

  // M 组：有效接通
  effective: OutreachMetric;

  // 过程指标（D2 mean 聚合）
  participation_rate: number | null; // 转介绍参与率
  checkin_rate: number | null; // 当月有效打卡率
  cc_reach_rate: number | null; // CC触达率
  coefficient: number | null; // 带新系数
  students_count: number | null; // 管辖学员数

  // 目标分配上下文
  target_source: 'allocated' | 'manual'; // "allocated"=按学员数加权
  team_revenue_target: number | null; // 团队总金额目标(供对比)
  team_paid_target: number | null; // 团队总付费目标

  // 节奏上下文（对齐双差额体系 + 8 项指标显示规范）
  remaining_daily_avg: number | null; // 达标需日均 (USD)
  pace_daily_needed: number | null; // 追进度需日均 (USD)
  current_daily_avg: number | null; // 当前日均 (USD)
  efficiency_lift_pct: number | null; // 效率提升需求
}

// ── 团队汇总 ──────────────────────────────────────────

/** 团队汇总 + 下属 CC 明细 */
export interface CCPerformanceTeamSummary {
  team: string;
  headcount: number;

  // 团队聚合
  revenue: PerformanceMetric;
  paid: PerformanceMetric;
  asp: PerformanceMetric;
  showup: PerformanceMetric;
  leads: PerformanceMetric;

  // 团队转化率
  showup_to_paid: ConversionRate;
  leads_to_paid: ConversionRate;

  // 团队拨打覆盖
  calls_total: number | null;
  called_this_month: number | null;
  call_target: number | null;
  call_proportion: number | null;
  call_achievement_pct: number | null;

  // 团队触达
  connected: OutreachMetric;
  effective: OutreachMetric;

  // 团队过程指标
  participation_rate: number | null;
  checkin_rate: number | null;
  cc_reach_rate: number | null;
  coefficient: number | null;
  students_count: number | null;

  // 下属明细
  records: CCPerformanceRecord[];
}

// ── API 响应 ──────────────────────────────────────────

/** CC 个人业绩 API 响应 */
export interface CCPerformanceResponse {
  month: string; // YYYYMM
  time_progress_pct: number; // 月度时间进度 (0~1)
  elapsed_workdays: number;
  remaining_workdays: number;
  exchange_rate: number; // USD→THB（from config）

  teams: CCPerformanceTeamSummary[];
  grand_total: CCPerformanceRecord | null;
}

// ── 辅助函数 ──────────────────────────────────────────

/** THB 换算辅助 */
export function toTHB(usd: number | null, rate: number): number | null {
  return usd != null ? usd * rate : null;
}

/** PerformanceMetric 的 THB 版本（百分比/BM率不换算，金额字段换算） */
export function metricToTHB(m: PerformanceMetric, rate: number): PerformanceMetric {
  return {
    target: toTHB(m.target, rate),
    actual: toTHB(m.actual, rate),
    gap: toTHB(m.gap, rate),
    achievement_pct: m.achievement_pct, // 百分比不换算
    bm_expected: toTHB(m.bm_expected, rate),
    bm_gap: toTHB(m.bm_gap, rate),
    bm_pct: m.bm_pct, // BM 达成率不换算
  };
}
