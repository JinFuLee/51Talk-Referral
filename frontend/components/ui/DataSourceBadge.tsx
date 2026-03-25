'use client';

import { clsx } from 'clsx';

export interface DataSourceBadgeProps {
  source?: string;
  className?: string;
  isEstimated?: boolean; // 用于部分基于目标预估的值
}

/**
 * 集中管理的信源徽章组件
 * 提供一个一致的视觉锚点让使用者清楚当前数据的可信赖度和出处
 */
export function DataSourceBadge({ source, className, isEstimated }: DataSourceBadgeProps) {
  if (!source && !isEstimated) return null;

  // 根据预定义别名解析展示文案与高亮级别
  let label = '系统分析';
  let variant: 'green' | 'yellow' | 'gray' = 'gray';

  if (isEstimated) {
    label = '预估数据';
    variant = 'yellow';
  } else if (source === 'fallback_f5') {
    label = '推算数据 (F5)';
    variant = 'yellow';
  } else if (source === 'real_f2_section') {
    label = '实测数据 (F2)';
    variant = 'green';
  } else if (source === 'real_b1') {
    label = '实测成本 (B1)';
    variant = 'green';
  } else if (source === 'cohort_roi') {
    label = 'ROI 同期群';
    variant = 'green';
  } else if (source === 'f7_summary') {
    label = '围场实录 (F7)';
    variant = 'green';
  } else if (source === 'f8_summary') {
    label = '有效拨打 (F8)';
    variant = 'green';
  } else if (source?.toLowerCase().includes('f11')) {
    label = '触达明细 (F11)';
    variant = 'green';
  } else if (source === 'c4') {
    label = '带新池 (C4)';
    variant = 'green';
  } else if (source === 'no_data') {
    label = '暂无数据';
    variant = 'gray';
  } else if (source === 'unavailable') {
    label = '数据不可用';
    variant = 'yellow';
  } else if (source === 'approximate') {
    label = '近似数据';
    variant = 'yellow';
  } else if (source === 'empty' || source === 'none') {
    return null; // 有意留空不渲染
  } else if (source) {
    label = `信源: ${source.toUpperCase()}`;
    variant = 'gray';
  }

  return (
    <span
      className={clsx(
        'text-[10px] px-2 py-0.5 rounded-full font-medium border flex-shrink-0 whitespace-nowrap',
        variant === 'yellow' && 'bg-amber-50 text-amber-600 border-amber-200',
        variant === 'green' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
        variant === 'gray' &&
          'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
        className
      )}
      title={isEstimated ? '部分或全部基于业务目标的降级模型' : '系统可溯源真实记录表单'}
    >
      {label}
    </span>
  );
}
