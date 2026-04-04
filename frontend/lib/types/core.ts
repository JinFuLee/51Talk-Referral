/**
 * 通用核心类型 — 跨业务域复用，不含转介绍业务语义
 * 供 analysis.ts 及其他模块 import
 */

/** 红绿灯状态 */
export type Status = 'green' | 'yellow' | 'red';

/** 带目标值的指标 */
export interface MetricWithTarget {
  actual: number;
  target: number;
  unit?: string;
  status?: Status;
}

/** 预测置信带单点 */
export interface PredictionBand {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

/** 风险预警条目（业务视图版） */
export interface RiskAlertBiz {
  level: 'red' | 'yellow' | 'green';
  category: string;
  message: string;
  action: string;
}
