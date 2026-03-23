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

export const usePresentationStore = create<PresentationStore>((set) => ({
  isPresentationMode: false,
  currentSlide: 0,
  togglePresentationMode: () => set((state) => ({ isPresentationMode: !state.isPresentationMode })),
  exitPresentationMode: () => set({ isPresentationMode: false, currentSlide: 0 }),
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
