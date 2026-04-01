import { create } from 'zustand';

interface ThemeState {
    bgColor: string;
    bgImageUrl: string;
    setTheme: (color: string, imageUrl: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    bgColor: '#ffffff', // Warna default (putih/gelap terserah kamu)
    bgImageUrl: '',
    setTheme: (bgColor, bgImageUrl) => set({ bgColor, bgImageUrl }),
}));