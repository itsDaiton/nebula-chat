import { createShikiAdapter } from '@chakra-ui/react';
import type { HighlighterGeneric } from 'shiki';
import { allowedLangs } from '@/shared/utils/allowedLangs';

export const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
  async load() {
    const { createHighlighter } = await import('shiki');
    return createHighlighter({
      langs: allowedLangs,
      themes: ['github-dark', 'github-light'],
    });
  },
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
});
