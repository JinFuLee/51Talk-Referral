/** 筛选维度值类型 */
export type Country = 'TH'; // 扩展时在此联合类型加入
export type DataRole = 'all' | 'cc' | 'ss' | 'lp' | 'ops';
export type Granularity = 'day' | 'week' | 'month' | 'quarter';
export type FunnelStage = 'all' | 'registration' | 'appointment' | 'attendance' | 'payment';
export type Channel =
  | 'all'
  | 'cc_narrow'
  | 'ss_narrow'
  | 'lp_narrow'
  | 'cc_wide'
  | 'lp_wide'
  | 'ops_wide';
export type BehaviorSegment =
  | 'gold'
  | 'effective'
  | 'stuck_pay'
  | 'stuck_show'
  | 'potential'
  | 'freeloader'
  | 'newcomer'
  | 'casual';
export type BenchmarkMode = 'off' | 'target' | 'bm_progress' | 'bm_today' | 'prediction';

/** 全局筛选状态（config-store 中的维度字段） */
export interface DimensionState {
  country: Country;
  dataRole: DataRole;
  enclosure: string[] | null; // null = active default
  team: string | null; // 向后兼容现有字段
  cc: string | null; // 向后兼容现有字段
  granularity: Granularity;
  funnelStage: FunnelStage;
  channel: Channel;
  behavior: BehaviorSegment[] | null; // null = all
  benchmarks: BenchmarkMode[]; // 可多选，默认 ['target']
}

/** 页面维度声明（哪些维度在本页面有效） */
export interface PageDimensions {
  country?: boolean;
  dataRole?: boolean | DataRole; // true = 可选, 'cc' = 固定值
  enclosure?: boolean;
  team?: boolean;
  granularity?: boolean | Granularity; // true = 可选, 'day' = 固定值
  funnelStage?: boolean;
  channel?: boolean;
  behavior?: boolean;
}

/** DIMENSION_DEFAULTS — 所有维度的默认值 */
export const DIMENSION_DEFAULTS = {
  country: 'TH' as Country,
  dataRole: 'all' as DataRole,
  enclosure: null as string[] | null,
  granularity: 'month' as Granularity,
  funnelStage: 'all' as FunnelStage,
  channel: 'all' as Channel,
  behavior: null as BehaviorSegment[] | null,
  benchmarks: ['target'] as BenchmarkMode[],
} as const;

/** /api/filter/options 响应类型 */
export interface FilterOptions {
  countries: { value: string; label: string }[];
  teams: { value: string; label: string; region?: string }[];
  enclosures: { value: string; label: string; is_active: boolean }[];
  channels: { value: string; label: string; available_sources: string[] }[];
  behaviors: { value: string; label: string; color: string; count: number }[];
  cc_list: string[];
}
