import { create } from 'zustand';

interface PresentationState {
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
}

export const usePresentationStore = create<PresentationState>((set) => ({
  isPresentationMode: false,
  togglePresentationMode: () => {
    set((state) => {
      const next = !state.isPresentationMode;
      if (next) {
        document.body.classList.add('presentation-mode');
      } else {
        document.body.classList.remove('presentation-mode');
      }
      return { isPresentationMode: next };
    });
  },
}));
