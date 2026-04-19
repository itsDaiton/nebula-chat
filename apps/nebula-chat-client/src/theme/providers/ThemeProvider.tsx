import type { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { ColorModeProvider } from '@/theme/providers/ColorModeProvider';
import { system } from '@/theme/theme';

export const ThemeProvider = ({ children }: Readonly<{ children: ReactNode }>) => (
  <ChakraProvider value={system}>
    <ColorModeProvider defaultTheme="system" enableSystem>
      {children}
    </ColorModeProvider>
  </ChakraProvider>
);
