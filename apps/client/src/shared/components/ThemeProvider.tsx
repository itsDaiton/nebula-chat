import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export const ThemeProvider = ({ children }: Readonly<{ children: ReactNode }>) => (
  <NextThemesProvider
    attribute="class"
    storageKey="nebula-theme"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
    // A data-block type keeps React 19 from warning about a script it would never run in this SPA.
    scriptProps={{ type: 'application/json' }}
  >
    {children}
  </NextThemesProvider>
);
