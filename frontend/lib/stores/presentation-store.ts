'use client';

import { create } from 'zustand';

interface PresentationStore {
  isPresentationMode: boolean;
  currentSlide: number;
  togglePresentationMode: () => void;
  exitPresentationMode: () => void;
  setCurrentSlide: (n: number) => void;
  nextSlide: (total: number) => void;
  prevSlide: () => void;
}

function setBodyPresentationMode(active: boolean) {
  if (typeof document === 'undefined') return;
  if (active) {
    document.body.classList.add('presentation-mode');
  } else {
    document.body.classList.remove('presentation-mode');
  }
}

export const usePresentationStore = create<PresentationStore>((set) => ({
  isPresentationMode: false,
  currentSlide: 0,
  togglePresentationMode: () =>
    set((state) => {
      const next = !state.isPresentationMode;
      setBodyPresentationMode(next);
      return { isPresentationMode: next };
    }),
  exitPresentationMode: () => {
    setBodyPresentationMode(false);
    set({ isPresentationMode: false, currentSlide: 0 });
  },
  setCurrentSlide: (n: number) => set({ currentSlide: n }),
  nextSlide: (total: number) =>
    set((state) => ({
      currentSlide: state.currentSlide < total - 1 ? state.currentSlide + 1 : state.currentSlide,
    })),
  prevSlide: () =>
    set((state) => ({
      currentSlide: state.currentSlide > 0 ? state.currentSlide - 1 : state.currentSlide,
    })),
}));
