import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { ColorModeProvider } from '@/theme/providers/ColorModeProvider';
import type { ColorModeProviderProps } from '@/shared/types/types';

export const Provider = (props: ColorModeProviderProps) => (
  <ChakraProvider value={defaultSystem}>
    <ColorModeProvider {...props} />
  </ChakraProvider>
);
