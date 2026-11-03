import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export const ThemeProvider = ({ children }: Readonly<{ children: ReactNode }>) => (
  <NextThemesProvider
    attribute="class"
    storageKey="nebula-theme"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    {children}
  </NextThemesProvider>
);
