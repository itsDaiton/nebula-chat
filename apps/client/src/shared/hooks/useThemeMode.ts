import { useTheme } from 'next-themes';
import type { ThemeMode, UseThemeModeReturn } from '@/shared/types/types';

export const useThemeMode = (): UseThemeModeReturn => {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();
  const themeMode = forcedTheme || resolvedTheme;
  const toggleThemeMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  return {
    themeMode: themeMode as ThemeMode,
    setThemeMode: setTheme,
    toggleThemeMode,
  };
};
