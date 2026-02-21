'use client';

import { useEffect } from 'react';
import { usePresentationStore } from '../stores/presentation-store';
import { getSlides } from '../presentation/scenes';
import type { SlideConfig } from '../presentation/types';

interface UsePresentationReturn {
  currentSlide: SlideConfig | null;
  progress: number;
  isFirstSlide: boolean;
  isLastSlide: boolean;
}

export function usePresentation(): UsePresentationReturn {
  const {
    isPresentationMode,
    audience,
    timeframe,
    currentSlideIndex,
    totalSlides,
    nextReveal,
    prevSlide,
    endPresentation,
    toggleFullscreen,
  } = usePresentationStore();

  useEffect(() => {
    if (!isPresentationMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for keys we handle
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextReveal();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prevSlide();
          break;
        case ' ':
          e.preventDefault();
          nextReveal();
          break;
        case 'Escape':
          e.preventDefault();
          endPresentation();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresentationMode, nextReveal, prevSlide, endPresentation, toggleFullscreen]);

  // Sync fullscreen state when user presses Escape in browser fullscreen
  useEffect(() => {
    if (!isPresentationMode) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        usePresentationStore.setState({ isFullscreen: false });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isPresentationMode]);

  const slides = audience && timeframe ? getSlides(audience, timeframe) : [];
  const currentSlide = slides[currentSlideIndex] ?? null;
  const progress = totalSlides > 0 ? (currentSlideIndex + 1) / totalSlides : 0;
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  return {
    currentSlide,
    progress,
    isFirstSlide,
    isLastSlide,
  };
}
