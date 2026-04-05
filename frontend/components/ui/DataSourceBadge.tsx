'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('DataSourceBadge');

  if (!source && !isEstimated) return null;

  // 根据预定义别名解析展示文案与高亮级别
  let label: string = t('systemAnalysis');
  let variant: 'green' | 'yellow' | 'gray' = 'gray';

  if (isEstimated) {
    label = t('estimated');
    variant = 'yellow';
  } else if (source === 'fallback_f5') {
    label = t('fallback_f5');
    variant = 'yellow';
  } else if (source === 'real_f2_section') {
    label = t('real_f2_section');
    variant = 'green';
  } else if (source === 'real_b1') {
    label = t('real_b1');
    variant = 'green';
  } else if (source === 'cohort_roi') {
    label = t('cohort_roi');
    variant = 'green';
  } else if (source === 'f7_summary') {
    label = t('f7_summary');
    variant = 'green';
  } else if (source === 'f8_summary') {
    label = t('f8_summary');
    variant = 'green';
  } else if (source?.toLowerCase().includes('f11')) {
    label = t('f11');
    variant = 'green';
  } else if (source === 'c4') {
    label = t('c4');
    variant = 'green';
  } else if (source === 'no_data') {
    label = t('no_data');
    variant = 'gray';
  } else if (source === 'unavailable') {
    label = t('unavailable');
    variant = 'yellow';
  } else if (source === 'approximate') {
    label = t('approximate');
    variant = 'yellow';
  } else if (source === 'empty' || source === 'none') {
    return null; // 有意留空不渲染
  } else if (source) {
    label = `${t('sourcePrefix')} ${source.toUpperCase()}`;
    variant = 'gray';
  }

  return (
    <span
      className={clsx(
        'text-[10px] px-2 py-0.5 rounded-full font-medium border flex-shrink-0 whitespace-nowrap',
        variant === 'yellow' && 'bg-warning-surface text-warning-token border-warning-token',
        variant === 'green' && 'bg-success-surface text-success-token border-success-token',
        variant === 'gray' && 'bg-subtle text-secondary-token border-subtle-token',
        className
      )}
      title={isEstimated ? t('estimatedTitle') : t('realTitle')}
    >
      {label}
    </span>
  );
}
