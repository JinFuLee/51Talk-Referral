"use client";

import { create } from "zustand";

interface PresentationStore {
  isPresentationMode: boolean
  togglePresentationMode: () => void
  exitPresentationMode: () => void
}

export const usePresentationStore = create<PresentationStore>((set) => ({
  isPresentationMode: false,
  togglePresentationMode: () =>
    set((state) => ({ isPresentationMode: !state.isPresentationMode })),
  exitPresentationMode: () => set({ isPresentationMode: false }),
}));
