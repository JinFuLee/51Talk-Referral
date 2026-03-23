export type Audience = 'gm' | 'ops-director' | 'crosscheck';
export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** 预留用于未来 slide 目录/大纲功能（如侧边栏 slide 列表展示） */
export interface SlideEntry {
  id: string;
  section: string;
  title: string;
  subtitle?: string;
}

/** 所有 Slide 组件共用的分页 props */
export interface SlideProps {
  slideNumber: number;
  totalSlides: number;
}

/**
 * 渠道归因数据（金额/占比/人均）
 * 对应后端 /api/channel/attribution 返回项
 * 与 channel.ts RevenueContribution 字段一致，此处作为 Slide 层别名复用
 */
export interface ChannelAttribution {
  channel: string;
  revenue: number;
  share: number;
  per_capita: number;
}

/**
 * 渠道漏斗数据（注册→预约→出席→付费）
 * 对应后端 /api/channel 返回项
 */
export interface ChannelFunnel {
  channel: string;
  registrations: number;
  appointments: number;
  attendances: number;
  paid_count: number;
}

/**
 * 渠道业绩拆解（目标/实际/差距/达成率）
 * 对应后端 /api/channel 返回项
 */
export interface ChannelRevenue {
  channel: string;
  target_amount_usd: number;
  actual_amount_usd: number;
  gap_usd: number;
  achievement_rate: number;
}

/**
 * 渠道三因素对标（预约/出席/付费因子）
 * 对应后端 /api/channel/three-factor 返回项
 */
export interface ChannelFactor {
  channel: string;
  expected_orders: number;
  actual_orders: number;
  gap_orders: number;
  appt_factor: number;
  show_factor: number;
  pay_factor: number;
}

/**
 * 漏斗环节目标差距
 * 对应后端 /api/overview 的 funnel_stages 数组项
 * 与 funnel.ts FunnelStage 字段子集一致，此处仅含 OverviewData 所需字段
 */
export interface FunnelStageOverview {
  name: string;
  target: number;
  actual: number;
  gap: number;
  achievement_rate: number;
}

/**
 * 概览数据
 * 对应后端 /api/overview 响应体
 */
export interface OverviewData {
  funnel_stages: FunnelStageOverview[];
}

/**
 * 渠道转化率（预约率/出席率/付费率 × 实际/目标）
 * 对应后端 /api/channel 返回项中的转化率字段
 */
export interface ChannelConversion {
  channel: string;
  appointment_rate: number;
  appointment_rate_target: number;
  attendance_rate: number;
  attendance_rate_target: number;
  paid_rate: number;
  paid_rate_target: number;
}
