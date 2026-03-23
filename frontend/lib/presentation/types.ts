export type Audience = 'gm' | 'ops-director' | 'crosscheck';
export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface SlideEntry {
  id: string;
  section: string;
  title: string;
  subtitle?: string;
}
