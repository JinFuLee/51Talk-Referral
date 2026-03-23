export type IndicatorCategory =
  | 'result'
  | 'achievement'
  | 'process'
  | 'efficiency'
  | 'process_wide'
  | 'conversion'
  | 'service_pre_paid'
  | 'service_post_paid';

export type IndicatorUnit = 'currency_usd' | 'percent' | 'count' | 'ratio';
export type IndicatorAvailability = 'available' | 'pending' | 'partial';

export interface IndicatorDef {
  id: string;
  name_zh: string;
  name_th: string;
  category: IndicatorCategory;
  unit: IndicatorUnit;
  formula: string | null;
  data_source: string;
  has_target: boolean;
  target_key: string | null;
  availability: IndicatorAvailability;
}

export interface RoleMatrix {
  readonly: boolean;
  enclosure: string;
  scope: string;
  active: string[];
}

export interface IndicatorMatrix {
  CC: RoleMatrix;
  SS: RoleMatrix;
  LP: RoleMatrix;
}

export const CATEGORY_LABELS_ZH: Record<IndicatorCategory, string> = {
  result: '结果指标',
  achievement: '达成指标',
  process: '过程指标',
  efficiency: '效率指标',
  process_wide: '宽口过程指标',
  conversion: '转化效率',
  service_pre_paid: '服务指标-付费前外呼',
  service_post_paid: '服务指标-付费后外呼',
};

export const CATEGORY_LABELS_TH: Record<IndicatorCategory, string> = {
  result: 'ตัวชี้วัดผล',
  achievement: 'ตัวชี้วัดความสำเร็จ',
  process: 'ตัวชี้วัดกระบวนการ',
  efficiency: 'ตัวชี้วัดประสิทธิภาพ',
  process_wide: 'ตัวชี้วัดกระบวนการ (กว้าง)',
  conversion: 'ประสิทธิภาพการแปลง',
  service_pre_paid: 'ตัวชี้วัดบริการ-ก่อนชำระ',
  service_post_paid: 'ตัวชี้วัดบริการ-หลังชำระ',
};

export const INDICATOR_CATEGORIES: IndicatorCategory[] = [
  'result',
  'achievement',
  'process',
  'efficiency',
  'process_wide',
  'conversion',
  'service_pre_paid',
  'service_post_paid',
];
