'use client';

import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { ColorModeProvider, type ColorModeProviderProps } from '@/shared/components/ui/color-mode';

export const Provider = (props: ColorModeProviderProps) => (
  <ChakraProvider value={defaultSystem}>
    <ColorModeProvider {...props} />
  </ChakraProvider>
);
