export type Audience = 'gm' | 'ops-director' | 'crosscheck';
export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface SlideConfig {
  id: string;
  title: string;
  subtitle?: string;
  component: string; // component registry key
  revealSteps?: number; // spacebar progressive reveal steps
  presenterNotes?: string;
  duration?: number; // suggested seconds
  section?: string; // section grouping
}

export interface SceneConfig {
  id: Audience;
  label: string;
  description: string;
  icon: string; // lucide icon name
  availableTimeframes: Timeframe[];
  slides: Record<Timeframe, SlideConfig[]>;
}

export interface PresentationNavState {
  audience: Audience | null;
  timeframe: Timeframe | null;
  currentSlideIndex: number;
  currentRevealStep: number;
  totalSlides: number;
  isFullscreen: boolean;
  returnPath: string;
}
