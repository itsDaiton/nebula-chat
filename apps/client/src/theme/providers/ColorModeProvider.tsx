import { ThemeProvider } from 'next-themes';
import type { ColorModeProviderProps } from '@/theme/types/types';

export const ColorModeProvider = (props: ColorModeProviderProps) => (
  <ThemeProvider attribute="class" storageKey="nebula-theme" disableTransitionOnChange {...props} />
);
