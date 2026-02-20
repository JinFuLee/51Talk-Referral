import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  language: 'zh' | 'th';
  role: 'ops' | 'exec' | 'finance';
  input_dir: string;
  output_dir: string;
  exchange_rate: number;
  selected_month?: string;
  setLanguage: (lang: 'zh' | 'th') => void;
  setRole: (role: 'ops' | 'exec' | 'finance') => void;
  setConfig: (config: Partial<Omit<ConfigState, 'setLanguage' | 'setRole' | 'setConfig'>>) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      language: 'zh',
      role: 'ops',
      input_dir: './input',
      output_dir: './output',
      exchange_rate: 35,
      setLanguage: (language) => set({ language }),
      setRole: (role) => set({ role }),
      setConfig: (config) => set(config),
    }),
    { name: 'panel-config' }
  )
);
