import type { IconButtonProps } from '@chakra-ui/react';
import type { ThemeProviderProps } from 'next-themes';

export type ColorMode = 'light' | 'dark';

export type UseColorModeReturn = {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  toggleColorMode: () => void;
};

export type ColorModeProviderProps = ThemeProviderProps;

export type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>;
