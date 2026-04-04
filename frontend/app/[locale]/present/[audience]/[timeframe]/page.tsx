'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { usePresentationStore } from '@/lib/stores/presentation-store';
import { BrandMark } from '@/components/ui/BrandMark';
import type { Audience } from '@/lib/presentation/types';

import { TargetGapSlide } from '@/components/slides/TargetGapSlide';
import { ThreeFactorSlide } from '@/components/slides/ThreeFactorSlide';
import { RevenueContributionSlide } from '@/components/slides/RevenueContributionSlide';
import { RevenueDecompositionSlide } from '@/components/slides/RevenueDecompositionSlide';
import { ScenarioAnalysisSlide } from '@/components/slides/ScenarioAnalysisSlide';
import { ConversionRateSlide } from '@/components/slides/ConversionRateSlide';
import { FunnelAttributionSlide } from '@/components/slides/FunnelAttributionSlide';
import { LeadAttributionSlide } from '@/components/slides/LeadAttributionSlide';
import { NetAttributionSlide } from '@/components/slides/NetAttributionSlide';
import { ChannelRevenueSlide } from '@/components/slides/ChannelRevenueSlide';

const I18N = {
  zh: { exitBtn: '退出', exitTitle: '退出汇报模式' },
  'zh-TW': { exitBtn: '退出', exitTitle: '退出匯報模式' },
  en: { exitBtn: 'Exit', exitTitle: 'Exit Presentation Mode' },
  th: { exitBtn: 'ออก', exitTitle: 'ออกจากโหมดนำเสนอ' },
};

// 有效组合：audience → 允许的 timeframe
const VALID_COMBINATIONS: Record<string, string[]> = {
  gm: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  'ops-director': ['daily', 'weekly', 'monthly'],
  crosscheck: ['weekly', 'monthly', 'quarterly'],
};

// Slide 组件类型
type SlideComponent = React.ComponentType<{ slideNumber: number; totalSlides: number }>;

// 每个场景的 Slide 顺序
const PLAYLISTS: Record<Audience, SlideComponent[]> = {
  gm: [
    TargetGapSlide,
    RevenueContributionSlide,
    ThreeFactorSlide,
    ConversionRateSlide,
    ScenarioAnalysisSlide,
    ChannelRevenueSlide,
  ],
  'ops-director': [
    TargetGapSlide,
    FunnelAttributionSlide,
    ConversionRateSlide,
    LeadAttributionSlide,
    NetAttributionSlide,
    ChannelRevenueSlide,
    ThreeFactorSlide,
  ],
  crosscheck: [
    RevenueContributionSlide,
    LeadAttributionSlide,
    NetAttributionSlide,
    RevenueDecompositionSlide,
    ThreeFactorSlide,
  ],
};

export default function PresentationPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    granularity: true,
    funnelStage: true,
    channel: true,
  });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const params = useParams();
  const router = useRouter();
  const { currentSlide, nextSlide, prevSlide, togglePresentationMode, exitPresentationMode } =
    usePresentationStore();
  const directionRef = useRef<'forward' | 'backward'>('forward');

  const exitPresentation = useCallback(() => {
    exitPresentationMode();
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    } catch {
      // 静默忽略
    }
    router.push('/present');
  }, [exitPresentationMode, router]);

  const audience = params.audience as string;
  const timeframe = params.timeframe as string;

  // 参数验证
  const isValidCombination =
    audience in VALID_COMBINATIONS && VALID_COMBINATIONS[audience].includes(timeframe);

  const playlist: SlideComponent[] = isValidCombination ? PLAYLISTS[audience as Audience] : [];
  const totalSlides = playlist.length;
  const CurrentSlide = totalSlides > 0 ? playlist[currentSlide] : null;

  // 进入汇报模式并启动全屏
  useEffect(() => {
    if (!isValidCombination) {
      router.replace('/present');
      return;
    }

    togglePresentationMode();

    try {
      document.documentElement.requestFullscreen?.();
    } catch {
      // 全屏不支持时静默忽略
    }

    return () => {
      exitPresentationMode();
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      } catch {
        // 静默忽略
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          directionRef.current = 'forward';
          nextSlide(totalSlides);
          break;
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          directionRef.current = 'backward';
          prevSlide();
          break;
        case 'Escape':
          e.preventDefault();
          exitPresentation();
          break;
      }
    },
    [nextSlide, prevSlide, exitPresentation, totalSlides]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isValidCombination || !CurrentSlide) {
    return null;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden" key={currentSlide}>
      {/* 当前 Slide */}
      <CurrentSlide slideNumber={currentSlide + 1} totalSlides={totalSlides} />

      {/* 退出按钮 — 毛玻璃品牌风格 */}
      <button
        onClick={exitPresentation}
        className="absolute bottom-5 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl bg-white/60 border border-white/40 shadow-lg text-[var(--n-600)] text-xs font-semibold transition-all duration-200 hover:bg-white/80 hover:shadow-xl hover:-translate-y-0.5"
        title={t.exitTitle}
      >
        <BrandMark size={14} className="text-[var(--brand-p1)]" />
        <span className="font-mono tracking-wider">ESC</span>
        <span>{t.exitBtn}</span>
      </button>
    </div>
  );
}
