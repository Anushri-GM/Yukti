import { create } from 'zustand';

interface SettingsState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  setLanguage: (language) => set({ language }),
}));
