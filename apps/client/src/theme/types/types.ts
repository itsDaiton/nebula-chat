import type { IconButtonProps } from '@chakra-ui/react';
import type { ThemeProviderProps } from 'next-themes';

export type ColorModeProviderProps = ThemeProviderProps;

export type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>;
