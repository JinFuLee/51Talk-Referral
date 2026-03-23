export type Audience = 'gm' | 'ops-director' | 'crosscheck';
export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** 预留用于未来 slide 目录/大纲功能（如侧边栏 slide 列表展示） */
export interface SlideEntry {
  id: string;
  section: string;
  title: string;
  subtitle?: string;
}
