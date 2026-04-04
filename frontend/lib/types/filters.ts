/** 筛选维度值类型 */
export type Country = 'TH'; // 扩展时在此联合类型加入
export type DataRole = 'all' | 'cc' | 'ss' | 'lp' | 'ops';
export type Channel =
  | 'all'
  | 'cc_narrow'
  | 'ss_narrow'
  | 'lp_narrow'
  | 'cc_wide'
  | 'lp_wide'
  | 'ops_wide';
export type BenchmarkMode = 'off' | 'target' | 'bm_progress' | 'bm_today' | 'prediction';

/** 全局筛选状态（config-store 中的维度字段） */
export interface DimensionState {
  country: Country;
  dataRole: DataRole;
  enclosure: string[] | null; // null = active default
  team: string | null; // 向后兼容现有字段
  cc: string | null; // 向后兼容现有字段
  channel: Channel;
  benchmarks: BenchmarkMode[]; // 可多选，默认 ['target']
}

/** 页面维度声明（哪些维度在本页面有效） */
export interface PageDimensions {
  country?: boolean;
  dataRole?: boolean | DataRole; // true = 可选, 'cc' = 固定值
  enclosure?: boolean;
  team?: boolean;
  channel?: boolean;
}

/** DIMENSION_DEFAULTS — 所有维度的默认值 */
export const DIMENSION_DEFAULTS = {
  country: 'TH' as Country,
  dataRole: 'all' as DataRole,
  enclosure: null as string[] | null,
  channel: 'all' as Channel,
  benchmarks: ['target'] as BenchmarkMode[],
} as const;

/** /api/filter/options 响应类型 */
export interface FilterOptions {
  countries: { value: string; label: string }[];
  teams: { value: string; label: string; region?: string }[];
  enclosures: { value: string; label: string; is_active: boolean }[];
  channels: { value: string; label: string; available_sources: string[] }[];
  cc_list: string[];
}
