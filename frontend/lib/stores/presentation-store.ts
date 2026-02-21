import { create } from 'zustand';
import type { Audience, Timeframe } from '../presentation/types';
import { getSlides } from '../presentation/scenes';

interface PresentationState {
  // --- Legacy (backward compatible) ---
  isPresentationMode: boolean;
  togglePresentationMode: () => void;

  // --- Nav state ---
  audience: Audience | null;
  timeframe: Timeframe | null;
  currentSlideIndex: number;
  currentRevealStep: number;
  totalSlides: number;
  isFullscreen: boolean;
  returnPath: string;

  // --- Actions ---
  startPresentation: (audience: Audience, timeframe: Timeframe, returnPath: string) => void;
  endPresentation: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  nextReveal: () => void;
  goToSlide: (index: number) => void;
  toggleFullscreen: () => void;
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  // --- Legacy ---
  isPresentationMode: false,
  togglePresentationMode: () => {
    set((state) => {
      const next = !state.isPresentationMode;
      if (typeof document !== 'undefined') {
        if (next) {
          document.body.classList.add('presentation-mode');
        } else {
          document.body.classList.remove('presentation-mode');
        }
      }
      return { isPresentationMode: next };
    });
  },

  // --- Nav state defaults ---
  audience: null,
  timeframe: null,
  currentSlideIndex: 0,
  currentRevealStep: 0,
  totalSlides: 0,
  isFullscreen: false,
  returnPath: '/',

  // --- Actions ---
  startPresentation: (audience, timeframe, returnPath) => {
    const slides = getSlides(audience, timeframe);
    if (typeof document !== 'undefined') {
      document.body.classList.add('presentation-mode');
    }
    set({
      isPresentationMode: true,
      audience,
      timeframe,
      returnPath,
      currentSlideIndex: 0,
      currentRevealStep: 0,
      totalSlides: slides.length,
    });
  },

  endPresentation: () => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('presentation-mode');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
    }
    set({
      isPresentationMode: false,
      audience: null,
      timeframe: null,
      currentSlideIndex: 0,
      currentRevealStep: 0,
      totalSlides: 0,
      isFullscreen: false,
    });
  },

  nextSlide: () => {
    const { currentSlideIndex, totalSlides } = get();
    if (currentSlideIndex < totalSlides - 1) {
      set({ currentSlideIndex: currentSlideIndex + 1, currentRevealStep: 0 });
    }
  },

  prevSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1, currentRevealStep: 0 });
    }
  },

  nextReveal: () => {
    const { audience, timeframe, currentSlideIndex, currentRevealStep } = get();
    if (!audience || !timeframe) return;

    const slides = getSlides(audience, timeframe);
    const slide = slides[currentSlideIndex];
    const revealSteps = slide?.revealSteps ?? 1;

    if (currentRevealStep < revealSteps - 1) {
      set({ currentRevealStep: currentRevealStep + 1 });
    } else {
      get().nextSlide();
    }
  },

  goToSlide: (index) => {
    const { totalSlides } = get();
    if (index >= 0 && index < totalSlides) {
      set({ currentSlideIndex: index, currentRevealStep: 0 });
    }
  },

  toggleFullscreen: () => {
    if (typeof document === 'undefined') return;
    const { isFullscreen } = get();
    if (!isFullscreen) {
      document.documentElement.requestFullscreen().catch(() => undefined);
      set({ isFullscreen: true });
    } else {
      document.exitFullscreen().catch(() => undefined);
      set({ isFullscreen: false });
    }
  },
}));
