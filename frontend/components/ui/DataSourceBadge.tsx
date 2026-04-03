'use client';

import { clsx } from 'clsx';
import { useLocale } from 'next-intl';

const I18N = {
  zh: {
    systemAnalysis: '系统分析',
    estimated: '预估数据',
    estimatedTitle: '部分或全部基于业务目标的降级模型',
    realTitle: '系统可溯源真实记录表单',
    fallback_f5: '推算数据 (F5)',
    real_f2_section: '实测数据 (F2)',
    real_b1: '实测成本 (B1)',
    cohort_roi: 'ROI 同期群',
    f7_summary: '围场实录 (F7)',
    f8_summary: '有效拨打 (F8)',
    f11: '触达明细 (F11)',
    c4: '带新池 (C4)',
    no_data: '暂无数据',
    unavailable: '数据不可用',
    approximate: '近似数据',
    sourcePrefix: '信源:',
  },
  'zh-TW': {
    systemAnalysis: '系統分析',
    estimated: '預估數據',
    estimatedTitle: '部分或全部基於業務目標的降級模型',
    realTitle: '系統可溯源真實記錄表單',
    fallback_f5: '推算數據 (F5)',
    real_f2_section: '實測數據 (F2)',
    real_b1: '實測成本 (B1)',
    cohort_roi: 'ROI 同期群',
    f7_summary: '圍場實錄 (F7)',
    f8_summary: '有效撥打 (F8)',
    f11: '觸達明細 (F11)',
    c4: '帶新池 (C4)',
    no_data: '暫無數據',
    unavailable: '數據不可用',
    approximate: '近似數據',
    sourcePrefix: '信源:',
  },
  en: {
    systemAnalysis: 'System Analysis',
    estimated: 'Estimated',
    estimatedTitle: 'Partially or fully based on a fallback model from business targets',
    realTitle: 'Traceable real system records',
    fallback_f5: 'Derived (F5)',
    real_f2_section: 'Measured (F2)',
    real_b1: 'Actual Cost (B1)',
    cohort_roi: 'ROI Cohort',
    f7_summary: 'Enclosure Log (F7)',
    f8_summary: 'Valid Calls (F8)',
    f11: 'Reach Detail (F11)',
    c4: 'New Pool (C4)',
    no_data: 'No Data',
    unavailable: 'Unavailable',
    approximate: 'Approximate',
    sourcePrefix: 'Source:',
  },
  th: {
    systemAnalysis: 'การวิเคราะห์ระบบ',
    estimated: 'ข้อมูลประมาณการ',
    estimatedTitle: 'บางส่วนหรือทั้งหมดอิงจากโมเดลสำรองตามเป้าหมายธุรกิจ',
    realTitle: 'บันทึกจริงที่ตรวจสอบได้จากระบบ',
    fallback_f5: 'ข้อมูลคำนวณ (F5)',
    real_f2_section: 'ข้อมูลวัดจริง (F2)',
    real_b1: 'ต้นทุนจริง (B1)',
    cohort_roi: 'ROI Cohort',
    f7_summary: 'บันทึกคอก (F7)',
    f8_summary: 'โทรได้ผล (F8)',
    f11: 'รายละเอียดการเข้าถึง (F11)',
    c4: 'กลุ่มใหม่ (C4)',
    no_data: 'ไม่มีข้อมูล',
    unavailable: 'ไม่พร้อมใช้งาน',
    approximate: 'ข้อมูลประมาณ',
    sourcePrefix: 'แหล่งที่มา:',
  },
} as const;
type I18NKey = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as I18NKey) in I18N ? (locale as I18NKey) : 'zh'];
}

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
  const t = useT();

  if (!source && !isEstimated) return null;

  // 根据预定义别名解析展示文案与高亮级别
  let label: string = t.systemAnalysis;
  let variant: 'green' | 'yellow' | 'gray' = 'gray';

  if (isEstimated) {
    label = t.estimated;
    variant = 'yellow';
  } else if (source === 'fallback_f5') {
    label = t.fallback_f5;
    variant = 'yellow';
  } else if (source === 'real_f2_section') {
    label = t.real_f2_section;
    variant = 'green';
  } else if (source === 'real_b1') {
    label = t.real_b1;
    variant = 'green';
  } else if (source === 'cohort_roi') {
    label = t.cohort_roi;
    variant = 'green';
  } else if (source === 'f7_summary') {
    label = t.f7_summary;
    variant = 'green';
  } else if (source === 'f8_summary') {
    label = t.f8_summary;
    variant = 'green';
  } else if (source?.toLowerCase().includes('f11')) {
    label = t.f11;
    variant = 'green';
  } else if (source === 'c4') {
    label = t.c4;
    variant = 'green';
  } else if (source === 'no_data') {
    label = t.no_data;
    variant = 'gray';
  } else if (source === 'unavailable') {
    label = t.unavailable;
    variant = 'yellow';
  } else if (source === 'approximate') {
    label = t.approximate;
    variant = 'yellow';
  } else if (source === 'empty' || source === 'none') {
    return null; // 有意留空不渲染
  } else if (source) {
    label = `${t.sourcePrefix} ${source.toUpperCase()}`;
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
      title={isEstimated ? t.estimatedTitle : t.realTitle}
    >
      {label}
    </span>
  );
}
