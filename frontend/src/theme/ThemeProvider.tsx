import type { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { ColorModeProvider } from '@/shared/components/ui/color-mode';
import { system } from '@/theme/theme';

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider defaultTheme="system" enableSystem>
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
